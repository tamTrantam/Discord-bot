@echo off
title Discord Music Bot v2.0 - Channel Binding Edition
color 0A
cls

echo.
echo ================================================
echo   Discord Music Bot v2.0 - Channel Binding Edition
echo ================================================
echo.
echo Features:
echo  ✓ Channel binding with persistent control panels
echo  ✓ Interactive search with automatic cleanup
echo  ✓ Real-time music controls via buttons
echo  ✓ Advanced YouTube filtering (excludes Shorts)
echo  ✓ yt-dlp integration for reliability
echo.

echo Checking requirements...
echo.

REM Check Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js is not installed!
    echo Download from: https://nodejs.org/
    pause
    exit /b 1
) else (
    echo ✓ Node.js is installed
)

REM Check main bot file
if not exist "index.js" (
    echo [ERROR] Bot file index.js not found!
    pause
    exit /b 1
) else (
    echo ✓ Bot files found
)

REM Check .env file
if not exist ".env" (
    echo [WARNING] .env file not found!
    echo The bot needs a Discord token to work.
    echo.
    pause
) else (
    echo ✓ Configuration file found
)

REM Check/install dependencies
if not exist "node_modules" (
    echo Installing dependencies...
    npm install
    if errorlevel 1 (
        echo [ERROR] Failed to install dependencies!
        pause
        exit /b 1
    )
) else (
    echo ✓ Dependencies installed
)

echo.
echo ================================================
echo Starting Discord Music Bot...
echo ================================================
echo.
echo Quick Start:
echo  1. Use /bind in a channel to create control panel
echo  2. Click 'Search & Play' for music discovery
echo  3. Search interface completely disappears after selection
echo  4. Use buttons for all music controls
echo.

REM Start the bot
node index.js

echo.
echo ================================================
echo Bot has stopped.
echo.
echo If there were errors, check:
echo  - Discord token in .env file
echo  - Bot permissions in Discord server
echo  - Internet connection
echo ================================================
echo.
pause
