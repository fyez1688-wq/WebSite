$ErrorActionPreference = "Stop"
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
New-Item -ItemType Directory -Force -Path "backups" | Out-Null
docker compose exec -T db pg_dump -U fy_user fy_site | Set-Content -Encoding UTF8 "backups/fy_site-$stamp.sql"
Write-Host "备份完成：backups/fy_site-$stamp.sql"
