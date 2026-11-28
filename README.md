# COMERCIANTE — aplicación local

Aplicación de gestión comercial y contable local, independiente de Floot.

## Funciones actuales
- Catálogo, fotografías, SKU, códigos de barras y QR.
- Ventas, compras, gastos, inventario y caja.
- IPV diario, balance de comprobación y cierres.
- Copias locales exportables e importables.
- Uso web sin conexión después de la primera carga.

## Desarrollo y pruebas
Requiere Node.js 20 o superior.

```bash
npm install
npm test
npm run build
```

## Android
La configuración de Capacitor está en `capacitor.config.ts`. El flujo de GitHub Actions ejecuta las pruebas, construye la aplicación web, genera el proyecto Android y publica el APK debug como artefacto descargable.

Abre la pestaña **Actions**, selecciona **COMERCIANTE - pruebas y APK Android** y consulta la ejecución. El APK aparece en **Artifacts** cuando todos los pasos terminan correctamente.

## Windows
`INICIAR_WINDOWS.bat` inicia la versión local con Node.js. Todavía no es un instalador EXE independiente.

## Pendiente de validación
La compilación automatizada debe terminar correctamente antes de considerar entregable el APK. Impresión, facturas con garantías, alertas de vencimiento, permisos multiusuario, sincronización entre dispositivos y pruebas físicas siguen pendientes de implementación o validación.


## Ficha de costo independiente
- Calcula costo total por lote y costo unitario con transporte, manipulación, envases y otros costos.
- Sugiere precio de venta a partir del margen deseado sobre el precio.
- Guarda fichas separadas del libro contable y del inventario.
- Incluye las fichas en las copias de seguridad y su restauración.


## Respaldo por correo electrónico

En Copias de seguridad, «Compartir respaldo por correo» prepara el archivo JSON completo. En dispositivos que admiten compartir archivos, permite elegir una aplicación de correo y adjuntar el respaldo directamente. Si el navegador no admite adjuntos compartidos, descarga el archivo y abre un borrador de correo para adjuntarlo manualmente. COMERCIANTE no almacena contraseñas ni envía datos sin intervención del usuario. La restauración sigue siendo manual y reemplaza los datos locales tras confirmación.

La sincronización continua entre Android y Windows (Wi-Fi/Bluetooth) aún requiere un motor de sincronización con identificadores únicos, registro de cambios y resolución de conflictos; no se considera implementada por esta función de correo.
