param(
  [int]$MaxWidth = 1600,
  [int]$JpegQuality = 78
)

$ErrorActionPreference = "Stop"
$serverDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$rootDir = Split-Path -Parent $serverDir
$sourceDir = Join-Path $rootDir "dynamic\uploads"
$targetDir = Join-Path $rootDir "static\images"

New-Item -ItemType Directory -Force -Path $targetDir | Out-Null

Add-Type -AssemblyName System.Drawing

function Get-JpegEncoder {
  return [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() |
    Where-Object { $_.MimeType -eq "image/jpeg" } |
    Select-Object -First 1
}

function Save-Jpeg([System.Drawing.Image]$Image, [string]$Path, [int]$Quality) {
  $encoder = Get-JpegEncoder
  $params = [System.Drawing.Imaging.EncoderParameters]::new(1)
  $params.Param[0] = [System.Drawing.Imaging.EncoderParameter]::new([System.Drawing.Imaging.Encoder]::Quality, [int64]$Quality)
  $Image.Save($Path, $encoder, $params)
}

$allowed = @(".jpg", ".jpeg", ".png", ".bmp")
$published = @()

if (Test-Path -LiteralPath $sourceDir) {
  foreach ($file in Get-ChildItem -LiteralPath $sourceDir -File) {
    if ($allowed -notcontains $file.Extension.ToLowerInvariant()) { continue }

    $baseName = [System.IO.Path]::GetFileNameWithoutExtension($file.Name)
    $safeBase = ($baseName -replace "[^a-zA-Z0-9._-]", "-").Trim("-")
    if ([string]::IsNullOrWhiteSpace($safeBase)) { $safeBase = "image" }
    $target = Join-Path $targetDir "$safeBase.jpg"

    $src = [System.Drawing.Image]::FromFile($file.FullName)
    try {
      $width = $src.Width
      $height = $src.Height
      if ($width -gt $MaxWidth) {
        $height = [int][Math]::Round($src.Height * ($MaxWidth / $src.Width))
        $width = $MaxWidth
      }

      $bitmap = [System.Drawing.Bitmap]::new($width, $height)
      try {
        $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
        try {
          $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
          $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
          $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
          $graphics.DrawImage($src, 0, 0, $width, $height)
        } finally {
          $graphics.Dispose()
        }
        Save-Jpeg $bitmap $target $JpegQuality
      } finally {
        $bitmap.Dispose()
      }

      $published += [pscustomobject]@{
        Source = $file.Name
        Output = [System.IO.Path]::GetFileName($target)
        Url = "/assets/images/$([System.Uri]::EscapeDataString([System.IO.Path]::GetFileName($target)))"
        Bytes = (Get-Item -LiteralPath $target).Length
      }
    } finally {
      $src.Dispose()
    }
  }
}

$published | Format-Table -AutoSize
