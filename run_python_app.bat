@echo off
title He Thong Phan Loai PLC - Python Desktop & Web Bridge
echo ======================================================================
echo   KHOI DONG HE THONG PHAN LOAI PLC & WEBCAM OPENCV (PYTHON DESKTOP)
echo   Web Bridge API & WebSocket Port: 8080
echo ======================================================================
cd /d "%~dp0temp_clone"

set "PYTHON_EXE=C:\Users\NHU HUU\AppData\Local\Python\bin\python.exe"
if not exist "%PYTHON_EXE%" (
    set "PYTHON_EXE=python"
)

"%PYTHON_EXE%" main.py
pause
