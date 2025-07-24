import {DateTime} from 'luxon';
import {useEffect, useMemo, useRef, useState} from 'react';
import {getCurrentWeatherForLocation, getNextSunEventForLocation} from '../services/weatherService.js';


/**
 * ⏲️ Shared Clock Hook: Emits `now` every full minute.
 *
 * This updated version uses a self-scheduling `setTimeout` loop,
 * a robust pattern that avoids potential drift from `setInterval`.
 */
const useClock = () => {
    const [now, setNow] = useState(() => DateTime.now());
    // Use a ref to hold the timeout ID, preventing re-renders from affecting it.
    const timeoutIdRef = useRef(null);

    useEffect(() => {
        // A function that schedules its own next run.
        const scheduleNextTick = () => {
            // Calculate the milliseconds until the next minute begins.
            const currentNow = DateTime.now();
            const msUntilNextMinute = (60 - currentNow.second) * 1000 - currentNow.millisecond;

            // Set the timeout for the next update.
            timeoutIdRef.current = setTimeout(() => {
                setNow(DateTime.now());
                scheduleNextTick(); // Reschedule the *next* tick after this one fires.
            }, msUntilNextMinute);
        };

        // Start the scheduling loop.
        scheduleNextTick();

        // The cleanup function clears the timeout when the component unmounts.
        return () => {
            if (timeoutIdRef.current) {
                clearTimeout(timeoutIdRef.current);
            }
        };
    }, []); // The empty array ensures this effect runs only once.

    return now;
};

/**
 * ⚙️ Custom Hook: Manages all time-related state and updates.
 */
const useTimeManager = (targetDate, now) => {
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
 * ⚙️ Custom Hook: Manages all weather data with separate update intervals.
 *
 * Current Weather: Fetched hourly.
 * Sun Events: Fetched every minute, driven by the useClock hook.
 */
const useWeatherData = (locations, now) => {
    const [weatherData, setWeatherData] = useState({});

    // --- EFFECT 1: For HOURLY data (Current Weather) ---
    // This effect runs only once to set up the hourly timer.
    useEffect(() => {
        let intervalId;

        const fetchCurrentWeather = async () => {
            console.log('Fetching CURRENT weather...');
            try {
                const promises = locations.map(loc => getCurrentWeatherForLocation(loc));
                const results = await Promise.all(promises);
                setWeatherData(prev => {
                    const updated = { ...prev };
                    locations.forEach((loc, idx) => {
                        if (!updated[loc]) updated[loc] = {};
                        updated[loc].current = results[idx];
                    });
                    return updated;
                });
            } catch (error) {
                console.error('Failed to fetch current weather:', error);
            }
        };

        // Calculate delay until the next full hour for the first scheduled fetch
        const initialTime = DateTime.now();
        const msUntilNextHour = (60 - initialTime.minute) * 60 * 1000 - initialTime.second * 1000 - initialTime.millisecond;

        const timeoutId = setTimeout(() => {
            fetchCurrentWeather();
            intervalId = setInterval(fetchCurrentWeather, 60 * 60 * 1000); // Every hour
        }, msUntilNextHour);

        fetchCurrentWeather(); // Fetch once immediately on mount

        // Cleanup function to clear timers when the component unmounts
        return () => {
            clearTimeout(timeoutId);
            if (intervalId) clearInterval(intervalId);
        };
    }, [locations]); // Dependency array ensures this runs only if 'locations' changes


    // --- EFFECT 2: For MINUTELY data (Sun Events) ---
    // This effect is driven by the 'now' prop from useClock.
    useEffect(() => {
        const fetchSunData = async () => {
            console.log('Fetching SUN data...');
            try {
                const promises = locations.map(loc => getNextSunEventForLocation(loc));
                const results = await Promise.all(promises);
                setWeatherData(prev => {
                    const updated = { ...prev };
                    locations.forEach((loc, idx) => {
                        if (!updated[loc]) updated[loc] = {};
                        updated[loc].sun = results[idx];
                    });
                    return updated;
                });
            } catch (error) {
                console.error('Failed to fetch sun data:', error);
            }
        };

        // This runs every time 'now' from useClock updates, which is every minute.
        fetchSunData();

    }, [now, locations]); // Dependency array ensures this re-runs when 'now' changes.

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
const LocationRow = ({ flag, time, name, sunEvent, currentWeather }) => {
    // Initialize state without accessing the window object.
    // State and useEffect remain the same...
    const [windowWidth, setWindowWidth] = useState(0);

    useEffect(() => {
        const handleResize = () => {
            setWindowWidth(window.innerWidth);
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const styles = {
        container: {
            display: 'grid',
            gridTemplateColumns: 'auto auto 1fr',
            gridTemplateRows: 'auto auto',
            gridColumnGap: '10px',
            gridRowGap: '1px',
            fontFamily: 'Arial, sans-serif',
            color: '#fff',
            letterSpacing: '-0.5px',
            maxWidth: '400px',
            margin: windowWidth > 600 ? '10px' : '10px auto',
        },
        cell: {
            padding: '1px',
            display: 'flex',
            alignItems: 'center',
        },
        flagCell: {
            gridArea: '1 / 1 / 3 / 2',
            fontSize: '2rem',
            justifyContent: 'center',
        },
        timeCell: {
            gridArea: '1 / 2 / 2 / 3',
            fontSize: '1.5rem',
            fontWeight: 'bold',
            justifyContent: 'flex-start',
        },
        nameCell: {
            gridArea: '1 / 3 / 2 / 4',
            fontSize: '1.2rem',
            fontWeight: 'bold',
            justifyContent: 'flex-end',
        },
        sunWeatherCell: {
            gridArea: '2 / 2 / 3 / 4',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: '5px',
        },
        weatherSpan: {
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
        }
    };

    return (
        <div style={styles.container}>
            {/* Cell 1: Flag (Column 1) */}
            <div style={{...styles.cell, ...styles.flagCell}}>{flag}</div>

            {/* Cell 2: Time (Column 2) */}
            <div style={{...styles.cell, ...styles.timeCell}}>{time}</div>

            {/* Cell 3: Name (Column 3) */}
            <div style={{...styles.cell, ...styles.nameCell}}>{name}</div>

            {/* Cell 4: Sun Event & Weather (Spans Columns 2-3) */}
            <div style={{...styles.cell, ...styles.sunWeatherCell}}>
                <span style={styles.weatherSpan}>
                    {sunEvent?.icon} in {sunEvent?.time} h
                </span>
                <span style={styles.weatherSpan}>
                    {currentWeather?.icon}
                    {currentWeather?.temperature != null && ` ${currentWeather.temperature}°C`}
                </span>
            </div>
        </div>
    );
};

// --- Main Component ---
const Clock = () => {
    const now = useClock();
    const targetDate = useMemo(() => DateTime.fromISO('2025-11-18T00:00:00', {zone: 'America/Lima'}), []);
    const locations = useMemo(() => ['Tambopata', 'Dresden'], []);

    const {germanyTime, peruTime, diffInHours, diffToBackHome} = useTimeManager(targetDate, now);
    const weatherData = useWeatherData(locations, now);

    return (
        <>
            <p style={{fontSize: '17px'}}>
                ✈️ Back home
                in {formatUnit(diffToBackHome.months, 'month', 'months')}, {formatUnit(diffToBackHome.weeks, 'week', 'weeks')}, {formatUnit(diffToBackHome.days, 'day', 'days')}.
                <br />
                ↔️ ~ 9,346 km | ⏰ {diffInHours}-hour time difference.
            </p>
            <div
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
                    name={`Dresden, Germany`}
                    sunEvent={weatherData.Dresden?.sun}
                    currentWeather={weatherData.Dresden?.current}
                />
            </div>
        </>
    );
};

export default Clock;