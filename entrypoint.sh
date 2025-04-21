#!/bin/bash

cleanup() {
    echo -e "\n\e[1;33mShutting down Slurp Tools...\e[0m"
    kill $(jobs -p) 2>/dev/null
    exit 0
}

# Registra la función de limpieza para señales de terminación
trap cleanup SIGINT SIGTERM

echo -e "Starting application..."
cd /scanner && uv run python3 -m uvicorn main:app --host 0.0.0.0 --port 8000 >/dev/null 2>&1 &
API_PID=$!
PORT=2222 node /app/frontend-build/index.js >/dev/null 2>&1 &
FRONTEND_PID=$!
/bin/backend-server >/dev/null 2>&1 &
BACKEND_PID=$!

for pid in $API_PID $FRONTEND_PID $BACKEND_PID; do
    if ! kill -0 $pid 2>/dev/null; then
        echo -e "\e[1;31mError: there was a problem with a process: (PID $pid).\e[0m"
        cleanup
    fi
done

sleep 3

clear

echo -e "\e[1;36m"
echo -e "   _____ _                   _____           _     "
echo -e "  / ____| |                 |_   _|         | |    "
echo -e " | (___ | |_   _ _ __ _ __    | |  ___   ___| |___ "
echo -e "  \\___ \\| | | | | '__| '_ \\   | | / _ \\ / _ \\ / __|"
echo -e "  ____) | | |_| | |  | |_) |  | || (_) | (_) \\__ \\"
echo -e " |_____/|_|\\__,_|_|  | .__/   |_| \\___/ \\___/|___/"
echo -e "                     | |                          "
echo -e "                     |_|                          "
echo -e "\e[0m"
echo -e "\e[1;32mWelcome to Slurp Tools!\e[0m"
echo -e "\e[1m"
echo -e "All services have started successfully."
echo -e ""
echo -e "Access the application at: \e[4;34mhttp://localhost:2222\e[0m"
echo -e ""
echo -e "Available services:"
echo -e "- \e[33mFrontend UI:\e[0m      http://localhost:2222"
echo -e "- \e[33mAPI Backend:\e[0m      http://localhost:8000"
echo -e "- \e[33mScanner Service:\e[0m  http://localhost:3000"
echo -e "\e[0m"
echo -e "Press Ctrl+C to stop all services."

wait
