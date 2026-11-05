# 3deco

Sitio estático de 3deco publicado en GitHub Pages. GitHub Pages no ejecuta el laminador; el cálculo desde un archivo STL se prepara como un servicio local separado, basado en OrcaSlicer.

## Nuevas iniciativas del sitio

La portada incluye espacios informativos para ideas de impresión 3D, propuestas de diseñadores, consultas de insumos, reparación de impresoras y recepción de material para posible reutilización o reciclaje. Los contactos se coordinan por WhatsApp; disponibilidad, servicios y recepción se confirman caso a caso.

La sección de ideas enlaza búsquedas en Thingiverse y Cults3D en vez de copiar archivos, imágenes o fichas de modelos. Cada diseño conserva los derechos de su autor: revisa la licencia y consigue permisos comerciales cuando corresponda. La convocatoria para diseñadores es solo una invitación a conversar, no una plataforma de carga, publicación o pago; esas funciones requieren un servicio de marketplace con backend.

Las cotizaciones para pedidos de impresión 3D informan que la producción comienza después de recibir el pago completo (100% por adelantado). Los datos de transferencia se solicitan directamente por WhatsApp; no se publican datos bancarios en el sitio.

## Portal administrador (prototipo)

`admin.html` es una maqueta de interfaz: el ingreso acepta cualquier texto, no autentica usuarios ni almacena credenciales, y la lista contiene pedidos y ganancias ficticios. Los pedidos de muestra se pueden clasificar en colas Ender 5, Creality CR-10 o empresa colaboradora; para estos últimos, la cotización externa y la comisión (20% inicial editable) calculan una comisión y un precio sugerido. Los cambios solo viven en memoria mientras la página está abierta. No ingreses información real. GitHub Pages no puede mantener una cola privada; antes de usar este portal con clientes reales hace falta implementar un backend con autenticación y almacenamiento seguros.

El panel también muestra estados ficticios para Ender 5 y CR-10 y permite simular la llegada de pedidos. Para pedidos nuevos, asigna una impresora marcada como disponible; si ambas están ocupadas o fuera de servicio, asigna la solicitud a la empresa colaboradora. Cambiar estados no mueve pedidos existentes. Esta regla no controla impresoras reales ni se conecta con la calculadora o un sistema de pagos.

## Futuro: pedidos pagados e impresión automatizada

La impresión automática en equipos físicos aún no está implementada. GitHub Pages no puede autenticar pagos, almacenar pedidos de forma privada ni enviar trabajos de impresión. Además, una transferencia solicitada por WhatsApp no notifica automáticamente al sitio que el pago se recibió; hasta integrar un proveedor con notificaciones verificables, esos pagos requieren conciliación manual.

La integración futura requiere:

1. Un backend privado para recibir cotizaciones/pedidos, guardar de forma segura el archivo, precio, impresora y estado, y autenticar al administrador.
2. Un proveedor de pago con notificación firmada del servidor (webhook). El backend debe validar firma, monto, moneda y pedido; procesar eventos idempotentemente y no confiar en que el navegador muestre una página de “pago exitoso”.
3. Un gestor de impresión compatible con los modelos y firmware reales. Mantenerlo en la red local protegida o conectarlo mediante un canal autenticado saliente; no publicar directamente la interfaz o API de la impresora en Internet.
4. Una revisión técnica del archivo y del trabajo antes de iniciar: perfil/material, volumen, tamaño del modelo, impresora disponible y estado de mantenimiento. Si ambas impresoras no están disponibles, derivar al colaborador o dejar el pedido pendiente de confirmación externa.
5. Empezar con pruebas simuladas y supervisadas, registro de trabajos y cancelación segura. Activar el inicio sin intervención solo después de comprobar el flujo con los equipos y perfiles reales.

Antes de programar esa integración habrá que elegir el proveedor de pago y confirmar el modelo, firmware y forma segura de administrar cada impresora. No guardes claves de pago ni acceso a los equipos en el sitio estático.

## Estadísticas de visitas

El sitio puede enviar métricas agregadas de la portada y la calculadora a Cloudflare Web Analytics. El administrador solo ofrece un acceso a los informes de Cloudflare: GitHub Pages no permite consultar una API privada de forma segura ni mostrar esas cifras dentro de esta página pública. El prototipo excluye su propia página de las mediciones.

Para activarlo, en [Cloudflare Web Analytics](https://dash.cloudflare.com/?to=/:account/web-analytics) agrega el hostname `thesculper.github.io` (sin la ruta `/3dec.o`), copia el token del sitio y pégalo en `analytics-config.js`. Es un token público de medición, no una credencial de cuenta. Tras publicar el cambio, las visitas aparecerán en los informes de Cloudflare; pueden tardar unos minutos. Mientras el token esté vacío, no se carga el beacon ni se registran visitas.

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
