from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import requests
import json
from data_processor import get_high_risk_polygons

app = FastAPI(title="NARI Routing API")

# Allow CORS for the React Native app
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

import os

# Load polygons once at startup
CSV_PATH = os.environ.get("CSV_PATH", "../bhubaneswar_women_safe_route_synthetic_dataset.csv")
HIGH_RISK_POLYGONS = get_high_risk_polygons(CSV_PATH)
VALHALLA_URL = os.environ.get("VALHALLA_URL", "http://localhost:8002/route")

class RouteRequest(BaseModel):
    start_lat: float
    start_lon: float
    end_lat: float
    end_lon: float
    costing: str = "pedestrian" # default to pedestrian for safety routes, could be auto
    avoid_danger_zones: bool = True

def point_to_segment_dist(px, py, x1, y1, x2, y2):
    l2 = (x2 - x1)**2 + (y2 - y1)**2
    if l2 == 0:
        return (px - x1)**2 + (py - y1)**2
    t = max(0, min(1, ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2))
    proj_x = x1 + t * (x2 - x1)
    proj_y = y1 + t * (y2 - y1)
    return (px - proj_x)**2 + (py - proj_y)**2

@app.post("/route")
async def get_safe_route(request: RouteRequest):
    """
    Fetches a route from Valhalla while avoiding high-risk polygons.
    """
    if not HIGH_RISK_POLYGONS:
        print("Warning: No high-risk polygons loaded.")
    
    # Filter polygons to only those near the route to avoid Valhalla payload limits
    min_lat = min(request.start_lat, request.end_lat) - 0.05
    max_lat = max(request.start_lat, request.end_lat) + 0.05
    min_lon = min(request.start_lon, request.end_lon) - 0.05
    max_lon = max(request.start_lon, request.end_lon) + 0.05
    
    relevant_polygons = []
    for poly in HIGH_RISK_POLYGONS:
        # A polygon is [[lon, lat], ...]. Check if the first point is in the bounding box
        lon, lat = poly[0][0], poly[0][1]
        if min_lat <= lat <= max_lat and min_lon <= lon <= max_lon:
            relevant_polygons.append(poly)
            
    # Sort polygons by distance to the direct line between start and end
    relevant_polygons.sort(key=lambda poly: point_to_segment_dist(
        poly[0][1], poly[0][0],
        request.start_lat, request.start_lon,
        request.end_lat, request.end_lon
    ))

    # Valhalla expects a JSON payload
    valhalla_query = {
        "locations": [
            {"lat": request.start_lat, "lon": request.start_lon},
            {"lat": request.end_lat, "lon": request.end_lon}
        ],
        "costing": request.costing,
        "costing_options": {
            request.costing: {
                "use_lit": 1.0 # Prefer lit streets (scale 0-1, where 1 means heavily prefer)
            }
        },
        "directions_options": {
            "units": "kilometers",
            "alternates": 2
        }
    }
    
    if request.avoid_danger_zones:
        # We sort by route proximity, so the top 100 will cover all danger zones strictly on the route
        # 100 polygons * 440m = 44,000m, which stays safely under our new 50,000m Valhalla limit
        valhalla_query["avoid_polygons"] = relevant_polygons[:100]
    
    try:
        response = requests.post(VALHALLA_URL, data=json.dumps(valhalla_query))
        
        # If it failed because polygons completely blocked the path, retry without them
        if not response.ok:
            error_data = {}
            try:
                error_data = response.json()
            except:
                pass
                
            if error_data.get("error_code") == 442 and request.avoid_danger_zones:
                print("Valhalla could not find a safe route. Retrying without polygons...")
                del valhalla_query["avoid_polygons"]
                retry_response = requests.post(VALHALLA_URL, data=json.dumps(valhalla_query))
                retry_response.raise_for_status()
                
                resp_json = retry_response.json()
                resp_json["warning"] = "Safe route fully blocked by danger zones. Showing standard route instead."
                return resp_json

            print("Valhalla error response:", response.text)
            response.raise_for_status()
            
        return response.json()
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=500, detail=f"Error communicating with Valhalla: {str(e)}")

@app.get("/health")
def health_check():
    return {"status": "ok", "polygons_loaded": len(HIGH_RISK_POLYGONS)}

@app.get("/polygons")
def get_polygons():
    """
    Returns the high-risk polygons to be visualized on the frontend map.
    """
    return {"polygons": HIGH_RISK_POLYGONS}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
