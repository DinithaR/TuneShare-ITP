import React, { useEffect, useState } from 'react'
import { useAppContext } from '../context/AppContext'

const Testimonial = () => {
    const { axios } = useAppContext();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);

    const shuffle = (arr=[]) => {
        const a = arr.slice();
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    };

    useEffect(() => {
        const load = async () => {
            try {
                const { data } = await axios.get('/api/reviews/random?limit=8');
                if (data.success) setItems(shuffle(data.reviews || []).slice(0,8));
            } catch (e) {
                // ignore
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const StarRow = ({ rating = 5 }) => (
        <div className="flex gap-0.5" aria-label={`Rating ${rating} out of 5`}>
            {[1,2,3,4,5].map((i) => (
                <svg key={i} width="22" height="20" viewBox="0 0 22 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M10.525.464a.5.5 0 0 1 .95 0l2.107 6.482a.5.5 0 0 0 .475.346h6.817a.5.5 0 0 1 .294.904l-5.515 4.007a.5.5 0 0 0-.181.559l2.106 6.483a.5.5 0 0 1-.77.559l-5.514-4.007a.5.5 0 0 0-.588 0l-5.514 4.007a.5.5 0 0 1-.77-.56l2.106-6.482a.5.5 0 0 0-.181-.56L.832 8.197a.5.5 0 0 1 .294-.904h6.817a.5.5 0 0 0 .475-.346z" fill={i <= rating ? "var(--color-primary)" : "#E5E7EB"}/>
                </svg>
            ))}
        </div>
    );

    const Chip = ({ r }) => {
        const rating = Math.round(r.rating || 5);
        const title = r.instrument ? `${r.instrument.brand || ''} ${r.instrument.model || ''}`.trim() : 'Instrument renter';
        return (
            <a
                href={r.instrument ? `/instrument-details/${r.instrument._id}` : '#'}
                className="shrink-0 inline-flex items-center gap-4 px-4 py-2.5 rounded-full border backdrop-blur-sm"
                style={{
                    borderColor: 'var(--color-borderColor)',
                    backgroundColor: 'rgba(255,255,255,0.75)',
                    boxShadow: '0 8px 24px rgba(30,41,59,0.10)'
                }}
                title={r.comment || ''}
            >
                <img
                    className="h-9 w-9 rounded-full object-cover ring-2 ring-white/80"
                    src={r.user?.image || 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?q=80&w=100'}
                    alt={r.user?.name || 'User'}
                />
                {r.instrument?.image && (
                    <img src={r.instrument.image} alt="instrument" className="h-9 w-9 rounded-md object-cover ring-2 ring-slate-100" />
                )}
                <span className="text-base font-medium" style={{ color: 'var(--color-primary-dull)' }}>{r.user?.name || 'User'}</span>
                <span className="text-sm text-slate-500">• {title}</span>
                <span className="ml-1 text-sm text-yellow-600">⭐ {rating}</span>
                <span className="max-w-[32ch] sm:max-w-[44ch] text-sm text-slate-600 overflow-hidden whitespace-nowrap text-ellipsis">{r.comment || 'No comment provided.'}</span>
            </a>
        );
    };

    return (
                <div className="w-full py-8" style={{ fontFamily: "'Outfit', sans-serif" }}>
                                    <style>{`
                                        @keyframes tickerScroll {
                                            0% { transform: translateX(0%); }
                                            100% { transform: translateX(-50%); }
                                        }
                                        .ticker { animation: tickerScroll 28s linear infinite; }
                                        .ticker-slow { animation-duration: 34s; }
                                        .reverse { animation-direction: reverse; }
                                        .group:hover .ticker { animation-play-state: paused; }
                                        @media (prefers-reduced-motion: reduce) { .ticker { animation: none; } }
                                    `}</style>
                        {loading && (
                            <div className="text-center text-sm text-slate-500">Loading testimonials…</div>
                        )}
                        {!loading && items.length === 0 && (
                            <div className="text-center text-sm text-slate-500">No reviews yet. Check back soon!</div>
                        )}
                                    {!loading && items.length > 0 && (
                                        <div className="relative group">
                                            {/* gradient edges */}
                                            <div className="pointer-events-none absolute inset-y-0 left-0 w-12 sm:w-16 bg-gradient-to-r from-white to-transparent" />
                                            <div className="pointer-events-none absolute inset-y-0 right-0 w-12 sm:w-16 bg-gradient-to-l from-white to-transparent" />
                                            {/* ticker rows */}
                                            <div className="space-y-4">
                                                <div className="overflow-hidden">
                                                    <div className="ticker flex items-center gap-4 sm:gap-6 min-w-[200%] will-change-transform">
                                                        {[...items, ...items].map((r, i) => (
                                                            <Chip key={`row1-${r._id}-${i}`} r={r} />
                                                        ))}
                                                    </div>
                                                </div>
                                                <div className="overflow-hidden">
                                                    <div className="ticker ticker-slow reverse flex items-center gap-4 sm:gap-6 min-w-[200%] will-change-transform">
                                                        {[...items, ...items].map((r, i) => (
                                                            <Chip key={`row2-${r._id}-${i}`} r={r} />
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                </div>
    );
};

export default Testimonial
