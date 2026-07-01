@echo off
setlocal

set "ROOT=%~dp0"
set "START_SCRIPT=%ROOT%server\Start-PersonalWeb.ps1"

if not exist "%START_SCRIPT%" (
  echo Start script not found: "%START_SCRIPT%"
  pause
  exit /b 1
)

echo Starting personal website server...
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%START_SCRIPT%"
pause
