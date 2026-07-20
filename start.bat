@echo off
chcp 65001 >nul
echo ========================================
echo   演唱会行程生成器 - 启动中...
echo ========================================
echo.
cd /d "%~dp0"
"C:\Users\EDY\.workbuddy\binaries\node\versions\22.22.2\node.exe" server.js
pause
