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

# 1. Start ML Service
Write-Host "`n[1/3] Starting Python ML Microservice (FastAPI)..." -ForegroundColor Yellow
Start-Process -FilePath "cmd.exe" -ArgumentList "/k", "cd /d `"$Root\devrisk-ai\ml-service`" && `"$PythonExe`" -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

# 2. Start Backend
Write-Host "[2/3] Starting Node.js Express Backend..." -ForegroundColor Green
Start-Process -FilePath "cmd.exe" -ArgumentList "/k", "cd /d `"$Root\devrisk-ai\backend`" && `"$NodeExe`" src/index.js"

# 3. Start Frontend
Write-Host "[3/3] Starting React 18 Vite Frontend..." -ForegroundColor Magenta
Start-Process -FilePath "cmd.exe" -ArgumentList "/k", "cd /d `"$Root\devrisk-ai\frontend`" && `"$NpmCmd`" run dev"

Write-Host "`n===============================================================================" -ForegroundColor Cyan
Write-Host "  SUCCESS! All services have been launched." -ForegroundColor Green
Write-Host "  * React Dashboard:       http://localhost:3000"
Write-Host "  * Developer Playground:  http://localhost:3000/simulator"
Write-Host "  * Backend REST Health:   http://localhost:3001/api/health"
Write-Host "  * ML API Swagger Docs:   http://localhost:8000/docs"
Write-Host "===============================================================================" -ForegroundColor Cyan

Start-Process "http://localhost:3000"
