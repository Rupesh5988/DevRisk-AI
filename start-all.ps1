# ===============================================================================
# DevRisk AI — PowerShell Orchestrator
# ===============================================================================

Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host "                         DEVRISK AI PLATFORM LAUNCHER                         " -ForegroundColor Cyan
Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host "  Starting all 3 services:"
Write-Host "    [1] Python FastAPI ML Microservice     - Port 8000" -ForegroundColor Yellow
Write-Host "    [2] Node.js / Express Backend Engine   - Port 3001" -ForegroundColor Green
Write-Host "    [3] React 18 / Vite Frontend           - Port 3000" -ForegroundColor Magenta
Write-Host "===============================================================================" -ForegroundColor Cyan

$Root = $PSScriptRoot
$PythonExe = "C:\Users\Nitro V16\AppData\Local\Programs\Python\Python313\python.exe"
if (-not (Test-Path $PythonExe)) { $PythonExe = "python" }

$NodeExe = "C:\Program Files\nodejs\node.exe"
if (-not (Test-Path $NodeExe)) { $NodeExe = "node" }

$NpmCmd = "C:\Program Files\nodejs\npm.cmd"
if (-not (Test-Path $NpmCmd)) { $NpmCmd = "npm" }

$MLDir = if (Test-Path "$Root\ml-service") { "$Root\ml-service" } else { "$Root\devrisk-ai\ml-service" }
$BackendDir = if (Test-Path "$Root\backend") { "$Root\backend" } else { "$Root\devrisk-ai\backend" }
$FrontendDir = if (Test-Path "$Root\frontend") { "$Root\frontend" } else { "$Root\devrisk-ai\frontend" }

if (-not (Test-Path "$BackendDir\node_modules")) {
    Write-Host "`n[INFO] Installing backend dependencies in $BackendDir..." -ForegroundColor Cyan
    Push-Location "$BackendDir"
    try { & $NpmCmd install } finally { Pop-Location }
}

if (-not (Test-Path "$FrontendDir\node_modules")) {
    Write-Host "`n[INFO] Installing frontend dependencies in $FrontendDir..." -ForegroundColor Cyan
    Push-Location "$FrontendDir"
    try { & $NpmCmd install } finally { Pop-Location }
}

# Clean up any lingering previous instances to prevent EADDRINUSE conflicts
Write-Host "[INFO] Checking and freeing ports 8000, 3001, 3000..." -ForegroundColor Cyan
@(8000, 3001, 3000) | ForEach-Object {
    $port = $_
    $conns = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($conns) {
        $conns.OwningProcess | Select-Object -Unique | ForEach-Object {
            try { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue } catch {}
        }
    }
}
Start-Sleep -Milliseconds 500

# 1. Start ML Service
Write-Host "`n[1/3] Starting Python ML Microservice (FastAPI)..." -ForegroundColor Yellow
Start-Process -FilePath "cmd.exe" -ArgumentList "/k", "cd /d `"$MLDir`" && `"$PythonExe`" -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

# 2. Start Backend
Write-Host "[2/3] Starting Node.js Express Backend..." -ForegroundColor Green
Start-Process -FilePath "cmd.exe" -ArgumentList "/k", "cd /d `"$BackendDir`" && `"$NodeExe`" src/index.js"

# 3. Start Frontend
Write-Host "[3/3] Starting React 18 Vite Frontend..." -ForegroundColor Magenta
Start-Process -FilePath "cmd.exe" -ArgumentList "/k", "cd /d `"$FrontendDir`" && `"$NpmCmd`" run dev"

Write-Host "`n===============================================================================" -ForegroundColor Cyan
Write-Host "  SUCCESS! All services have been launched." -ForegroundColor Green
Write-Host "  * React Dashboard:       http://localhost:3000"
Write-Host "  * Developer Playground:  http://localhost:3000/simulator"
Write-Host "  * Backend REST Health:   http://localhost:3001/api/health"
Write-Host "  * ML API Swagger Docs:   http://localhost:8000/docs"
Write-Host "===============================================================================" -ForegroundColor Cyan

Start-Process "http://localhost:3000"
