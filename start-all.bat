@echo off
title DevRisk AI - Platform Orchestrator
color 0B

echo ===============================================================================
echo                          DEVRISK AI PLATFORM LAUNCHER
echo ===============================================================================
echo   Starting all 3 platform services:
echo     [1] Python FastAPI ML Microservice     - Port 8000
echo     [2] Node.js / Express Backend Engine   - Port 3001
echo     [3] React 18 / Vite Frontend           - Port 3000
echo ===============================================================================

set "PYTHON_EXE=C:\Users\Nitro V16\AppData\Local\Programs\Python\Python313\python.exe"
if not exist "%PYTHON_EXE%" set "PYTHON_EXE=python"

set "NODE_EXE=C:\Program Files\nodejs\node.exe"
if not exist "%NODE_EXE%" set "NODE_EXE=node"

set "NPM_CMD=C:\Program Files\nodejs\npm.cmd"
if not exist "%NPM_CMD%" set "NPM_CMD=npm"

set "ML_DIR=%~dp0ml-service"
set "BACKEND_DIR=%~dp0backend"
set "FRONTEND_DIR=%~dp0frontend"

if not exist "%BACKEND_DIR%" set "ML_DIR=%~dp0devrisk-ai\ml-service"
if not exist "%BACKEND_DIR%" set "BACKEND_DIR=%~dp0devrisk-ai\backend"
if not exist "%BACKEND_DIR%" set "FRONTEND_DIR=%~dp0devrisk-ai\frontend"

if exist "%BACKEND_DIR%\node_modules" goto skip_backend_npm
echo.
echo [INFO] Installing backend dependencies...
pushd "%BACKEND_DIR%"
call "%NPM_CMD%" install
popd
:skip_backend_npm

if exist "%FRONTEND_DIR%\node_modules" goto skip_frontend_npm
echo.
echo [INFO] Installing frontend dependencies...
pushd "%FRONTEND_DIR%"
call "%NPM_CMD%" install
popd
:skip_frontend_npm

echo.
echo [1/3] Starting Python ML Service (FastAPI + XGBoost + SHAP)...
start "DevRisk AI - ML Service (Port 8000)" cmd /k "cd /d ""%ML_DIR%"" && ""%PYTHON_EXE%"" -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

echo [2/3] Starting Node.js Express Backend...
start "DevRisk AI - Backend API (Port 3001)" cmd /k "cd /d ""%BACKEND_DIR%"" && ""%NODE_EXE%"" src/index.js"

echo [3/3] Starting React Vite Frontend...
start "DevRisk AI - Frontend Dashboard (Port 3000)" cmd /k "cd /d ""%FRONTEND_DIR%"" && ""%NPM_CMD%"" run dev"

echo.
echo ===============================================================================
echo   SUCCESS! All services are initializing in separate background windows.
echo ===============================================================================
echo   * React Dashboard:       http://localhost:3000
echo   * Developer Playground:  http://localhost:3000/simulator
echo   * Backend REST Health:   http://localhost:3001/api/health
echo   * ML API Swagger Docs:   http://localhost:8000/docs
echo ===============================================================================
echo   Press any key to open the DevRisk AI Dashboard in your browser...
pause >nul
start http://localhost:3000
