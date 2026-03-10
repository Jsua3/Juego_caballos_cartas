import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';

const SUITS = [
  { id: 'oros',    name: 'Oros',    emoji: '🪙', color: '#FFD700', glow: '#FFD70060', symbol: '⬤' },
  { id: 'copas',   name: 'Copas',   emoji: '🏆', color: '#DC2626', glow: '#DC262660', symbol: '♥' },
  { id: 'espadas', name: 'Espadas', emoji: '⚔️', color: '#94A3B8', glow: '#94A3B860', symbol: '♠' },
  { id: 'bastos',  name: 'Bastos',  emoji: '🪵', color: '#16A34A', glow: '#16A34A60', symbol: '♣' },
];

const TRACK_LENGTH = 7;

function getSuit(id) { return SUITS.find((s) => s.id === id); }

function HorseMarker({ suitId, isWinner }) {
  const [imgError, setImgError] = useState(false);
  const suit = getSuit(suitId);
  if (imgError) {
    return (
      <span style={{
        fontSize: 22,
        filter: isWinner ? `drop-shadow(0 0 10px ${suit.color})` : `drop-shadow(0 2px 4px rgba(0,0,0,0.5))`,
      }}>🏇</span>
    );
  }
  return (
    <img
      src={`${process.env.PUBLIC_URL}/cards/${suitId}-11.png`}
      alt={suitId}
      onError={() => setImgError(true)}
      style={{
        height: 38, width: 'auto', objectFit: 'contain', borderRadius: 3,
        filter: isWinner
          ? `drop-shadow(0 0 10px ${suit.color})`
          : `drop-shadow(0 2px 4px rgba(0,0,0,0.5))`,
      }}
    />
  );
}

function CasinoCard({ suitId, faceDown = false, small = false }) {
  const [imgError, setImgError] = useState(false);
  const suit = suitId ? getSuit(suitId) : null;
  const w = small ? 40 : 60;
  const h = small ? 58 : 86;

  if (faceDown) {
    return (
      <div style={{
        width: w, height: h, borderRadius: 6, overflow: 'hidden',
        background: 'linear-gradient(135deg, #7B1F1F 0%, #991B1B 50%, #7B1F1F 100%)',
        border: '2px solid #B8860B',
        boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
      }} />
    );
  }

  if (!suit) return null;

  if (!imgError) {
    return (
      <div style={{ width: w, height: h, borderRadius: 6, overflow: 'hidden', border: `2px solid ${suit.color}`, boxShadow: `0 0 12px ${suit.glow}` }}>
        <img
          src={`${process.env.PUBLIC_URL}/cards/${suitId}-11.png`}
          alt={suit.name}
          onError={() => setImgError(true)}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </div>
    );
  }

  return (
    <div style={{
      width: w, height: h, borderRadius: 6,
      background: 'linear-gradient(180deg, #FFFEF5 0%, #F5F0E0 100%)',
      border: `2px solid ${suit.color}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: small ? 20 : 28, color: suit.color,
      boxShadow: `0 0 12px ${suit.glow}`,
    }}>
      {suit.symbol}
    </div>
  );
}

export default function RacingPhase({ positions, currentCard, penaltySuit, trackCards, players }) {
  const logRef = useRef(null);
  const [log, setLog] = useState([]);

  useEffect(() => {
    if (currentCard) {
      const suit = getSuit(currentCard.suit);
      const msg = penaltySuit
        ? `🃏 ${suit?.name} avanza ⚠️ ${getSuit(penaltySuit)?.name} retrocede`
        : `🃏 ${suit?.name} ${suit?.symbol} → avanza`;
      setLog((prev) => [...prev.slice(-60), { msg, id: Date.now() }]);
    }
  }, [currentCard, penaltySuit]);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [log]);

  const bettingPlayers = players?.filter((p) => p.betSuit) ?? [];

  return (
    <div className="min-h-screen pt-16 px-2 pb-6" style={{
      backgroundImage: `linear-gradient(rgba(4,10,4,0.85), rgba(4,10,4,0.85)), url(${process.env.PUBLIC_URL}/background.jpg)`,
      backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed',
      fontFamily: "'Georgia', serif",
    }}>
      <style>{`
        @keyframes pulse-glow { 0%,100%{box-shadow:0 0 20px rgba(255,215,0,0.3)} 50%{box-shadow:0 0 40px rgba(255,215,0,0.7)} }
        .pulse-ring { animation: pulse-glow 2s ease-in-out infinite; }
      `}</style>

      <div className="max-w-2xl mx-auto mt-4">
        {/* Title */}
        <div className="text-center mb-4">
          <h2 style={{
            background: 'linear-gradient(135deg, #FFD700, #B8860B, #FFD700)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            fontFamily: "'Cinzel', serif", fontSize: 26, fontWeight: 900,
          }}>
            ¡EN CARRERA!
          </h2>
        </div>

        {/* Players bets */}
        {bettingPlayers.length > 0 && (
          <div className="flex gap-2 justify-center mb-4 flex-wrap">
            {bettingPlayers.map((p) => {
              const suit = getSuit(p.betSuit);
              return (
                <div key={p.userId} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
                  style={{ background: `${suit?.color}20`, border: `1px solid ${suit?.color}60`, color: suit?.color }}>
                  <span>{suit?.emoji}</span>
                  <span>{p.username}</span>
                  <span className="opacity-70">{p.betAmount?.toLocaleString()}pts</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Track — penalty cards */}
        {trackCards && trackCards.length > 0 && (
          <div className="rounded-xl border border-yellow-600/20 bg-black/50 p-3 mb-4">
            <p className="text-yellow-700 text-xs text-center mb-2" style={{ fontFamily: "'Cinzel', serif", letterSpacing: 2 }}>
              CARTAS DE PENALIZACIÓN
            </p>
            <div className="flex justify-center gap-3">
              {trackCards.map((suit, i) => (
                <div key={i} className="flex flex-col items-center gap-1">
                  <CasinoCard suitId={suit} small />
                  <span className="text-gray-500 text-xs">pos {i + 1}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Race track */}
        <div className="rounded-2xl border border-yellow-600/20 bg-black/60 backdrop-blur p-4 mb-4">
          {SUITS.map((suit) => {
            const pos = positions[suit.id] ?? 0;
            const pct = Math.min((pos / TRACK_LENGTH) * 100, 100);
            return (
              <div key={suit.id} className="mb-3 last:mb-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg w-7 text-center">{suit.emoji}</span>
                  <div className="flex-1 relative rounded-full overflow-hidden" style={{
                    height: 52,
                    background: 'linear-gradient(90deg, rgba(22,101,52,0.15) 0%, rgba(22,101,52,0.25) 50%, rgba(22,101,52,0.15) 100%)',
                    border: '1px solid rgba(184,134,11,0.15)',
                  }}>
                    {/* Track grid lines */}
                    {Array.from({ length: TRACK_LENGTH }).map((_, i) => (
                      <div key={i} className="absolute top-0 bottom-0 border-r border-dashed border-yellow-900/30"
                        style={{ left: `${((i + 1) / TRACK_LENGTH) * 100}%` }} />
                    ))}
                    {/* Finish line */}
                    <div className="absolute top-0 bottom-0 right-0 w-1" style={{ background: 'linear-gradient(180deg, #FFD700, #B8860B)' }} />
                    {/* Horse */}
                    <div className="absolute top-1/2 -translate-y-1/2 transition-all duration-500"
                      style={{ left: `calc(${pct}% - 20px)` }}>
                      <HorseMarker suitId={suit.id} isWinner={pos >= TRACK_LENGTH} />
                    </div>
                  </div>
                  <span className="text-yellow-400 text-sm font-bold w-8 text-right">{pos}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Current card drawn */}
        <div className="flex items-center gap-4 rounded-xl border border-yellow-600/20 bg-black/50 p-4 mb-4">
          <div>
            <p className="text-gray-400 text-xs mb-1" style={{ fontFamily: "'Cinzel', serif", letterSpacing: 2 }}>ÚLTIMA CARTA</p>
            {currentCard ? (
              <CasinoCard suitId={currentCard.suit} />
            ) : (
              <CasinoCard faceDown />
            )}
          </div>
          {currentCard && (
            <div>
              <p className="text-white font-bold">{getSuit(currentCard.suit)?.name}</p>
              <p className="text-gray-400 text-sm">{getSuit(currentCard.suit)?.emoji} avanza</p>
              {penaltySuit && (
                <p className="text-red-400 text-sm mt-1">⚠️ {getSuit(penaltySuit)?.name} retrocede</p>
              )}
            </div>
          )}
        </div>

        {/* Log */}
        <div ref={logRef} className="rounded-xl border border-gray-800 bg-black/40 p-3 h-32 overflow-y-auto">
          {log.map((entry) => (
            <p key={entry.id} className="text-gray-400 text-xs leading-5">{entry.msg}</p>
          ))}
          {log.length === 0 && <p className="text-gray-600 text-xs text-center mt-4">Esperando cartas…</p>}
        </div>
      </div>
    </div>
  );
}
