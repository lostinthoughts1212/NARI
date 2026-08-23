#!/bin/bash

# Start Valhalla in the background
echo "Starting Valhalla Engine..."
/valhalla/scripts/run.sh &

# Wait for Valhalla to be ready on port 8002
echo "Waiting for Valhalla to initialize..."
while ! curl -s -f http://localhost:8002/status > /dev/null; do
    sleep 2
done
echo "Valhalla is fully up and running!"

# Start the Python FastAPI backend in the foreground
echo "Starting FastAPI Backend..."
export VALHALLA_URL=http://localhost:8002/route
export CSV_PATH=/bhubaneswar_women_safe_route_synthetic_dataset.csv

# Hugging Face Spaces exposes port 7860
cd /app
uvicorn main:app --host 0.0.0.0 --port 7860
