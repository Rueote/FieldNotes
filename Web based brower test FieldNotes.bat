cd /d "M:\Script Editor Custom\scriptsmith-studio"
start /min cmd /k "npm run dev"
timeout /t 1
start http://localhost:8080