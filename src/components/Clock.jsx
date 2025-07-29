import { DateTime } from 'luxon';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
    getCurrentWeatherForLocation,
    getNextSunEventForLocation,
    getTodayPrecipitationProbability
} from '../services/weatherService.js';


/**
 * ⏲️ Shared Clock Hook: Emits `now` every full minute.
 */
const useClock = () => {
    const [now, setNow] = useState(() => DateTime.now());
    const timeoutIdRef = useRef(null);

    useEffect(() => {
        const scheduleNextTick = () => {
            const currentNow = DateTime.now();
            const msUntilNextMinute = (60 - currentNow.second) * 1000 - currentNow.millisecond;

            timeoutIdRef.current = setTimeout(() => {
                setNow(DateTime.now());
                scheduleNextTick();
            }, msUntilNextMinute);
        };

        scheduleNextTick();

        return () => {
            if (timeoutIdRef.current) {
                clearTimeout(timeoutIdRef.current);
            }
        };
    }, []);

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
 * 🌦️ Custom Hook: Manages all weather data fetching and state.
 */
const useWeatherManager = (locations, now) => {
    const [weatherData, setWeatherData] = useState({});

    // Effect for HOURLY data (Current Weather & Precipitation)
    useEffect(() => {
        let intervalId;
        const fetchHourlyData = async () => {
            console.log('Fetching HOURLY data (weather, precipitation)...');
            try {
                const weatherPromises = locations.map(loc => getCurrentWeatherForLocation(loc));
                const precipPromises = locations.map(loc => getTodayPrecipitationProbability(loc));

                const [weatherResults, precipResults] = await Promise.all([
                    Promise.all(weatherPromises),
                    Promise.all(precipPromises),
                ]);

                setWeatherData(prevData => {
                    const updatedData = JSON.parse(JSON.stringify(prevData));
                    locations.forEach((loc, idx) => {
                        if (!updatedData[loc]) updatedData[loc] = {};
                        updatedData[loc].current = weatherResults[idx];
                        updatedData[loc].precipitation = precipResults[idx];
                    });
                    return updatedData;
                });
            } catch (error) {
                console.error('Failed to fetch hourly weather data:', error);
            }
        };

        const initialTime = DateTime.now();
        const msUntilNextHour = (60 - initialTime.minute - 1) * 60 * 1000 + (60 - initialTime.second) * 1000;

        const timeoutId = setTimeout(() => {
            fetchHourlyData();
            intervalId = setInterval(fetchHourlyData, 60 * 60 * 1000);
        }, msUntilNextHour > 0 ? msUntilNextHour : 0);

        fetchHourlyData();

        return () => {
            clearTimeout(timeoutId);
            if (intervalId) clearInterval(intervalId);
        };
    }, [locations]);

    // Effect for MINUTELY data (Sun Events)
    useEffect(() => {
        const fetchSunData = async () => {
            console.log('Fetching MINUTELY data (sun events)...');
            try {
                const sunPromises = locations.map(loc => getNextSunEventForLocation(loc));
                const sunResults = await Promise.all(sunPromises);

                setWeatherData(prevData => {
                    const newWeatherData = { ...prevData };
                    locations.forEach((loc, idx) => {
                        newWeatherData[loc] = {
                            ...newWeatherData[loc], // Preserves other data (like 'current' weather)
                            sun: sunResults[idx]    // Adds or updates the 'sun' data
                        };
                    });
                    return newWeatherData;
                });
            } catch (error) {
                console.error('Failed to fetch sun data:', error);
            }
        };

        fetchSunData();
    }, [now, locations]);

    return weatherData;
};


// --- Helper & UI Components ---
const formatUnit = (value, singular, plural) => {
    const rounded = Math.floor(value || 0);
    return `${rounded} ${rounded === 1 ? singular : plural}`;
};

/**
 * ✨ UI Component: Renders a single location row.
 */
const LocationRow = ({ flag, time, name, locationData }) => {
    // --- STYLING FIX: Re-introduced window width detection ---
    const [windowWidth, setWindowWidth] = useState(0);

    useEffect(() => {
        // This function updates the state with the current window width.
        const handleResize = () => {
            setWindowWidth(window.innerWidth);
        };

        // Set the initial width when the component mounts.
        handleResize();

        // Add event listener to update width on resize.
        window.addEventListener('resize', handleResize);

        // Cleanup function to remove the event listener.
        return () => window.removeEventListener('resize', handleResize);
    }, []); // Empty dependency array ensures this effect runs only once.

    // Safely destructure data, providing empty objects as fallbacks.
    const { sun, current, precipitation } = locationData || {};

    // Define styles inside the component to access windowWidth.
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
                    {sun ? <>{sun.icon} in {sun.time} h</> : '...'}
                </span>
                <span style={styles.weatherSpan}>
                    {current ? <>{current.icon} {current.temperature}</> : '...'}
                    {' | '}
                    {precipitation ? <>☔ {precipitation.maxPrecipitationProbability}%</> : '...'}
                </span>
            </div>
        </div>
    );
};

// --- Main Component ---
const Clock = () => {
    const now = useClock();
    const targetDate = useMemo(() => DateTime.fromISO('2025-11-18T00:00:00', { zone: 'America/Lima' }), []);
    const locations = useMemo(() => ['Tambopata', 'Dresden'], []);

    const { germanyTime, peruTime, diffInHours, diffToBackHome } = useTimeManager(targetDate, now);
    const weatherData = useWeatherManager(locations, now);

    return (
        <>
            <p style={{fontSize: '16px'}}>
                ✈️ Back home
                in {formatUnit(diffToBackHome.months, 'month', 'months')}, {formatUnit(diffToBackHome.weeks, 'week', 'weeks')}, {formatUnit(diffToBackHome.days, 'day', 'days')}.
                <br />
                ↔️ ~ 10,646 km | ⏰ {diffInHours}-hour time difference.
            </p>
            <div>
                <LocationRow
                    flag="🇵🇪"
                    time={peruTime}
                    name="Tambopata, Peru"
                    locationData={weatherData.Tambopata}
                />
                <LocationRow
                    flag="🇩🇪"
                    time={germanyTime}
                    name="Dresden, Germany"
                    locationData={weatherData.Dresden}
                />
            </div>
        </>
    );
};

export default Clock;