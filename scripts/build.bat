@echo off
REM Agent Bar Build Script for Windows

echo 🚀 Building Agent Bar for Chrome...

REM Check if Plasmo is installed
where plasmo >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo 📦 Installing Plasmo CLI...
    npm install -g plasmo
)

REM Install dependencies (skip optional to avoid build issues)
echo 📚 Installing dependencies...
npm install --no-optional --no-audit --no-fund

REM Build for Chrome
echo 🔨 Building Chrome extension...
call npm run build:chrome

if %ERRORLEVEL% EQU 0 (
    echo ✅ Chrome extension built successfully!
    echo 📂 Extension location: build\chrome-mv3-prod
    echo 🌐 Load in Chrome: chrome://extensions/ -> Developer mode -> Load unpacked
) else (
    echo ❌ Build failed!
    pause
)