import json
import sys
import tempfile
import threading
import unittest
from pathlib import Path
from http.client import HTTPConnection
from urllib.request import Request, urlopen

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app import SlicerHTTPServer, ServiceConfig, ServiceError, stl_dimensions_mm


class SlicerServiceTests(unittest.TestCase):
    def test_reads_ascii_stl_dimensions(self):
        with tempfile.TemporaryDirectory() as directory:
            model = Path(directory) / "box.stl"
            model.write_text(
                "solid box\n"
                "facet normal 0 0 1\nouter loop\n"
                "vertex 0 0 0\nvertex 10 0 0\nvertex 0 20 0\n"
                "endloop\nendfacet\n"
                "facet normal 0 0 1\nouter loop\n"
                "vertex 0 0 30\nvertex 10 0 0\nvertex 0 20 0\n"
                "endloop\nendfacet\nendsolid box\n",
                encoding="ascii",
            )
            self.assertEqual(stl_dimensions_mm(model), (10.0, 20.0, 30.0))

    def test_rejects_non_stl_data(self):
        with tempfile.TemporaryDirectory() as directory:
            model = Path(directory) / "invalid.stl"
            model.write_bytes(b"not an STL")
            with self.assertRaises(ServiceError) as error:
                stl_dimensions_mm(model)
            self.assertEqual(error.exception.status, 422)

    def test_slices_using_selected_profile_and_reads_orca_statistics(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            profile_root = root / "profiles"
            printer_dir = profile_root / "ender-5"
            (printer_dir / "filaments").mkdir(parents=True)
            (printer_dir / "machine.json").write_text('{"name":"machine"}', encoding="utf-8")
            (printer_dir / "process.json").write_text(
                '{"sparse_infill_density":"20%"}',
                encoding="utf-8",
            )
            (printer_dir / "filaments" / "pla.json").write_text(
                '{"name":"PLA"}',
                encoding="utf-8",
            )
            fake_slicer = root / "fake_slicer.py"
            fake_slicer.write_text(
                "import json, pathlib, sys\n"
                "args = sys.argv[1:]\n"
                "out = pathlib.Path(args[args.index('--outputdir') + 1])\n"
                "pathlib.Path(args[0]).resolve()\n"
                "process = json.loads(pathlib.Path(args[args.index('--load-settings') + 1].split(';')[1]).read_text())\n"
                "assert process['sparse_infill_density'] == '50%'\n"
                "(out / 'model.statistics.json').write_text(json.dumps({"
                "'summary': {'time': 3600, 'weight': 12.34},"
                "'objects': [{'support_weight': 2.34}]}))\n",
                encoding="utf-8",
            )
            config = ServiceConfig(
                profile_dir=profile_root,
                slicer_command=(sys.executable, str(fake_slicer)),
                allowed_origins={"http://allowed.test"},
                timeout_seconds=5,
                max_upload_bytes=1024 * 1024,
                max_concurrent_slices=1,
                temp_dir=root,
            )
            model_data = (
                "solid box\n"
                "vertex 0 0 0\nvertex 10 0 0\nvertex 0 20 0\n"
                "vertex 0 0 30\nvertex 10 0 0\nvertex 0 20 0\n"
                "endsolid box\n"
            ).encode("ascii")
            server = SlicerHTTPServer(("127.0.0.1", 0), config)
            thread = threading.Thread(target=server.serve_forever)
            thread.start()
            request = Request(
                f"http://127.0.0.1:{server.server_port}/api/slice",
                data=model_data,
                headers={
                    "Content-Type": "application/octet-stream",
                    "Origin": "http://allowed.test",
                    "X-Printer": "ender-5",
                    "X-Material": "PLA_20000",
                    "X-Infill": "50",
                },
                method="POST",
            )
            try:
                with urlopen(request, timeout=5) as response:
                    result = json.load(response)
                    self.assertEqual(response.headers["Access-Control-Allow-Origin"], "http://allowed.test")
                self.assertEqual(result["time_seconds"], 3600)
                self.assertEqual(result["filament_grams"], 12.34)
                self.assertEqual(result["support_grams"], 2.34)
                self.assertEqual(result["dimensions_mm"], {"x": 10.0, "y": 20.0, "z": 30.0})
            finally:
                server.shutdown()
                thread.join(timeout=2)
                server.server_close()

    def test_rejects_unsupported_printer(self):
        with tempfile.TemporaryDirectory() as directory:
            config = ServiceConfig(
                profile_dir=Path(directory),
                slicer_command=("orca-slicer-cli",),
                allowed_origins=set(),
                timeout_seconds=5,
                max_upload_bytes=1024,
                max_concurrent_slices=1,
                temp_dir=Path(directory),
            )
            with self.assertRaises(ServiceError) as error:
                from app import load_profile_bundle

                load_profile_bundle(config, "otra", "PLA_20000", "50")
            self.assertEqual(error.exception.status, 422)

    def test_http_rejects_untrusted_origins_and_oversized_uploads(self):
        with tempfile.TemporaryDirectory() as directory:
            config = ServiceConfig(
                profile_dir=Path(directory),
                slicer_command=("orca-slicer-cli",),
                allowed_origins={"http://allowed.test"},
                timeout_seconds=5,
                max_upload_bytes=2,
                max_concurrent_slices=1,
                temp_dir=Path(directory),
            )
            server = SlicerHTTPServer(("127.0.0.1", 0), config)
            thread = threading.Thread(target=server.serve_forever)
            thread.start()
            try:
                cases = [
                    ("http://untrusted.test", 403),
                    ("http://allowed.test", 413),
                ]
                for origin, expected_status in cases:
                    connection = HTTPConnection("127.0.0.1", server.server_port, timeout=2)
                    if expected_status == 403:
                        connection.request("OPTIONS", "/api/slice", headers={"Origin": origin})
                    else:
                        connection.putrequest("POST", "/api/slice")
                        connection.putheader("Content-Type", "application/octet-stream")
                        connection.putheader("Content-Length", "3")
                        connection.putheader("Origin", origin)
                        connection.endheaders()
                    response = connection.getresponse()
                    self.assertEqual(response.status, expected_status)
                    response.read()
                    connection.close()
            finally:
                server.shutdown()
                thread.join(timeout=2)
                server.server_close()


if __name__ == "__main__":
    unittest.main()
