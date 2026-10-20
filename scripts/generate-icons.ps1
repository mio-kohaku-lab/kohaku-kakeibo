param([Parameter(Mandatory=$true)][string]$Source)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$iconDirectory = Join-Path $PSScriptRoot '../icons'
$sourceImage = [System.Drawing.Bitmap]::new((Resolve-Path -LiteralPath $Source).Path)
try {
 foreach ($item in @(@(32,'jar-final-v5-favicon.png',1.0),@(192,'jar-final-v5-192.png',1.0),@(512,'jar-final-v5-512.png',1.0),@(512,'jar-final-v5-maskable-512.png',0.86),@(180,'jar-final-v5-apple-touch.png',1.0))) {
  $size=[int]$item[0];$scale=[double]$item[2]
  $bitmap=[System.Drawing.Bitmap]::new($size,$size)
  $g=[System.Drawing.Graphics]::FromImage($bitmap)
  try {
   $g.Clear($sourceImage.GetPixel(0,0))
   $g.InterpolationMode=[System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
   $g.PixelOffsetMode=[System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
   $side=[int]($size*$scale);$offset=[int](($size-$side)/2)
   $g.DrawImage($sourceImage,$offset,$offset,$side,$side)
   $bitmap.Save((Join-Path $iconDirectory $item[1]),[System.Drawing.Imaging.ImageFormat]::Png)
  } finally {$g.Dispose();$bitmap.Dispose()}
 }
} finally {$sourceImage.Dispose()}
