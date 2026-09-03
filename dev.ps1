$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

Write-Host "== Starting Messenger (development) ==" -ForegroundColor Cyan

docker compose up -d db
Start-Sleep -Seconds 3

Write-Host "Opening Electron desktop app (API must be running too)."
Write-Host "Terminal 1 (API):  npm run dev:api"
Write-Host "Terminal 2 (Desktop window):  npm run dev:electron"
Write-Host ""
Write-Host "Quick browser preview instead of Electron:  npm run dev:desktop  ->  http://localhost:5173"
