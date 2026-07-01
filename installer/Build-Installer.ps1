param(
  [string]$OutputDir = (Join-Path (Split-Path -Parent $PSScriptRoot) "dist"),
  [string]$PackageName = "PZQPersonalWeb-Setup.exe"
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
$workRoot = Join-Path $env:TEMP "PZQPersonalWebInstallerBuild"
$payloadRoot = Join-Path $workRoot "payload"
$iexpressDir = Join-Path $workRoot "iexpress"
$zipPath = Join-Path $iexpressDir "app.zip"
$installScript = Join-Path $PSScriptRoot "Install-PZQPersonalWeb.ps1"
$sedPath = Join-Path $workRoot "package.sed"
$outputPath = Join-Path $OutputDir $PackageName
$tempOutputPath = Join-Path $workRoot $PackageName

if (Test-Path -LiteralPath $workRoot) {
  Remove-Item -LiteralPath $workRoot -Recurse -Force
}
New-Item -ItemType Directory -Force -Path $payloadRoot, $iexpressDir, $OutputDir | Out-Null

foreach ($dir in @("server", "static")) {
  Copy-Item -LiteralPath (Join-Path $repoRoot $dir) -Destination (Join-Path $payloadRoot $dir) -Recurse -Force
}

$machineCloudflaredConfig = Join-Path $payloadRoot "server\cloudflared-config.yml"
if (Test-Path -LiteralPath $machineCloudflaredConfig) {
  Remove-Item -LiteralPath $machineCloudflaredConfig -Force
}

$firmwareSource = Join-Path $repoRoot "firmware\esp32s3_wifi_portal\esp32s3_wifi_portal"
if (Test-Path -LiteralPath $firmwareSource) {
  $firmwareDest = Join-Path $payloadRoot "firmware\esp32s3_wifi_portal\esp32s3_wifi_portal"
  New-Item -ItemType Directory -Force -Path $firmwareDest | Out-Null
  Copy-Item -LiteralPath (Join-Path $firmwareSource "esp32s3_wifi_portal.ino") -Destination $firmwareDest -Force
}

$firmwareBin = Join-Path $repoRoot "firmware\esp32s3_wifi_portal\build\esp32s3_wifi_portal.ino.bin"
if (Test-Path -LiteralPath $firmwareBin) {
  $firmwareBuildDest = Join-Path $payloadRoot "firmware\esp32s3_wifi_portal\build"
  New-Item -ItemType Directory -Force -Path $firmwareBuildDest | Out-Null
  Copy-Item -LiteralPath $firmwareBin -Destination $firmwareBuildDest -Force
}

Compress-Archive -Path (Join-Path $payloadRoot "*") -DestinationPath $zipPath -Force
Copy-Item -LiteralPath $installScript -Destination (Join-Path $iexpressDir "Install-PZQPersonalWeb.ps1") -Force

$escapedOutput = $tempOutputPath.Replace("\", "\\")
$escapedInstall = (Join-Path $iexpressDir "Install-PZQPersonalWeb.ps1").Replace("\", "\\")
$escapedZip = $zipPath.Replace("\", "\\")
$sed = @"
[Version]
Class=IEXPRESS
SEDVersion=3
[Options]
PackagePurpose=InstallApp
ShowInstallProgramWindow=0
HideExtractAnimation=1
UseLongFileName=1
InsideCompressed=0
CAB_FixedSize=0
CAB_ResvCodeSigning=0
RebootMode=N
InstallPrompt=
DisplayLicense=
FinishMessage=Installation complete. Desktop shortcuts have been created.
TargetName=$escapedOutput
FriendlyName=PZQ Personal Web Installer
AppLaunched=powershell.exe -NoProfile -ExecutionPolicy Bypass -File Install-PZQPersonalWeb.ps1
PostInstallCmd=<None>
AdminQuietInstCmd=
UserQuietInstCmd=
SourceFiles=SourceFiles
[Strings]
FILE0=Install-PZQPersonalWeb.ps1
FILE1=app.zip
[SourceFiles]
SourceFiles0=$($iexpressDir.Replace("\", "\\"))
[SourceFiles0]
%FILE0%=
%FILE1%=
"@

Set-Content -LiteralPath $sedPath -Value $sed -Encoding ASCII
& iexpress.exe /N /Q $sedPath

for ($i = 0; $i -lt 120 -and -not (Test-Path -LiteralPath $tempOutputPath); $i += 1) {
  Start-Sleep -Seconds 1
}

if (-not (Test-Path -LiteralPath $tempOutputPath)) {
  throw "Installer was not created: $tempOutputPath"
}

Copy-Item -LiteralPath $tempOutputPath -Destination $outputPath -Force
Write-Host "Installer created: $outputPath"
