# 3deco

Sitio estático de 3deco publicado en GitHub Pages. GitHub Pages no ejecuta el laminador; el cálculo desde un archivo STL se prepara como un servicio local separado, basado en OrcaSlicer.

## Portal administrador (prototipo)

`admin.html` es una maqueta de interfaz: el ingreso acepta cualquier texto, no autentica usuarios ni almacena credenciales, y la lista contiene pedidos y ganancias ficticios. No ingreses información real. GitHub Pages no puede mantener una cola privada; antes de usar este portal con clientes reales hace falta implementar un backend con autenticación y almacenamiento seguros.

## Probar el servicio de laminado local

Requiere Docker Desktop con contenedores Linux. OrcaSlicer 2.4.2 se descarga durante la construcción de la imagen y se verifica con SHA-256. El primer build puede tardar y descargar varios cientos de MB.

1. Exporta desde OrcaSlicer los perfiles de máquina y proceso para Ender 5 y CR-10, y los de filamento para PLA, PETG, ABS y TPU. El servicio no incluye perfiles genéricos: usa los perfiles que realmente estén configurados para evitar cotizaciones basadas en supuestos. Los archivos de perfiles quedan excluidos de Git.
2. Deja esos archivos localmente en `slicer-service/profiles/` con esta estructura:

   ```text
   slicer-service/profiles/
   ├── ender-5/
   │   ├── machine.json
   │   ├── process.json
   │   └── filaments/
   │       ├── pla.json
   │       ├── petg.json
   │       ├── abs.json
   │       └── tpu.json
   └── cr-10/
       ├── machine.json
       ├── process.json
       └── filaments/
           ├── pla.json
           ├── petg.json
           ├── abs.json
           └── tpu.json
   ```

3. En una terminal, desde la raíz del repositorio, ejecuta:

   ```powershell
   docker compose -f slicer-service\docker-compose.yml up --build
   ```

4. En otra terminal, sirve la página localmente:

   ```powershell
   py -m http.server 8000
   ```

5. Abre `http://localhost:8000/calculo.html`, selecciona el material y la impresora, carga un STL de hasta 50 MB y pulsa **Calcular desde STL**. OrcaSlicer devuelve el tiempo y filamento estimados; las dimensiones del STL se usan para el costo de empaque. Los archivos temporales se eliminan al terminar el cálculo.

El servicio solo escucha en el loopback del equipo, permite los orígenes locales y la página de GitHub Pages, limita el tamaño de STL, el tiempo de laminado y la concurrencia. CORS no reemplaza autenticación: no se debe exponer este servicio a Internet tal cual. Antes de usar una URL pública habrá que elegir hosting y añadir las protecciones apropiadas. La estimación depende de perfiles OrcaSlicer válidos y no reemplaza una cotización confirmada.
