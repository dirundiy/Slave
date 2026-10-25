@echo off
title slave
cd /d "C:\Users\default.LAPTOP-N0643BU1\Method"
start "" cmd /c "timeout /t 4 /nobreak >nul & start chrome http://127.0.0.1:5173"
npm run dev
