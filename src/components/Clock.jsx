import {DateTime} from 'luxon';
import {useEffect, useMemo, useState} from 'react';
import {getCurrentWeatherForLocation, getNextSunEventForLocation} from '../services/weatherService.js';

/**
 * ⏲️ Shared Clock Hook: Emits `now` every full minute.
 */
const useClock = () => {
    const [now, setNow] = useState(() => DateTime.now());

    useEffect(() => {
        const now = DateTime.now();
        const msUntilNextMinute = (60 - now.second) * 1000 - now.millisecond;

        let intervalId;

        const timeoutId = setTimeout(() => {
            setNow(DateTime.now());
            intervalId = setInterval(() => {
                setNow(DateTime.now());
            }, 60 * 1000);
        }, msUntilNextMinute);

        return () => {
            clearTimeout(timeoutId);
            if (intervalId) clearInterval(intervalId);
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
 * ⚙️ Custom Hook: Fetches and manages ALL weather data (sun & current) for a list of locations.
 */
const useWeatherData = (locations, now) => {
    const [weatherData, setWeatherData] = useState({});

    useEffect(() => {
        let intervalId;
        let sunIntervalId;

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

        const fetchAllSunData = async () => {
            try {
                const promises = locations.map(loc => getNextSunEventForLocation(loc));
                const results = await Promise.all(promises);
                setWeatherData(prev => {
                    const updated = {...prev};
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

        const msUntilNextHour = (60 - now.minute) * 60 * 1000 - now.second * 1000 - now.millisecond;
        const msUntilNextMinute = (60 - now.second) * 1000 - now.millisecond;

        const timeoutId = setTimeout(() => {
            fetchAllWeatherData();
            intervalId = setInterval(fetchAllWeatherData, 60 * 60 * 1000);
        }, msUntilNextHour);

        const sunTimeoutId = setTimeout(() => {
            fetchAllSunData();
            sunIntervalId = setInterval(fetchAllSunData, 60 * 1000);
        }, msUntilNextMinute);

        fetchAllWeatherData(); // fetch once immediately
        fetchAllSunData();     // fetch once immediately

        return () => {
            clearTimeout(timeoutId);
            clearTimeout(sunTimeoutId);
            if (intervalId) clearInterval(intervalId);
            if (sunIntervalId) clearInterval(sunIntervalId);
        };
    }, [locations, now]);

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