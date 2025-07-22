import { DateTime } from 'luxon';
import { useState, useEffect } from 'react';

const Clock = () => {
    // Initialize states with immediate calculations
    const initialDresden = DateTime.now().setZone('Europe/Berlin');
    const initialLima = DateTime.now().setZone('America/Lima');
    const targetDate = DateTime.fromISO('2025-11-18T00:00:00', { zone: 'America/Lima' });

    const [dresdenTime, setDresdenTime] = useState(initialDresden.toFormat('HH:mm'));
    const [limaTime, setLimaTime] = useState(initialLima.toFormat('HH:mm'));
    const [diffInHours, setDiffInHours] = useState((initialDresden.offset - initialLima.offset) / 60);
    const [diffToBackHome, setDiffToBackHome] = useState(
        targetDate.diff(initialLima, ['months', 'weeks', 'days', 'hours', 'minutes', 'seconds']).toObject()
    );

    useEffect(() => {
        const interval = setInterval(() => {
            const dresden = DateTime.now().setZone('Europe/Berlin');
            const lima = DateTime.now().setZone('America/Lima');

            setDresdenTime(dresden.toFormat('HH:mm'));
            setLimaTime(lima.toFormat('HH:mm'));
            setDiffInHours((dresden.offset - lima.offset) / 60);

            const diff = targetDate.diff(lima, ['months', 'weeks', 'days', 'hours', 'minutes', 'seconds']).toObject();
            setDiffToBackHome(diff);
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    return (
        <>
            <p> 🕒 {limaTime} (Tambopata) | {dresdenTime} (Dresden +{diffInHours}h) </p>
            <p>
                ✈️ Rückflug: {Math.floor(diffToBackHome.months || 0)} Monate, {Math.floor(diffToBackHome.weeks || 0)} Wochen, {Math.floor(diffToBackHome.days || 0)} Tage{/*, {Math.floor(diffToBackHome.hours || 0)} Stunden, {Math.floor(diffToBackHome.minutes || 0)} Minuten, {Math.floor(diffToBackHome.seconds || 0)} Sekunden*/}
            </p>
        </>
    );
};

export default Clock;