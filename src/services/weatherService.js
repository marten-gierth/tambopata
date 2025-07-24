import { DateTime } from 'luxon';
import { LOCATIONS } from '../config.js';

// A simple in-memory cache to minimize API requests.
const cache = {
    data: null,
    timestamp: 0,
    // Store the in-flight fetch promise to prevent race conditions
    fetchPromise: null,
    // Cache is valid for 15 minutes (in milliseconds)
    CACHE_DURATION: 15 * 60 * 1000
};

/**
 * Fetches and caches weather data for all locations defined in config.js.
 * This function is the base for all other data processing.
 */
export async function getSharedWeatherData() {
    const now = Date.now();

    // 1. Check if valid data exists in the cache
    if (cache.data && (now - cache.timestamp < cache.CACHE_DURATION)) {
        console.log("✅ Weather data loaded from cache.");
        return cache.data;
    }

    // 2. Check if a fetch is already in progress. If so, return the existing promise.
    if (cache.fetchPromise) {
        console.log("⏳ Waiting for an already ongoing API fetch...");
        return cache.fetchPromise;
    }

    console.log("🔥 Fetching new weather data from the API...");

    // 3. If no cache and no ongoing fetch, start a new one.
    // We wrap the logic in an immediately-invoked async function
    // to store the promise in cache.fetchPromise.
    cache.fetchPromise = (async () => {
        try {
            const fetchPromises = LOCATIONS.map(location =>
                fetch(`https://api.open-meteo.com/v1/forecast?latitude=${location.latitude}&longitude=${location.longitude}&daily=temperature_2m_max,temperature_2m_min,sunrise,sunset&hourly=temperature_2m,weathercode,precipitation&timezone=auto&forecast_days=2`)
                    .then(res => res.json())
                    .then(data => ({ ...location, weather: data }))
            );

            const results = await Promise.all(fetchPromises);
            console.log("✅ API fetch successful. Combined data:", results);

            // Store the results in the cache
            cache.data = results;
            cache.timestamp = Date.now(); // Use a fresh timestamp

            return cache.data;
        } catch (error) {
            console.error("API fetch failed:", error);
            // In case of error, re-throw it so callers can handle it
            throw error;
        } finally {
            // IMPORTANT: Clear the promise once it's resolved or rejected.
            // This allows future calls (e.g., after cache expiry) to trigger a new fetch.
            cache.fetchPromise = null;
        }
    })();

    return cache.fetchPromise;
}

/**
 * Analyzes the weather data for a single location and returns the next sun event.
 * @param {string} locationName - The name of the location (e.g., "Dresden").
 * @returns {Promise<{icon: string, time: string}>} An object with the icon and time for the next sun event.
 */
export async function getNextSunEventForLocation(locationName) {
    // 1. Get the shared data (from cache or fresh fetch)
    const allWeatherData = await getSharedWeatherData();

    // 2. Find the data for the requested location
    const locationData = allWeatherData.find(loc => loc.name === locationName);

    // 3. Handle cases where the location isn't found
    if (!locationData || !locationData.weather) {
        console.error(`Weather data for "${locationName}" could not be found.`);
        return { icon: '❓', time: '--:--' };
    }

    // 4. Perform the analysis for that single location
    const { weather } = locationData;
    const locationTimezone = weather.timezone;
    const nowInLocation = DateTime.now().setZone(locationTimezone);
    const sunriseToday = DateTime.fromISO(weather.daily.sunrise[0], { zone: locationTimezone });
    const sunsetToday = DateTime.fromISO(weather.daily.sunset[0], { zone: locationTimezone });
    const sunriseTomorrow = DateTime.fromISO(weather.daily.sunrise[1], { zone: locationTimezone });

    if (nowInLocation < sunriseToday) {
        return { icon: '🌅️', time: sunriseToday.diff(nowInLocation).toFormat('h:mm') };
    } else if (nowInLocation < sunsetToday) {
        return { icon: '🌙', time: sunsetToday.diff(nowInLocation).toFormat('h:mm') };
    } else {
        return { icon: '🌅', time: sunriseTomorrow.diff(nowInLocation).toFormat('h:mm') };
    }
}

/**
 * A helper function to convert WMO weather codes to a display icon.
 * @param {number} weatherCode - The WMO weather code from the API.
 * @param {boolean} isDay - True if it's currently daytime, false otherwise.
 * @returns {string} An emoji icon representing the weather.
 */
function getWeatherIcon(weatherCode, isDay) {
    // For a clear sky, show ☀️ for day and 🌙 for night.
    if (weatherCode === 0) return isDay ? '☀️' : '🌙';
    if (weatherCode >= 1 && weatherCode <= 3) return '☁️'; // Mainly clear, partly cloudy, overcast
    if (weatherCode >= 45 && weatherCode <= 48) return '🌫️'; // Fog
    if (weatherCode >= 51 && weatherCode <= 57) return '💧'; // Drizzle
    if (weatherCode >= 61 && weatherCode <= 67) return '🌧️'; // Rain
    if (weatherCode >= 71 && weatherCode <= 77) return '❄️'; // Snow
    if (weatherCode >= 80 && weatherCode <= 82) return '🌦️'; // Rain showers
    if (weatherCode >= 85 && weatherCode <= 86) return '🌨️'; // Snow showers
    if (weatherCode === 95) return '⛈️'; // Thunderstorm
    if (weatherCode >= 96 && weatherCode <= 99) return '⛈️'; // Thunderstorm with hail
    return '❓'; // Default case
}
/**
 * Gets the current weather for a single location from the shared data.
 * @param {string} locationName - The name of the location (e.g., "Dresden").
 * @returns {Promise<{temperature: number, icon: string, precipitation: number}>} An object with current weather details.
 */
export async function getCurrentWeatherForLocation(locationName) {
    // 1. Get the shared data (from cache or fresh fetch)
    const allWeatherData = await getSharedWeatherData();

    // 2. Find the data for the requested location
    const locationData = allWeatherData.find(loc => loc.name === locationName);

    // 3. Handle cases where the location isn't found
    if (!locationData || !locationData.weather) {
        console.error(`Weather data for "${locationName}" could not be found.`);
        return { temperature: 'N/A', icon: '❓', precipitation: 'N/A' };
    }

    // 4. Find the current hour's data for that location
    try {
        const { weather } = locationData;
        const locationTimezone = weather.timezone;
        const nowInLocation = DateTime.now().setZone(locationTimezone);

        // Determine if it's day or night to select the correct icon
        const sunriseToday = DateTime.fromISO(weather.daily.sunrise[0], { zone: locationTimezone });
        const sunsetToday = DateTime.fromISO(weather.daily.sunset[0], { zone: locationTimezone });
        const isDay = nowInLocation > sunriseToday && nowInLocation < sunsetToday;

        // The API returns hourly data. We format the current time to match the API's time format
        // to find the correct index in the hourly arrays.
        const currentHourISO = nowInLocation.toFormat("yyyy-MM-dd'T'HH':00'");
        const currentIndex = weather.hourly.time.indexOf(currentHourISO);

        if (currentIndex === -1) {
            console.error(`Could not find current hour (${currentHourISO}) in data for ${locationName}.`);
            return { temperature: 'N/A', icon: '❓', precipitation: 'N/A' };
        }

        const temperature = weather.hourly.temperature_2m[currentIndex];
        const weatherCode = weather.hourly.weathercode[currentIndex];
        const precipitation = weather.hourly.precipitation[currentIndex];

        // 5. Return the formatted data
        return {
            temperature: Math.round(temperature),
            icon: getWeatherIcon(weatherCode, isDay),
            precipitation: precipitation
        };

    } catch(error) {
        console.error(`Error processing current weather for ${locationName}:`, error);
        return { temperature: 'N/A', icon: '❓', precipitation: 'N/A' };
    }
}