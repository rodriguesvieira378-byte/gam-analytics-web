@echo off
title GAM Analytics Web
echo.
echo ========================================
echo   GAM ANALYTICS WEB - MVP V0.1
echo ========================================
echo.
if not exist .env.local copy .env.example .env.local
echo Instalando dependencias...
call npm install
if errorlevel 1 (
  echo.
  echo Falha na instalacao. Confirme se o Node.js esta instalado e se ha internet.
  pause
  exit /b 1
)
echo.
echo Iniciando o sistema em http://localhost:3000
call npm run dev
pause
