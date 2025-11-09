// API Base URL
const API_BASE = '';

// DOM Elements
const locationInput = document.getElementById('locationInput');
const searchBtn = document.getElementById('searchBtn');
const currentLocationBtn = document.getElementById('currentLocationBtn');
const loading = document.getElementById('loading');
const weatherContent = document.getElementById('weatherContent');
const currentWeather = document.getElementById('currentWeather');
const hourlyForecast = document.getElementById('hourlyForecast');
const pastDaysForecast = document.getElementById('pastDaysForecast');
const pastDaysToggle = document.getElementById('pastDaysToggle');
const errorMessage = document.getElementById('errorMessage');
const errorText = document.getElementById('errorText');
const startDate = document.getElementById('startDate');
const endDate = document.getElementById('endDate');
const loadHistoricalBtn = document.getElementById('loadHistoricalBtn');
const historicalForecast = document.getElementById('historicalForecast');
const autocompleteDropdown = document.getElementById('autocompleteDropdown');

// State
let currentLat = null;
let currentLon = null;
let autocompleteTimeout = null;
let autocompleteResults = [];
let currentUnit = 'c';
let currentTempC = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Request user location on page load
    requestUserLocation();
    
    // Event listeners
    searchBtn.addEventListener('click', handleSearch);
    locationInput.addEventListener('input', handleAutocomplete);
    locationInput.addEventListener('keydown', handleKeyDown);
    locationInput.addEventListener('focus', () => {
        if (autocompleteResults.length > 0) {
            autocompleteDropdown.classList.add('show');
        }
    });
    
    // Close autocomplete when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-wrapper')) {
            autocompleteDropdown.classList.remove('show');
        }
    });
    
    currentLocationBtn.addEventListener('click', getCurrentLocation);
    pastDaysToggle.addEventListener('change', handlePastDaysToggle);
    loadHistoricalBtn.addEventListener('click', handleHistoricalData);
    
    // Set default date range (last year)
    const today = new Date();
    const oneYearAgo = new Date(today);
    oneYearAgo.setFullYear(today.getFullYear() - 1);
    endDate.value = today.toISOString().split('T')[0];
    startDate.value = oneYearAgo.toISOString().split('T')[0];
    
    // Unit toggle functionality
    const unitButtons = document.querySelectorAll('.unit-btn');
    unitButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            unitButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const newUnit = btn.dataset.unit;
            
            // Convert temperature using stored Celsius value
            if (currentTempC !== null) {
                const tempEl = document.getElementById('currentTemp');
                if (newUnit === 'f') {
                    const tempF = Math.round((currentTempC * 9/5) + 32);
                    tempEl.textContent = tempF;
                } else {
                    tempEl.textContent = currentTempC;
                }
                currentUnit = newUnit;
            }
        });
    });
});

// Request user location on page load
function requestUserLocation() {
    if (!navigator.geolocation) {
        // Fallback to default location if geolocation not supported
        loadWeather();
        return;
    }
    
    showLoading();
    
    navigator.geolocation.getCurrentPosition(
        (position) => {
            currentLat = position.coords.latitude;
            currentLon = position.coords.longitude;
            loadWeather(currentLat, currentLon);
        },
        (error) => {
            // If user denies or error occurs, load default location
            console.log('Location access denied or error:', error);
            loadWeather();
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        }
    );
}

// Get current location (manual button click)
function getCurrentLocation() {
    if (!navigator.geolocation) {
        showError('Geolocation is not supported by your browser');
        return;
    }
    
    currentLocationBtn.disabled = true;
    const locationIcon = currentLocationBtn.querySelector('i');
    if (locationIcon) {
        locationIcon.className = 'ti ti-loader-2';
    }
    
    navigator.geolocation.getCurrentPosition(
        (position) => {
            currentLat = position.coords.latitude;
            currentLon = position.coords.longitude;
            loadWeather(currentLat, currentLon);
            locationInput.value = '';
            autocompleteDropdown.classList.remove('show');
            currentLocationBtn.disabled = false;
            if (locationIcon) {
                locationIcon.className = 'ti ti-map-pin';
            }
        },
        (error) => {
            showError('Unable to retrieve your location');
            currentLocationBtn.disabled = false;
            if (locationIcon) {
                locationIcon.className = 'ti ti-map-pin';
            }
        }
    );
}

// Handle autocomplete
function handleAutocomplete(e) {
    const query = e.target.value.trim();
    
    // Clear previous timeout
    if (autocompleteTimeout) {
        clearTimeout(autocompleteTimeout);
    }
    
    // Hide dropdown if query is too short
    if (query.length < 2) {
        autocompleteDropdown.classList.remove('show');
        autocompleteResults = [];
        return;
    }
    
    // Debounce autocomplete requests
    autocompleteTimeout = setTimeout(async () => {
        try {
            const response = await fetch(`${API_BASE}/api/autocomplete?q=${encodeURIComponent(query)}`);
            const data = await response.json();
            
            if (data.results && data.results.length > 0) {
                autocompleteResults = data.results;
                displayAutocompleteResults(data.results);
                autocompleteDropdown.classList.add('show');
            } else {
                autocompleteDropdown.classList.remove('show');
                autocompleteResults = [];
            }
        } catch (error) {
            console.error('Error fetching autocomplete:', error);
            autocompleteDropdown.classList.remove('show');
        }
    }, 300); // 300ms debounce
}

// Handle keyboard navigation in autocomplete
function handleKeyDown(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        const query = locationInput.value.trim();
        if (query && autocompleteResults.length > 0) {
            // Select first result
            selectLocation(autocompleteResults[0]);
        } else if (query) {
            handleSearch();
        }
    } else if (e.key === 'Escape') {
        autocompleteDropdown.classList.remove('show');
    }
}

// Display autocomplete results
function displayAutocompleteResults(results) {
    autocompleteDropdown.innerHTML = '';
    
    results.forEach((result, index) => {
        const item = document.createElement('div');
        item.className = 'autocomplete-item';
        item.innerHTML = `
            <div class="autocomplete-item-name">${result.name}</div>
            <div class="autocomplete-item-country">${result.country}</div>
        `;
        item.addEventListener('click', () => selectLocation(result));
        autocompleteDropdown.appendChild(item);
    });
}

// Select location from autocomplete
function selectLocation(location) {
    locationInput.value = location.display;
    autocompleteDropdown.classList.remove('show');
    
    // Load weather for selected location
    currentLat = location.latitude;
    currentLon = location.longitude;
    loadWeather(currentLat, currentLon);
}

// Handle search
function handleSearch() {
    const query = locationInput.value.trim();
    if (!query) {
        showError('Please enter a location');
        return;
    }
    
    // If there are autocomplete results and query matches, use coordinates
    const matchingResult = autocompleteResults.find(r => r.display === query);
    if (matchingResult) {
        selectLocation(matchingResult);
    } else {
        // Otherwise, search by name
        loadWeather(null, null, query);
    }
}

// Handle past days toggle
function handlePastDaysToggle() {
    if (pastDaysToggle.checked) {
        loadWeather(currentLat, currentLon, null, 10);
    } else {
        loadWeather(currentLat, currentLon);
    }
}

// Load weather data
async function loadWeather(lat = null, lon = null, location = null, pastDays = 0) {
    showLoading();
    
    try {
        let url = `${API_BASE}/api/weather?`;
        
        if (location) {
            url += `location=${encodeURIComponent(location)}`;
        } else if (lat && lon) {
            url += `latitude=${lat}&longitude=${lon}`;
            currentLat = lat;
            currentLon = lon;
        } else {
            // If no location provided, use default (empty query will use default in backend)
            url += `latitude=31.525309&longitude=74.299928`;
        }
        
        if (pastDays > 0) {
            url += `&past_days=${pastDays}`;
        }
        
        console.log('Fetching weather from:', url);
        const response = await fetch(url);
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}: ${response.statusText}` }));
            hideLoading();
            showError(errorData.error || `Failed to load weather data (${response.status})`);
            return;
        }
        
        const data = await response.json();
        displayWeather(data);
        hideError();
    } catch (error) {
        console.error('Error loading weather:', error);
        hideLoading();
        showError(`Network error: ${error.message}. Please make sure the server is running.`);
    }
}

// Display weather data
function displayWeather(data) {
    // Store coordinates for historical data
    if (data.location) {
        if (data.location.latitude && data.location.longitude) {
            currentLat = data.location.latitude;
            currentLon = data.location.longitude;
        }
    }
    
    // Update current weather
    if (data.current) {
        const temp = Math.round(data.current.temperature_2m);
        currentTempC = temp;
        const tempEl = document.getElementById('currentTemp');
        if (tempEl) {
            if (currentUnit === 'f') {
                const tempF = Math.round((temp * 9/5) + 32);
                tempEl.textContent = tempF;
            } else {
                tempEl.textContent = temp;
            }
        }
        
        const windSpeed = data.current.wind_speed_10m || 0;
        const windSpeedEl = document.getElementById('windSpeed');
        if (windSpeedEl) {
            windSpeedEl.textContent = `${windSpeed.toFixed(1)} km/h`;
        }
        
        const humidity = data.current.relative_humidity_2m || 0;
        const humidityEl = document.getElementById('humidity');
        if (humidityEl) {
            humidityEl.textContent = `${humidity}%`;
        }
        
        // Precipitation (default to 0% if not available)
        const precipitation = 0;
        const precipitationEl = document.getElementById('precipitation');
        if (precipitationEl) {
            precipitationEl.textContent = `${precipitation}%`;
        }
        
        // Update current time
        const now = new Date();
        const timeStr = now.toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit',
            hour12: true 
        });
        const dayStr = now.toLocaleDateString('en-US', { 
            weekday: 'long' 
        });
        const currentTimeEl = document.getElementById('currentTime');
        if (currentTimeEl) {
            currentTimeEl.textContent = `${dayStr} ${timeStr}`;
        }
        
        // Update weather condition based on temperature
        const condition = getWeatherCondition(temp);
        const conditionEl = document.getElementById('weatherCondition');
        if (conditionEl) {
            conditionEl.textContent = condition;
        }
        
        // Update weather icon based on temperature
        const iconClass = getWeatherIcon(temp);
        const weatherIconEl = document.getElementById('weatherIcon');
        if (weatherIconEl) {
            weatherIconEl.innerHTML = `<i class="ti ${iconClass}"></i>`;
        }
    }
    
    // Display hourly forecast
    if (data.hourly) {
        displayHourlyForecast(data.hourly);
    }
    
    // Display past days if available
    if (pastDaysToggle.checked && data.hourly) {
        displayPastDays(data.hourly);
    } else {
        pastDaysForecast.innerHTML = '';
    }
    
    hideLoading();
}

// Display hourly forecast
function displayHourlyForecast(hourlyData) {
    hourlyForecast.innerHTML = '';
    
    const times = hourlyData.time || [];
    const temps = hourlyData.temperature_2m || [];
    const humidity = hourlyData.relative_humidity_2m || [];
    const windSpeed = hourlyData.wind_speed_10m || [];
    
    // Show next 24 hours
    const now = new Date();
    let startIndex = 0;
    
    // Find the current hour or next hour
    for (let i = 0; i < times.length; i++) {
        const hourTime = new Date(times[i]);
        if (hourTime >= now) {
            startIndex = i;
            break;
        }
    }
    
    for (let i = startIndex; i < Math.min(startIndex + 24, times.length); i++) {
        const hourTime = new Date(times[i]);
        const timeStr = formatTime(hourTime);
        const temp = Math.round(temps[i] || 0);
        const hum = Math.round(humidity[i] || 0);
        const wind = (windSpeed[i] || 0).toFixed(1);
        
        const hourItem = document.createElement('div');
        hourItem.className = 'hourly-item';
        hourItem.innerHTML = `
            <div class="hourly-time">${timeStr}</div>
            <div class="hourly-temp">${temp}°</div>
            <div class="hourly-details">
                <div class="hourly-detail-item"><i class="ti ti-droplet"></i> ${hum}%</div>
                <div class="hourly-detail-item"><i class="ti ti-wind"></i> ${wind}</div>
            </div>
        `;
        
        hourlyForecast.appendChild(hourItem);
    }
}

// Display past days
function displayPastDays(hourlyData) {
    pastDaysForecast.innerHTML = '';
    
    const times = hourlyData.time || [];
    const temps = hourlyData.temperature_2m || [];
    const humidity = hourlyData.relative_humidity_2m || [];
    const windSpeed = hourlyData.wind_speed_10m || [];
    
    // Group by date
    const daysMap = new Map();
    
    for (let i = 0; i < times.length; i++) {
        const date = new Date(times[i]);
        const dateKey = date.toDateString();
        
        if (!daysMap.has(dateKey)) {
            daysMap.set(dateKey, {
                temps: [],
                humidity: [],
                windSpeed: []
            });
        }
        
        const dayData = daysMap.get(dateKey);
        dayData.temps.push(temps[i]);
        dayData.humidity.push(humidity[i]);
        dayData.windSpeed.push(windSpeed[i]);
    }
    
    // Display each day
    const sortedDays = Array.from(daysMap.entries()).sort((a, b) => {
        return new Date(a[0]) - new Date(b[0]);
    });
    
    sortedDays.forEach(([dateKey, dayData]) => {
        const date = new Date(dateKey);
        const avgTemp = Math.round(dayData.temps.reduce((a, b) => a + b, 0) / dayData.temps.length);
        const avgHumidity = Math.round(dayData.humidity.reduce((a, b) => a + b, 0) / dayData.humidity.length);
        const avgWind = (dayData.windSpeed.reduce((a, b) => a + b, 0) / dayData.windSpeed.length).toFixed(1);
        const maxTemp = Math.round(Math.max(...dayData.temps));
        const minTemp = Math.round(Math.min(...dayData.temps));
        
        const dayItem = document.createElement('div');
        dayItem.className = 'past-day-item';
        dayItem.innerHTML = `
            <div>
                <div class="past-day-date">${formatDate(date)}</div>
                <div class="past-day-details">${avgHumidity}% humidity</div>
            </div>
            <div style="text-align: right;">
                <div class="past-day-temp">${avgTemp}°C</div>
                <div class="past-day-details">${minTemp}° / ${maxTemp}° • ${avgWind} km/h</div>
            </div>
        `;
        
        pastDaysForecast.appendChild(dayItem);
    });
}

// Format time
function formatTime(date) {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
}

// Format date
function formatDate(date) {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
        return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
        return 'Yesterday';
    } else {
        return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    }
}

// Get weather icon class based on temperature
function getWeatherIcon(temp) {
    const hour = new Date().getHours();
    const isNight = hour >= 18 || hour < 6;
    
    if (temp >= 30) return isNight ? 'ti-moon' : 'ti-sun';
    if (temp >= 20) return isNight ? 'ti-moon' : 'ti-sun';
    if (temp >= 10) return isNight ? 'ti-moon-stars' : 'ti-cloud';
    if (temp >= 0) return isNight ? 'ti-moon-stars' : 'ti-cloud-snow';
    return 'ti-snowflake';
}

// Get weather condition text
function getWeatherCondition(temp) {
    if (temp >= 30) return 'Clear';
    if (temp >= 20) return 'Clear';
    if (temp >= 10) return 'Partly Cloudy';
    if (temp >= 0) return 'Cloudy';
    return 'Snow';
}


// Show loading
function showLoading() {
    loading.style.display = 'flex';
    weatherContent.style.display = 'none';
}

// Hide loading
function hideLoading() {
    loading.style.display = 'none';
    weatherContent.style.display = 'block';
}

// Show error
function showError(message) {
    errorText.textContent = message;
    errorMessage.style.display = 'flex';
    setTimeout(() => {
        errorMessage.style.display = 'none';
    }, 5000);
}

// Hide error
function hideError() {
    errorMessage.style.display = 'none';
}

// Handle historical data request
async function handleHistoricalData() {
    if (!currentLat || !currentLon) {
        showError('Please search for a location first');
        return;
    }
    
    const start = startDate.value;
    const end = endDate.value;
    
    if (!start || !end) {
        showError('Please select both start and end dates');
        return;
    }
    
    if (new Date(start) > new Date(end)) {
        showError('Start date must be before end date');
        return;
    }
    
    loadHistoricalBtn.disabled = true;
    loadHistoricalBtn.textContent = 'Loading...';
    historicalForecast.innerHTML = '<div class="loading"><div class="spinner"></div><p>Loading historical data...</p></div>';
    
    try {
        let url = `${API_BASE}/api/historical?latitude=${currentLat}&longitude=${currentLon}&start_date=${start}&end_date=${end}`;
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (response.ok) {
            displayHistoricalData(data);
            hideError();
        } else {
            showError(data.error || 'Failed to load historical data');
            historicalForecast.innerHTML = '<p class="placeholder-text">Failed to load historical data. Please try again.</p>';
        }
    } catch (error) {
        console.error('Error loading historical data:', error);
        showError(`Network error: ${error.message}. Please make sure the server is running.`);
        historicalForecast.innerHTML = '<p class="placeholder-text">Network error. Please try again.</p>';
        loadHistoricalBtn.disabled = false;
        loadHistoricalBtn.textContent = 'Load Historical Data';
    } finally {
        loadHistoricalBtn.disabled = false;
        loadHistoricalBtn.textContent = 'Load Historical Data';
    }
}

// Display historical data
function displayHistoricalData(data) {
    historicalForecast.innerHTML = '';
    
    if (!data.hourly || !data.hourly.time || !data.hourly.temperature_2m) {
        historicalForecast.innerHTML = '<p class="placeholder-text">No historical data available for the selected date range.</p>';
        return;
    }
    
    const times = data.hourly.time || [];
    const temps = data.hourly.temperature_2m || [];
    
    // Group by date
    const daysMap = new Map();
    
    for (let i = 0; i < times.length; i++) {
        const date = new Date(times[i]);
        const dateKey = date.toDateString();
        
        if (!daysMap.has(dateKey)) {
            daysMap.set(dateKey, {
                temps: [],
                date: date
            });
        }
        
        const dayData = daysMap.get(dateKey);
        dayData.temps.push(temps[i]);
    }
    
    // Display each day
    const sortedDays = Array.from(daysMap.entries()).sort((a, b) => {
        return new Date(a[0]) - new Date(b[0]);
    });
    
    if (sortedDays.length === 0) {
        historicalForecast.innerHTML = '<p class="placeholder-text">No data available for the selected date range.</p>';
        return;
    }
    
    sortedDays.forEach(([dateKey, dayData]) => {
        const avgTemp = Math.round(dayData.temps.reduce((a, b) => a + b, 0) / dayData.temps.length);
        const maxTemp = Math.round(Math.max(...dayData.temps));
        const minTemp = Math.round(Math.min(...dayData.temps));
        
        const dayItem = document.createElement('div');
        dayItem.className = 'historical-day-item';
        dayItem.innerHTML = `
            <div>
                <div class="historical-day-date">${formatHistoricalDate(dayData.date)}</div>
            </div>
            <div style="text-align: right;">
                <div class="historical-day-temp">${avgTemp}°C</div>
                <div class="historical-day-details">${minTemp}° / ${maxTemp}°</div>
            </div>
        `;
        
        historicalForecast.appendChild(dayItem);
    });
}

// Format historical date
function formatHistoricalDate(date) {
    return date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric',
        month: 'long', 
        day: 'numeric' 
    });
}

