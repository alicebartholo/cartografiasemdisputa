# Cartografias em Disputa - servidor local (Windows PowerShell 5.1+, sem dependencias)
# Serve o site e permite salvar pontos, hotspots e imagens direto na pasta do projeto.
param([int]$Port = 8080)

$ErrorActionPreference = 'Stop'
$base = (Resolve-Path (Split-Path -Parent $MyInvocation.MyCommand.Path)).Path
$utf8 = New-Object System.Text.UTF8Encoding $false
$allowedSave = @('data/pontos.geojson', 'atlas/atlas.json')
$mime = @{
  '.html' = 'text/html; charset=utf-8'; '.htm' = 'text/html; charset=utf-8'; '.css' = 'text/css; charset=utf-8'
  '.js' = 'application/javascript; charset=utf-8'; '.json' = 'application/json; charset=utf-8'; '.geojson' = 'application/geo+json; charset=utf-8'
  '.svg' = 'image/svg+xml'; '.png' = 'image/png'; '.jpg' = 'image/jpeg'; '.jpeg' = 'image/jpeg'; '.webp' = 'image/webp'; '.gif' = 'image/gif'
  '.ico' = 'image/x-icon'; '.pdf' = 'application/pdf'; '.mp3' = 'audio/mpeg'; '.mp4' = 'video/mp4'; '.txt' = 'text/plain; charset=utf-8'; '.md' = 'text/plain; charset=utf-8'
}

$listener = New-Object System.Net.HttpListener
$started = $false
for ($p = $Port; $p -lt $Port + 10; $p++) {
  try {
    $listener = New-Object System.Net.HttpListener
    $listener.Prefixes.Add("http://localhost:$p/")
    $listener.Start(); $Port = $p; $started = $true; break
  } catch { }
}
if (-not $started) { Write-Host 'Nao foi possivel abrir nenhuma porta entre 8080 e 8089.' -ForegroundColor Red; exit 1 }

$url = "http://localhost:$Port/"
Write-Host ''
Write-Host '  CARTOGRAFIAS EM DISPUTA  -  WebGIS e Atlas Ilustrados' -ForegroundColor Yellow
Write-Host "  Servidor ativo em $url" -ForegroundColor Green
Write-Host '  Pasta do projeto: ' $base
Write-Host '  Deixe esta janela aberta enquanto usa o site. Para encerrar: Ctrl+C ou feche a janela.' -ForegroundColor DarkGray
Write-Host ''
try { Start-Process $url } catch { }

function Send-Json($res, [int]$code, [string]$json) {
  $b = $utf8.GetBytes($json)
  $res.StatusCode = $code; $res.ContentType = 'application/json; charset=utf-8'
  $res.ContentLength64 = $b.Length; $res.OutputStream.Write($b, 0, $b.Length)
}
function Esc([string]$s) { return ($s -replace '\\', '\\' -replace '"', '\"') }
function Safe-Path([string]$rel) {
  $rel = $rel -replace '/', '\'
  $full = [System.IO.Path]::GetFullPath([System.IO.Path]::Combine($base, $rel))
  if (-not $full.StartsWith($base, [System.StringComparison]::OrdinalIgnoreCase)) { return $null }
  return $full
}

while ($listener.IsListening) {
  try { $ctx = $listener.GetContext() } catch { break }
  $req = $ctx.Request; $res = $ctx.Response
  try {
    $res.AddHeader('Cache-Control', 'no-cache')
    $path = [System.Uri]::UnescapeDataString($req.Url.AbsolutePath)

    if ($path -eq '/api/status') {
      Send-Json $res 200 '{"ok":true,"servidor":"powershell"}'
    }
    elseif ($path -eq '/api/salvar' -and $req.HttpMethod -eq 'POST') {
      $reader = New-Object System.IO.StreamReader($req.InputStream, $utf8)
      $body = $reader.ReadToEnd(); $reader.Close()
      $obj = $body | ConvertFrom-Json
      $rel = [string]$obj.arquivo
      if ($allowedSave -notcontains $rel) { Send-Json $res 403 ('{"ok":false,"erro":"arquivo nao permitido: ' + (Esc $rel) + '"}') }
      else {
        $full = Safe-Path $rel
        $dir = Split-Path -Parent $full
        if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir | Out-Null }
        if (Test-Path $full) {
          $bk = Join-Path $base '_backup'
          if (-not (Test-Path $bk)) { New-Item -ItemType Directory -Path $bk | Out-Null }
          $stamp = Get-Date -Format 'yyyyMMdd_HHmmss'
          Copy-Item $full (Join-Path $bk ((Split-Path -Leaf $full) + '.' + $stamp + '.bak'))
        }
        [System.IO.File]::WriteAllText($full, [string]$obj.conteudo, $utf8)
        Write-Host ('  salvo: ' + $rel) -ForegroundColor Cyan
        Send-Json $res 200 '{"ok":true}'
      }
    }
    elseif ($path -eq '/api/upload' -and $req.HttpMethod -eq 'POST') {
      $nome = [string]$req.QueryString['nome']
      if (-not $nome) { $nome = 'imagem.jpg' }
      $nome = ($nome -replace '[^A-Za-z0-9._-]', '_').ToLower()
      $ext = [System.IO.Path]::GetExtension($nome)
      if (@('.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg') -notcontains $ext) { Send-Json $res 400 '{"ok":false,"erro":"formato de imagem nao suportado"}' }
      else {
        $mediaDir = Join-Path $base 'media'
        if (-not (Test-Path $mediaDir)) { New-Item -ItemType Directory -Path $mediaDir | Out-Null }
        $stem = [System.IO.Path]::GetFileNameWithoutExtension($nome)
        $final = $nome; $i = 1
        while (Test-Path (Join-Path $mediaDir $final)) { $final = "$stem-$i$ext"; $i++ }
        $fs = [System.IO.File]::Create((Join-Path $mediaDir $final))
        $req.InputStream.CopyTo($fs); $fs.Close()
        Write-Host ('  imagem: media/' + $final) -ForegroundColor Cyan
        Send-Json $res 200 ('{"ok":true,"caminho":"media/' + $final + '"}')
      }
    }
    else {
      $rel = $path.TrimStart('/')
      if ($rel -eq '') { $rel = 'index.html' }
      $full = Safe-Path $rel
      if ($full -and (Test-Path $full -PathType Container)) { $full = Join-Path $full 'index.html' }
      if ($full -and (Test-Path $full -PathType Leaf)) {
        $ext = [System.IO.Path]::GetExtension($full).ToLower()
        $res.ContentType = if ($mime.ContainsKey($ext)) { $mime[$ext] } else { 'application/octet-stream' }
        $fs = [System.IO.File]::OpenRead($full)
        $res.ContentLength64 = $fs.Length
        $fs.CopyTo($res.OutputStream); $fs.Close()
      } else {
        $res.StatusCode = 404
        $b = $utf8.GetBytes('404 - nao encontrado: ' + $rel)
        $res.OutputStream.Write($b, 0, $b.Length)
      }
    }
  } catch {
    try { Send-Json $res 500 ('{"ok":false,"erro":"' + (Esc $_.Exception.Message) + '"}') } catch { }
    Write-Host ('  erro: ' + $_.Exception.Message) -ForegroundColor Red
  } finally {
    try { $res.OutputStream.Close() } catch { }
  }
}
