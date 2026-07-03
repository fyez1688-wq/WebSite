param([Parameter(Mandatory=$true)][string]$File)
$ErrorActionPreference = "Stop"
Get-Content $File | docker compose exec -T db psql -U fy_user -d fy_site
Write-Host "恢复完成：$File"
