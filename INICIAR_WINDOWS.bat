@echo off
cd /d "%~dp0"
where node >nul 2>nul || (echo Instala Node.js 20 o superior y vuelve a ejecutar este archivo.& pause & exit /b 1)
if not exist node_modules (echo Instalando dependencias por primera vez...& npm install)
if errorlevel 1 (echo No se pudieron instalar las dependencias. Comprueba la conexion a internet.& pause & exit /b 1)
npm run dev
pause
