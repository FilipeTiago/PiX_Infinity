@echo off
setlocal EnableExtensions

rem --- CONFIG ---
set "LOG=%ProgramData%\Pix\logs\Start-Game.log"
set "HID_TASK_ON=Pix-HidHide-On"
set "HID_TASK_OFF=Pix-HidHide-Off"
set "STEAM_EXE=C:\Program Files (x86)\Steam\steam.exe"

if not exist "%ProgramData%\Pix\logs" mkdir "%ProgramData%\Pix\logs" >nul 2>&1

echo [%date% %time%] START>>"%LOG%"
whoami /all >>"%LOG%" 2>&1

set "GAME=%~1"
if not defined GAME (
  echo [%date% %time%] ERROR: No argument provided. Usage: Start-Game.cmd ^<appid|steam-url|exe^>>> "%LOG%"
  goto :end
)

rem ---- make sure Steam isn’t already holding devices ----
echo [%date% %time%] pre-clean: kill steam.exe/gameoverlayui.exe>>"%LOG%"
taskkill /IM steam.exe /IM gameoverlayui.exe /F >>"%LOG%" 2>&1
timeout /t 2 >nul

rem ---- HidHide ON (SYSTEM scheduled task) ----
echo [%date% %time%] HidHide ON => schtasks /Run /TN "%HID_TASK_ON%">>"%LOG%"
schtasks /Run /TN "%HID_TASK_ON%" >>"%LOG%" 2>&1
set "RC=%ERRORLEVEL%"
schtasks /Query /TN "%HID_TASK_ON%" /V /FO LIST | findstr /I "Last Run Result" >>"%LOG%"
echo [%date% %time%] HidHide ON rc=%RC%>>"%LOG%"
timeout /t 2 >nul

rem ---- Launch game and wait ----
echo [%date% %time%] LAUNCH: %GAME%>>"%LOG%"

set "IS_URL=%GAME:~0,8%"
echo %GAME%| findstr /R "^[0-9][0-9]*$" >nul
if %ERRORLEVEL%==0 (
  powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "Start-Process -FilePath '%STEAM_EXE%' -ArgumentList @('-applaunch','%GAME%') -Wait" >>"%LOG%" 2>&1
) else if /I "%IS_URL%"=="steam://" (
  powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "Start-Process -FilePath '%STEAM_EXE%' -ArgumentList @('%GAME%') -Wait" >>"%LOG%" 2>&1
) else if exist "%GAME%" (
  powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "Start-Process -FilePath '%GAME%' -Wait" >>"%LOG%" 2>&1
) else (
  echo [%date% %time%] ERROR: Argument not recognized: %GAME%>>"%LOG%"
)

rem ---- HidHide OFF ----
echo [%date% %time%] HidHide OFF => schtasks /Run /TN "%HID_TASK_OFF%">>"%LOG%"
schtasks /Run /TN "%HID_TASK_OFF%" >>"%LOG%" 2>&1
set "RC=%ERRORLEVEL%"
schtasks /Query /TN "%HID_TASK_OFF%" /V /FO LIST | findstr /I "Last Run Result" >>"%LOG%"
echo [%date% %time%] HidHide OFF rc=%RC%>>"%LOG%"
timeout /t 1 >nul

:end
echo [%date% %time%] END rc=%ERRORLEVEL%>>"%LOG%"
exit /b %ERRORLEVEL%
