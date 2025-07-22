import { DateTime } from 'luxon';
import { useState, useEffect } from 'react';

const Clock = () => {
    const [diffToBackHome, setDiffToBackHome] = useState({});
    const [dresdenTime, setDresdenTime] = useState('');
    const [limaTime, setLimaTime] = useState('');
    const [diffInHours, setDiffInHours] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            const dresden = DateTime.now().setZone('Europe/Berlin');
            const lima = DateTime.now().setZone('America/Lima');
            const targetDate = DateTime.fromISO('2025-11-18T00:00:00', { zone: 'America/Lima' });

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
            <p> {limaTime} Tambopata +{diffInHours}h | Dresden {dresdenTime} </p>
            <p>
                Rückflug in: {Math.floor(diffToBackHome.months || 0)} Monate, {Math.floor(diffToBackHome.weeks || 0)} Wochen, {Math.floor(diffToBackHome.days || 0)} Tage{/*, {Math.floor(diffToBackHome.hours || 0)} Stunden, {Math.floor(diffToBackHome.minutes || 0)} Minuten, {Math.floor(diffToBackHome.seconds || 0)} Sekunden*/}
            </p>
        </>
    );
};

export default Clock;