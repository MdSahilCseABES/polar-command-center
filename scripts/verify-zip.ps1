$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.IO.Compression.FileSystem

$zipPath = "C:\Users\mohda\Downloads\polar-command-center.zip"
Write-Host "Verifying ZIP file at: $zipPath"
$zip = [System.IO.Compression.ZipFile]::OpenRead($zipPath)
Write-Host "Total entries in ZIP archive: $($zip.Entries.Count)"

Write-Host "Sample entries in ZIP archive:"
$zip.Entries | Select-Object -First 10 | ForEach-Object { Write-Host "  Entry: $($_.FullName)" }
Write-Host "node_modules present: $hasNodeModules (Expected: 0)"
Write-Host ".git present: $hasGit (Expected: 0)"

$keyFiles = @(
  "polar-command-center/package.json",
  "polar-command-center/package-lock.json",
  "polar-command-center/index.html",
  "polar-command-center/vite.config.js",
  "polar-command-center/tailwind.config.js",
  "polar-command-center/postcss.config.js",
  "polar-command-center/vercel.json",
  "polar-command-center/netlify.toml",
  "polar-command-center/src/App.jsx",
  "polar-command-center/src/main.jsx",
  "polar-command-center/src/pages/MapView.jsx",
  "polar-command-center/src/pages/Dashboard.jsx",
  "polar-command-center/src/index.css",
  "polar-command-center/public/polar-logo.svg",
  "polar-command-center/public/polar-hero-bg.jpg",
  "polar-command-center/.env.example",
  "polar-command-center/README.md"
)

$missingCount = 0
foreach ($f in $keyFiles) {
  $entry = $zip.GetEntry($f)
  if ($null -ne $entry) {
    Write-Host "  [OK] $f ($($entry.Length) bytes)"
  } else {
    Write-Host "  [FAIL MISSING] $f"
    $missingCount++
  }
}

$zip.Dispose()

if ($missingCount -eq 0 -and $hasNodeModules -eq 0 -and $hasGit -eq 0) {
  Write-Host "ZIP verification PASSED perfectly!"
} else {
  Write-Host "ZIP verification FAILED with $missingCount missing files."
  exit 1
}
