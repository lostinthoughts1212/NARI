import pandas as pd
import math
from typing import List, Dict

# 1 degree of latitude is approx 111km
# 1 degree of longitude is approx 111km * cos(latitude)
# We want to create a small polygon around a point to avoid it.
# Let's say ~25 meters radius (50x50m danger zones) to fit inside Valhalla's 10,000m circumference limit for 50 polygons.
RADIUS_DEG = 0.0002 # Roughly 25 meters

def create_square_polygon(lat: float, lon: float, radius: float = RADIUS_DEG) -> List[List[float]]:
    """Creates a simple square polygon around a coordinate."""
    return [
        [lon - radius, lat - radius],
        [lon + radius, lat - radius],
        [lon + radius, lat + radius],
        [lon - radius, lat + radius],
        [lon - radius, lat - radius] # Close the polygon
    ]

def get_high_risk_polygons(csv_path: str) -> List[List[List[float]]]:
    """
    Reads the synthetic crime dataset, aggregates high-risk points into a grid,
    and returns a list of polygons for Valhalla to avoid.
    """
    try:
        df = pd.read_csv(csv_path)
        
        # Filter for high risk
        high_risk_df = df[(df['severity'] >= 4) | (df['risk_score'] >= 80) | (df['lighting'] == 'Poor')].copy()
        
        # Round to 3 decimal places to create a ~111m grid
        high_risk_df['grid_lat'] = high_risk_df['latitude'].round(3)
        high_risk_df['grid_lon'] = high_risk_df['longitude'].round(3)
        
        # Drop duplicates in the grid to merge overlapping zones
        unique_grids = high_risk_df.drop_duplicates(subset=['grid_lat', 'grid_lon'])
        
        polygons = []
        for _, row in unique_grids.iterrows():
            # Create a larger polygon (radius 0.0005 = ~55m radius, 111m width) to cover the grid cell
            poly = create_square_polygon(row['grid_lat'], row['grid_lon'], radius=0.0005)
            polygons.append(poly)
            
        return polygons
    except Exception as e:
        print(f"Error processing CSV: {e}")
        return []

if __name__ == "__main__":
    # Test
    csv_file = "../bhubaneswar_women_safe_route_synthetic_dataset.csv"
    polys = get_high_risk_polygons(csv_file)
    print(f"Generated {len(polys)} high-risk polygons to avoid.")
