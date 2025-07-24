import { DateTime } from 'luxon';
import { useEffect, useState, useMemo } from 'react';
import { getNextSunEventForLocation, getCurrentWeatherForLocation } from '../services/weatherService.js';

// --- Custom Hooks for Logic ---
/**
 * ⚙️ Custom Hook: Manages all time-related state and updates.
 */
const useTimeManager = (targetDate) => {
    const [now, setNow] = useState(() => DateTime.now());

    useEffect(() => {
        const intervalId = setInterval(() => setNow(DateTime.now()), 1000);
        return () => clearInterval(intervalId);
    }, []);

    const germanyTime = useMemo(() => now.setZone('Europe/Berlin'), [now]);
    const peruTime = useMemo(() => now.setZone('America/Lima'), [now]);

    const diffToBackHome = useMemo(() => targetDate.diff(peruTime, ['months', 'weeks', 'days']).toObject(), [peruTime, targetDate]);
    const diffInHours = useMemo(() => (germanyTime.offset - peruTime.offset) / 60, [germanyTime, peruTime]);

    return {
        germanyTime: germanyTime.toFormat('HH:mm'),
        peruTime: peruTime.toFormat('HH:mm'),
        diffInHours,
        diffToBackHome,
    };
};

/**
 * ⚙️ Custom Hook: Fetches and manages ALL weather data (sun & current) for a list of locations.
 */
const useWeatherData = (locations) => {
    const [weatherData, setWeatherData] = useState({});

    useEffect(() => {
        const fetchAllWeatherData = async () => {
            try {
                const promises = locations.flatMap(loc => [
                    getNextSunEventForLocation(loc),
                    getCurrentWeatherForLocation(loc)
                ]);
                const results = await Promise.all(promises);
                const dataMap = locations.reduce((acc, loc, index) => {
                    acc[loc] = {
                        sun: results[index * 2],
                        current: results[index * 2 + 1]
                    };
                    return acc;
                }, {});
                setWeatherData(dataMap);
            } catch (error) {
                console.error('Failed to fetch weather data:', error);
            }
        };
        fetchAllWeatherData();
    }, [locations]);

    return weatherData;
};

// --- Helper & UI Components ---
const formatUnit = (value, singular, plural) => {
    const rounded = Math.floor(value || 0);
    return `${rounded} ${rounded === 1 ? singular : plural}`;
};

/**
 * ✨ UI Component: Renders a single row of location information in columns.
 */
const LocationRow = ({ flag, time, name, sunEvent, currentWeather }) => (
    <>
        {/* Column 1 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {flag}<span style={{ paddingLeft: '0.5rem' }}>{time}</span>
        </div>
        {/* Column 2 */}
        <div>{name}</div>
        {/* Column 3 */}
        <div>{sunEvent?.icon} {sunEvent?.time}</div>
        {/* Column 4 */}
        <div>
            {currentWeather?.icon}
            {currentWeather?.temperature != null && ` ${currentWeather.temperature}°C`}
        </div>
    </>
);

// --- Main Component ---
const Clock = () => {
    const targetDate = useMemo(() => DateTime.fromISO('2025-11-18T00:00:00', { zone: 'America/Lima' }), []);
    const locations = useMemo(() => ['Tambopata', 'Dresden'], []);

    const { germanyTime, peruTime, diffInHours, diffToBackHome } = useTimeManager(targetDate);
    const weatherData = useWeatherData(locations);

    return (
        <>
            <p style={{ fontSize: '1.2rem', margin: '1rem 0' }}>
                ✈️ Back home in {formatUnit(diffToBackHome.months, 'month', 'months')}, {formatUnit(diffToBackHome.weeks, 'week', 'weeks')}, {formatUnit(diffToBackHome.days, 'day', 'days')}.
            </p>
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'auto auto auto auto',
                    gap: '0.5rem 1rem',
                    alignItems: 'center',
                    whiteSpace: 'nowrap',
                    maxWidth : '400px',
                    paddingTop: '1rem',
                }}
            >
                <LocationRow
                    flag="🇵🇪"
                    time={peruTime}
                    name="Tambopata, Peru"
                    sunEvent={weatherData.Tambopata?.sun}
                    currentWeather={weatherData.Tambopata?.current}
                />
                <LocationRow
                    flag="🇩🇪"
                    time={germanyTime}
                    name={`Dresden, Germany (+${diffInHours}h)`}
                    sunEvent={weatherData.Dresden?.sun}
                    currentWeather={weatherData.Dresden?.current}
                />
            </div>
        </>
    );
};

export default Clock;