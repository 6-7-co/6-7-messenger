$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

Write-Host "== Messenger setup ==" -ForegroundColor Cyan

Write-Host "1/6 Checking Node.js..."
try { node --version | Out-Null } catch { throw "Node.js not found. Install LTS from https://nodejs.org" }

Write-Host "2/6 Checking Docker..."
try { docker --version | Out-Null } catch {
  Write-Host "Docker not found. Install Docker Desktop from https://www.docker.com/products/docker-desktop" -ForegroundColor Yellow
  Write-Host "(PostgreSQL will run inside Docker. Without it you must run Postgres yourself.)"
}

Write-Host "3/6 Installing dependencies (this can take a few minutes)..."
npm install

Write-Host "4/6 Creating .env files if missing..."
if (-not (Test-Path "apps/api/.env")) {
  Copy-Item "apps/api/.env.example" "apps/api/.env"
  Write-Host "Created apps/api/.env  <- EDIT IT and set strong secrets!" -ForegroundColor Yellow
}
if (-not (Test-Path ".env")) {
  Copy-Item ".env.example" ".env"
  Write-Host "Created .env"
}

Write-Host "5/6 Generating Prisma client..."
npm run db:generate

Write-Host "6/6 Starting PostgreSQL and pushing the schema..."
docker compose up -d db
Start-Sleep -Seconds 4
npm run db:push

Write-Host ""
Write-Host "Setup complete!" -ForegroundColor Green
Write-Host "Start the app with:  .\dev.ps1"
Write-Host "Or run API + Electron with:  npm run dev:api  (terminal 1) and  npm run dev:electron  (terminal 2)"
