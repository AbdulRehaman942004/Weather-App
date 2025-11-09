from flask import Flask, render_template, jsonify, request
from flask_cors import CORS
import requests
from datetime import datetime, timedelta
from weather_api import get_current_forecast, get_past_10_days, get_historical_data

app = Flask(__name__)
CORS(app)

def get_location_from_query(query):
    """Get coordinates from location name using geocoding"""
    url = "https://geocoding-api.open-meteo.com/v1/search"
    params = {
        "name": query,
        "count": 1,
        "language": "en",
        "format": "json"
    }
    
    try:
        response = requests.get(url, params=params, timeout=10)
        if response.status_code == 200:
            data = response.json()
            if data.get("results") and len(data["results"]) > 0:
                result = data["results"][0]
                return {
                    "latitude": result["latitude"],
                    "longitude": result["longitude"],
                    "name": result["name"],
                    "country": result.get("country", "")
                }
        return None
    except Exception as e:
        print(f"Error geocoding: {e}")
        return None

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/weather', methods=['GET'])
def weather():
    location_query = request.args.get('location', '')
    latitude = request.args.get('latitude', type=float)
    longitude = request.args.get('longitude', type=float)
    past_days = request.args.get('past_days', 0, type=int)
    
    # If location name provided, geocode it
    if location_query and not (latitude and longitude):
        location_data = get_location_from_query(location_query)
        if location_data:
            latitude = location_data["latitude"]
            longitude = location_data["longitude"]
            location_name = location_data["name"]
            country = location_data["country"]
        else:
            return jsonify({"error": "Location not found"}), 404
    elif not (latitude and longitude):
        # Default to Lahore
        latitude = 31.525309
        longitude = 74.299928
        location_name = "Lahore"
        country = "Pakistan"
    else:
        location_name = f"{latitude}, {longitude}"
        country = ""
    
    # Use API 1: Current forecast
    weather_data = get_current_forecast(latitude, longitude)
    
    # If past_days is requested, use API 2: Past 10 days
    if past_days > 0:
        past_data = get_past_10_days(latitude, longitude)
        if past_data and weather_data:
            # Merge past days data with current forecast
            if "hourly" in past_data:
                # Combine hourly data
                if "hourly" not in weather_data:
                    weather_data["hourly"] = {}
                # Extend hourly arrays with past data
                for key in past_data["hourly"]:
                    if key in weather_data["hourly"]:
                        weather_data["hourly"][key] = past_data["hourly"][key] + weather_data["hourly"][key]
                    else:
                        weather_data["hourly"][key] = past_data["hourly"][key]
    
    if weather_data:
        weather_data["location"] = {
            "name": location_name,
            "country": country,
            "latitude": latitude,
            "longitude": longitude
        }
        return jsonify(weather_data)
    else:
        return jsonify({"error": "Failed to fetch weather data"}), 500

@app.route('/api/historical', methods=['GET'])
def historical():
    location_query = request.args.get('location', '')
    latitude = request.args.get('latitude', type=float)
    longitude = request.args.get('longitude', type=float)
    start_date = request.args.get('start_date', '')
    end_date = request.args.get('end_date', '')
    
    # If location name provided, geocode it
    if location_query and not (latitude and longitude):
        location_data = get_location_from_query(location_query)
        if location_data:
            latitude = location_data["latitude"]
            longitude = location_data["longitude"]
            location_name = location_data["name"]
            country = location_data["country"]
        else:
            return jsonify({"error": "Location not found"}), 404
    elif not (latitude and longitude):
        return jsonify({"error": "Latitude and longitude required"}), 400
    else:
        location_name = f"{latitude}, {longitude}"
        country = ""
    
    # Validate dates
    if not start_date or not end_date:
        return jsonify({"error": "start_date and end_date required (format: YYYY-MM-DD)"}), 400
    
    # Use API 3: Historical data
    historical_data = get_historical_data(latitude, longitude, start_date, end_date)
    
    if historical_data:
        historical_data["location"] = {
            "name": location_name,
            "country": country,
            "latitude": latitude,
            "longitude": longitude
        }
        return jsonify(historical_data)
    else:
        return jsonify({"error": "Failed to fetch historical data"}), 500

@app.route('/api/search', methods=['GET'])
def search():
    query = request.args.get('q', '')
    if not query:
        return jsonify({"error": "Query parameter required"}), 400
    
    location_data = get_location_from_query(query)
    if location_data:
        return jsonify(location_data)
    else:
        return jsonify({"error": "Location not found"}), 404

@app.route('/api/autocomplete', methods=['GET'])
def autocomplete():
    """Return multiple location suggestions for autocomplete"""
    query = request.args.get('q', '')
    if not query or len(query) < 2:
        return jsonify({"results": []})
    
    url = "https://geocoding-api.open-meteo.com/v1/search"
    params = {
        "name": query,
        "count": 5,  # Return up to 5 suggestions
        "language": "en",
        "format": "json"
    }
    
    try:
        response = requests.get(url, params=params, timeout=10)
        if response.status_code == 200:
            data = response.json()
            if data.get("results"):
                results = []
                for result in data["results"][:5]:  # Limit to 5 results
                    results.append({
                        "name": result["name"],
                        "country": result.get("country", ""),
                        "latitude": result["latitude"],
                        "longitude": result["longitude"],
                        "display": f"{result['name']}, {result.get('country', '')}"
                    })
                return jsonify({"results": results})
        return jsonify({"results": []})
    except Exception as e:
        print(f"Error in autocomplete: {e}")
        return jsonify({"results": []})

if __name__ == '__main__':
    app.run(debug=True, port=5000)

