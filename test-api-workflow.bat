@echo off
echo Killing existing server...
taskkill /F /IM node.exe 2>nul

echo Starting server...
cd server
start /B npm start

echo Waiting for server to start...
timeout /t 3 /nobreak >nul

echo Testing API workflow...
curl -X POST http://localhost:3001/api/process-video -H "Content-Type: application/json" -d "{\"youtubeUrl\":\"https://www.youtube.com/watch?v=jNQXAC9IVRw\",\"targetLanguage\":\"hi-IN\"}" > job_response.txt

echo Job created, extracting job ID...
for /f "tokens=2 delims=:" %%a in ('findstr "jobId" job_response.txt') do (
    for /f "tokens=1 delims=," %%b in ("%%a") do (
        set JOB_ID=%%b
    )
)

echo Job ID: %JOB_ID%
echo Waiting for processing...
timeout /t 5 /nobreak >nul

echo Checking job status...
curl http://localhost:3001/api/job-status/%JOB_ID:~1,-1%

del job_response.txt