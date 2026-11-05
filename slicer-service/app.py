import json
import logging
import math
import os
import shlex
import shutil
import signal
import struct
import subprocess
import tempfile
from dataclasses import dataclass
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import BoundedSemaphore
from typing import Any, cast
from urllib.parse import urlparse


MAX_UPLOAD_BYTES = 50 * 1024 * 1024
MAX_TRIANGLES = MAX_UPLOAD_BYTES // 50
ALLOWED_INFILL = {"15", "20", "50", "70", "100"}
PRINTERS = {"ender-5": "ender-5", "cr-10": "cr-10"}
MATERIALS = {
    "PLA_20000": "pla",
    "PLA_24000": "pla",
    "PETG_28000": "petg",
    "ABS_30000": "abs",
    "TPU_36000": "tpu",
}
DEFAULT_ORIGINS = {
    "https://thesculper.github.io",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
}

logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))
logger = logging.getLogger("3deco-slicer")


class ServiceError(Exception):
    def __init__(self, status: int, message: str):
        super().__init__(message)
        self.status = status
        self.message = message


@dataclass(frozen=True)
class ServiceConfig:
    profile_dir: Path
    slicer_command: tuple[str, ...]
    allowed_origins: set[str]
    timeout_seconds: int
    max_upload_bytes: int
    max_concurrent_slices: int
    temp_dir: Path


def config_from_environment() -> ServiceConfig:
    command = tuple(shlex.split(os.getenv("SLICER_COMMAND", "orca-slicer-cli")))
    if not command:
        raise ValueError("SLICER_COMMAND must not be empty")

    origins = {
        origin.strip()
        for origin in os.getenv("CORS_ORIGINS", "").split(",")
        if origin.strip()
    }
    origins = origins or DEFAULT_ORIGINS.copy()

    return ServiceConfig(
        profile_dir=Path(os.getenv("PROFILES_DIR", "/app/profiles")),
        slicer_command=command,
        allowed_origins=origins,
        timeout_seconds=max(1, int(os.getenv("SLICE_TIMEOUT_SECONDS", "180"))),
        max_upload_bytes=max(1, int(os.getenv("MAX_UPLOAD_BYTES", str(MAX_UPLOAD_BYTES)))),
        max_concurrent_slices=max(1, int(os.getenv("MAX_CONCURRENT_SLICES", "1"))),
        temp_dir=Path(os.getenv("TEMP_DIR", tempfile.gettempdir())),
    )


def _profile_file(profile_dir: Path, relative_path: Path) -> Path:
    root = profile_dir.resolve()
    candidate = (root / relative_path).resolve()
    if os.path.commonpath((str(root), str(candidate))) != str(root):
        raise ServiceError(503, "La ruta del perfil de laminado no es válida.")
    if not candidate.is_file():
        raise ServiceError(
            503,
            "Falta un perfil OrcaSlicer para esta impresora o material. Revisa la configuración local del servicio.",
        )
    return candidate


def _read_profile(path: Path) -> dict[str, Any]:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        logger.error("Could not read slicer profile %s: %s", path.name, error)
        raise ServiceError(503, "Hay un perfil OrcaSlicer inválido; revisa sus archivos JSON.") from error
    if not isinstance(value, dict):
        raise ServiceError(503, "El perfil OrcaSlicer debe contener un objeto JSON.")
    return value


def load_profile_bundle(
    config: ServiceConfig,
    printer: str,
    material: str,
    infill: str,
) -> tuple[Path, Path, dict[str, Any]]:
    printer_slug = PRINTERS.get(printer)
    material_slug = MATERIALS.get(material)
    if printer_slug is None:
        raise ServiceError(422, "La impresora seleccionada no tiene un perfil de laminado configurado.")
    if material_slug is None:
        raise ServiceError(422, "El material seleccionado no es compatible con el cálculo automático.")
    if infill not in ALLOWED_INFILL:
        raise ServiceError(422, "Selecciona un porcentaje de relleno válido.")

    machine = _profile_file(config.profile_dir, Path(printer_slug) / "machine.json")
    process = _profile_file(config.profile_dir, Path(printer_slug) / "process.json")
    filament = _profile_file(
        config.profile_dir,
        Path(printer_slug) / "filaments" / f"{material_slug}.json",
    )
    process_settings = _read_profile(process)
    process_settings["sparse_infill_density"] = f"{infill}%"
    return machine, filament, process_settings


def stl_dimensions_mm(path: Path) -> tuple[float, float, float]:
    size = path.stat().st_size
    minimum = [math.inf, math.inf, math.inf]
    maximum = [-math.inf, -math.inf, -math.inf]
    vertex_count = 0

    def include_vertex(values: tuple[float, float, float]) -> None:
        nonlocal vertex_count
        if not all(math.isfinite(value) for value in values):
            raise ServiceError(422, "El STL contiene coordenadas inválidas.")
        for axis, value in enumerate(values):
            minimum[axis] = min(minimum[axis], value)
            maximum[axis] = max(maximum[axis], value)
        vertex_count += 1
        if vertex_count > MAX_TRIANGLES * 3:
            raise ServiceError(413, "El STL contiene demasiados triángulos.")

    with path.open("rb") as model:
        header = model.read(84)
        if len(header) == 84:
            triangle_count = struct.unpack_from("<I", header, 80)[0]
            if 0 < triangle_count <= MAX_TRIANGLES and size == 84 + triangle_count * 50:
                for _ in range(triangle_count):
                    facet = model.read(50)
                    for offset in (12, 24, 36):
                        include_vertex(struct.unpack_from("<fff", facet, offset))

    if vertex_count == 0:
        with path.open("rb") as model:
            if not model.read(5).lower() == b"solid":
                raise ServiceError(422, "El archivo no parece ser un STL binario o ASCII válido.")
        try:
            with path.open("r", encoding="ascii", errors="ignore") as model:
                for line in model:
                    parts = line.strip().split()
                    if parts and parts[0].lower() == "vertex":
                        if len(parts) != 4:
                            raise ServiceError(422, "El STL ASCII contiene un vértice inválido.")
                        try:
                            include_vertex(tuple(float(value) for value in parts[1:]))
                        except ValueError as error:
                            raise ServiceError(422, "El STL ASCII contiene coordenadas inválidas.") from error
        except OSError as error:
            raise ServiceError(422, "No se pudo leer el archivo STL.") from error

    if vertex_count < 3 or vertex_count % 3:
        raise ServiceError(422, "El STL no contiene una malla triangular completa.")

    dimensions = tuple(maximum[axis] - minimum[axis] for axis in range(3))
    if not all(math.isfinite(value) and value > 0 for value in dimensions):
        raise ServiceError(422, "El modelo STL debe tener dimensiones mayores que cero en sus tres ejes.")
    return dimensions


def _statistics_from_output(output_dir: Path) -> tuple[float, float, float]:
    statistics_files = sorted(output_dir.glob("*.statistics.json"))
    if not statistics_files:
        raise ServiceError(502, "OrcaSlicer no devolvió estadísticas; revisa el perfil configurado.")

    total_time = 0.0
    total_weight = 0.0
    total_support_weight = 0.0
    for path in statistics_files:
        try:
            report = json.loads(path.read_text(encoding="utf-8"))
            summary = report["summary"]
            duration = float(summary["time"])
            weight = float(summary["weight"])
            objects = report.get("objects", [])
            if not isinstance(objects, list) or any(not isinstance(item, dict) for item in objects):
                raise ValueError("Invalid object statistics")
            support_weight = sum(float(item.get("support_weight", 0)) for item in objects)
        except (OSError, json.JSONDecodeError, KeyError, TypeError, ValueError) as error:
            logger.error("Invalid OrcaSlicer statistics file %s: %s", path.name, error)
            raise ServiceError(502, "OrcaSlicer devolvió estadísticas inválidas.") from error
        if (
            not math.isfinite(duration)
            or not math.isfinite(weight)
            or not math.isfinite(support_weight)
            or duration <= 0
            or weight <= 0
            or support_weight < 0
            or support_weight > weight
        ):
            raise ServiceError(502, "OrcaSlicer devolvió tiempo o consumo de filamento inválidos.")
        total_time += duration
        total_weight += weight
        total_support_weight += support_weight
    return total_time, total_weight, total_support_weight


def slice_stl(
    model_path: Path,
    config: ServiceConfig,
    work_dir: Path,
    printer: str,
    material: str,
    infill: str,
) -> dict[str, Any]:
    machine, filament, process_settings = load_profile_bundle(config, printer, material, infill)
    dimensions = stl_dimensions_mm(model_path)
    work_dir.mkdir(parents=True, exist_ok=True)
    process = work_dir / "process.json"
    process.write_text(json.dumps(process_settings), encoding="utf-8")
    output_dir = work_dir / "output"
    home_dir = work_dir / "home"
    output_dir.mkdir()
    home_dir.mkdir()

    command = [
        *config.slicer_command,
        str(model_path),
        "--load-settings",
        f"{machine};{process}",
        "--load-filaments",
        str(filament),
        "--slice",
        "0",
        "--export-gcode",
        "--export-statistics",
        "--outputdir",
        str(output_dir),
    ]
    environment = os.environ.copy()
    environment.update(
        {
            "HOME": str(home_dir),
            "TMPDIR": str(work_dir),
            "QT_QPA_PLATFORM": "offscreen",
        }
    )
    try:
        process_handle = subprocess.Popen(
            command,
            cwd=work_dir,
            env=environment,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            start_new_session=(os.name == "posix"),
        )
        try:
            stdout, stderr = process_handle.communicate(timeout=config.timeout_seconds)
        except subprocess.TimeoutExpired as error:
            if os.name == "posix":
                try:
                    os.killpg(process_handle.pid, signal.SIGKILL)
                except ProcessLookupError:
                    pass
            else:
                try:
                    process_handle.kill()
                except ProcessLookupError:
                    pass
            process_handle.communicate()
            raise ServiceError(504, "El laminado excedió el tiempo máximo permitido.") from error
    except OSError as error:
        logger.error("Could not start OrcaSlicer: %s", error)
        raise ServiceError(503, "No se encontró OrcaSlicer en el servicio local.") from error

    if process_handle.returncode:
        logger.error("OrcaSlicer exited with %s: %s", process_handle.returncode, stderr[-2000:])
        raise ServiceError(422, "OrcaSlicer no pudo laminar el modelo con el perfil seleccionado.")

    seconds, grams, support_grams = _statistics_from_output(output_dir)
    return {
        "time_seconds": seconds,
        "filament_grams": grams,
        "support_grams": support_grams,
        "dimensions_mm": {
            "x": round(dimensions[0], 2),
            "y": round(dimensions[1], 2),
            "z": round(dimensions[2], 2),
        },
        "profile": printer,
        "material": material,
    }


def _profile_is_ready(config: ServiceConfig, printer: str, material: str) -> bool:
    try:
        load_profile_bundle(config, printer, material, "50")
    except ServiceError:
        return False
    return True


class SlicerHTTPServer(ThreadingHTTPServer):
    daemon_threads = True
    allow_reuse_address = True

    def __init__(self, address: tuple[str, int], config: ServiceConfig):
        super().__init__(address, SlicerHandler)
        self.config = config
        self.slice_slots = BoundedSemaphore(config.max_concurrent_slices)


class SlicerHandler(BaseHTTPRequestHandler):
    server_version = "3deco-slicer"
    protocol_version = "HTTP/1.0"

    @property
    def config(self) -> ServiceConfig:
        return cast(SlicerHTTPServer, self.server).config

    def log_message(self, format_string: str, *args: Any) -> None:
        return

    def _origin_allowed(self) -> bool:
        origin = self.headers.get("Origin")
        return origin is None or origin in self.config.allowed_origins

    def _send_json(self, status: int, payload: dict[str, Any]) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        origin = self.headers.get("Origin")
        if origin and origin in self.config.allowed_origins:
            self.send_header("Access-Control-Allow-Origin", origin)
            self.send_header("Vary", "Origin")
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self) -> None:
        if not self._origin_allowed():
            self._send_json(403, {"error": "Origen no permitido."})
            return
        self.send_response(204)
        origin = self.headers.get("Origin")
        if origin:
            self.send_header("Access-Control-Allow-Origin", origin)
            self.send_header("Vary", "Origin")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header(
            "Access-Control-Allow-Headers",
            "Content-Type, X-Printer, X-Material, X-Infill",
        )
        if self.headers.get("Access-Control-Request-Private-Network") == "true":
            self.send_header("Access-Control-Allow-Private-Network", "true")
        self.send_header("Content-Length", "0")
        self.end_headers()

    def do_GET(self) -> None:
        if urlparse(self.path).path != "/health":
            self._send_json(404, {"error": "Ruta no encontrada."})
            return
        if not self._origin_allowed():
            self._send_json(403, {"error": "Origen no permitido."})
            return

        executable = self.config.slicer_command[0]
        slicer_available = Path(executable).is_file() or shutil.which(executable) is not None
        ready_profiles = [
            f"{printer}/{material}"
            for printer in PRINTERS
            for material in MATERIALS
            if _profile_is_ready(self.config, printer, material)
        ]
        self._send_json(
            200,
            {
                "status": "ok",
                "slicer_available": slicer_available,
                "profiles": ready_profiles,
            },
        )

    def do_POST(self) -> None:
        if urlparse(self.path).path != "/api/slice":
            self._send_json(404, {"error": "Ruta no encontrada."})
            return
        if not self._origin_allowed():
            self._send_json(403, {"error": "Origen no permitido."})
            return
        if self.headers.get_content_type() != "application/octet-stream":
            self._send_json(415, {"error": "Envía el archivo STL como datos binarios."})
            return

        try:
            content_length = int(self.headers.get("Content-Length", ""))
        except ValueError:
            self._send_json(411, {"error": "Se requiere un tamaño de archivo válido."})
            return
        if content_length <= 0:
            self._send_json(400, {"error": "El archivo está vacío."})
            return
        if content_length > self.config.max_upload_bytes:
            self._send_json(413, {"error": "El archivo excede el límite de 50 MB."})
            return

        printer = self.headers.get("X-Printer", "")
        material = self.headers.get("X-Material", "")
        infill = self.headers.get("X-Infill", "")
        try:
            load_profile_bundle(self.config, printer, material, infill)
        except ServiceError as error:
            self._send_json(error.status, {"error": error.message})
            return

        server = cast(SlicerHTTPServer, self.server)
        if not server.slice_slots.acquire(blocking=False):
            self._send_json(429, {"error": "El servicio está procesando otro modelo. Inténtalo nuevamente."})
            return

        try:
            self.config.temp_dir.mkdir(parents=True, exist_ok=True)
            with tempfile.TemporaryDirectory(prefix="3deco-slice-", dir=self.config.temp_dir) as temporary:
                work_dir = Path(temporary)
                model_path = work_dir / "model.stl"
                remaining = content_length
                with model_path.open("wb") as model:
                    while remaining:
                        chunk = self.rfile.read(min(64 * 1024, remaining))
                        if not chunk:
                            raise ServiceError(400, "La carga del archivo quedó incompleta.")
                        model.write(chunk)
                        remaining -= len(chunk)
                result = slice_stl(
                    model_path,
                    self.config,
                    work_dir,
                    printer,
                    material,
                    infill,
                )
            self._send_json(200, result)
        except ServiceError as error:
            self._send_json(error.status, {"error": error.message})
        except OSError as error:
            logger.exception("Local slicing service failed: %s", error)
            self._send_json(500, {"error": "El servicio local no pudo procesar el archivo."})
        finally:
            server.slice_slots.release()


def main() -> None:
    config = config_from_environment()
    host = os.getenv("HOST", "127.0.0.1")
    port = int(os.getenv("PORT", "8001"))
    server = SlicerHTTPServer((host, port), config)
    logger.info("3deco local slicing service listening on %s:%s", host, port)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        logger.info("Stopping local slicing service")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
