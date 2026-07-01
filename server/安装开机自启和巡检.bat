@echo off
setlocal

set "ROOT=%~dp0"
set "START_SCRIPT=%ROOT%Start-PersonalWeb.ps1"
set "WATCHDOG_SCRIPT=%ROOT%Watchdog-PersonalWeb.ps1"
set "START_ACTION=powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File ""%START_SCRIPT%"""
set "WATCHDOG_ACTION=powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File ""%WATCHDOG_SCRIPT%"""

net session >nul 2>&1
if errorlevel 1 (
  powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
  exit /b
)

schtasks /Create /F /TN "PZQ Personal Web Startup" /SC ONSTART /DELAY 0000:30 /RU SYSTEM /RL HIGHEST /TR "%START_ACTION%"
schtasks /Create /F /TN "PZQ Personal Web Watchdog" /SC MINUTE /MO 1 /RU SYSTEM /RL HIGHEST /TR "%WATCHDOG_ACTION%"

echo Installed startup and 1-minute watchdog tasks.
pause
