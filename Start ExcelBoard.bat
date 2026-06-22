@echo off
title ExcelBoard Launcher
color 0A

echo.
echo  ============================================
echo   ExcelBoard - Starting...
echo  ============================================
echo.

:: Set PATH for Node.js
set "PATH=%PATH%;C:\Program Files\nodejs"

:: Go to project folder
cd /d "E:\Claude\excelboard"

:: Kill any old processes on ports 3001 and 5173
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3001 " 2^>nul') do taskkill /PID %%a /F >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5173 " 2^>nul') do taskkill /PID %%a /F >nul 2>&1

echo  [1/3] Starting Backend API...
start "ExcelBoard - Backend" /min cmd /c "cd /d E:\Claude\excelboard\packages\backend && set PATH=%PATH%;C:\Program Files\nodejs && npx tsx --experimental-sqlite src/index.ts"

echo  [2/3] Starting Frontend...
start "ExcelBoard - Frontend" /min cmd /c "cd /d E:\Claude\excelboard\packages\frontend && set PATH=%PATH%;C:\Program Files\nodejs && npx vite"

echo  [3/3] Waiting for servers to start...
timeout /t 5 /nobreak >nul

:: Open in Chrome
echo  Opening ExcelBoard in Chrome...
start chrome "http://localhost:5173"

echo.
echo  ============================================
echo   ExcelBoard is running!
echo   Frontend : http://localhost:5173
echo   Backend  : http://localhost:3001
echo  ============================================
echo.
echo  Press any key to STOP all servers...
pause >nul

:: Stop everything on key press
echo  Stopping servers...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3001 " 2^>nul') do taskkill /PID %%a /F >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5173 " 2^>nul') do taskkill /PID %%a /F >nul 2>&1
echo  Done. Goodbye!
timeout /t 2 /nobreak >nul
