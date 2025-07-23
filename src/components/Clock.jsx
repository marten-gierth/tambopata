import { DateTime } from 'luxon';
import { useEffect, useState } from 'react';
import { getNextSunEventForLocation } from '../services/weatherService.js';

const Clock = () => {
    // State for time and countdown
    const targetDate = DateTime.fromISO('2025-11-18T00:00:00', { zone: 'America/Lima' });
    const [germanyTime, setGermanyTime] = useState(DateTime.now().setZone('Europe/Berlin').toFormat('HH:mm'));
    const [peruTime, setPeruTime] = useState(DateTime.now().setZone('America/Lima').toFormat('HH:mm'));
    const [diffInHours, setDiffInHours] = useState(
        (DateTime.now().setZone('Europe/Berlin').offset - DateTime.now().setZone('America/Lima').offset) / 60
    );
    const [diffToBackHome, setDiffToBackHome] = useState(
        targetDate.diff(DateTime.now().setZone('America/Lima'), ['months', 'weeks', 'days']).toObject()
    );

    // State for sun event data
    const [tambopataSunEvent, setTambopataSunEvent] = useState(null);
    const [dresdenSunEvent, setDresdenSunEvent] = useState(null);

    // Effect for updating clocks every second
    useEffect(() => {
        const interval = setInterval(() => {
            const germany = DateTime.now().setZone('Europe/Berlin');
            const peru = DateTime.now().setZone('America/Lima');

            setGermanyTime(germany.toFormat('HH:mm'));
            setPeruTime(peru.toFormat('HH:mm'));
            setDiffInHours((germany.offset - peru.offset) / 60);

            const diff = targetDate.diff(peru, ['months', 'weeks', 'days']).toObject();
            setDiffToBackHome(diff);
        }, 1000);

        return () => clearInterval(interval);
    }, [targetDate]);

    // Effect for fetching sun event data once on component mount
    useEffect(() => {
        const fetchSunEvents = async () => {
            try {
                const tambopataResponse = await getNextSunEventForLocation('Tambopata');
                const dresdenResponse = await getNextSunEventForLocation('Dresden');
                setTambopataSunEvent(tambopataResponse);
                setDresdenSunEvent(dresdenResponse);
            } catch (error) {
                console.error('Failed to get sun event:', error);
            }
        };

        fetchSunEvents();
    }, []); // Empty dependency array means this runs only once

    const formatUnit = (value, singular, plural) => {
        const rounded = Math.floor(value || 0);
        return `${rounded} ${rounded === 1 ? singular : plural}`;
    };

    return (
        <>
            <p style={{ fontSize: '1.2rem', margin: '1rem 0' }}>
                ✈️ Back home in {formatUnit(diffToBackHome.months, 'month', 'months')}, {formatUnit(diffToBackHome.weeks, 'week', 'weeks')}, {formatUnit(diffToBackHome.days, 'day', 'days')}.
            </p>
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'auto 1fr auto',
                    gap: '0.25rem 0',
                    alignItems: 'center',
                    maxWidth: '350px',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: '70px', whiteSpace: 'nowrap' }}>
                    🇵🇪<span style={{ paddingLeft: '0.5rem' }}>{peruTime}</span>
                </div>
                <div style={{ whiteSpace: 'nowrap', paddingLeft: '0.5rem' }}>Tambopata, Peru</div>
                <div style={{ whiteSpace: 'nowrap' }}>{tambopataSunEvent?.icon} {tambopataSunEvent?.time}</div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: '70px', whiteSpace: 'nowrap' }}>
                    🇩🇪<span style={{ paddingLeft: '0.5rem' }}>{germanyTime}</span>
                </div>
                <div style={{ whiteSpace: 'nowrap', paddingLeft: '0.5rem' }}>Dresden, Germany (+{diffInHours}h)</div>
                <div style={{ whiteSpace: 'nowrap' }}>{dresdenSunEvent?.icon} {dresdenSunEvent?.time}</div>
            </div>
        </>
    );
};

export default Clock;