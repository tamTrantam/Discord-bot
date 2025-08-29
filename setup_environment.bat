@echo off
title Discord Music Bot v2.0 - Environment Setup
color 0B

echo ===============================================
echo Discord Music Bot v2.0 - Environment Setup
echo ===============================================
echo.
echo This script will set up the environment for the
echo Discord Music Bot with Channel Binding features.
echo.

echo [1/6] Cleaning up old dependencies...
if exist "node_modules" (
    echo Removing old node_modules directory...
    rmdir /s /q "node_modules"
    echo ✓ Removed old node_modules
)

if exist "package-lock.json" (
    echo Removing old package-lock.json...
    del "package-lock.json"
    echo ✓ Removed old package-lock.json
)

echo.
echo [2/6] Installing fresh dependencies...
echo This may take a few minutes...
npm install
if errorlevel 1 (
    echo [ERROR] Failed to install dependencies!
    echo.
    echo Try these troubleshooting steps:
    echo  1. Check your internet connection
    echo  2. Run: npm cache clean --force
    echo  3. Delete node_modules and try again
    echo  4. Update Node.js to latest LTS version
    echo.
    pause
    exit /b 1
)
echo ✓ npm dependencies installed successfully

echo.
echo [3/6] Removing deprecated packages...
echo Cleaning up old YouTube libraries that no longer work...
npm uninstall fluent-ffmpeg node-id3 youtube-search-api youtubei.js ytdl-core play-dl 2>nul
echo ✓ Deprecated packages removed

echo.
echo [4/6] Verifying yt-dlp installation...
yt-dlp --version >nul 2>&1
if errorlevel 1 (
    echo [WARNING] yt-dlp is not installed!
    echo.
    echo yt-dlp is REQUIRED for the bot to work properly.
    echo It replaces all the broken YouTube libraries.
    echo.
    echo Installation options:
    echo  1. Python: pip install yt-dlp
    echo  2. Download: https://github.com/yt-dlp/yt-dlp/releases
    echo  3. Chocolatey: choco install yt-dlp
    echo  4. Scoop: scoop install yt-dlp
    echo.
    echo Please install yt-dlp and run this setup again.
    pause
    exit /b 1
) else (
    for /f "tokens=*" %%i in ('yt-dlp --version') do echo ✓ yt-dlp %%i is properly installed
)

echo.
echo [5/6] Checking bot structure and new features...
echo Verifying all required files are present...

REM Check core files
if exist "index.js" (
    echo ✓ Main bot file: index.js
) else (
    echo ✗ Missing: index.js
)

if exist "package.json" (
    echo ✓ Package configuration: package.json
) else (
    echo ✗ Missing: package.json
)

REM Check command files
echo.
echo Checking command files:
if exist "src\commands\bind.js" (
    echo ✓ Channel binding: bind.js
) else (
    echo ✗ Missing: bind.js (Channel binding system)
)

if exist "src\commands\unbind.js" (
    echo ✓ Unbind system: unbind.js
) else (
    echo ✗ Missing: unbind.js (Unbind system)
)

if exist "src\commands\search.js" (
    echo ✓ Interactive search: search.js
) else (
    echo ✗ Missing: search.js (Interactive search system)
)

if exist "src\commands\play.js" (
    echo ✓ Play command: play.js
) else (
    echo ✗ Missing: play.js
)

if exist "src\commands\queue.js" (
    echo ✓ Queue command: queue.js
) else (
    echo ✗ Missing: queue.js
)

REM Check utility files
echo.
echo Checking utility files:
if exist "src\utils\YouTubeUtils.js" (
    echo ✓ YouTube utilities: YouTubeUtils.js
) else (
    echo ✗ Missing: YouTubeUtils.js
)

if exist "src\utils\MusicQueue.js" (
    echo ✓ Music queue system: MusicQueue.js
) else (
    echo ✗ Missing: MusicQueue.js
)

if exist "src\utils\ButtonUtils.js" (
    echo ✓ Button utilities: ButtonUtils.js
) else (
    echo ✗ Missing: ButtonUtils.js (Advanced button patterns)
)

REM Check documentation
echo.
echo Checking documentation:
if exist "README.md" (
    echo ✓ Main documentation: README.md
) else (
    echo ✗ Missing: README.md
)

if exist "BINDING_SYSTEM.md" (
    echo ✓ Binding guide: BINDING_SYSTEM.md
) else (
    echo ✗ Missing: BINDING_SYSTEM.md
)

if exist "BUTTON_GUIDE.md" (
    echo ✓ Button guide: BUTTON_GUIDE.md
) else (
    echo ✗ Missing: BUTTON_GUIDE.md
)

echo.
echo [6/6] Environment configuration...
if not exist ".env" (
    echo Creating example .env file...
    (
        echo # Discord Music Bot v2.0 Configuration
        echo # =====================================
        echo.
        echo # Your Discord bot token (REQUIRED)
        echo DISCORD_TOKEN=your_bot_token_here
        echo.
        echo # Enable debug mode for troubleshooting (true/false)
        echo DEBUG_MODE=false
        echo.
        echo # Additional configuration options can be added here
    ) > .env
    echo ✓ Created .env template file
    echo.
    echo [IMPORTANT] Please edit .env file and add your Discord bot token!
) else (
    echo ✓ .env file already exists
)

echo.
echo ===============================================
echo 🎉 Environment setup complete!
echo ===============================================
echo.
echo 📋 NEXT STEPS:
echo  1. Edit .env file and add your Discord bot token
echo  2. Ensure yt-dlp is working: yt-dlp --version
echo  3. Run start_bot.bat to start the bot
echo.
echo 🎵 NEW FEATURES IN v2.0:
echo  • Channel binding with persistent control panels
echo  • Interactive search with ephemeral interface cleanup
echo  • Real-time music controls via buttons
echo  • Advanced YouTube filtering (no Shorts)
echo  • Auto-updating interface every 30 seconds
echo.
echo 🔧 TROUBLESHOOTING:
echo  • If bot fails to start: Check .env configuration
echo  • If search doesn't work: Verify yt-dlp installation
echo  • For detailed logs: Set DEBUG_MODE=true in .env
echo  • Documentation: Check DOCUMENTATION.md
echo.
echo ===============================================
pause
