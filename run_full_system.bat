@echo off
title Khoi Dong Toan Bo He Thong (Python Backend + Web Frontend)
echo ======================================================================
echo   DANG KHOI DONG TOAN BO HE THONG PHAN LOAI (PYTHON + WEB HMI)
echo ======================================================================

echo 1. Khoi dong Python Backend & Web Bridge (Port 8080)...
start "Python Backend & OpenCV" "%~dp0run_python_headless.bat"

timeout /t 3 /nobreak >nul

echo 2. Khoi dong Web HMI Frontend (Port 5173)...
start "Web HMI Dashboard" "%~dp0run_web.bat"

timeout /t 2 /nobreak >nul
start http://localhost:5173

echo ======================================================================
echo   HE THONG DA DUOC KHOI CHAY THANH CONG!
echo   - Web HMI:      http://localhost:5173
echo   - Python API:   http://localhost:8080/api/status
echo   - Camera Feed:  http://localhost:8080/api/video_feed
echo ======================================================================
