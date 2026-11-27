# COMERCIANTE — versión local reconstruida 0.3.1

Aplicación de gestión comercial y contable local, independiente de Floot.

## Funciones implementadas
- Catálogo con fotografía desde cámara/galería, edición, SKU, código de barras y contenido QR.
- Búsqueda por nombre, SKU, código de barras o QR.
- Generación local de QR y Code128.
- Persistencia local mediante IndexedDB y almacenamiento local.
- Registro de ventas, compras y gastos; control de existencias y caja.
- IPV diario, faltante/sobrante, balance de comprobación y cierre guardado.
- Exportación e importación de copia JSON con fotografías.
- Service worker para uso web sin conexión después de la primera carga.

## Preparación y pruebas
Requiere Node.js 20 o superior y conexión inicial para instalar dependencias.

```bash
npm install
npm test
npm run build
```

## Android (compilación remota)
El proyecto incluye `capacitor.config.json`. En un entorno con Android SDK: `npm install`, `npm run build`, `npx cap add android`, `npx cap sync android` y `cd android && ./gradlew assembleDebug`. El flujo de GitHub Actions incluido en el repositorio automatiza estos pasos y publica el APK debug como artefacto.

## Windows
`INICIAR_WINDOWS.bat` inicia la versión web local con Node.js. No es todavía un instalador EXE independiente.

## Estado verificado
- 16 pruebas automatizadas de contabilidad, inventario, edición y validaciones superadas en Node 22.16.0.
- `node --check src/app.js` superado.
- No se pudo instalar npm en el entorno de esta sesión por fallo DNS de `registry.npmjs.org`; por ello el build de producción y la APK aún deben confirmarse en GitHub Actions.
- No se han probado cámara, impresora, almacenamiento ni rendimiento en teléfono físico.
- Usuarios, roles, permisos, devoluciones y sincronización entre dispositivos siguen pendientes.
