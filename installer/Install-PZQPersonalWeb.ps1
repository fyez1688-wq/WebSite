param(
  [string]$InstallRoot = (Join-Path $env:LOCALAPPDATA "PZQPersonalWeb")
)

$ErrorActionPreference = "Stop"
$packageDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$zipPath = Join-Path $packageDir "app.zip"

if (-not (Test-Path -LiteralPath $zipPath)) {
  throw "Package file not found: $zipPath"
}

New-Item -ItemType Directory -Force -Path $InstallRoot | Out-Null
Expand-Archive -LiteralPath $zipPath -DestinationPath $InstallRoot -Force

foreach ($dir in @(
  "dynamic",
  "dynamic\logs",
  "dynamic\uploads",
  "dynamic\esp32",
  "dynamic\storage",
  "dynamic\storage\users",
  "dynamic\database"
)) {
  New-Item -ItemType Directory -Force -Path (Join-Path $InstallRoot $dir) | Out-Null
}

$desktop = [Environment]::GetFolderPath("Desktop")
$shortcutPath = Join-Path $desktop "PZQ Server.lnk"
$startScript = Join-Path $InstallRoot "server\Start-PersonalWeb.ps1"

$shell = New-Object -ComObject WScript.Shell

function Save-ShortcutWithFallback($shortcut, [string]$preferredPath, [string]$fallbackPath) {
  try {
    $shortcut.Save()
    return $preferredPath
  } catch {
    $fallbackDir = Split-Path -Parent $fallbackPath
    New-Item -ItemType Directory -Force -Path $fallbackDir | Out-Null
    $fallback = $script:shell.CreateShortcut($fallbackPath)
    $fallback.TargetPath = $shortcut.TargetPath
    $fallback.Arguments = $shortcut.Arguments
    $fallback.WorkingDirectory = $shortcut.WorkingDirectory
    $fallback.IconLocation = $shortcut.IconLocation
    $fallback.Description = $shortcut.Description
    $fallback.Save()
    return $fallbackPath
  }
}

$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = "powershell.exe"
$shortcut.Arguments = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$startScript`""
$shortcut.WorkingDirectory = $InstallRoot
$shortcut.IconLocation = "$env:SystemRoot\System32\SHELL32.dll,13"
$shortcut.Description = "Start PZQ Personal Web local server"
$savedServerShortcut = Save-ShortcutWithFallback $shortcut $shortcutPath (Join-Path $InstallRoot "PZQ Server.lnk")

$urlShortcutPath = Join-Path $desktop "Open PZQ Website.lnk"
$urlShortcut = $shell.CreateShortcut($urlShortcutPath)
$urlShortcut.TargetPath = "http://127.0.0.1:18080/"
$urlShortcut.IconLocation = "$env:SystemRoot\System32\SHELL32.dll,14"
$urlShortcut.Description = "Open PZQ Personal Web local site"
$savedUrlShortcut = Save-ShortcutWithFallback $urlShortcut $urlShortcutPath (Join-Path $InstallRoot "Open PZQ Website.lnk")

$startMenuDir = Join-Path ([Environment]::GetFolderPath("Programs")) "PZQ Personal Web"
try {
  New-Item -ItemType Directory -Force -Path $startMenuDir | Out-Null
  Copy-Item -LiteralPath $savedServerShortcut -Destination (Join-Path $startMenuDir "PZQ Server.lnk") -Force
  Copy-Item -LiteralPath $savedUrlShortcut -Destination (Join-Path $startMenuDir "Open PZQ Website.lnk") -Force
} catch {
}

Write-Host "Installed to: $InstallRoot"
Write-Host "Server shortcut: $savedServerShortcut"
Write-Host "Open after starting: http://127.0.0.1:18080/"
