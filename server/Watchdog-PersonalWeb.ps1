param(
  [int]$Port = 18080,
  [string]$PublicUrl = "https://pzq1688.com/"
)

$ErrorActionPreference = "SilentlyContinue"
$serverDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$rootDir = Split-Path -Parent $serverDir
$logDir = Join-Path $rootDir "dynamic\logs"
$startScript = Join-Path $serverDir "Start-PersonalWeb.ps1"
$forceRestartFlag = Join-Path $logDir "force-restart.flag"
$failureCountFile = Join-Path $logDir "watchdog-failure-count.txt"
$cloudflaredConfig = Join-Path $serverDir "cloudflared-config.yml"
$localCloudflaredConfig = Join-Path $serverDir "cloudflared-config.local.yml"
$restartFailureThreshold = 3

New-Item -ItemType Directory -Force -Path $logDir | Out-Null

function Write-Log([string]$Message) {
  $line = "{0} {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $Message
  try {
    Add-Content -LiteralPath (Join-Path $logDir "startup-watchdog.log") -Value $line
  } catch {
  }
}

function Get-FailureCount {
  try {
    if (Test-Path -LiteralPath $failureCountFile) {
      $value = Get-Content -LiteralPath $failureCountFile -Raw
      return [Math]::Max(0, [int]$value.Trim())
    }
  } catch {
  }
  return 0
}

function Set-FailureCount([int]$Count) {
  try {
    Set-Content -LiteralPath $failureCountFile -Value ([string][Math]::Max(0, $Count)) -Encoding UTF8
  } catch {
  }
}

function Clear-FailureCount {
  try {
    if (Test-Path -LiteralPath $failureCountFile) {
      Remove-Item -LiteralPath $failureCountFile -Force
    }
  } catch {
  }
}

function Ensure-OneMinuteSchedule {
  try {
    schtasks /Change /TN "PZQ Personal Web Watchdog" /RI 1 | Out-Null
  } catch {
  }
}

Ensure-OneMinuteSchedule

function Test-Internet {
  try {
    $response = Invoke-WebRequest -Uri "https://1.1.1.1/cdn-cgi/trace" -UseBasicParsing -TimeoutSec 8
    return $response.StatusCode -eq 200
  } catch {
    return $false
  }
}

function Test-Local {
  try {
    $response = Invoke-WebRequest -Uri "http://127.0.0.1:$Port/health" -UseBasicParsing -TimeoutSec 8
    return $response.StatusCode -eq 200
  } catch {
    return $false
  }
}

function Test-Public {
  try {
    $response = Invoke-WebRequest -Uri $PublicUrl -UseBasicParsing -TimeoutSec 15
    return $response.StatusCode -eq 200 -and $response.Content.Contains("ESP32")
  } catch {
    return $false
  }
}

function Stop-LocalListeners {
  try {
    $lines = netstat -ano | Select-String ":$Port"
    foreach ($line in $lines) {
      $parts = ($line.ToString().Trim() -split "\s+")
      if ($parts.Length -ge 5 -and $parts[1] -match ":$Port$" -and $parts[3] -eq "LISTENING") {
        Stop-Process -Id ([int]$parts[-1]) -Force
      }
    }
  } catch {
  }
}

if (Test-Path -LiteralPath $forceRestartFlag) {
  Remove-Item -LiteralPath $forceRestartFlag -Force
  Clear-FailureCount
  Write-Log "force restart requested"
  Stop-LocalListeners
  Get-Process cloudflared | Stop-Process -Force
  & powershell -NoProfile -ExecutionPolicy Bypass -File $startScript -Port $Port
  exit 0
}

if (-not (Test-Internet)) {
  Write-Log "internet unavailable, skip restart"
  exit 0
}

$localOk = Test-Local
$publicOk = Test-Public
$cloudflaredRunning = @(Get-Process -Name "cloudflared" -ErrorAction SilentlyContinue).Count -gt 0

if ($publicOk) {
  Clear-FailureCount
  Write-Log "check ok local=$localOk public=true"
  exit 0
}

if ($localOk -and -not $cloudflaredRunning) {
  if ((Test-Path -LiteralPath $localCloudflaredConfig) -or (Test-Path -LiteralPath $cloudflaredConfig)) {
    Clear-FailureCount
    Write-Log "local ok but tunnel not running, starting tunnel"
    & powershell -NoProfile -ExecutionPolicy Bypass -File $startScript -Port $Port
    exit 0
  }

  Clear-FailureCount
  Write-Log "check ok local=true public=false tunnel=not-configured"
  exit 0
}

$failureCount = (Get-FailureCount) + 1
Set-FailureCount $failureCount

if ($failureCount -lt $restartFailureThreshold) {
  Write-Log "check failed local=$localOk public=$publicOk count=$failureCount/$restartFailureThreshold, wait before restart"
  exit 0
}

Clear-FailureCount
Write-Log "check failed local=$localOk public=$publicOk count=$failureCount/$restartFailureThreshold, restarting personal web"
Get-Process cloudflared | Stop-Process -Force
& powershell -NoProfile -ExecutionPolicy Bypass -File $startScript -Port $Port
