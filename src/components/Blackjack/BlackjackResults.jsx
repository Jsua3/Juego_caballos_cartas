import { useState, useEffect } from 'react';
import BlackjackCard from './BlackjackCard';
import { useAuth } from '../../context/AuthContext';

const OUTCOME_STYLE = {
  win:       { label: 'WIN',       bg: '#065F46', color: '#34D399', border: '#10B981' },
  lose:      { label: 'LOSE',      bg: '#7F1D1D', color: '#FCA5A5', border: '#EF4444' },
  push:      { label: 'PUSH',      bg: '#374151', color: '#9CA3AF', border: '#6B7280' },
  blackjack: { label: 'BLACKJACK', bg: '#78350F', color: '#FDE68A', border: '#F59E0B' },
  bust:      { label: 'BUST',      bg: '#7F1D1D', color: '#FCA5A5', border: '#EF4444' },
};

export default function BlackjackResults({ results = [], dealerCards = [], dealerValue, onLeave }) {
  const { user } = useAuth();
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    setCountdown(5);
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) { clearInterval(timer); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex flex-col gap-5 py-6 px-4 max-w-lg mx-auto w-full">
      <h2 className="text-center text-yellow-400 font-black text-2xl"
        style={{ fontFamily: "'Cinzel', serif", letterSpacing: 2 }}>
        RESULTADOS
      </h2>

      {/* Dealer hand */}
      <div className="rounded-xl border border-gray-700/40 bg-black/40 p-4 text-center">
        <p className="text-gray-500 text-xs font-bold mb-2"
          style={{ fontFamily: "'Cinzel', serif", letterSpacing: 2 }}>
          DEALER — {dealerValue > 21 ? `BUST (${dealerValue})` : dealerValue}
        </p>
        <div className="flex justify-center gap-2 flex-wrap">
          {dealerCards.map((card, i) => (
            <BlackjackCard key={i} card={card} small />
          ))}
        </div>
      </div>

      {/* Player results */}
      <div className="space-y-3">
        {results.map((r) => {
          const isMe = r.userId === user?.id;
          return (
            <div
              key={r.userId}
              className="rounded-xl p-4"
              style={{
                background: isMe ? 'rgba(255,215,0,0.05)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${isMe ? 'rgba(255,215,0,0.25)' : 'rgba(255,255,255,0.08)'}`,
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                    style={{ background: 'rgba(184,134,11,0.15)', border: '1.5px solid rgba(184,134,11,0.4)', color: '#FFD700' }}>
                    {r.username.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-white font-medium text-sm">{r.username}{isMe ? ' (tú)' : ''}</span>
                </div>
                <span className="text-yellow-400 font-bold text-sm">{r.pointsAfter?.toLocaleString()} pts</span>
              </div>

              {r.hands.map((hand, hi) => {
                const s = OUTCOME_STYLE[hand.outcome] || OUTCOME_STYLE.lose;
                const netPayout = hand.payout - hand.bet;
                return (
                  <div key={hi} className="flex items-center gap-3 flex-wrap">
                    {/* Cards */}
                    <div className="flex gap-1">
                      {hand.cards.map((card, ci) => (
                        <BlackjackCard key={ci} card={card} small />
                      ))}
                    </div>
                    {/* Value */}
                    <span className="text-xs text-gray-400 font-bold">{hand.value}</span>
                    {/* Outcome badge */}
                    <span style={{
                      fontSize: 11, fontWeight: 'bold', padding: '2px 8px',
                      borderRadius: 4, background: s.bg, color: s.color, border: `1px solid ${s.border}`,
                    }}>
                      {s.label}
                    </span>
                    {/* Payout */}
                    <span className="text-xs font-bold ml-auto"
                      style={{ color: netPayout >= 0 ? '#34D399' : '#F87171' }}>
                      {netPayout >= 0 ? `+${netPayout}` : netPayout} pts
                    </span>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Countdown + leave */}
      <div className="flex flex-col items-center gap-3">
        {countdown > 0 ? (
          <p className="text-gray-400 text-sm">
            Nueva ronda en <span className="text-yellow-400 font-bold">{countdown}s</span>…
          </p>
        ) : (
          <p className="text-gray-400 text-sm">Iniciando nueva ronda…</p>
        )}
        <button
          onClick={onLeave}
          className="px-6 py-2.5 rounded-xl text-sm font-bold text-gray-300 transition"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}
        >
          Salir al Lobby
        </button>
      </div>
    </div>
  );
}
