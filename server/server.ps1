param(
  [int]$Port = 18080,
  [string]$User = "admin",
  [string]$Password = "change-me",
  [string]$StoragePassword = "change-me",
  [string]$DeviceToken = "change-me-device-token"
)

$ErrorActionPreference = "Stop"
$prefix = "http://127.0.0.1:$Port/"
$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Any, $Port)
$sessionSecret = [Guid]::NewGuid().ToString("N")
$storageSecret = [Guid]::NewGuid().ToString("N")
$startedAt = Get-Date
$serverDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$websiteRoot = Split-Path -Parent $serverDir
$dataDir = Join-Path $websiteRoot "dynamic\uploads"
$espRoot = Join-Path $websiteRoot "dynamic\esp32"
$storageRoot = Join-Path $websiteRoot "dynamic\storage"
$storageUserRoot = Join-Path $storageRoot "users"
$storageAccountFile = Join-Path $storageRoot "accounts.json"
$siteDir = Join-Path $websiteRoot "static\homepage"
$imageDir = Join-Path $websiteRoot "static\images"
$songDir = Join-Path $websiteRoot "static\song"
$databaseDir = Join-Path $websiteRoot "dynamic\database"
$espAuthFile = Join-Path $espRoot "esp32-auth.json"
$espDeviceFile = Join-Path $espRoot "device-state.json"
$espCommandFile = Join-Path $espRoot "pending-command.txt"
$espWifiFile = Join-Path $espRoot "wifi-state.json"
$espPendingWifiFile = Join-Path $espRoot "pending-wifi.json"
$espDeviceTokenFile = Join-Path $espRoot "device-token.txt"
$logDir = Join-Path $websiteRoot "dynamic\logs"
$device = @{
  LastSeen = $null
  Ip = ""
  Rssi = ""
  Led = "unknown"
  Polls = 0
  Uptime = ""
  Heap = ""
  HeapTotal = ""
  Mac = ""
  Ssid = ""
  Route = ""
  HttpStatus = ""
}
$pendingCommand = "none"
$pendingWifi = @{
  Ssid = ""
  Password = ""
}
$firmwarePath = Join-Path $websiteRoot "firmware\esp32s3_wifi_portal\build\esp32s3_wifi_portal.ino.bin"
$firmwareVersion = "1"
$fileBytesCache = @{}
$songJsonCache = ""
$songJsonCacheUntil = Get-Date

foreach ($dir in @($websiteRoot, $dataDir, $espRoot, $storageRoot, $storageUserRoot, $siteDir, $imageDir, $songDir, $databaseDir, $logDir)) {
  if (-not (Test-Path $dir)) {
    New-Item -ItemType Directory -Path $dir -Force | Out-Null
  }
}

$oldEspAuthFile = Join-Path $databaseDir "esp32-auth.json"
if ((Test-Path -LiteralPath $oldEspAuthFile) -and -not (Test-Path -LiteralPath $espAuthFile)) {
  Move-Item -LiteralPath $oldEspAuthFile -Destination $espAuthFile -Force
}

function Load-EspAuth {
  if (-not (Test-Path -LiteralPath $espAuthFile)) { return }
  try {
    $auth = Get-Content -LiteralPath $espAuthFile -Raw | ConvertFrom-Json
    if (-not [string]::IsNullOrWhiteSpace($auth.user)) { $script:User = [string]$auth.user }
    if (-not [string]::IsNullOrWhiteSpace($auth.password)) { $script:Password = [string]$auth.password }
  } catch {
  }
}

function Save-EspAuth([string]$newUser, [string]$newPassword) {
  $auth = [pscustomobject]@{
    user = $newUser
    password = $newPassword
    updated = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
  }
  $auth | ConvertTo-Json | Set-Content -LiteralPath $espAuthFile -Encoding UTF8
}

Load-EspAuth

if (Test-Path -LiteralPath $espDeviceTokenFile) {
  try {
    $tokenFromFile = (Get-Content -LiteralPath $espDeviceTokenFile -Raw).Trim()
    if (-not [string]::IsNullOrWhiteSpace($tokenFromFile)) {
      $DeviceToken = $tokenFromFile
    }
  } catch {
  }
}

function Load-EspModuleData {
  if (Test-Path -LiteralPath $espDeviceFile) {
    try {
      $state = Get-Content -LiteralPath $espDeviceFile -Raw | ConvertFrom-Json
      $script:device.LastSeen = if ($state.LastSeen) { [datetime]$state.LastSeen } else { $null }
      $script:device.Ip = [string]$state.Ip
      $script:device.Rssi = [string]$state.Rssi
      $script:device.Led = [string]$state.Led
      $script:device.Polls = [int]$state.Polls
      $script:device.Uptime = [string]$state.Uptime
      $script:device.Heap = [string]$state.Heap
      $script:device.HeapTotal = [string]$state.HeapTotal
      $script:device.Mac = [string]$state.Mac
      $script:device.Ssid = [string]$state.Ssid
      $script:device.Route = [string]$state.Route
      $script:device.HttpStatus = [string]$state.HttpStatus
    } catch {
    }
  }
  if (Test-Path -LiteralPath $espCommandFile) {
    try {
      $cmd = (Get-Content -LiteralPath $espCommandFile -Raw).Trim()
      if ($cmd) { $script:pendingCommand = $cmd }
    } catch {
    }
  }
  if (Test-Path -LiteralPath $espPendingWifiFile) {
    try {
      $wifi = Get-Content -LiteralPath $espPendingWifiFile -Raw | ConvertFrom-Json
      $script:pendingWifi.Ssid = [string]$wifi.ssid
      $script:pendingWifi.Password = [string]$wifi.password
    } catch {
    }
  }
}

function Save-EspDeviceState {
  $state = [pscustomobject]@{
    LastSeen = if ($null -ne $device.LastSeen) { $device.LastSeen.ToString("o") } else { $null }
    Ip = $device.Ip
    Rssi = $device.Rssi
    Led = $device.Led
    Polls = $device.Polls
    Uptime = $device.Uptime
    Heap = $device.Heap
    HeapTotal = $device.HeapTotal
    Mac = $device.Mac
    Ssid = $device.Ssid
    Route = $device.Route
    HttpStatus = $device.HttpStatus
  }
  $state | ConvertTo-Json | Set-Content -LiteralPath $espDeviceFile -Encoding UTF8
}

function Save-EspPendingCommand {
  Set-Content -LiteralPath $espCommandFile -Value $script:pendingCommand -Encoding UTF8
}

function Save-EspPendingWifi {
  $wifi = [pscustomobject]@{
    ssid = $script:pendingWifi.Ssid
    password = $script:pendingWifi.Password
    updated = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
  }
  $wifi | ConvertTo-Json | Set-Content -LiteralPath $espPendingWifiFile -Encoding UTF8
}

function Save-EspWifiState([string]$networksJson, [string]$status) {
  $networks = @()
  if (-not [string]::IsNullOrWhiteSpace($networksJson)) {
    try {
      $parsed = $networksJson | ConvertFrom-Json
      foreach ($item in @($parsed)) {
        $networks += [pscustomobject]@{
          ssid = [string]$item.ssid
          rssi = [int]$item.rssi
          auth = [string]$item.auth
        }
      }
    } catch {
    }
  }
  $state = [pscustomobject]@{
    status = $status
    networks = $networks
    updated = (Get-Date).ToString("o")
  }
  $state | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $espWifiFile -Encoding UTF8
}

function Wifi-StateJson {
  if (Test-Path -LiteralPath $espWifiFile) {
    try {
      return (Get-Content -LiteralPath $espWifiFile -Raw)
    } catch {
    }
  }
  return '{"status":"idle","networks":[],"updated":null}'
}

Load-EspModuleData

function Read-Request($client) {
  $stream = $client.GetStream()
  $buffer = New-Object byte[] 65536
  $count = $stream.Read($buffer, 0, $buffer.Length)
  if ($count -le 0) { return $null }
  $raw = [System.Text.Encoding]::UTF8.GetString($buffer, 0, $count)
  while (-not $raw.Contains("`r`n`r`n")) {
    $nextCount = $stream.Read($buffer, 0, $buffer.Length)
    if ($nextCount -le 0) { break }
    $raw += [System.Text.Encoding]::UTF8.GetString($buffer, 0, $nextCount)
  }
  $parts = $raw -split "`r`n`r`n", 2
  $head = $parts[0]
  $body = if ($parts.Count -gt 1) { $parts[1] } else { "" }
  $lines = $head -split "`r`n"
  $requestLine = $lines[0] -split " "
  $headers = @{}
  for ($i = 1; $i -lt $lines.Count; $i++) {
    $headerParts = $lines[$i] -split ":", 2
    if ($headerParts.Count -eq 2) {
      $headers[$headerParts[0].Trim().ToLowerInvariant()] = $headerParts[1].Trim()
    }
  }
  if ($headers.ContainsKey("expect") -and $headers["expect"].ToLowerInvariant().Contains("100-continue")) {
    $continueBytes = [System.Text.Encoding]::ASCII.GetBytes("HTTP/1.1 100 Continue`r`n`r`n")
    $stream.Write($continueBytes, 0, $continueBytes.Length)
  }
  $contentLength = 0
  if ($headers.ContainsKey("content-length")) {
    [void][int]::TryParse($headers["content-length"], [ref]$contentLength)
  }
  while ([System.Text.Encoding]::UTF8.GetByteCount($body) -lt $contentLength) {
    $nextCount = $stream.Read($buffer, 0, $buffer.Length)
    if ($nextCount -le 0) { break }
    $body += [System.Text.Encoding]::UTF8.GetString($buffer, 0, $nextCount)
  }
  return @{
    Method = $requestLine[0]
    Target = $requestLine[1]
    Headers = $headers
    Body = $body
    Stream = $stream
  }
}

function Send-Response($stream, [int]$status, [string]$statusText, [string]$contentType, [string]$body, [string[]]$extraHeaders = @(), [bool]$includeBody = $true) {
  $bodyBytes = [System.Text.Encoding]::UTF8.GetBytes($body)
  $header = "HTTP/1.1 $status $statusText`r`n"
  $header += "Content-Type: $contentType; charset=utf-8`r`n"
  $header += "Content-Length: $($bodyBytes.Length)`r`n"
  $header += "Connection: close`r`n"
  foreach ($line in $extraHeaders) { $header += "$line`r`n" }
  $header += "`r`n"
  $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($header)
  $stream.Write($headerBytes, 0, $headerBytes.Length)
  if ($includeBody) {
    $stream.Write($bodyBytes, 0, $bodyBytes.Length)
  }
}

function Send-Bytes($stream, [int]$status, [string]$statusText, [string]$contentType, [byte[]]$bytes, [string[]]$extraHeaders = @(), [bool]$includeBody = $true) {
  $header = "HTTP/1.1 $status $statusText`r`n"
  $header += "Content-Type: $contentType`r`n"
  $header += "Content-Length: $($bytes.Length)`r`n"
  $header += "Connection: close`r`n"
  foreach ($line in $extraHeaders) { $header += "$line`r`n" }
  $header += "`r`n"
  $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($header)
  $stream.Write($headerBytes, 0, $headerBytes.Length)
  if ($includeBody) {
    $stream.Write($bytes, 0, $bytes.Length)
  }
}

function File-ETag([System.IO.FileInfo]$file) {
  return '"' + $file.Length + "-" + $file.LastWriteTimeUtc.Ticks + '"'
}

function File-LastModified([System.IO.FileInfo]$file) {
  return $file.LastWriteTimeUtc.ToString("R", [System.Globalization.CultureInfo]::InvariantCulture)
}

function Request-HasFreshFile([hashtable]$headers, [System.IO.FileInfo]$file) {
  if ($null -eq $headers) { return $false }
  $etag = File-ETag $file
  if ($headers.ContainsKey("if-none-match") -and $headers["if-none-match"] -eq $etag) {
    return $true
  }
  if ($headers.ContainsKey("if-modified-since")) {
    try {
      $since = [datetime]::Parse($headers["if-modified-since"], [System.Globalization.CultureInfo]::InvariantCulture).ToUniversalTime()
      return $file.LastWriteTimeUtc -le $since.AddSeconds(1)
    } catch {
    }
  }
  return $false
}

function Send-NotModified($stream, [System.IO.FileInfo]$file, [string]$cacheControl) {
  $header = "HTTP/1.1 304 Not Modified`r`n"
  $header += "Cache-Control: $cacheControl`r`n"
  $header += "ETag: $(File-ETag $file)`r`n"
  $header += "Last-Modified: $(File-LastModified $file)`r`n"
  $header += "Connection: close`r`n`r`n"
  $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($header)
  $stream.Write($headerBytes, 0, $headerBytes.Length)
}

function Send-FileStream($stream, [string]$path, [string]$contentType, [string]$rangeHeader = "", [bool]$includeBody = $true, [hashtable]$requestHeaders = $null, [string]$cacheControl = "public, max-age=86400") {
  $file = [System.IO.FileInfo]::new($path)
  if ([string]::IsNullOrWhiteSpace($rangeHeader) -and (Request-HasFreshFile $requestHeaders $file)) {
    Send-NotModified $stream $file $cacheControl
    return
  }
  $total = [int64]$file.Length
  $start = [int64]0
  $end = [int64]($total - 1)
  $status = 200
  $statusText = "OK"
  $extra = @("Cache-Control: $cacheControl", "ETag: $(File-ETag $file)", "Last-Modified: $(File-LastModified $file)", "Accept-Ranges: bytes")

  if (-not [string]::IsNullOrWhiteSpace($rangeHeader) -and $rangeHeader.StartsWith("bytes=")) {
    $range = $rangeHeader.Substring(6).Split(",")[0].Trim()
    $parts = $range.Split("-")
    if ($parts.Length -ge 1 -and $parts[0] -match "^\d+$") {
      $start = [int64]$parts[0]
    }
    if ($parts.Length -ge 2 -and $parts[1] -match "^\d+$") {
      $end = [int64]$parts[1]
    }
    if ($start -lt 0) { $start = 0 }
    if ($end -ge $total) { $end = $total - 1 }
    if ($start -le $end -and $start -lt $total) {
      $status = 206
      $statusText = "Partial Content"
      $extra += "Content-Range: bytes $start-$end/$total"
    } else {
      Send-Response $stream 416 "Range Not Satisfiable" "text/plain" "Invalid range" @("Content-Range: bytes */$total")
      return
    }
  }

  $length = [int64]($end - $start + 1)
  $header = "HTTP/1.1 $status $statusText`r`n"
  $header += "Content-Type: $contentType`r`n"
  $header += "Content-Length: $length`r`n"
  $header += "Connection: close`r`n"
  foreach ($line in $extra) { $header += "$line`r`n" }
  $header += "`r`n"
  $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($header)
  $stream.Write($headerBytes, 0, $headerBytes.Length)
  if (-not $includeBody) {
    return
  }

  $fs = [System.IO.File]::OpenRead($path)
  try {
    $fs.Seek($start, [System.IO.SeekOrigin]::Begin) | Out-Null
    $buffer = New-Object byte[] 65536
    $remaining = $length
    while ($remaining -gt 0) {
      $readSize = [int][Math]::Min($buffer.Length, $remaining)
      $read = $fs.Read($buffer, 0, $readSize)
      if ($read -le 0) { break }
      $stream.Write($buffer, 0, $read)
      $remaining -= $read
    }
  } finally {
    $fs.Close()
  }
}

function Redirect($stream, [string]$location, [string[]]$headers = @()) {
  Send-Response $stream 302 "Found" "text/plain" "" (@("Location: $location") + $headers)
}

function Is-LoggedIn($req) {
  return $req.Headers.ContainsKey("cookie") -and $req.Headers["cookie"].Contains("esp_session=$sessionSecret")
}

function Is-StorageUnlocked($req) {
  return $req.Headers.ContainsKey("cookie") -and $req.Headers["cookie"].Contains("storage_session=$storageSecret")
}

function Hash-Text([string]$value) {
  $sha = [System.Security.Cryptography.SHA256]::Create()
  try {
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($value)
    return [Convert]::ToBase64String($sha.ComputeHash($bytes))
  } finally {
    $sha.Dispose()
  }
}

function Load-StorageAccounts {
  if (-not (Test-Path -LiteralPath $storageAccountFile)) { return @{} }
  try {
    $raw = Get-Content -LiteralPath $storageAccountFile -Raw -ErrorAction Stop
    if ([string]::IsNullOrWhiteSpace($raw)) { return @{} }
    $obj = $raw | ConvertFrom-Json
    $accounts = @{}
    foreach ($prop in $obj.PSObject.Properties) {
      $accounts[$prop.Name] = $prop.Value
    }
    return $accounts
  } catch {
    return @{}
  }
}

function Save-StorageAccounts($accounts) {
  $accounts | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $storageAccountFile -Encoding UTF8
}

function Safe-StorageUser([string]$user) {
  if ([string]::IsNullOrWhiteSpace($user)) { return $null }
  $trimmed = $user.Trim()
  if ($trimmed.Length -lt 2 -or $trimmed.Length -gt 32) { return $null }
  if ($trimmed -notmatch "^[a-zA-Z0-9._-]+$") { return $null }
  return $trimmed
}

function New-StorageToken([string]$user) {
  return [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes("$user|$storageSecret"))
}

function Get-StorageUserFromRequest($req) {
  if (-not $req.Headers.ContainsKey("cookie")) { return $null }
  $cookie = $req.Headers["cookie"]
  $match = [regex]::Match($cookie, "storage_auth=([^;]+)")
  if (-not $match.Success) { return $null }
  try {
    $decoded = [System.Text.Encoding]::UTF8.GetString([Convert]::FromBase64String([System.Net.WebUtility]::UrlDecode($match.Groups[1].Value)))
    $parts = $decoded -split "\|", 2
    if ($parts.Count -ne 2 -or $parts[1] -ne $storageSecret) { return $null }
    return Safe-StorageUser $parts[0]
  } catch {
    return $null
  }
}

function Is-StorageLoggedIn($req) {
  return $null -ne (Get-StorageUserFromRequest $req)
}

function Read-Form([string]$raw) {
  $form = @{}
  foreach ($pair in $raw -split "&") {
    if (-not $pair) { continue }
    $parts = $pair -split "=", 2
    $key = [System.Net.WebUtility]::UrlDecode($parts[0])
    $value = if ($parts.Count -gt 1) { [System.Net.WebUtility]::UrlDecode($parts[1]) } else { "" }
    $form[$key] = $value
  }
  return $form
}

function JsonEscape([string]$value) {
  if ($null -eq $value) { return "" }
  return $value.Replace("\", "\\").Replace('"', '\"')
}

function Safe-FileName([string]$name) {
  if ([string]::IsNullOrWhiteSpace($name)) { return $null }
  $fileName = [System.IO.Path]::GetFileName($name)
  foreach ($bad in [System.IO.Path]::GetInvalidFileNameChars()) {
    $fileName = $fileName.Replace([string]$bad, "_")
  }
  if ([string]::IsNullOrWhiteSpace($fileName)) { return $null }
  return $fileName
}

function Storage-UserDir([string]$user) {
  $safeUser = Safe-StorageUser $user
  if ($null -eq $safeUser) { return $null }
  $dir = Join-Path $storageUserRoot $safeUser
  New-Item -ItemType Directory -Force -Path $dir | Out-Null
  return $dir
}

function Storage-Path([string]$user, [string]$name) {
  $userDir = Storage-UserDir $user
  if ($null -eq $userDir) { return $null }
  $safe = Safe-FileName $name
  if ($null -eq $safe) { return $null }
  return Join-Path $userDir $safe
}

function Ensure-UnderDataDir([string]$path) {
  if ([string]::IsNullOrWhiteSpace($path)) { return $false }
  $fullTarget = [System.IO.Path]::GetFullPath($path)
  $fullRoot = [System.IO.Path]::GetFullPath($dataDir)
  return $fullTarget.StartsWith($fullRoot, [System.StringComparison]::OrdinalIgnoreCase)
}

function Ensure-UnderDir([string]$path, [string]$root) {
  if ([string]::IsNullOrWhiteSpace($path) -or [string]::IsNullOrWhiteSpace($root)) { return $false }
  $fullTarget = [System.IO.Path]::GetFullPath($path)
  $fullRoot = [System.IO.Path]::GetFullPath($root)
  if (-not $fullRoot.EndsWith([System.IO.Path]::DirectorySeparatorChar)) {
    $fullRoot += [System.IO.Path]::DirectorySeparatorChar
  }
  return $fullTarget.StartsWith($fullRoot, [System.StringComparison]::OrdinalIgnoreCase)
}

function Content-Type-For([string]$name) {
  switch ([System.IO.Path]::GetExtension($name).ToLowerInvariant()) {
    ".html" { return "text/html" }
    ".htm" { return "text/html" }
    ".css" { return "text/css" }
    ".js" { return "application/javascript" }
    ".jpg" { return "image/jpeg" }
    ".jpeg" { return "image/jpeg" }
    ".png" { return "image/png" }
    ".gif" { return "image/gif" }
    ".webp" { return "image/webp" }
    ".svg" { return "image/svg+xml" }
    ".mp3" { return "audio/mpeg" }
    ".m4a" { return "audio/mp4" }
    ".aac" { return "audio/aac" }
    ".ogg" { return "audio/ogg" }
    ".wav" { return "audio/wav" }
    ".flac" { return "audio/flac" }
    ".txt" { return "text/plain" }
    ".json" { return "application/json" }
    ".pdf" { return "application/pdf" }
    default { return "application/octet-stream" }
  }
}

function Get-CachedFileBytes([string]$path) {
  $item = Get-Item -LiteralPath $path
  $key = $item.FullName.ToLowerInvariant()
  $stamp = $item.LastWriteTimeUtc.Ticks
  if ($script:fileBytesCache.ContainsKey($key)) {
    $cached = $script:fileBytesCache[$key]
    if ($cached.Stamp -eq $stamp -and $cached.Length -eq $item.Length) {
      return [byte[]]$cached.Bytes
    }
  }

  $bytes = [System.IO.File]::ReadAllBytes($item.FullName)
  $script:fileBytesCache[$key] = [pscustomobject]@{
    Stamp = $stamp
    Length = $item.Length
    Bytes = $bytes
  }
  return $bytes
}

function Send-SiteFile($stream, [string]$fileName, [bool]$includeBody = $true, [hashtable]$requestHeaders = $null) {
  $safeName = [System.IO.Path]::GetFileName($fileName)
  $target = Join-Path $siteDir $safeName
  if ((Test-Path $target) -and [System.IO.File]::Exists($target)) {
    $file = [System.IO.FileInfo]::new($target)
    $cacheControl = if ($safeName -eq "index.html") { "public, max-age=5, stale-while-revalidate=30" } else { "public, max-age=31536000, immutable" }
    if (Request-HasFreshFile $requestHeaders $file) {
      Send-NotModified $stream $file $cacheControl
      return
    }
    Send-Bytes $stream 200 "OK" (Content-Type-For $safeName) (Get-CachedFileBytes $target) @("Cache-Control: $cacheControl", "ETag: $(File-ETag $file)", "Last-Modified: $(File-LastModified $file)") $includeBody
  } else {
    Send-Response $stream 404 "Not Found" "text/plain" "Site file not found" @() $includeBody
  }
}

function Send-AssetFile($stream, [string]$root, [string]$encodedPath, [string]$rangeHeader = "", [bool]$includeBody = $true, [hashtable]$requestHeaders = $null) {
  $decoded = [System.Net.WebUtility]::UrlDecode($encodedPath).Replace("/", [System.IO.Path]::DirectorySeparatorChar)
  $relative = $decoded.TrimStart([System.IO.Path]::DirectorySeparatorChar)
  if ([string]::IsNullOrWhiteSpace($relative) -or $relative.Contains("..")) {
    Send-Response $stream 400 "Bad Request" "text/plain" "Bad asset path" @() $includeBody
    return
  }

  $target = Join-Path $root $relative
  if ((Ensure-UnderDir $target $root) -and (Test-Path $target) -and [System.IO.File]::Exists($target)) {
    $cacheControl = "public, max-age=31536000, immutable"
    Send-FileStream $stream $target (Content-Type-For $target) $rangeHeader $includeBody $requestHeaders $cacheControl
  } else {
    Send-Response $stream 404 "Not Found" "text/plain" "Asset not found" @("Cache-Control: no-store") $includeBody
  }
}

function Song-Json {
  if (-not [string]::IsNullOrWhiteSpace($script:songJsonCache) -and (Get-Date) -lt $script:songJsonCacheUntil) {
    return $script:songJsonCache
  }

  $allowed = @(".mp3", ".m4a", ".aac", ".ogg", ".wav", ".flac")
  $items = @()
  if (Test-Path $songDir) {
    foreach ($file in Get-ChildItem -Path $songDir -File | Where-Object { $allowed -contains $_.Extension.ToLowerInvariant() }) {
      $name = $file.Name
      $title = [System.IO.Path]::GetFileNameWithoutExtension($name) -replace "_", " "
      $url = "/song/" + [System.Uri]::EscapeDataString($name)
      $items += "{""name"":""$(JsonEscape $title)"",""file"":""$(JsonEscape $name)"",""url"":""$(JsonEscape $url)""}"
    }
  }
  $script:songJsonCache = "[" + ($items -join ",") + "]"
  $script:songJsonCacheUntil = (Get-Date).AddSeconds(30)
  return $script:songJsonCache
}

function Send-SongFile($stream, [string]$encodedName, [string]$rangeHeader = "") {
  $decoded = [System.Net.WebUtility]::UrlDecode($encodedName)
  $safeName = [System.IO.Path]::GetFileName($decoded)
  $target = Join-Path $songDir $safeName
  $allowed = @(".mp3", ".m4a", ".aac", ".ogg", ".wav", ".flac")
  if (($allowed -contains [System.IO.Path]::GetExtension($safeName).ToLowerInvariant()) -and (Test-Path $target) -and [System.IO.File]::Exists($target)) {
    Send-FileStream $stream $target (Content-Type-For $safeName) $rangeHeader
  } else {
    Send-Response $stream 404 "Not Found" "text/plain" "Song not found"
  }
}

function Storage-Json {
  param([string]$user, [string]$query = "")
  $userDir = Storage-UserDir $user
  if ($null -eq $userDir) { return "[]" }
  $items = @()
  if (Test-Path $userDir) {
    foreach ($file in Get-ChildItem -Path $userDir -File | Sort-Object LastWriteTime -Descending) {
      if (-not [string]::IsNullOrWhiteSpace($query)) {
        $matchName = $file.Name.IndexOf($query, [System.StringComparison]::OrdinalIgnoreCase) -ge 0
        if (-not $matchName) { continue }
      }
      $items += "{""name"":""$(JsonEscape $file.Name)"",""size"":$($file.Length),""modified"":""$($file.LastWriteTime.ToString("yyyy-MM-dd HH:mm:ss"))""}"
    }
  }
  return "[" + ($items -join ",") + "]"
}

function Old-Storage-Json {
  param([string]$query = "")
  $items = @()
  if (Test-Path $dataDir) {
    foreach ($file in Get-ChildItem -Path $dataDir -File | Sort-Object LastWriteTime -Descending) {
      if (-not [string]::IsNullOrWhiteSpace($query)) {
        $matchName = $file.Name.IndexOf($query, [System.StringComparison]::OrdinalIgnoreCase) -ge 0
        $matchText = $false
        if (-not $matchName -and $file.Length -lt 1048576) {
          $ext = [System.IO.Path]::GetExtension($file.Name).ToLowerInvariant()
          if ($ext -in @(".txt", ".json", ".csv", ".log", ".md", ".html", ".css", ".js", ".ino", ".xml")) {
            try {
              $content = Get-Content -LiteralPath $file.FullName -Raw -ErrorAction Stop
              $matchText = $content.IndexOf($query, [System.StringComparison]::OrdinalIgnoreCase) -ge 0
            } catch {
              $matchText = $false
            }
          }
        }
        if (-not ($matchName -or $matchText)) { continue }
      }
      $items += "{""name"":""$(JsonEscape $file.Name)"",""size"":$($file.Length),""modified"":""$($file.LastWriteTime.ToString("yyyy-MM-dd HH:mm:ss"))""}"
    }
  }
  return "[" + ($items -join ",") + "]"
}

function Storage-ReadText([string]$name) {
  $target = Storage-Path $name
  if ($null -eq $target -or -not (Test-Path $target)) { return $null }
  $ext = [System.IO.Path]::GetExtension($target).ToLowerInvariant()
  if ($ext -notin @(".txt", ".json", ".csv", ".log", ".md", ".html", ".css", ".js", ".ino", ".xml", ".yaml", ".yml")) {
    return $null
  }
  return Get-Content -LiteralPath $target -Raw -ErrorAction Stop
}

function Device-Json {
  $online = $false
  $age = -1
  if ($null -ne $device.LastSeen) {
    $age = [int]((Get-Date) - $device.LastSeen).TotalSeconds
    $online = $age -le 15
  }
  return "{""online"":$($online.ToString().ToLowerInvariant()),""age"":$age,""ip"":""$(JsonEscape $device.Ip)"",""rssi"":""$(JsonEscape $device.Rssi)"",""led"":""$(JsonEscape $device.Led)"",""polls"":$($device.Polls),""pending"":""$(JsonEscape $pendingCommand)"",""uptime"":""$(JsonEscape $device.Uptime)"",""heap"":""$(JsonEscape $device.Heap)"",""heapTotal"":""$(JsonEscape $device.HeapTotal)"",""mac"":""$(JsonEscape $device.Mac)"",""ssid"":""$(JsonEscape $device.Ssid)"",""route"":""$(JsonEscape $device.Route)"",""httpStatus"":""$(JsonEscape $device.HttpStatus)""}"
}

function Layout([string]$title, [string]$body) {
  return @"
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>$title</title>
  <style>
    :root { color-scheme: dark; --bg: #07080d; --panel: #151c2a; --panel-soft: #101622; --line: rgba(255,255,255,.13); --text: #f4f7fb; --muted: #a4adbb; --primary: #61d4ff; --secondary: #334155; --ok: #4ee2a8; --bad: #ff6b9c; }
    body { margin: 0; background: var(--bg); color: var(--text); font-family: Arial, sans-serif; }
    a { color: inherit; }
    form { margin: 0; }
    .center { min-height: 100vh; display: grid; place-items: center; padding: 16px; box-sizing: border-box; }
    .login { width: min(400px, 100%); background: var(--panel); border: 1px solid var(--line); border-radius: 8px; padding: 22px; box-sizing: border-box; box-shadow: 0 18px 42px rgba(0,0,0,.32); }
    .loginTop { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 18px; }
    .login h1 { margin: 0; font-size: 24px; }
    .login form { display: grid; gap: 12px; }
    label { display: grid; gap: 6px; font-size: 13px; color: var(--muted); }
    input { border: 1px solid var(--line); border-radius: 6px; font-size: 16px; padding: 10px 11px; background: #0b111c; color: var(--text); }
    button, .button { border: 0; border-radius: 6px; background: var(--primary); color: #fff; text-decoration: none; font-size: 15px; padding: 10px 13px; cursor: pointer; display: inline-block; line-height: 1.2; }
    .button.secondary, button.secondary { background: var(--secondary); }
    .button.ghost, button.ghost { background: #1f2937; color: var(--text); border: 1px solid var(--line); }
    .actions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 14px; }
    .moduleNav { display: flex; flex-wrap: wrap; gap: 8px; }
    .moduleNav button { background: #1f2937; color: var(--text); border: 1px solid var(--line); }
    .moduleNav button.active { background: var(--primary); color: #fff; border-color: var(--primary); }
    .module { display: none; }
    .module.active { display: grid; gap: 14px; }
    .error { color: var(--bad); font-size: 14px; margin: 0 0 12px; }
    header { background: var(--panel); border-bottom: 1px solid var(--line); position: sticky; top: 0; z-index: 2; }
    .bar, main { max-width: 1180px; margin: 0 auto; padding: 16px; box-sizing: border-box; }
    .bar { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
    .barActions { display: flex; align-items: center; gap: 10px; }
    h1 { margin: 0; font-size: 22px; }
    main { display: grid; gap: 14px; }
    .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
    section { background: var(--panel); border: 1px solid var(--line); border-radius: 8px; padding: 16px; }
    h2 { margin: 0 0 12px; font-size: 18px; }
    p { margin: 6px 0; line-height: 1.5; }
    .muted { color: var(--muted); }
    .kv { display: grid; gap: 8px; }
    .row { display: flex; justify-content: space-between; gap: 14px; align-items: baseline; border-bottom: 1px solid var(--line); padding: 7px 0; }
    .row:last-child { border-bottom: 0; }
    .row span:first-child { color: var(--muted); }
    code { background: #0b111c; border: 1px solid var(--line); border-radius: 4px; padding: 2px 5px; overflow-wrap: anywhere; }
    .pill { display: inline-flex; align-items: center; border-radius: 999px; padding: 3px 9px; font-size: 13px; background: #1f2937; color: var(--muted); }
    .pill.ok { background: rgba(78,226,168,.12); color: var(--ok); }
    .pill.bad { background: rgba(255,107,156,.13); color: var(--bad); }
    .storageSection { padding: 0; overflow: hidden; }
    .storageHeader { display: flex; justify-content: space-between; align-items: flex-start; gap: 14px; padding: 16px; border-bottom: 1px solid var(--line); }
    .storageHeader h2 { margin-bottom: 4px; }
    .storageTools { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
    .storageTools input[type=file] { max-width: 320px; }
    .storageToolbar { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 10px; padding: 12px 16px; border-bottom: 1px solid var(--line); background: var(--panel-soft); }
    .storageSearch { min-width: min(320px, 100%); }
    .storageShell { display: grid; grid-template-columns: 180px minmax(0, 1fr) 320px; min-height: 560px; }
    .storageSidebar { border-right: 1px solid var(--line); background: var(--panel-soft); padding: 12px; }
    .storageNavItem { display: flex; justify-content: space-between; align-items: center; gap: 8px; width: 100%; padding: 10px 11px; border-radius: 7px; color: var(--muted); box-sizing: border-box; }
    .storageNavItem.active { background: rgba(97,212,255,.12); color: var(--primary); font-weight: 700; }
    .storageMain { min-width: 0; overflow-x: auto; }
    .storageListHeader { display: grid; grid-template-columns: 34px minmax(180px, 1.8fr) 110px 168px 260px; gap: 10px; align-items: center; padding: 10px 14px; border-bottom: 1px solid var(--line); color: var(--muted); font-size: 13px; background: var(--panel); }
    .message { min-height: 22px; color: var(--muted); }
    .fileList { display: grid; }
    .fileRow { display: grid; grid-template-columns: 34px minmax(180px, 1.8fr) 110px 168px 260px; gap: 10px; align-items: center; border-bottom: 1px solid var(--line); padding: 10px 14px; min-height: 54px; }
    .fileRow:hover { background: rgba(97,212,255,.08); }
    .fileActions { display: flex; flex-wrap: wrap; gap: 6px; justify-content: flex-end; }
    .fileActions button, .fileActions .button { padding: 7px 9px; font-size: 13px; }
    .fileRow:last-child { border-bottom: 0; }
    .fileName { overflow-wrap: anywhere; font-weight: 700; }
    .fileMeta { color: var(--muted); font-size: 13px; }
    #networkPanel { border: 1px solid rgba(97,212,255,.16); border-radius: 12px; background: linear-gradient(145deg, rgba(8,13,24,.96), rgba(15,23,42,.9)); padding: 14px; box-shadow: inset 0 1px 0 rgba(255,255,255,.05); }
    #networkPanel .row { border-bottom-color: rgba(97,212,255,.18); }
    #wifiList { gap: 8px; margin-top: 4px; }
    #wifiList .fileRow { grid-template-columns: minmax(120px, 1.4fr) 86px 112px auto; border: 1px solid rgba(148,163,184,.18); border-radius: 10px; background: rgba(2,6,23,.72); color: var(--text); text-align: left; width: 100%; box-sizing: border-box; }
    #wifiList .fileRow:hover { background: rgba(14,165,233,.14); border-color: rgba(97,212,255,.42); }
    #wifiList .wifiNetwork { cursor: pointer; }
    #wifiList .wifiNetwork span:first-child { font-weight: 800; overflow-wrap: anywhere; }
    #wifiList .wifiNetwork span:nth-child(2) { color: var(--ok); font-family: Consolas, monospace; }
    #wifiList .wifiNetwork span:nth-child(3) { color: var(--muted); }
    #wifiList .wifiNetwork span:last-child { justify-self: end; border-radius: 999px; background: rgba(97,212,255,.13); color: var(--primary); padding: 5px 10px; font-size: 12px; font-weight: 700; }
    #wifiConnectForm { gap: 10px; border: 1px solid rgba(97,212,255,.16); border-radius: 10px; background: rgba(2,6,23,.62); padding: 12px; }
    #wifiConnectForm label { display: grid; gap: 6px; color: var(--muted); }
    #wifiConnectForm input { background: #050914; border: 1px solid rgba(148,163,184,.28); color: var(--text); }
    #wifiMessage { color: var(--primary); }
    .storageDetail { border-left: 1px solid var(--line); background: var(--panel); padding: 14px; min-width: 0; }
    .storageDetail h2 { font-size: 16px; }
    .editorBar { display: grid; grid-template-columns: minmax(0, 1fr) auto auto; gap: 8px; margin-top: 12px; }
    .previewBox { margin-top: 12px; border: 1px solid var(--line); border-radius: 8px; background: var(--panel-soft); min-height: 160px; overflow: hidden; }
    .previewBox.empty { display: grid; place-items: center; color: var(--muted); }
    .previewBox img { display: block; max-width: 100%; max-height: 520px; margin: 0 auto; }
    .previewBox iframe { width: 100%; height: 560px; border: 0; display: block; }
    .previewBox pre { margin: 0; padding: 14px; white-space: pre-wrap; overflow-wrap: anywhere; max-height: 520px; overflow: auto; font-family: Consolas, monospace; font-size: 13px; }
    @media (max-width: 980px) { .storageShell { grid-template-columns: 1fr; } .storageSidebar { display: none; } .storageDetail { border-left: 0; border-top: 1px solid var(--line); } .storageListHeader { display: none; } .fileRow { grid-template-columns: 28px minmax(0, 1fr); align-items: start; } #wifiList .fileRow { grid-template-columns: minmax(0, 1fr) auto; } #wifiList .wifiNetwork span:nth-child(3) { display: none; } #wifiList .wifiNetwork span:last-child { grid-column: 2; } .fileSizeCell, .fileTimeCell { display: none; } .fileActions { grid-column: 2; justify-content: flex-start; flex-wrap: wrap; } }
    @media (max-width: 720px) { .grid { grid-template-columns: 1fr; } .bar { align-items: flex-start; flex-direction: column; } .barActions { width: 100%; justify-content: space-between; } .storageHeader { flex-direction: column; } .storageToolbar { align-items: stretch; } .storageTools, .storageTools button, .storageTools .button, .storageTools input { width: 100%; box-sizing: border-box; } .editorBar { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
$body
<script>
  const translations = {
    en: {
      appTitle: 'ESP32-S3 Remote Home',
      moduleEsp32: 'ESP32',
      moduleStorage: 'Storage',
      loginTitle: 'ESP32-S3 Login',
      username: 'Username',
      password: 'Password',
      login: 'Log in',
      logout: 'Log out',
      loginError: 'Incorrect username or password.',
      serverStatus: 'Server Status',
      host: 'Host',
      hostValue: 'laptop',
      localUrl: 'Local URL',
      uptime: 'Uptime',
      seconds: 'seconds',
      deviceStatus: 'Device Status',
      online: 'Online',
      deviceIp: 'Device IP',
      wifiRssi: 'WiFi RSSI',
      gpioState: 'GPIO state',
      lastSeen: 'Last seen',
      pollCount: 'Poll count',
      deviceUptime: 'Device uptime',
      freeHeap: 'Free memory',
      macAddress: 'MAC address',
      wifiSsid: 'WiFi SSID',
      reportRoute: 'Report path',
      httpStatus: 'HTTP status',
      otaUpdate: 'OTA Update',
      restartDevice: 'Restart ESP32',
      toggleHelp: 'Toggle means switch GPIO to the opposite state.',
      restarting: 'Restarting',
      countdownSuffix: 'seconds',
      routeLocal: 'Local network',
      routePublic: 'Public tunnel',
      storageTitle: 'Storage',
      storageHint: 'Uploaded files are saved in Website Data / dynamic / uploads.',
      storageOpenPassword: 'Open password',
      storageUnlocked: 'Unlocked',
      unlockFailed: 'Wrong password.',
      unlockStorage: 'Unlock',
      storageLocked: 'Locked',
      allFiles: 'All files',
      desktopFolder: 'Uploads folder',
      searchFiles: 'Search files',
      chooseFile: 'Choose file',
      uploadFile: 'Upload',
      refreshFiles: 'Refresh',
      fileName: 'File name',
      fileSize: 'Size',
      fileModified: 'Modified',
      editFile: 'Edit',
      renameFile: 'Rename',
      deleteSelected: 'Delete selected',
      saveFile: 'Save',
      saveDone: 'Saved.',
      renameDone: 'Renamed.',
      deleteSelectedDone: 'Selected files deleted.',
      selectFilesFirst: 'Select files first.',
      download: 'Download',
      preview: 'Preview',
      previewTitle: 'Preview',
      noPreview: 'Preview is not available for this file type.',
      deleteFile: 'Delete',
      confirmDelete: 'Confirm delete',
      deleteCountdown: 'Confirm in',
      noFiles: 'No files yet.',
      uploadDone: 'Upload complete.',
      uploadFailed: 'Upload failed.',
      deleteDone: 'Deleted.',
      gpioOn: 'GPIO On',
      gpioOff: 'GPIO Off',
      toggle: 'Toggle',
      checking: 'checking...',
      yes: 'yes',
      no: 'no',
      never: 'never',
      secondsAgo: 'seconds ago'
    },
    zh: {
      appTitle: '\u0045\u0053\u0050\u0033\u0032\u002d\u0053\u0033 \u8fdc\u7a0b\u4e3b\u9875',
      moduleEsp32: '\u0045\u0053\u0050\u0033\u0032',
      moduleStorage: '\u5b58\u50a8',
      loginTitle: '\u0045\u0053\u0050\u0033\u0032\u002d\u0053\u0033 \u767b\u5f55',
      username: '\u7528\u6237\u540d',
      password: '\u5bc6\u7801',
      login: '\u767b\u5f55',
      logout: '\u9000\u51fa',
      loginError: '\u7528\u6237\u540d\u6216\u5bc6\u7801\u4e0d\u6b63\u786e\u3002',
      serverStatus: '\u670d\u52a1\u5668\u72b6\u6001',
      host: '\u4e3b\u673a',
      hostValue: '\u7b14\u8bb0\u672c\u7535\u8111',
      localUrl: '\u672c\u5730\u5730\u5740',
      uptime: '\u8fd0\u884c\u65f6\u95f4',
      seconds: '\u79d2',
      deviceStatus: '\u8bbe\u5907\u72b6\u6001',
      online: '\u5728\u7ebf',
      deviceIp: '\u8bbe\u5907\u0049\u0050',
      wifiRssi: '\u0057\u0069\u0046\u0069 \u4fe1\u53f7',
      gpioState: '\u0047\u0050\u0049\u004f \u72b6\u6001',
      lastSeen: '\u6700\u540e\u4e0a\u62a5',
      pollCount: '\u8f6e\u8be2\u6b21\u6570',
      deviceUptime: '\u8bbe\u5907\u8fd0\u884c\u65f6\u95f4',
      freeHeap: '\u5269\u4f59\u5185\u5b58',
      macAddress: '\u004d\u0041\u0043 \u5730\u5740',
      wifiSsid: '\u0057\u0069\u0046\u0069 \u540d\u79f0',
      reportRoute: '\u4e0a\u62a5\u901a\u9053',
      httpStatus: '\u0048\u0054\u0054\u0050 \u72b6\u6001',
      otaUpdate: '\u004f\u0054\u0041 \u66f4\u65b0',
      restartDevice: '\u91cd\u542f \u0045\u0053\u0050\u0033\u0032',
      toggleHelp: '\u5207\u6362\u8868\u793a\u628a\u0047\u0050\u0049\u004f\u5207\u5230\u76f8\u53cd\u72b6\u6001\u3002',
      restarting: '\u6b63\u5728\u91cd\u542f',
      countdownSuffix: '\u79d2',
      routeLocal: '\u5c40\u57df\u7f51',
      routePublic: '\u516c\u7f51\u96a7\u9053',
      storageTitle: '\u5b58\u50a8',
      storageHint: '\u4e0a\u4f20\u6587\u4ef6\u4f1a\u4fdd\u5b58\u5230\u7f51\u7ad9\u6570\u636e / dynamic / uploads\u3002',
      storageOpenPassword: '\u6253\u5f00\u5bc6\u7801',
      storageUnlocked: '\u5df2\u89e3\u9501',
      unlockFailed: '\u5bc6\u7801\u9519\u8bef\u3002',
      unlockStorage: '\u89e3\u9501',
      storageLocked: '\u672a\u89e3\u9501',
      allFiles: '\u5168\u90e8\u6587\u4ef6',
      desktopFolder: '\u4e0a\u4f20\u6587\u4ef6\u5939',
      searchFiles: '\u641c\u7d22\u6587\u4ef6',
      chooseFile: '\u9009\u62e9\u6587\u4ef6',
      uploadFile: '\u4e0a\u4f20',
      refreshFiles: '\u5237\u65b0',
      fileName: '\u6587\u4ef6\u540d',
      fileSize: '\u5927\u5c0f',
      fileModified: '\u4fee\u6539\u65f6\u95f4',
      editFile: '\u7f16\u8f91',
      renameFile: '\u91cd\u547d\u540d',
      deleteSelected: '\u5220\u9664\u9009\u4e2d',
      saveFile: '\u4fdd\u5b58',
      saveDone: '\u5df2\u4fdd\u5b58\u3002',
      renameDone: '\u5df2\u91cd\u547d\u540d\u3002',
      deleteSelectedDone: '\u5df2\u5220\u9664\u6240\u9009\u6587\u4ef6\u3002',
      selectFilesFirst: '\u8bf7\u5148\u9009\u62e9\u6587\u4ef6\u3002',
      download: '\u4e0b\u8f7d',
      preview: '\u9884\u89c8',
      previewTitle: '\u9884\u89c8',
      noPreview: '\u6b64\u6587\u4ef6\u7c7b\u578b\u4e0d\u652f\u6301\u9884\u89c8\u3002',
      deleteFile: '\u5220\u9664',
      confirmDelete: '\u786e\u8ba4\u5220\u9664',
      deleteCountdown: '\u5012\u8ba1\u65f6',
      noFiles: '\u6682\u65e0\u6587\u4ef6\u3002',
      uploadDone: '\u4e0a\u4f20\u5b8c\u6210\u3002',
      uploadFailed: '\u4e0a\u4f20\u5931\u8d25\u3002',
      deleteDone: '\u5df2\u5220\u9664\u3002',
      gpioOn: '\u0047\u0050\u0049\u004f \u6253\u5f00',
      gpioOff: '\u0047\u0050\u0049\u004f \u5173\u95ed',
      toggle: '\u5207\u6362',
      checking: '\u6b63\u5728\u68c0\u67e5...',
      yes: '\u662f',
      no: '\u5426',
      never: '\u4ece\u672a',
      secondsAgo: '\u79d2\u524d'
    }
  };
  function currentLang() {
    const saved = localStorage.getItem('uiLang');
    return saved === 'zh' ? 'zh' : 'en';
  }
  function t(key) {
    const lang = currentLang();
    return (translations[lang] && translations[lang][key]) || translations.en[key] || key;
  }
  function setLang(lang) {
    localStorage.setItem('uiLang', lang === 'zh' ? 'zh' : 'en');
    applyLang();
  }
  function applyLang() {
    const lang = currentLang();
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
    document.querySelectorAll('[data-i18n]').forEach(function(el) {
      el.textContent = t(el.getAttribute('data-i18n'));
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(function(el) {
      el.setAttribute('placeholder', t(el.getAttribute('data-i18n-placeholder')));
    });
    if (window.latestDeviceState) renderDevice(window.latestDeviceState);
  }
  document.addEventListener('DOMContentLoaded', applyLang);
</script>
</body>
</html>
"@
}

function Login-Page([bool]$badLogin) {
  $error = if ($badLogin) { '<p class="error" data-i18n="loginError">Incorrect username or password.</p>' } else { '' }
  $body = @"
  <div class="center">
    <main class="login">
      <div class="loginTop">
        <h1 data-i18n="loginTitle">ESP32-S3 Login</h1>
      </div>
      $error
      <form method="post" action="/login">
        <label><span data-i18n="username">Username</span><input name="user" autocomplete="username" required></label>
        <label><span data-i18n="password">Password</span><input name="password" type="password" autocomplete="current-password" required></label>
        <button type="submit" data-i18n="login">Log in</button>
      </form>
    </main>
  </div>
"@
  return Layout "ESP32-S3 Login" $body
}

function Storage-AuthPage {
  param(
    [string]$mode,
    [string]$message = ""
  )
  $isRegister = $mode -eq "register"
  $title = if ($isRegister) { "Storage Register" } else { "Storage Login" }
  $heading = if ($isRegister) { "Register Storage Account" } else { "Storage Login" }
  $action = if ($isRegister) { "/storage/register" } else { "/storage/login" }
  $switchHref = if ($isRegister) { "/storage/login" } else { "/storage/register" }
  $switchText = if ($isRegister) { "Already have an account" } else { "Create an account" }
  $msg = if ([string]::IsNullOrWhiteSpace($message)) { "" } else { '<p class="error">' + $message + '</p>' }
  $body = @"
  <div class="center">
    <main class="login">
      <div class="loginTop"><h1>$heading</h1></div>
      $msg
      <form method="post" action="$action">
        <label><span>Account</span><input name="user" autocomplete="username" required></label>
        <label><span>Password</span><input name="password" type="password" autocomplete="current-password" required></label>
        <button type="submit">$heading</button>
      </form>
      <div class="actions">
        <a class="button ghost" href="$switchHref">$switchText</a>
        <a class="button ghost" href="/">Back Home</a>
      </div>
    </main>
  </div>
"@
  return Layout $title $body
}

function Storage-Page {
  param([string]$user)
  $safeUser = Safe-StorageUser $user
  $body = @"
  <header>
    <div class="bar">
      <h1>Storage Module</h1>
      <div class="barActions">
        <span class="pill">Account: $safeUser</span>
        <a class="button ghost" href="/">Home</a>
        <a class="button ghost" href="/main">ESP32</a>
        <a class="button ghost" href="/storage/logout">Log out</a>
      </div>
    </div>
  </header>
  <main>
    <section class="storageSection">
      <div class="storageHeader">
        <div>
          <h2>My Files</h2>
          <p class="muted">Files are isolated per account under dynamic/storage/users/$safeUser.</p>
        </div>
      </div>
      <div class="storageToolbar">
        <div class="storageTools">
          <input id="uploadInput" type="file" multiple>
          <button type="button" onclick="uploadSelectedFiles()">Upload</button>
          <button type="button" class="secondary" onclick="deleteSelectedFiles()">Delete selected</button>
          <button type="button" class="ghost" onclick="loadFiles()">Refresh</button>
        </div>
        <input id="storageSearch" class="storageSearch" type="search" placeholder="Search files">
      </div>
      <div class="storageMain">
        <div class="storageListHeader">
          <input id="selectAllFiles" type="checkbox" onclick="toggleAllFiles(this.checked)">
          <span>File name</span>
          <span>Size</span>
          <span>Modified</span>
          <span></span>
        </div>
        <div id="fileList" class="fileList"></div>
        <p id="storageMessage" class="message"></p>
      </div>
    </section>
  </main>
  <script>
    let storageSearchTimer = null;
    function formatSize(bytes) {
      const n = Number(bytes) || 0;
      if (n >= 1048576) return (n / 1048576).toFixed(1) + ' MB';
      if (n >= 1024) return (n / 1024).toFixed(1) + ' KB';
      return n + ' B';
    }
    function setStorageMessage(text) {
      const el = document.getElementById('storageMessage');
      if (el) el.textContent = text || '';
    }
    function extensionOf(name) {
      const i = name.lastIndexOf('.');
      return i >= 0 ? name.substring(i).toLowerCase() : 'file';
    }
    function readFileAsBase64(file) {
      return new Promise(function(resolve, reject) {
        const reader = new FileReader();
        reader.onload = function() {
          const dataUrl = String(reader.result || '');
          const comma = dataUrl.indexOf(',');
          resolve(comma >= 0 ? dataUrl.substring(comma + 1) : dataUrl);
        };
        reader.onerror = function() { reject(reader.error || new Error('read failed')); };
        reader.readAsDataURL(file);
      });
    }
    function getSelectedNames() {
      return Array.from(document.querySelectorAll('.storage-check:checked')).map(function(el) {
        return el.getAttribute('data-name') || '';
      }).filter(Boolean);
    }
    function toggleAllFiles(checked) {
      document.querySelectorAll('.storage-check').forEach(function(el) {
        el.checked = checked;
      });
    }
    async function uploadSelectedFiles() {
      const input = document.getElementById('uploadInput');
      const files = input && input.files ? Array.from(input.files) : [];
      if (!files.length) {
        setStorageMessage('Select files first.');
        return;
      }
      setStorageMessage('');
      for (const file of files) {
        const base64 = await readFileAsBase64(file);
        const res = await fetch('/api/storage/upload', {
          method: 'POST',
          body: new URLSearchParams({ name: file.name, data: base64 })
        });
        if (!res.ok) {
          setStorageMessage('Upload failed: ' + file.name);
          return;
        }
      }
      input.value = '';
      setStorageMessage('Upload complete.');
      await loadFiles();
    }
    async function renameFile(name) {
      const nextName = prompt('New file name', name);
      if (!nextName || nextName.trim() === name) return;
      const res = await fetch('/api/storage/rename', {
        method: 'POST',
        body: new URLSearchParams({ oldName: name, newName: nextName.trim() })
      });
      setStorageMessage(res.ok ? 'Renamed.' : 'Rename failed.');
      await loadFiles();
    }
    async function deleteFile(name) {
      if (!confirm('Delete ' + name + '?')) return;
      await fetch('/api/storage/delete', {
        method: 'POST',
        body: new URLSearchParams({ name: name })
      });
      setStorageMessage('Deleted.');
      await loadFiles();
    }
    async function deleteSelectedFiles() {
      const names = getSelectedNames();
      if (!names.length) {
        setStorageMessage('Select files first.');
        return;
      }
      if (!confirm('Delete ' + names.length + ' selected file(s)?')) return;
      for (const name of names) {
        await fetch('/api/storage/delete', {
          method: 'POST',
          body: new URLSearchParams({ name: name })
        });
      }
      setStorageMessage('Selected files deleted.');
      await loadFiles();
    }
    async function loadFiles() {
      const list = document.getElementById('fileList');
      const query = document.getElementById('storageSearch').value.trim();
      const res = await fetch('/api/storage/list?q=' + encodeURIComponent(query));
      if (res.status === 401) {
        location.href = '/storage/login';
        return;
      }
      if (!res.ok) {
        setStorageMessage('Failed to load files.');
        return;
      }
      const files = await res.json();
      document.getElementById('selectAllFiles').checked = false;
      list.innerHTML = '';
      if (!files.length) {
        const empty = document.createElement('p');
        empty.className = 'muted';
        empty.textContent = 'No files yet.';
        list.appendChild(empty);
        return;
      }
      files.forEach(function(file) {
        const row = document.createElement('div');
        row.className = 'fileRow';
        const check = document.createElement('input');
        check.type = 'checkbox';
        check.className = 'storage-check';
        check.setAttribute('data-name', file.name);
        const info = document.createElement('div');
        info.innerHTML = '<div class="fileName"></div><div class="fileMeta"></div>';
        info.children[0].textContent = file.name;
        info.children[1].textContent = extensionOf(file.name);
        const size = document.createElement('div');
        size.className = 'fileSizeCell fileMeta';
        size.textContent = formatSize(file.size);
        const modified = document.createElement('div');
        modified.className = 'fileTimeCell fileMeta';
        modified.textContent = file.modified;
        const actions = document.createElement('div');
        actions.className = 'fileActions';
        const download = document.createElement('a');
        download.className = 'button ghost';
        download.href = '/storage/download?name=' + encodeURIComponent(file.name);
        download.textContent = 'Download';
        const rename = document.createElement('button');
        rename.type = 'button';
        rename.className = 'ghost';
        rename.textContent = 'Rename';
        rename.onclick = function() { renameFile(file.name); };
        const del = document.createElement('button');
        del.type = 'button';
        del.className = 'secondary';
        del.textContent = 'Delete';
        del.onclick = function() { deleteFile(file.name); };
        actions.appendChild(download);
        actions.appendChild(rename);
        actions.appendChild(del);
        row.appendChild(check);
        row.appendChild(info);
        row.appendChild(size);
        row.appendChild(modified);
        row.appendChild(actions);
        list.appendChild(row);
      });
    }
    document.getElementById('storageSearch').addEventListener('input', function() {
      clearTimeout(storageSearchTimer);
      storageSearchTimer = setTimeout(loadFiles, 250);
    });
    document.addEventListener('DOMContentLoaded', loadFiles);
  </script>
"@
  return Layout "Storage" $body
}

function Main-Page {
  $uptime = [int]((Get-Date) - $startedAt).TotalSeconds
  $body = @"
  <header>
    <div class="bar">
      <h1 data-i18n="appTitle">ESP32-S3 Remote Home</h1>
    </div>
  </header>
  <main>
    <div id="module-esp32" class="module active">
      <div>
        <section>
          <h2 data-i18n="deviceStatus">Device Status</h2>
          <div class="kv">
            <div class="row"><span data-i18n="online">Online</span><strong id="online" class="pill">checking...</strong></div>
            <div class="row"><span data-i18n="deviceIp">Device IP</span><code id="deviceIp">-</code></div>
            <div class="row"><span data-i18n="wifiRssi">WiFi RSSI</span><code id="rssi">-</code></div>
            <div class="row"><span data-i18n="gpioState">GPIO state</span><code id="led">-</code></div>
            <div class="row"><span data-i18n="lastSeen">Last seen</span><code id="lastSeen">-</code></div>
            <div class="row"><span data-i18n="pollCount">Poll count</span><code id="polls">-</code></div>
            <div class="row"><span data-i18n="deviceUptime">Device uptime</span><code id="deviceUptime">-</code></div>
            <div class="row"><span data-i18n="freeHeap">Free memory</span><code id="freeHeap">-</code></div>
            <div class="row"><span data-i18n="macAddress">MAC address</span><code id="macAddress">-</code></div>
            <div class="row"><span data-i18n="wifiSsid">WiFi SSID</span><code id="wifiSsid">-</code></div>
            <div class="row"><span data-i18n="reportRoute">Report path</span><code id="reportRoute">-</code></div>
            <div class="row"><span data-i18n="httpStatus">HTTP status</span><code id="httpStatus">-</code></div>
          </div>
          <div class="actions">
            <form method="post" action="/command"><input type="hidden" name="cmd" value="on"><button type="submit" data-i18n="gpioOn">GPIO On</button></form>
            <form method="post" action="/command"><input type="hidden" name="cmd" value="off"><button type="submit" class="secondary" data-i18n="gpioOff">GPIO Off</button></form>
            <form method="post" action="/command"><input type="hidden" name="cmd" value="ota"><button type="submit" class="ghost" data-i18n="otaUpdate">OTA Update</button></form>
            <form id="restartForm" method="post" action="/command"><input type="hidden" name="cmd" value="restart"><button id="restartBtn" type="submit" class="secondary" data-i18n="restartDevice">Restart ESP32</button></form>
            <button id="networkOpen" type="button" class="ghost">Network</button>
            <button id="accountEditOpen" type="button" class="ghost">Account settings</button>
          </div>
          <p id="restartStatus" class="muted"></p>
          <div id="networkPanel" class="kv" style="display:none;margin-top:12px;">
            <div class="row"><span>WiFi scan</span><button id="wifiScanBtn" type="button" class="ghost">Refresh networks</button></div>
            <div id="wifiList" class="fileList"></div>
            <form id="wifiConnectForm" method="post" action="/api/device/wifi/connect" style="display:none;">
              <label><span>SSID</span><input id="wifiSsidInput" name="ssid" readonly required></label>
              <label><span>Password</span><input id="wifiPasswordInput" name="password" type="password" autocomplete="current-password"></label>
              <button type="submit">Connect</button>
            </form>
            <p id="wifiMessage" class="muted"></p>
          </div>
          <form id="accountForm" method="post" action="/account" class="kv" style="display:none;margin-top:12px;">
            <label><span>Current password</span><input name="oldPassword" type="text" autocomplete="current-password" value="$Password" required></label>
            <label><span>New username</span><input name="newUser" autocomplete="username" value="$User" required></label>
            <label><span>New password</span><input name="newPassword" type="password" autocomplete="new-password" required></label>
            <button type="submit">Update account</button>
          </form>
          <p id="accountMessage" class="muted"></p>
        </section>
      </div>
    </div>
    <div id="module-storage" class="module">
      <section class="storageSection">
        <div class="storageHeader">
          <div>
            <h2 data-i18n="storageTitle">Storage</h2>
            <p class="muted" data-i18n="storageHint">Uploaded files are saved on the desktop in the website data folder.</p>
          </div>
          <span id="storageLockState" class="message"></span>
        </div>
        <div id="storageLockPanel" class="storageToolbar">
          <div class="storageTools">
            <input id="storagePassword" type="password" data-i18n-placeholder="storageOpenPassword" placeholder="Open password">
            <button type="button" onclick="unlockStorage()" data-i18n="unlockStorage">Unlock</button>
          </div>
        </div>
        <div id="storageUnlockedPanel" style="display:none;">
          <div class="storageToolbar">
            <div class="storageTools">
              <button type="button" onclick="uploadSelectedFiles()" data-i18n="uploadFile">Upload</button>
              <button type="button" class="secondary" onclick="deleteSelectedFiles()" data-i18n="deleteSelected">Delete selected</button>
              <button type="button" class="ghost" onclick="loadFiles()" data-i18n="refreshFiles">Refresh</button>
              <input id="uploadInput" type="file" multiple>
            </div>
            <input id="storageSearch" class="storageSearch" type="search" data-i18n-placeholder="searchFiles" placeholder="Search files">
          </div>
          <div class="storageShell">
            <aside class="storageSidebar">
              <div class="storageNavItem active"><span data-i18n="allFiles">All files</span><span id="storageFileCount">0</span></div>
              <div class="storageNavItem"><span data-i18n="desktopFolder">Desktop folder</span></div>
            </aside>
            <div class="storageMain">
              <div class="storageListHeader">
                <input id="selectAllFiles" type="checkbox" onclick="toggleAllFiles(this.checked)">
                <span data-i18n="fileName">File name</span>
                <span data-i18n="fileSize">Size</span>
                <span data-i18n="fileModified">Modified</span>
                <span></span>
              </div>
              <div id="fileList" class="fileList"></div>
              <p id="storageMessage" class="message"></p>
            </div>
            <aside class="storageDetail">
              <h2 data-i18n="previewTitle">Preview</h2>
              <div id="previewBox" class="previewBox empty"></div>
              <div class="editorBar">
                <input id="editorFileName" type="text" readonly>
                <button type="button" class="ghost" onclick="renameCurrentEditor()" data-i18n="renameFile">Rename</button>
                <button type="button" class="secondary" onclick="saveEditor()" data-i18n="saveFile">Save</button>
              </div>
              <textarea id="fileEditor" style="width:100%;min-height:220px;margin-top:8px;display:none;box-sizing:border-box;"></textarea>
            </aside>
          </div>
        </div>
      </section>
    </div>
  </main>
  <script>
    function showModule(name) {
      document.querySelectorAll('.module').forEach(function(el) {
        el.classList.toggle('active', el.id === 'module-' + name);
      });
      document.querySelectorAll('[data-module-tab]').forEach(function(el) {
        el.classList.toggle('active', el.getAttribute('data-module-tab') === name);
      });
      if (name === 'storage') loadFiles();
    }
    let storageUnlocked = false;
    let currentEditName = '';
    let storageSearchTimer = null;
    function formatSize(bytes) {
      const n = Number(bytes) || 0;
      if (n >= 1048576) return (n / 1048576).toFixed(1) + ' MB';
      if (n >= 1024) return (n / 1024).toFixed(1) + ' KB';
      return n + ' B';
    }
    function setStorageMessage(text) {
      const el = document.getElementById('storageMessage');
      if (el) el.textContent = text || '';
    }
    function setStorageLockState(text) {
      const el = document.getElementById('storageLockState');
      if (el) el.textContent = text || '';
    }
    function setStorageUnlocked(unlocked) {
      storageUnlocked = !!unlocked;
      const lockedPanel = document.getElementById('storageLockPanel');
      const openPanel = document.getElementById('storageUnlockedPanel');
      if (lockedPanel) lockedPanel.style.display = storageUnlocked ? 'none' : 'flex';
      if (openPanel) openPanel.style.display = storageUnlocked ? 'block' : 'none';
      setStorageLockState(storageUnlocked ? t('storageUnlocked') : t('storageLocked'));
    }
    function extensionOf(name) {
      const i = name.lastIndexOf('.');
      return i >= 0 ? name.substring(i).toLowerCase() : '';
    }
    function isTextExtension(ext) {
      return ['.txt', '.json', '.csv', '.log', '.md', '.html', '.css', '.js', '.ino', '.xml', '.ini', '.yml', '.yaml', '.py', '.c', '.cpp', '.h', '.hpp'].includes(ext);
    }
    function getStorageQuery() {
      const input = document.getElementById('storageSearch');
      return input ? input.value.trim() : '';
    }
    function readFileAsBase64(file) {
      return new Promise(function(resolve, reject) {
        const reader = new FileReader();
        reader.onload = function() {
          const dataUrl = String(reader.result || '');
          const comma = dataUrl.indexOf(',');
          resolve(comma >= 0 ? dataUrl.substring(comma + 1) : dataUrl);
        };
        reader.onerror = function() { reject(reader.error || new Error('read failed')); };
        reader.readAsDataURL(file);
      });
    }
    async function unlockStorage() {
      const input = document.getElementById('storagePassword');
      const password = input ? input.value : '';
      const res = await fetch('/api/storage/unlock', {
        method: 'POST',
        body: new URLSearchParams({ password: password })
      });
      if (res.ok) {
        if (input) input.value = '';
        setStorageUnlocked(true);
        setStorageMessage('');
        await loadFiles();
      } else {
        setStorageUnlocked(false);
        setStorageMessage(t('unlockFailed'));
      }
    }
    async function previewFile(name) {
      const box = document.getElementById('previewBox');
      if (!box) return;
      const ext = extensionOf(name);
      const url = '/storage/preview?name=' + encodeURIComponent(name);
      box.className = 'previewBox';
      box.innerHTML = '';
      if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.ico'].includes(ext)) {
        const img = document.createElement('img');
        img.src = url;
        img.alt = name;
        box.appendChild(img);
      } else if (isTextExtension(ext)) {
        const res = await fetch(url);
        const text = await res.text();
        const pre = document.createElement('pre');
        pre.textContent = text;
        box.appendChild(pre);
      } else if (ext === '.pdf') {
        const frame = document.createElement('iframe');
        frame.src = url;
        box.appendChild(frame);
      } else {
        box.className = 'previewBox empty';
        box.textContent = t('noPreview');
      }
    }
    async function editFile(name) {
      const res = await fetch('/api/storage/read?name=' + encodeURIComponent(name));
      if (!res.ok) {
        setStorageMessage(t('noPreview'));
        return;
      }
      const data = await res.json();
      currentEditName = data.name || name;
      const nameEl = document.getElementById('editorFileName');
      const editor = document.getElementById('fileEditor');
      if (nameEl) nameEl.value = currentEditName;
      if (editor) {
        editor.style.display = 'block';
        editor.value = data.content || '';
      }
      setStorageMessage('');
      await previewFile(currentEditName);
    }
    async function saveEditor() {
      const nameEl = document.getElementById('editorFileName');
      const editor = document.getElementById('fileEditor');
      const name = (nameEl && nameEl.value ? nameEl.value.trim() : currentEditName).trim();
      if (!name || !editor) return;
      const res = await fetch('/api/storage/save', {
        method: 'POST',
        body: new URLSearchParams({ name: name, content: editor.value })
      });
      if (res.ok) {
        currentEditName = name;
        setStorageMessage(t('saveDone'));
        await loadFiles();
      } else {
        setStorageMessage(t('uploadFailed'));
      }
    }
    async function renameCurrentEditor() {
      const nameEl = document.getElementById('editorFileName');
      const current = nameEl ? nameEl.value.trim() : currentEditName;
      if (!current) return;
      const nextName = prompt(t('renameFile'), current);
      if (!nextName || nextName.trim() === current) return;
      const res = await fetch('/api/storage/rename', {
        method: 'POST',
        body: new URLSearchParams({ oldName: current, newName: nextName.trim() })
      });
      if (res.ok) {
        currentEditName = nextName.trim();
        if (nameEl) nameEl.value = currentEditName;
        setStorageMessage(t('renameDone'));
        await loadFiles();
      } else {
        setStorageMessage(t('uploadFailed'));
      }
    }
    async function renameFile(name) {
      const nextName = prompt(t('renameFile'), name);
      if (!nextName || nextName.trim() === name) return;
      const res = await fetch('/api/storage/rename', {
        method: 'POST',
        body: new URLSearchParams({ oldName: name, newName: nextName.trim() })
      });
      if (res.ok) {
        setStorageMessage(t('renameDone'));
        if (currentEditName === name) {
          currentEditName = nextName.trim();
          const nameEl = document.getElementById('editorFileName');
          if (nameEl) nameEl.value = currentEditName;
        }
        await loadFiles();
      } else {
        setStorageMessage(t('uploadFailed'));
      }
    }
    function getSelectedNames() {
      return Array.from(document.querySelectorAll('.storage-check:checked')).map(function(el) {
        return el.getAttribute('data-name') || '';
      }).filter(Boolean);
    }
    function toggleAllFiles(checked) {
      document.querySelectorAll('.storage-check').forEach(function(el) {
        el.checked = checked;
      });
    }
    async function deleteSelectedFiles() {
      const names = getSelectedNames();
      if (!names.length) {
        setStorageMessage(t('selectFilesFirst'));
        return;
      }
      if (!confirm(t('confirmDelete') + '?')) return;
      for (const name of names) {
        await fetch('/api/storage/delete', {
          method: 'POST',
          body: new URLSearchParams({ name: name })
        });
      }
      setStorageMessage(t('deleteSelectedDone'));
      await loadFiles();
    }
    async function deleteFile(name) {
      if (!confirm(t('confirmDelete') + '?')) return;
      await fetch('/api/storage/delete', {
        method: 'POST',
        body: new URLSearchParams({ name: name })
      });
      setStorageMessage(t('deleteDone'));
      await loadFiles();
    }
    async function uploadSelectedFiles() {
      const input = document.getElementById('uploadInput');
      const files = input && input.files ? Array.from(input.files) : [];
      if (!files.length) {
        setStorageMessage(t('selectFilesFirst'));
        return;
      }
      setStorageMessage('');
      for (const file of files) {
        const base64 = await readFileAsBase64(file);
        const res = await fetch('/api/storage/upload', {
          method: 'POST',
          body: new URLSearchParams({ name: file.name, data: base64 })
        });
        if (!res.ok) {
          setStorageMessage(t('uploadFailed') + ' ' + file.name);
          return;
        }
      }
      if (input) input.value = '';
      setStorageMessage(t('uploadDone'));
      await loadFiles();
    }
    async function loadFiles() {
      const list = document.getElementById('fileList');
      if (!list) return;
      const query = getStorageQuery();
      let res;
      try {
        res = await fetch('/api/storage/list?q=' + encodeURIComponent(query));
      } catch (err) {
        setStorageUnlocked(false);
        setStorageMessage(t('storageLocked'));
        return;
      }
      if (res.status === 401) {
        setStorageUnlocked(false);
        setStorageMessage(t('storageLocked'));
        list.innerHTML = '';
        return;
      }
      if (!res.ok) {
        setStorageMessage(t('uploadFailed'));
        return;
      }
      setStorageUnlocked(true);
      const files = await res.json();
      const countEl = document.getElementById('storageFileCount');
      if (countEl) countEl.textContent = String(files.length);
      const selectAll = document.getElementById('selectAllFiles');
      if (selectAll) selectAll.checked = false;
      list.innerHTML = '';
      if (!files.length) {
        const empty = document.createElement('p');
        empty.className = 'muted';
        empty.textContent = t('noFiles');
        list.appendChild(empty);
        return;
      }
      files.forEach(function(file) {
        const row = document.createElement('div');
        row.className = 'fileRow';
        const check = document.createElement('input');
        check.type = 'checkbox';
        check.className = 'storage-check';
        check.setAttribute('data-name', file.name);
        const info = document.createElement('div');
        info.innerHTML = '<div class="fileName"></div><div class="fileMeta"></div>';
        info.children[0].textContent = file.name;
        info.children[1].textContent = extensionOf(file.name) || 'file';
        const size = document.createElement('div');
        size.className = 'fileSizeCell fileMeta';
        size.textContent = formatSize(file.size);
        const modified = document.createElement('div');
        modified.className = 'fileTimeCell fileMeta';
        modified.textContent = file.modified;
        const actions = document.createElement('div');
        actions.className = 'fileActions';
        const preview = document.createElement('button');
        preview.type = 'button';
        preview.className = 'ghost';
        preview.textContent = t('preview');
        preview.onclick = function() { previewFile(file.name); };
        const edit = document.createElement('button');
        edit.type = 'button';
        edit.className = 'ghost';
        edit.textContent = t('editFile');
        edit.onclick = function() { editFile(file.name); };
        const rename = document.createElement('button');
        rename.type = 'button';
        rename.className = 'ghost';
        rename.textContent = t('renameFile');
        rename.onclick = function() { renameFile(file.name); };
        const download = document.createElement('a');
        download.className = 'button ghost';
        download.href = '/storage/download?name=' + encodeURIComponent(file.name);
        download.textContent = t('download');
        const del = document.createElement('button');
        del.type = 'button';
        del.className = 'secondary';
        del.textContent = t('deleteFile');
        del.onclick = function() { deleteFile(file.name); };
        actions.appendChild(preview);
        if (isTextExtension(extensionOf(file.name))) actions.appendChild(edit);
        actions.appendChild(rename);
        actions.appendChild(download);
        actions.appendChild(del);
        row.appendChild(check);
        row.appendChild(info);
        row.appendChild(size);
        row.appendChild(modified);
        row.appendChild(actions);
        list.appendChild(row);
      });
      const editor = document.getElementById('fileEditor');
      if (editor && currentEditName) {
        const currentExists = files.some(function(file) { return file.name === currentEditName; });
        if (!currentExists) {
          currentEditName = '';
          const nameEl = document.getElementById('editorFileName');
          if (nameEl) nameEl.value = '';
          editor.style.display = 'none';
          editor.value = '';
        }
      }
    }
    const storageSearchInput = document.getElementById('storageSearch');
    if (storageSearchInput) {
      storageSearchInput.addEventListener('input', function() {
        clearTimeout(storageSearchTimer);
        storageSearchTimer = setTimeout(function() { loadFiles(); }, 250);
      });
      storageSearchInput.addEventListener('keydown', function(ev) {
        if (ev.key === 'Enter') {
          ev.preventDefault();
          loadFiles();
        }
      });
    }
    function renderDevice(data) {
      window.latestDeviceState = data;
      const onlineEl = document.getElementById('online');
      onlineEl.textContent = data.online ? t('yes') : t('no');
      onlineEl.classList.toggle('ok', !!data.online);
      onlineEl.classList.toggle('bad', !data.online);
      document.getElementById('deviceIp').textContent = data.ip || '-';
      document.getElementById('rssi').textContent = data.rssi ? data.rssi + ' dBm' : '-';
      document.getElementById('led').textContent = data.led || '-';
      document.getElementById('lastSeen').textContent = data.age >= 0 ? data.age + ' ' + t('secondsAgo') : t('never');
      document.getElementById('polls').textContent = data.polls;
      document.getElementById('deviceUptime').textContent = data.uptime ? data.uptime + ' ' + t('seconds') : '-';
      if (data.heap && data.heapTotal && Number(data.heapTotal) > 0) {
        const percent = Math.round(Number(data.heap) * 100 / Number(data.heapTotal));
        document.getElementById('freeHeap').textContent = percent + '%';
      } else {
        document.getElementById('freeHeap').textContent = data.heap ? data.heap + ' bytes' : '-';
      }
      document.getElementById('macAddress').textContent = data.mac || '-';
      document.getElementById('wifiSsid').textContent = data.ssid || '-';
      document.getElementById('reportRoute').textContent = data.route === 'local' ? t('routeLocal') : (data.route === 'public' ? t('routePublic') : (data.route || '-'));
      document.getElementById('httpStatus').textContent = data.httpStatus || '-';
    }
    async function refreshDevice() {
      const res = await fetch('/api/device/state');
      const data = await res.json();
      renderDevice(data);
    }
    refreshDevice();
    setInterval(refreshDevice, 3000);
    const restartForm = document.getElementById('restartForm');
    if (restartForm) {
      restartForm.addEventListener('submit', function() {
        let remain = 10;
        const status = document.getElementById('restartStatus');
        const btn = document.getElementById('restartBtn');
        btn.disabled = true;
        function tick() {
          status.textContent = t('restarting') + ': ' + remain + ' ' + t('countdownSuffix');
          remain -= 1;
          if (remain >= 0) {
            setTimeout(tick, 1000);
          } else {
            btn.disabled = false;
            status.textContent = '';
            refreshDevice();
          }
        }
        tick();
      });
    }
    const networkOpen = document.getElementById('networkOpen');
    const networkPanel = document.getElementById('networkPanel');
    const wifiScanBtn = document.getElementById('wifiScanBtn');
    const wifiList = document.getElementById('wifiList');
    const wifiForm = document.getElementById('wifiConnectForm');
    const wifiSsidInput = document.getElementById('wifiSsidInput');
    const wifiPasswordInput = document.getElementById('wifiPasswordInput');
    const wifiMessage = document.getElementById('wifiMessage');
    function setWifiMessage(text) {
      if (wifiMessage) wifiMessage.textContent = text;
    }
    function escapeHtml(value) {
      return String(value).replace(/[&<>"']/g, function(ch) {
        return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch];
      });
    }
    function renderWifiNetworks(state) {
      if (!wifiList) return;
      const networks = Array.isArray(state.networks) ? state.networks : [];
      if (!networks.length) {
        wifiList.innerHTML = '<div class="fileRow"><span>No networks yet.</span><span></span><span></span><span></span></div>';
        return;
      }
      wifiList.innerHTML = networks.map(function(item) {
        const ssid = item.ssid || '';
        return '<button type="button" class="fileRow wifiNetwork" data-ssid="' + escapeHtml(ssid) + '">' +
          '<span>' + escapeHtml(ssid || '(hidden)') + '</span>' +
          '<span>' + escapeHtml(String(item.rssi || '-')) + ' dBm</span>' +
          '<span>' + escapeHtml(item.auth || '-') + '</span>' +
          '<span>Connect</span>' +
          '</button>';
      }).join('');
      document.querySelectorAll('.wifiNetwork').forEach(function(btn) {
        btn.addEventListener('click', function() {
          wifiSsidInput.value = btn.getAttribute('data-ssid') || '';
          wifiPasswordInput.value = '';
          wifiForm.style.display = 'grid';
          setWifiMessage('Enter password and connect.');
          wifiPasswordInput.focus();
        });
      });
    }
    async function loadWifiState() {
      const res = await fetch('/api/device/wifi/state', { cache: 'no-store' });
      if (!res.ok) return null;
      const state = await res.json();
      renderWifiNetworks(state);
      if (state.status === 'connected') {
        if (networkPanel) networkPanel.style.display = 'none';
        setWifiMessage('');
        refreshDevice();
      } else if (state.status) {
        setWifiMessage(state.status.replace(/_/g, ' '));
      }
      return state;
    }
    async function requestWifiScan() {
      setWifiMessage('Scanning...');
      if (wifiScanBtn) wifiScanBtn.disabled = true;
      await fetch('/api/device/wifi/scan', { method: 'POST' });
      let attempts = 0;
      const timer = setInterval(async function() {
        attempts += 1;
        const state = await loadWifiState();
        if ((state && state.status === 'scan_ready') || attempts >= 8) {
          clearInterval(timer);
          if (wifiScanBtn) wifiScanBtn.disabled = false;
        }
      }, 1500);
    }
    if (networkOpen && networkPanel) {
      networkOpen.addEventListener('click', function() {
        networkPanel.style.display = networkPanel.style.display === 'none' ? 'grid' : 'none';
        if (accountForm) accountForm.style.display = 'none';
        if (networkPanel.style.display !== 'none') requestWifiScan();
      });
    }
    if (wifiScanBtn) {
      wifiScanBtn.addEventListener('click', requestWifiScan);
    }
    if (wifiForm) {
      wifiForm.addEventListener('submit', async function(event) {
        event.preventDefault();
        setWifiMessage('Connecting...');
        const res = await fetch('/api/device/wifi/connect', {
          method: 'POST',
          body: new URLSearchParams(new FormData(wifiForm))
        });
        if (!res.ok) {
          setWifiMessage('Connect request failed.');
          return;
        }
        let attempts = 0;
        const timer = setInterval(async function() {
          attempts += 1;
          const state = await loadWifiState();
          if ((state && state.status === 'connected') || attempts >= 12) {
            clearInterval(timer);
            if (state && state.status !== 'connected') setWifiMessage('Waiting for device result.');
          }
        }, 1500);
      });
    }
    const accountOpen = document.getElementById('accountEditOpen');
    const accountForm = document.getElementById('accountForm');
    const accountMessage = document.getElementById('accountMessage');
    if (accountOpen && accountForm) {
      accountOpen.addEventListener('click', function() {
        accountForm.style.display = accountForm.style.display === 'none' ? 'grid' : 'none';
        if (networkPanel) networkPanel.style.display = 'none';
        if (wifiForm) wifiForm.style.display = 'none';
        setWifiMessage('');
        if (accountMessage) accountMessage.textContent = '';
      });
      accountForm.addEventListener('submit', async function(event) {
        event.preventDefault();
        const res = await fetch('/account', {
          method: 'POST',
          body: new URLSearchParams(new FormData(accountForm))
        });
        if (res.ok) {
          accountForm.style.display = 'none';
          if (accountMessage) accountMessage.textContent = 'Account updated.';
        } else {
          if (accountMessage) accountMessage.textContent = 'Update failed.';
        }
      });
    }
  </script>
"@
  return Layout "ESP32-S3 Home" $body
}

$listener.Start()
Write-Host "Local server running at $prefix"
Write-Host "Login user: $User"
Write-Host "Login password: $Password"

try {
  while ($true) {
    $client = $listener.AcceptTcpClient()
    $client.ReceiveTimeout = 10000
    $client.SendTimeout = 10000
    try {
      $req = Read-Request $client
      if ($null -eq $req) { continue }
      $stream = $req.Stream
      $uri = [Uri]::new("http://local$($req.Target)")
      $path = $uri.AbsolutePath
      $isHead = $req.Method -eq "HEAD"
      $isGetOrHead = $req.Method -eq "GET" -or $isHead

      if ($path -eq "/" -and $isGetOrHead) {
        Send-SiteFile $stream "index.html" (-not $isHead) $req.Headers
      } elseif ($path.StartsWith("/assets/site/") -and $isGetOrHead) {
        $range = if ($req.Headers.ContainsKey("range")) { $req.Headers["range"] } else { "" }
        Send-AssetFile $stream $siteDir ($path.Substring(13)) $range (-not $isHead) $req.Headers
      } elseif ($path.StartsWith("/assets/images/") -and $isGetOrHead) {
        $range = if ($req.Headers.ContainsKey("range")) { $req.Headers["range"] } else { "" }
        Send-AssetFile $stream $imageDir ($path.Substring(15)) $range (-not $isHead) $req.Headers
      } elseif ($path -eq "/styles.css" -and $isGetOrHead) {
        Send-SiteFile $stream "styles.css" (-not $isHead) $req.Headers
      } elseif ($path -eq "/script.js" -and $isGetOrHead) {
        Send-SiteFile $stream "script.js" (-not $isHead) $req.Headers
      } elseif ($path -eq "/api/songs" -and $isGetOrHead) {
        Send-Response $stream 200 "OK" "application/json" (Song-Json) @("Cache-Control: public, max-age=30") (-not $isHead)
      } elseif ($path.StartsWith("/song/") -and $req.Method -eq "GET") {
        $range = if ($req.Headers.ContainsKey("range")) { $req.Headers["range"] } else { "" }
        Send-SongFile $stream ($path.Substring(6)) $range
      } elseif ($path -eq "/login" -and $req.Method -eq "GET") {
        Send-Response $stream 200 "OK" "text/html" (Login-Page ($uri.Query.Contains("error=1")))
      } elseif ($path -eq "/login" -and $req.Method -eq "POST") {
        Load-EspAuth
        $form = Read-Form $req.Body
        if ($form["user"] -eq $User -and $form["password"] -eq $Password) {
          Redirect $stream "/main" @("Set-Cookie: esp_session=$sessionSecret; Path=/; HttpOnly; SameSite=Lax")
        } else {
          Redirect $stream "/login?error=1"
        }
      } elseif ($path -eq "/api/login" -and $req.Method -eq "POST") {
        Load-EspAuth
        $form = Read-Form $req.Body
        if ($form["user"] -eq $User -and $form["password"] -eq $Password) {
          Send-Response $stream 200 "OK" "application/json" '{"ok":true}' @("Cache-Control: no-store", "Set-Cookie: esp_session=$sessionSecret; Path=/; HttpOnly; SameSite=Lax")
        } else {
          Send-Response $stream 401 "Unauthorized" "application/json" '{"ok":false,"error":"bad_login"}' @("Cache-Control: no-store")
        }
      } elseif ($path -eq "/logout") {
        Redirect $stream "/login" @("Set-Cookie: esp_session=; Path=/; Max-Age=0")
      } elseif ($path -eq "/account" -and $req.Method -eq "POST") {
        if (Is-LoggedIn $req) {
          $form = Read-Form $req.Body
          $newUser = [string]$form["newUser"]
          $newPassword = [string]$form["newPassword"]
          if ($form["oldPassword"] -eq $Password -and -not [string]::IsNullOrWhiteSpace($newUser) -and -not [string]::IsNullOrWhiteSpace($newPassword)) {
            $script:User = $newUser.Trim()
            $script:Password = $newPassword
            Save-EspAuth $script:User $script:Password
            Send-Response $stream 200 "OK" "application/json" '{"ok":true}' @("Cache-Control: no-store", "Set-Cookie: esp_session=$sessionSecret; Path=/; HttpOnly; SameSite=Lax")
          } else {
            Send-Response $stream 400 "Bad Request" "application/json" '{"error":"bad_account"}' @("Cache-Control: no-store")
          }
        } else {
          Send-Response $stream 401 "Unauthorized" "application/json" '{"error":"login_required"}' @("Cache-Control: no-store")
        }
      } elseif ($path -eq "/storage" -and $isGetOrHead) {
        $storageUser = Get-StorageUserFromRequest $req
        if ($null -ne $storageUser) {
          Send-Response $stream 200 "OK" "text/html" (Storage-Page $storageUser) @("Cache-Control: no-store") (-not $isHead)
        } else {
          Redirect $stream "/storage/login"
        }
      } elseif ($path -eq '/storage/login' -and $req.Method -eq 'GET') {
        $msg = if ($uri.Query.Contains('error=1')) { 'Invalid account or password.' } else { '' }
        $page = Storage-AuthPage -mode 'login' -message $msg
        Send-Response $stream 200 'OK' 'text/html' $page @('Cache-Control: no-store')
      } elseif ($path -eq '/storage/login' -and $req.Method -eq 'POST') {
        $form = Read-Form $req.Body
        $safeUser = Safe-StorageUser $form["user"]
        $storagePasswordInput = [string]$form["password"]
        $accounts = Load-StorageAccounts
        if ($null -ne $safeUser -and $accounts.ContainsKey($safeUser)) {
          $account = $accounts[$safeUser]
          $hashInput = [string]$account.salt + '|' + $storagePasswordInput
          $hash = Hash-Text $hashInput
          if ($hash -eq $account.hash) {
            $token = [System.Net.WebUtility]::UrlEncode((New-StorageToken $safeUser))
            Redirect $stream '/storage' @("Set-Cookie: storage_auth=$token; Path=/; HttpOnly; SameSite=Lax")
          } else {
            Redirect $stream '/storage/login?error=1'
          }
        } else {
          Redirect $stream '/storage/login?error=1'
        }
      } elseif ($path -eq '/storage/register' -and $req.Method -eq 'GET') {
        $msg = if ($uri.Query.Contains('exists=1')) { 'Account already exists.' } elseif ($uri.Query.Contains('bad=1')) { 'Use 2-32 letters, numbers, dot, underscore, or dash.' } else { '' }
        $page = Storage-AuthPage -mode 'register' -message $msg
        Send-Response $stream 200 'OK' 'text/html' $page @('Cache-Control: no-store')
      } elseif ($path -eq '/storage/register' -and $req.Method -eq 'POST') {
        $form = Read-Form $req.Body
        $safeUser = Safe-StorageUser $form["user"]
        $storagePasswordInput = [string]$form["password"]
        if ($null -eq $safeUser -or [string]::IsNullOrWhiteSpace($storagePasswordInput)) {
          Redirect $stream '/storage/register?bad=1'
        } else {
          $accounts = Load-StorageAccounts
          if ($accounts.ContainsKey($safeUser)) {
            Redirect $stream '/storage/register?exists=1'
          } else {
            $salt = [Guid]::NewGuid().ToString("N")
            $accounts[$safeUser] = [pscustomobject]@{
              salt = $salt
              hash = (Hash-Text ($salt + '|' + $storagePasswordInput))
              created = (Get-Date).ToString('yyyy-MM-dd HH:mm:ss')
            }
            Save-StorageAccounts $accounts
            [void](Storage-UserDir $safeUser)
            $token = [System.Net.WebUtility]::UrlEncode((New-StorageToken $safeUser))
            Redirect $stream '/storage' @("Set-Cookie: storage_auth=$token; Path=/; HttpOnly; SameSite=Lax")
          }
        }
      } elseif ($path -eq "/storage/logout") {
        Redirect $stream "/storage/login" @("Set-Cookie: storage_auth=; Path=/; Max-Age=0")
      } elseif ($path -eq "/command" -and $req.Method -eq "POST") {
        if (Is-LoggedIn $req) {
          $form = Read-Form $req.Body
          $cmd = $form["cmd"]
          if ($cmd -in @("on", "off", "ota", "restart", "wifi_scan")) {
            $script:pendingCommand = $cmd
            Save-EspPendingCommand
          }
          Redirect $stream "/main"
        } else {
          Redirect $stream "/login"
        }
      } elseif ($path -eq "/main") {
        if (Is-LoggedIn $req) {
          Send-Response $stream 200 "OK" "text/html" (Main-Page)
        } else {
          Redirect $stream "/login"
        }
      } elseif ($path -eq "/api/public/device/state") {
        Send-Response $stream 200 "OK" "application/json" (Device-Json)
      } elseif ($path -eq "/api/device/state") {
        if (Is-LoggedIn $req) {
          Send-Response $stream 200 "OK" "application/json" (Device-Json)
        } else {
          Send-Response $stream 401 "Unauthorized" "application/json" '{"error":"login_required"}'
        }
      } elseif ($path -eq "/api/device/wifi/state") {
        if (Is-LoggedIn $req) {
          Send-Response $stream 200 "OK" "application/json" (Wifi-StateJson) @("Cache-Control: no-store")
        } else {
          Send-Response $stream 401 "Unauthorized" "application/json" '{"error":"login_required"}'
        }
      } elseif ($path -eq "/api/device/wifi/scan" -and $req.Method -eq "POST") {
        if (Is-LoggedIn $req) {
          $script:pendingCommand = "wifi_scan"
          Save-EspPendingCommand
          Save-EspWifiState "" "scan_requested"
          Send-Response $stream 200 "OK" "application/json" '{"ok":true}' @("Cache-Control: no-store")
        } else {
          Send-Response $stream 401 "Unauthorized" "application/json" '{"error":"login_required"}'
        }
      } elseif ($path -eq "/api/device/wifi/connect" -and $req.Method -eq "POST") {
        if (Is-LoggedIn $req) {
          $form = Read-Form $req.Body
          $script:pendingWifi.Ssid = [string]$form["ssid"]
          $script:pendingWifi.Password = [string]$form["password"]
          $script:pendingCommand = "wifi_connect"
          Save-EspPendingWifi
          Save-EspPendingCommand
          Save-EspWifiState "" "connect_requested"
          Send-Response $stream 200 "OK" "application/json" '{"ok":true}' @("Cache-Control: no-store")
        } else {
          Send-Response $stream 401 "Unauthorized" "application/json" '{"error":"login_required"}'
        }
      } elseif ($path -eq "/api/storage/list") {
        $storageUser = Get-StorageUserFromRequest $req
        if ($null -ne $storageUser) {
          $query = [System.Net.WebUtility]::UrlDecode($uri.Query.TrimStart("?").Replace("q=", ""))
          Send-Response $stream 200 "OK" "application/json" (Storage-Json $storageUser $query) @("Cache-Control: no-store")
        } else {
          Send-Response $stream 401 "Unauthorized" "application/json" '{"error":"login_required"}'
        }
      } elseif ($path -eq "/api/storage/upload" -and $req.Method -eq "POST") {
        $storageUser = Get-StorageUserFromRequest $req
        if ($null -ne $storageUser) {
          $form = Read-Form $req.Body
          $target = Storage-Path $storageUser $form["name"]
          if ($null -eq $target -or [string]::IsNullOrWhiteSpace($form["data"])) {
            Send-Response $stream 400 "Bad Request" "application/json" '{"error":"bad_upload"}'
          } else {
            [System.IO.File]::WriteAllBytes($target, [Convert]::FromBase64String($form["data"]))
            Send-Response $stream 200 "OK" "application/json" '{"ok":true}'
          }
        } else {
          Send-Response $stream 401 "Unauthorized" "application/json" '{"error":"login_required"}'
        }
      } elseif ($path -eq "/api/storage/delete" -and $req.Method -eq "POST") {
        $storageUser = Get-StorageUserFromRequest $req
        if ($null -ne $storageUser) {
          $form = Read-Form $req.Body
          $target = Storage-Path $storageUser $form["name"]
          if ($null -ne $target -and (Test-Path $target)) {
            Remove-Item -LiteralPath $target -Force
          }
          Send-Response $stream 200 "OK" "application/json" '{"ok":true}'
        } else {
          Send-Response $stream 401 "Unauthorized" "application/json" '{"error":"login_required"}'
        }
      } elseif ($path -eq "/api/storage/rename" -and $req.Method -eq "POST") {
        $storageUser = Get-StorageUserFromRequest $req
        if ($null -ne $storageUser) {
          $form = Read-Form $req.Body
          $src = Storage-Path $storageUser $form["oldName"]
          $dst = Storage-Path $storageUser $form["newName"]
          if ($null -eq $src -or $null -eq $dst -or -not (Test-Path $src)) {
            Send-Response $stream 400 "Bad Request" "application/json" '{"error":"bad_rename"}'
          } elseif (Test-Path $dst) {
            Send-Response $stream 409 "Conflict" "application/json" '{"error":"exists"}'
          } else {
            Move-Item -LiteralPath $src -Destination $dst
            Send-Response $stream 200 "OK" "application/json" '{"ok":true}'
          }
        } else {
          Send-Response $stream 401 "Unauthorized" "application/json" '{"error":"login_required"}'
        }
      } elseif ($path -eq "/storage/download") {
        $storageUser = Get-StorageUserFromRequest $req
        if ($null -ne $storageUser) {
          $name = [System.Net.WebUtility]::UrlDecode($uri.Query.TrimStart("?").Replace("name=", ""))
          $target = Storage-Path $storageUser $name
          if ($null -ne $target -and (Test-Path $target)) {
            $safeName = [System.IO.Path]::GetFileName($target)
            Send-Bytes $stream 200 "OK" (Content-Type-For $safeName) ([System.IO.File]::ReadAllBytes($target)) @("Content-Disposition: attachment; filename=""$safeName""")
          } else {
            Send-Response $stream 404 "Not Found" "text/plain" "File not found"
          }
        } else {
          Redirect $stream "/storage/login"
        }
      } elseif ($path -eq "/api/device/poll" -and $req.Method -eq "POST") {
        $form = Read-Form $req.Body
        if ($form["token"] -ne $DeviceToken) {
          Send-Response $stream 403 "Forbidden" "application/json" '{"error":"bad_token"}'
        } else {
          $script:device.LastSeen = Get-Date
          $script:device.Ip = $form["ip"]
          $script:device.Rssi = $form["rssi"]
          $script:device.Led = $form["led"]
          $script:device.Uptime = $form["uptime"]
          $script:device.Heap = $form["heap"]
          $script:device.HeapTotal = $form["heapTotal"]
          $script:device.Mac = $form["mac"]
          $script:device.Ssid = $form["ssid"]
          $script:device.Route = $form["route"]
          $script:device.HttpStatus = $form["httpStatus"]
          $script:device.Polls = [int]$script:device.Polls + 1
          $hasWifiScan = $form.ContainsKey("wifiScan")
          if ($hasWifiScan) {
            Save-EspWifiState ([string]$form["wifiScan"]) "scan_ready"
          }
          if ((-not $hasWifiScan) -and $form.ContainsKey("wifiStatus") -and -not [string]::IsNullOrWhiteSpace([string]$form["wifiStatus"])) {
            Save-EspWifiState "" ([string]$form["wifiStatus"])
          }
          $cmdToSend = $script:pendingCommand
          $ssidToSend = $script:pendingWifi.Ssid
          $passwordToSend = $script:pendingWifi.Password
          $script:pendingCommand = "none"
          if ($cmdToSend -eq "wifi_connect") {
            $script:pendingWifi.Ssid = ""
            $script:pendingWifi.Password = ""
            Save-EspPendingWifi
          }
          Save-EspPendingCommand
          Save-EspDeviceState
          Send-Response $stream 200 "OK" "application/json" "{""command"":""$(JsonEscape $cmdToSend)"",""ssid"":""$(JsonEscape $ssidToSend)"",""password"":""$(JsonEscape $passwordToSend)""}"
        }
      } elseif ($path -eq "/health" -and $isGetOrHead) {
        Send-Response $stream 200 "OK" "application/json" '{"ok":true}' @("Cache-Control: no-store") (-not $isHead)
      } elseif ($path -eq "/firmware/version") {
        $size = if (Test-Path $firmwarePath) { (Get-Item $firmwarePath).Length } else { 0 }
        Send-Response $stream 200 "OK" "application/json" "{""version"":""$firmwareVersion"",""size"":$size}"
      } elseif ($path -eq "/firmware/esp32.bin") {
        if (Test-Path $firmwarePath) {
          Send-Bytes $stream 200 "OK" "application/octet-stream" ([System.IO.File]::ReadAllBytes($firmwarePath)) @("Cache-Control: no-store")
        } else {
          Send-Response $stream 404 "Not Found" "text/plain" "Firmware not found"
        }
      } else {
        Send-Response $stream 404 "Not Found" "text/plain" "Not found"
      }
    } catch {
      if ($client.Connected) {
        Send-Response $client.GetStream() 500 "Internal Server Error" "text/plain" $_.Exception.Message
      }
    } finally {
      $client.Close()
    }
  }
} finally {
  $listener.Stop()
}

