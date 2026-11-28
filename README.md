# COMERCIANTE — aplicación local

Aplicación de gestión comercial y contable local, independiente de Floot.

## Funciones actuales
- Catálogo, fotografías, SKU, códigos de barras y QR.
- Ventas, compras, gastos, inventario y caja.
- IPV diario, balance de comprobación y cierres.
- Copias locales exportables e importables.
- Facturas y comprobantes imprimibles con condiciones de garantía.
- Control de perecederos por lote y alertas de vencimiento.
- Fichas de costo independientes.
- Respaldo completo exportable, restaurable y compartible por correo.
- Uso local sin conexión en las versiones instaladas.

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
El flujo `COMERCIANTE - construir Windows` genera dos entregables para Windows: instalador NSIS y ejecutable portable. Se construyen en GitHub Actions con Electron; descarga ambos desde **Actions → ejecución → Artifacts**. La primera compilación debe validarse antes de distribuirla. `INICIAR_WINDOWS.bat` permanece como opción de desarrollo con Node.js.

## Pendiente de validación y siguientes etapas
- Instalar y probar físicamente APK, cámara, lector, impresión y almacenamiento en Android.
- Instalar y probar los dos ejecutables Windows en un equipo real.
- Integrar la imagen de portada/logotipo definitivo en los iconos Android y Windows.
- Diseñar e implementar sincronización local por Wi-Fi entre equipos, con registro de cambios y resolución de conflictos. El correo electrónico es respaldo manual, no sincronización automática.
- Los perfiles multiusuario y permisos granulares todavía no están implementados.


## Ficha de costo independiente
- Calcula costo total por lote y costo unitario con transporte, manipulación, envases y otros costos.
- Sugiere precio de venta a partir del margen deseado sobre el precio.
- Guarda fichas separadas del libro contable y del inventario.
- Incluye las fichas en las copias de seguridad y su restauración.


## Respaldo por correo electrónico

En Copias de seguridad, «Compartir respaldo por correo» prepara el archivo JSON completo. En dispositivos que admiten compartir archivos, permite elegir una aplicación de correo y adjuntar el respaldo directamente. Si el navegador no admite adjuntos compartidos, descarga el archivo y abre un borrador de correo para adjuntarlo manualmente. COMERCIANTE no almacena contraseñas ni envía datos sin intervención del usuario. La restauración sigue siendo manual y reemplaza los datos locales tras confirmación.

La sincronización continua entre Android y Windows (Wi-Fi/Bluetooth) aún requiere un motor de sincronización con identificadores únicos, registro de cambios y resolución de conflictos; no se considera implementada por esta función de correo.
