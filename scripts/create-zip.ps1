$ErrorActionPreference = "Stop"

$sourceDir = "c:\Users\mohda\Downloads\polar-expedition-prototype\polar-expedition-prototype"
$stageParent = [System.IO.Path]::Combine([System.IO.Path]::GetTempPath(), "pcc_pack_" + [System.Guid]::NewGuid().ToString("N"))
$stageDir = Join-Path $stageParent "polar-command-center"
$destZipDownloads = "C:\Users\mohda\Downloads\polar-command-center.zip"
$destZipDesktop = "C:\Users\mohda\Desktop\polar-command-center.zip"

Write-Host "Creating staging directory: $stageDir"
New-Item -ItemType Directory -Path $stageDir -Force | Out-Null

$itemsToInclude = @(
  "src",
  "public",
  "docs",
  "scripts",
  "supabase",
  "legacy",
  "index.html",
  "package.json",
  "package-lock.json",
  "README.md",
  "vite.config.js",
  "tailwind.config.js",
  "postcss.config.js",
  "vercel.json",
  "netlify.toml",
  ".env.example",
  ".gitignore",
  "Polar_Command_Center_Resource_Attribution_Directory.pdf",
  "Real_World_Polar_Expedition_Reference_Data.pdf",
  "generate_resource_directory_pdf.js"
)

foreach ($item in $itemsToInclude) {
  $src = Join-Path $sourceDir $item
  if (Test-Path $src) {
    Write-Host "Copying: $item"
    $dest = Join-Path $stageDir $item
    Copy-Item -Path $src -Destination $dest -Recurse -Force
  } else {
    Write-Host "Skipping (not found): $item"
  }
}

if (Test-Path $destZipDownloads) {
  Remove-Item -Force $destZipDownloads
}
if (Test-Path $destZipDesktop) {
  Remove-Item -Force $destZipDesktop
}

Write-Host "Compressing archive with normalized forward-slash paths to $destZipDownloads..."
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$zipArchive = [System.IO.Compression.ZipFile]::Open($destZipDownloads, [System.IO.Compression.ZipArchiveMode]::Create)
$allFiles = Get-ChildItem -Path $stageParent -Recurse -File

foreach ($f in $allFiles) {
  $relative = $f.FullName.Substring($stageParent.Length).TrimStart('\', '/')
  $zipPathEntry = $relative.Replace('\', '/')
  [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zipArchive, $f.FullName, $zipPathEntry, [System.IO.Compression.CompressionLevel]::Optimal) | Out-Null
}

$zipArchive.Dispose()

Write-Host "Mirroring to $destZipDesktop..."
Copy-Item -Path $destZipDownloads -Destination $destZipDesktop -Force

Write-Host "Cleaning up staging directory..."
Remove-Item -Path $stageParent -Recurse -Force

$downInfo = Get-Item $destZipDownloads
$deskInfo = Get-Item $destZipDesktop

Write-Host "SUCCESS!"
Write-Host "Downloads ZIP size: $($downInfo.Length) bytes ($([Math]::Round($downInfo.Length / 1MB, 2)) MB)"
Write-Host "Desktop ZIP size: $($deskInfo.Length) bytes ($([Math]::Round($deskInfo.Length / 1MB, 2)) MB)"
