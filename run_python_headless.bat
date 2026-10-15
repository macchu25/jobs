@echo off
title He Thong Phan Loai PLC - Python Headless Server
echo ======================================================================
echo   KHOI DONG PYTHON HEADLESS (WEBCAM + PLC + WEB BRIDGE PORT 8080)
echo   Che do chay ngam toi uu - Khong can mo cua so PyQt5
echo ======================================================================
cd /d "%~dp0temp_clone"

set "PYTHON_EXE=C:\Users\NHU HUU\AppData\Local\Python\bin\python.exe"
if not exist "%PYTHON_EXE%" (
    set "PYTHON_EXE=python"
)

"%PYTHON_EXE%" run_headless.py
pause
