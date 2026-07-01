@echo off
setlocal

set "ROOT=%~dp0"
set "CONFIG=%ROOT%cloudflared-config.yml"

where cloudflared >nul 2>nul
if errorlevel 1 (
  echo cloudflared is not on PATH.
  echo Install cloudflared first, then run this file again.
  pause
  exit /b 1
)

if not exist "%CONFIG%" (
  echo Config file not found: "%CONFIG%"
  pause
  exit /b 1
)

echo Starting Cloudflare tunnel...
echo Config: "%CONFIG%"
cloudflared tunnel --config "%CONFIG%" run

pause
