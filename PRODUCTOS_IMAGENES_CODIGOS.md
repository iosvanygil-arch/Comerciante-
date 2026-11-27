# Catálogo visual y códigos

Cada artículo tiene campos de fotografía, descripción, categoría, SKU interno, código de barras, contenido QR, costo, precio, existencia y stock mínimo.

- Fotografía: captura con cámara o selección desde galería; JPG, PNG, WEBP o GIF, máximo 8 MB.
- QR: se genera a partir del contenido guardado; valor predeterminado `COMERCIANTE:<SKU>`.
- Código de barras: generación Code 128; el valor se puede introducir o tomar del SKU. Para EAN-13/EAN-8 se debe validar longitud y dígito de control antes de añadir el generador específico.
- Escaneo: QR, EAN, UPC y Code128 si el navegador soporta `BarcodeDetector`. Android requiere permiso de cámara y contexto seguro (HTTPS o localhost). Si no está disponible, usar lector USB/Bluetooth o entrada manual.
- La edición conserva el ID y no permite cambiar el SKU una vez creado, para no romper referencias de movimientos.
- Las fotos se guardan en IndexedDB y se incluyen en el respaldo JSON.

Pendiente: pruebas de impresión física y lectura con varios modelos de teléfonos y lectores.
