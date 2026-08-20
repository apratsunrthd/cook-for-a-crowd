@echo off
REM Stops the Cook for a Crowd container started by
REM "Start Cook for a Crowd.bat". Your data stays put -- it lives in the
REM data folder on your computer, not inside the container, so stopping
REM (or even deleting) the container never touches it.
cd /d "%~dp0"
docker compose down
echo Stopped.
pause
