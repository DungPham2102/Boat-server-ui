# This script simulates a Raspberry Pi Gateway sending boat telemetry data to the server.
# It sends data via HTTP POST requests to the /api/telemetry endpoint.

# --- Installation ---
# If you don't have the 'requests' library installed, open your terminal and run:
# pip install requests
# --------------------

import requests
import random
import math
import time
import json

# The full URL of the server's API endpoint
SERVER_URL = "http://localhost:3001/api/telemetry"

# We will store the state of each boat in a dictionary.
boats = {
    "00001": {
        "lat": 21.03873701,
        "lon": 105.78245842,
        "head": 45,
        "left_speed": 1500,
        "right_speed": 1500,
    },
    "00002": {
        "lat": 21.03900000,
        "lon": 105.78200000,
        "head": 120,
        "left_speed": 1500,
        "right_speed": 1500,
    },
    "00003": {
        "lat": 21.03850000,
        "lon": 105.78290000,
        "head": 270,
        "left_speed": 1500,
        "right_speed": 1500,
    },
    "00004": {
        "lat": 21.03950000,
        "lon": 105.78290000,
        "head": 270,
        "left_speed": 1500,
        "right_speed": 1500,
    },
}

def update_boat_state(boat_id):
    """Generates slightly modified data for a given boat to simulate movement."""
    boat = boats[boat_id]

    # Simulate a slight, random turn
    turn = random.uniform(-2.0, 2.0)  # Turn up to 2 degrees
    boat["head"] = (boat["head"] + turn + 360) % 360

    # Simulate slight speed changes (around 1500 for PWM)
    boat["left_speed"] += random.randint(-5, 5)
    boat["right_speed"] += random.randint(-5, 5)
    boat["left_speed"] = max(1450, min(1550, boat["left_speed"]))
    boat["right_speed"] = max(1450, min(1550, boat["right_speed"]))

    # Move the boat forward based on its heading
    speed_factor = 0.00001  # Controls how fast the boat moves on the map
    rad = math.radians(boat["head"])
    
    # Simplified movement calculation
    boat["lat"] += speed_factor * math.cos(rad)
    # Correction for longitude based on latitude
    boat["lon"] += speed_factor * math.sin(rad) / math.cos(math.radians(boat["lat"]))

    # Target heading can be fixed or randomized
    target_head = (boat["head"] + random.randint(-10, 10) + 360) % 360

    # Return a dictionary (JSON object) instead of a string
    return {
        "boatId": boat_id,
        "lat": round(boat['lat'], 6),
        "lon": round(boat['lon'], 6),
        "head": round(boat['head']),
        "targetHead": round(target_head),
        "leftSpeed": boat['left_speed'],
        "rightSpeed": boat['right_speed']
    }

def send_data_http():
    """Continuously sends simulated boat data to the server via HTTP POST."""
    print(f"✅ Starting JSON data transmission to {SERVER_URL}")
    
    while True:
        try:
            # Iterate through each boat, update and send its data
            for boat_id in boats.keys():
                data_dict = update_boat_state(boat_id)
                
                # Define headers to specify we're sending JSON
                headers = {'Content-Type': 'application/json'}
                
                # Send the data as a JSON string in the body of a POST request
                response = requests.post(SERVER_URL, data=json.dumps(data_dict), headers=headers, timeout=5)
                
                # Check the server's response
                if response.status_code == 200:
                    print(f"➡️  Sent: {json.dumps(data_dict)} | ✅ Server OK")
                else:
                    # Print an error if the server responded with a non-200 status
                    print(f"➡️  Sent: {json.dumps(data_dict)} | ❌ Server responded with {response.status_code}: {response.text}")

                # Stagger the updates for each boat slightly
                time.sleep(0.5)
            
            # Wait a bit before the next round of updates for all boats
            time.sleep(1)

        except requests.exceptions.RequestException as e:
            print(f"🔌 Connection error: {e}")
            print("Retrying in 5 seconds...")
            time.sleep(5)
        except KeyboardInterrupt:
            print("\n🛑 Simulation stopped by user.")
            break
        except Exception as e:
            print(f"An unexpected error occurred: {e}")
            print("Retrying in 5 seconds...")
            time.sleep(5)

if __name__ == "__main__":
    print("--- HTTP Gateway Simulator ---")
    # Note: Make sure the boats in the 'boats' dictionary (e.g., 'boat1', 'boat2')
    # exist in your database with matching boatId values.
    send_data_http()
