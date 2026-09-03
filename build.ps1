$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

Write-Host "== Building Messenger ==" -ForegroundColor Cyan
npm run build

Write-Host ""
Write-Host "Build finished." -ForegroundColor Green
Write-Host "To create a Windows installer (.exe):  npm run package:win -w @messenger/desktop"
Write-Host "Installer output will be in apps/desktop/release/"
