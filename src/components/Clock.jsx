import {DateTime} from 'luxon';
import {useEffect, useMemo, useState} from 'react';
import {getCurrentWeatherForLocation, getNextSunEventForLocation} from '../services/weatherService.js';

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
const LocationRow = ({ flag, time, name, sunEvent, currentWeather }) => {
    // Initialize state without accessing the window object.
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
            gridTemplateColumns: 'auto 1fr auto',
            gridTemplateRows: 'auto auto',
            gridColumnGap: '0px',
            gridRowGap: '1px',
            fontFamily: 'Arial, sans-serif',
            color: '#fff',
            letterSpacing: '-0.5px',
            maxWidth: '400px',
            // Aligns left on large screens, centers on small
            margin: windowWidth > 600 ? '10px' : '10px auto',
        },
        cell: {
            padding: '1px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
        },
        flagCell: {
            gridArea: '1 / 1 / 3 / 2',
            fontSize: '2rem',
        },
        timeCell: {
            gridArea: '1 / 2 / 2 / 3',
            fontSize: '1.5rem',
            padding: '0 0 0 10px',
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
            padding: '5px 10px',
        },
        weatherSpan: {
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
        }
    };

    return (
        <div style={styles.container}>
            {/* Cell 1: Flag */}
            <div style={{...styles.cell, ...styles.flagCell}}>{flag}</div>

            {/* Cell 2: Time */}
            <div style={{...styles.cell, ...styles.timeCell}}>{time}</div>

            {/* Cell 3: Name */}
            <div style={{...styles.cell, ...styles.nameCell}}>{name}</div>

            {/* Cell 4: Sun Event & Weather */}
            <div style={{...styles.cell, ...styles.sunWeatherCell}}>
                <span style={styles.weatherSpan}>
                    {sunEvent?.icon} {sunEvent?.time}
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
        const targetDate = useMemo(() => DateTime.fromISO('2025-11-18T00:00:00', {zone: 'America/Lima'}), []);
        const locations = useMemo(() => ['Tambopata', 'Dresden'], []);

        const {germanyTime, peruTime, diffInHours, diffToBackHome} = useTimeManager(targetDate);
        const weatherData = useWeatherData(locations);

        return (
            <>
                <p style={{fontSize: '17px', margin: '10px'}}>
                    ✈️ Back home
                    in {formatUnit(diffToBackHome.months, 'month', 'months')}, {formatUnit(diffToBackHome.weeks, 'week', 'weeks')}, {formatUnit(diffToBackHome.days, 'day', 'days')}.
                </p>
                <div
                    /*   style={{
                           display: 'grid',
                           gridTemplateColumns: 'auto auto auto auto',
                           gap: '0.5rem 0.25rem',
                           alignItems: 'center',
                           whiteSpace: 'nowrap',
                           maxWidth: '400px',
                           paddingTop: '0.5rem',
                       }}*/
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