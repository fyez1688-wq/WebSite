param(
  [int]$Port = 18080,
  [int]$HealthTimeoutSeconds = 60
)

$ErrorActionPreference = "Stop"
$serverDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$rootDir = Split-Path -Parent $serverDir
$logDir = Join-Path $rootDir "dynamic\logs"
$serverScript = Join-Path $serverDir "server.ps1"
$cloudflaredConfig = Join-Path $serverDir "cloudflared-config.yml"
$localCloudflaredConfig = Join-Path $serverDir "cloudflared-config.local.yml"
$serverOut = Join-Path $logDir "server.out.log"
$serverErr = Join-Path $logDir "server.err.log"
$cloudflaredOut = Join-Path $logDir "cloudflared.out.log"
$cloudflaredErr = Join-Path $logDir "cloudflared.err.log"
$startupLog = Join-Path $logDir "startup-watchdog.log"

$cloudflaredCandidates = @(
  (Join-Path $serverDir "cloudflared.exe"),
  (Join-Path $env:ProgramFiles "cloudflared\cloudflared.exe"),
  (Join-Path ${env:ProgramFiles(x86)} "cloudflared\cloudflared.exe")
)

$wingetCloudflaredRoot = Join-Path $env:LOCALAPPDATA "Microsoft\WinGet\Packages"
if (Test-Path -LiteralPath $wingetCloudflaredRoot) {
  $wingetCloudflared = Get-ChildItem -LiteralPath $wingetCloudflaredRoot -Directory -Filter "Cloudflare.cloudflared_*" -ErrorAction SilentlyContinue |
    ForEach-Object { Join-Path $_.FullName "cloudflared.exe" } |
    Where-Object { Test-Path -LiteralPath $_ } |
    Select-Object -First 1
  if ($wingetCloudflared) {
    $cloudflaredCandidates += $wingetCloudflared
  }
}

New-Item -ItemType Directory -Force -Path $logDir | Out-Null

function Write-Log([string]$Message) {
  $line = "{0} {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $Message
  try {
    Add-Content -LiteralPath $startupLog -Value $line
  } catch {
  }
}

function Test-LocalHealth {
  try {
    $response = Invoke-WebRequest -Uri "http://127.0.0.1:$Port/health" -UseBasicParsing -TimeoutSec 5
    return $response.StatusCode -eq 200
  } catch {
    return $false
  }
}

function Resolve-CloudflaredExe {
  foreach ($candidate in $cloudflaredCandidates) {
    if (-not [string]::IsNullOrWhiteSpace($candidate) -and (Test-Path -LiteralPath $candidate)) {
      return $candidate
    }
  }

  $cmd = Get-Command cloudflared -ErrorAction SilentlyContinue
  if ($null -ne $cmd -and -not [string]::IsNullOrWhiteSpace($cmd.Source)) {
    return $cmd.Source
  }

  return $null
}

function Start-DetachedProcess {
  param(
    [Parameter(Mandatory = $true)][string]$FilePath,
    [Parameter(Mandatory = $true)][string[]]$Arguments,
    [Parameter(Mandatory = $true)][string]$StdOut,
    [Parameter(Mandatory = $true)][string]$StdErr,
    [string]$WorkingDirectory = $serverDir
  )

  return Start-Process -FilePath $FilePath -ArgumentList $Arguments -WorkingDirectory $WorkingDirectory -WindowStyle Hidden -PassThru -RedirectStandardOutput $StdOut -RedirectStandardError $StdErr
}

function Wait-ForHealth {
  param([int]$Seconds = 60)

  $deadline = (Get-Date).AddSeconds($Seconds)
  while ((Get-Date) -lt $deadline) {
    if (Test-LocalHealth) {
      return $true
    }
    Start-Sleep -Seconds 2
  }

  return $false
}

Write-Log "startup requested"

$localHealthy = Test-LocalHealth
if (-not $localHealthy) {
  if (-not (Test-Path -LiteralPath $serverScript)) {
    Write-Log "server script missing: $serverScript"
    exit 1
  }

  Write-Log "local health check failed, starting server"
  Start-DetachedProcess -FilePath "powershell.exe" -Arguments @(
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-WindowStyle",
    "Hidden",
    "-File",
    $serverScript,
    "-Port",
    $Port
  ) -StdOut $serverOut -StdErr $serverErr | Out-Null

  if (Wait-ForHealth -Seconds $HealthTimeoutSeconds) {
    Write-Log "local server became healthy"
  } else {
    Write-Log "local server still unhealthy after $HealthTimeoutSeconds seconds"
  }
} else {
  Write-Log "local server already healthy"
}

$cloudflaredExe = Resolve-CloudflaredExe
if ($null -eq $cloudflaredExe) {
  Write-Log "cloudflared executable not found, local server only"
  Write-Log "startup complete"
  exit 0
}

$activeCloudflaredConfig = if (Test-Path -LiteralPath $localCloudflaredConfig) { $localCloudflaredConfig } else { $cloudflaredConfig }
$cloudflaredRunning = @(Get-Process -Name "cloudflared" -ErrorAction SilentlyContinue).Count -gt 0
if (-not $cloudflaredRunning) {
  if (-not (Test-Path -LiteralPath $activeCloudflaredConfig)) {
    Write-Log "cloudflared config missing, local server only"
    Write-Log "startup complete"
    exit 0
  }

  Write-Log "cloudflared not running, starting tunnel"
  Start-DetachedProcess -FilePath $cloudflaredExe -Arguments @(
    "tunnel",
    "--config",
    $activeCloudflaredConfig,
    "run"
  ) -StdOut $cloudflaredOut -StdErr $cloudflaredErr | Out-Null
} else {
  Write-Log "cloudflared already running"
}

Write-Log "startup complete"
