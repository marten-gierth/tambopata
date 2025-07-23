import { DateTime } from 'luxon';
import { LOCATIONS } from '../config.js';

// A simple in-memory cache to minimize API requests.
const cache = {
    data: null,
    timestamp: 0,
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

    console.log("🔥 Fetching new weather data from the API...");

    // 2. If cache is empty or stale: start all requests in parallel
    const fetchPromises = LOCATIONS.map(location =>
        fetch(`https://api.open-meteo.com/v1/forecast?latitude=${location.latitude}&longitude=${location.longitude}&daily=temperature_2m_max,temperature_2m_min,sunrise,sunset&hourly=temperature_2m,weathercode,precipitation&timezone=auto&forecast_days=2`)
            .then(res => res.json())
            .then(data => ({ ...location, weather: data })) // Add the weather data to the location object
    );

    // Wait for all requests to complete
    const results = await Promise.all(fetchPromises);

    // Log the freshly fetched and combined data structure
    console.log("✅ API fetch successful. Combined data:", results);

    // 3. Store the results in the cache
    cache.data = results;
    cache.timestamp = now;

    return cache.data;
}

/**
 * NEW: Analyzes the weather data for a single location and returns the next sun event.
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
        return { icon: '☀️', time: sunriseToday.toFormat('HH:mm') };
    } else if (nowInLocation < sunsetToday) {
        return { icon: '🌙', time: sunsetToday.toFormat('HH:mm') };
    } else {
        return { icon: '☀️', time: sunriseTomorrow.toFormat('HH:mm') };
    }
}
