import {DateTime} from 'luxon';
import {useEffect, useState} from 'react';

const Clock = () => {
    const targetDate = DateTime.fromISO('2025-11-18T00:00:00', {zone: 'America/Lima'});

    const nowGermany = DateTime.now().setZone('Europe/Berlin');
    const nowPeru = DateTime.now().setZone('America/Lima');

    const [germanyTime, setGermanyTime] = useState(nowGermany.toFormat('HH:mm'));
    const [peruTime, setPeruTime] = useState(nowPeru.toFormat('HH:mm'));
    const [diffInHours, setDiffInHours] = useState((nowGermany.offset - nowPeru.offset) / 60);
    const [diffToBackHome, setDiffToBackHome] = useState(
        targetDate.diff(nowPeru, ['months', 'weeks', 'days']).toObject()
    );

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
    }, []);

    const formatUnit = (value, singular, plural) => {
        const rounded = Math.floor(value || 0);
        return `${rounded} ${rounded === 1 ? singular : plural}`;
    };

    return (
        <>
            <p style={{fontSize: '1.2rem', margin: '1rem 0'}}>
                ✈️ Back home
                in {formatUnit(diffToBackHome.months, 'month', 'months')}, {formatUnit(diffToBackHome.weeks, 'week', 'weeks')}, {formatUnit(diffToBackHome.days, 'day', 'days')}.
            </p>
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'auto auto',
                    gap: '0.25rem 0',
                    alignItems: 'center',
                    maxWidth: '300px',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    🇵🇪<span style={{ textAlign: 'right', paddingLeft: '0.5rem' }}>{peruTime}</span>
                </div>
                <div>Tambopata, Peru</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    🇩🇪<span style={{ textAlign: 'right', paddingLeft: '0.5rem' }}>{germanyTime}</span>
                </div>
                <div>Dresden, Germany (+{diffInHours}h)</div>
            </div>
        </>
    );
};

export default Clock;