@echo off
title Cartografias em Disputa - servidor local
cd /d "%~dp0"
echo Iniciando o geoportal Cartografias em Disputa...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0server.ps1"
if errorlevel 1 (
  echo.
  echo O servidor PowerShell nao iniciou. Tentando com Python...
  python server.py
)
pause
