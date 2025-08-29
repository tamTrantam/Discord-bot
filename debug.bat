@echo off
title Discord Music Bot v2.0 - Debug Mode
color 0E
cls

echo.
echo ====================================
echo   Discord Music Bot v2.0 
echo   DEBUG MODE
echo ====================================
echo.

echo Checking requirements...
node --version
if errorlevel 1 (
    echo ERROR: Node.js not found!
    pause
    exit
)

echo.
echo Checking bot files...
if not exist "index.js" (
    echo ERROR: index.js not found!
    pause
    exit
)

if not exist ".env" (
    echo WARNING: .env file not found!
    echo The bot may not start without a Discord token.
)

echo.
echo Starting bot with debug output...
echo.

node index.js

echo.
echo Bot stopped. Check output above for any errors.
pause
