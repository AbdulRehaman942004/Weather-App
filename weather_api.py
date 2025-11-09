import requests
import json


# API 1: Current forecast and current weather
def get_current_forecast(latitude, longitude):
    """
    Get current weather and forecast data
    """
    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": latitude,
        "longitude": longitude,
        "current": "temperature_2m,wind_speed_10m,relative_humidity_2m",
        "hourly": "temperature_2m,relative_humidity_2m,wind_speed_10m"
    }
    
    response = requests.get(url, params=params)
    
    if response.status_code == 200:
        data = response.json()
        return data
    else:
        print(f"Error {response.status_code}: {response.text}")
        return None


# API 2: Past 10 days weather data
def get_past_10_days(latitude, longitude):
    """
    Get weather data for the past 10 days
    """
    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": latitude,
        "longitude": longitude,
        "past_days": 10,
        "hourly": "temperature_2m,relative_humidity_2m,wind_speed_10m"
    }
    
    response = requests.get(url, params=params)
    
    if response.status_code == 200:
        data = response.json()
        return data
    else:
        print(f"Error {response.status_code}: {response.text}")
        return None


# API 3: Historical data (ERA5 archive)
def get_historical_data(latitude, longitude, start_date, end_date):
    """
    Get historical weather data from ERA5 archive
    Parameters:
    - latitude: float
    - longitude: float
    - start_date: string in format "YYYY-MM-DD"
    - end_date: string in format "YYYY-MM-DD"
    """
    url = "https://archive-api.open-meteo.com/v1/era5"
    params = {
        "latitude": latitude,
        "longitude": longitude,
        "start_date": start_date,
        "end_date": end_date,
        "hourly": "temperature_2m"
    }
    
    response = requests.get(url, params=params)
    
    if response.status_code == 200:
        data = response.json()
        return data
    else:
        print(f"Error {response.status_code}: {response.text}")
        return None


# Example usage
if __name__ == "__main__":
    # Example coordinates (Lahore)
    lat = 31.525309
    lon = 74.299928
    
    # Test API 1: Current forecast
    print("=== Current Forecast ===")
    current_data = get_current_forecast(lat, lon)
    if current_data:
        print(json.dumps(current_data, indent=2))
    
    # Test API 2: Past 10 days
    print("\n=== Past 10 Days ===")
    past_data = get_past_10_days(lat, lon)
    if past_data:
        print(json.dumps(past_data, indent=2))
    
    # Test API 3: Historical data
    print("\n=== Historical Data ===")
    historical_data = get_historical_data(lat, lon, "2021-01-01", "2021-12-31")
    if historical_data:
        print(json.dumps(historical_data, indent=2))
