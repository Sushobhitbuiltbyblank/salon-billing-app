@echo off
title Belezia Salon POS - Local Server
echo ========================================================
echo       BELEZIA LUXURY SALON POS - WINDOWS 10 LAUNCHER
echo ========================================================
echo.

:: Check Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed!
    echo Please download and install Node.js (LTS version) from: https://nodejs.org
    echo After installing Node.js, double-click this file again.
    echo.
    pause
    exit /b
)

:: Install dependencies if node_modules is missing
if not exist "node_modules\" (
    echo [1/3] Installing dependencies for the first time...
    call npm install
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to install dependencies. Check your internet connection.
        pause
        exit /b
    )
)

echo [2/3] Starting Salon POS Local Server on port 3001...
echo.
echo --------------------------------------------------------
echo Local URL:        http://localhost:3001
echo iPad / Mobile:    Open Command Prompt -> type "ipconfig" -> use http://YOUR_IP:3001
echo --------------------------------------------------------
echo.

:: Automatically open browser after 3 seconds in background
start "" /b timeout /t 3 /nobreak >nul & start http://localhost:3001

:: Start Next.js App
call npm run dev
pause
