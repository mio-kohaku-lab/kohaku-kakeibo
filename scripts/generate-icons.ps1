# Rebuild PNG icons using Windows System.Drawing. No external packages required.
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$iconDirectory = Join-Path $PSScriptRoot '../icons'
function Brush([string]$hex) { [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml($hex)) }
function RoundedRect($g, $brush, [single]$x, [single]$y, [single]$w, [single]$h, [single]$r) {
  $p = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $p.AddArc($x,$y,$r*2,$r*2,180,90)
  $p.AddArc($x+$w-$r*2,$y,$r*2,$r*2,270,90)
  $p.AddArc($x+$w-$r*2,$y+$h-$r*2,$r*2,$r*2,0,90)
  $p.AddArc($x,$y+$h-$r*2,$r*2,$r*2,90,90)
  $p.CloseFigure(); $g.FillPath($brush,$p); $p.Dispose()
}
foreach ($item in @(@(192,'icon-192.png'),@(512,'icon-512.png'),@(512,'icon-maskable-512.png'),@(180,'apple-touch-icon.png'))) {
  $size = [int]$item[0]
  $bitmap = [System.Drawing.Bitmap]::new($size,$size)
  $g = [System.Drawing.Graphics]::FromImage($bitmap)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.Clear([System.Drawing.ColorTranslator]::FromHtml('#6d7d52'))
  $g.ScaleTransform($size/512.0,$size/512.0)
  # Keep every meaningful mark inside the central maskable safe area.
  $g.TranslateTransform(256,256); $g.ScaleTransform(0.86,0.86); $g.TranslateTransform(-256,-256)
  $shadow=Brush '#536640'; $paper=Brush '#f4e9cd'; $amber=Brush '#d4a057'; $leaf=Brush '#b8ca8e'
  RoundedRect $g $shadow 140 132 244 270 30
  RoundedRect $g $paper 128 120 244 270 30
  RoundedRect $g $amber 128 120 58 270 28
  $g.FillRectangle($amber,158,120,28,270)
  $pen=[System.Drawing.Pen]::new([System.Drawing.ColorTranslator]::FromHtml('#b69560'),15)
  $pen.StartCap='Round'; $pen.EndCap='Round'
  $g.DrawLine($pen,215,230,321,230); $g.DrawLine($pen,215,274,297,274); $g.DrawLine($pen,215,318,321,318)
  $path=[System.Drawing.Drawing2D.GraphicsPath]::new()
  $path.AddBezier(276,182,260,128,286,96,346,95)
  $path.AddBezier(346,95,351,144,329,179,276,182)
  $path.CloseFigure(); $g.FillPath($leaf,$path)
  $stem=[System.Drawing.Pen]::new([System.Drawing.ColorTranslator]::FromHtml('#6d7d52'),10)
  $stem.StartCap='Round'; $stem.EndCap='Round'
  $g.DrawBezier($stem,275,199,285,166,302,139,326,119)
  $bitmap.Save((Join-Path $iconDirectory $item[1]),[System.Drawing.Imaging.ImageFormat]::Png)
  $stem.Dispose(); $path.Dispose(); $pen.Dispose(); $shadow.Dispose(); $paper.Dispose(); $amber.Dispose(); $leaf.Dispose(); $g.Dispose(); $bitmap.Dispose()
}

