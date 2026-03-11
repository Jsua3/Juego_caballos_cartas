import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { playSound } from '../../utils/sound';

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
        height: 42, width: 'auto', objectFit: 'contain', borderRadius: 3,
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

// Columnas del grid: emoji (1.75rem) + gap (0.5rem) + track (1fr) + gap (0.5rem) + score (2rem)
const TRACK_GRID = '1.75rem 1fr 2rem';
const TRACK_GAP  = '0.5rem';

export default function RacingPhase({ positions, currentCard, penaltySuit, trackCards, revealedCount = 0, players }) {
  const logRef = useRef(null);
  const [log, setLog] = useState([]);

  useEffect(() => {
    if (currentCard) {
      const suit = getSuit(currentCard.suit);
      if (penaltySuit) {
        playSound('retreat');
        const msg = `🃏 ${suit?.name} avanza ⚠️ ${getSuit(penaltySuit)?.name} retrocede`;
        setLog((prev) => [...prev.slice(-60), { msg, id: Date.now() }]);
      } else {
        playSound('advance');
        const msg = `🃏 ${suit?.name} ${suit?.symbol} → avanza`;
        setLog((prev) => [...prev.slice(-60), { msg, id: Date.now() }]);
      }
    }
  }, [currentCard, penaltySuit]);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [log]);

  const bettingPlayers = players?.filter((p) => p.betSuit) ?? [];
  const { user } = useAuth();

  return (
    <div className="min-h-screen pt-16 px-2 pb-6" style={{
      backgroundImage: `linear-gradient(rgba(4,10,4,0.85), rgba(4,10,4,0.85)), url(${process.env.PUBLIC_URL}/background.jpg)`,
      backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed',
      fontFamily: "'Georgia', serif",
    }}>
      <style>{`
        @keyframes pulse-glow { 0%,100%{box-shadow:0 0 20px rgba(255,215,0,0.3)} 50%{box-shadow:0 0 40px rgba(255,215,0,0.7)} }
        .pulse-ring { animation: pulse-glow 2s ease-in-out infinite; }
        @keyframes card-bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
        @keyframes col-reveal { 0%{opacity:0;transform:scaleY(0.6)} 100%{opacity:1;transform:scaleY(1)} }
        .col-reveal { animation: col-reveal 0.35s ease-out forwards; }
      `}</style>

      {/* Contenedor ancho para que el tablero se vea bien */}
      <div className="max-w-4xl mx-auto mt-4 px-2">

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

        {/* Players */}
        {bettingPlayers.length > 0 && (
          <div className="rounded-xl border border-yellow-600/20 bg-black/50 p-3 mb-4">
            <p className="text-yellow-700 text-xs text-center mb-3" style={{ fontFamily: "'Cinzel', serif", letterSpacing: 2 }}>
              JUGADORES
            </p>
            <div className="flex justify-center gap-4 flex-wrap">
              {bettingPlayers.map((p) => {
                const suit = getSuit(p.betSuit);
                const isWinning = (positions[p.betSuit] ?? 0) === Math.max(...Object.values(positions));
                const isMe = p.userId === user?.id;
                return (
                  <div key={p.userId} className="flex flex-col items-center gap-1.5">
                    <div style={{ animation: isWinning ? 'card-bounce 1s ease-in-out infinite' : 'none' }}>
                      <CasinoCard suitId={p.betSuit} small />
                    </div>
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                      style={{
                        background: `${suit?.color}25`,
                        border: `2px solid ${isMe ? '#FFD700' : suit?.color}`,
                        color: isMe ? '#FFD700' : suit?.color,
                        boxShadow: isMe ? '0 0 10px rgba(255,215,0,0.4)' : 'none',
                      }}>
                      {p.username.charAt(0).toUpperCase()}
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-bold" style={{ color: isMe ? '#FFD700' : '#D1D5DB' }}>
                        {p.username}{isMe ? ' (tú)' : ''}
                      </p>
                      <p className="text-xs" style={{ color: suit?.color }}>
                        {suit?.emoji} {p.betAmount?.toLocaleString()}pts
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Track principal + cartas penalizadoras ── */}
        <div className="rounded-2xl border border-yellow-600/20 bg-black/60 backdrop-blur p-4 mb-4">

          {/* Carriles */}
          {SUITS.map((suit) => {
            const pos = positions[suit.id] ?? 0;
            const pct = Math.min((pos / TRACK_LENGTH) * 100, 100);
            return (
              <div key={suit.id} className="mb-2 last:mb-0"
                style={{ display: 'grid', gridTemplateColumns: TRACK_GRID, gap: TRACK_GAP, alignItems: 'center' }}>
                <span className="text-xl text-center">{suit.emoji}</span>
                <div className="relative rounded-lg overflow-hidden" style={{
                  height: 58,
                  background: 'linear-gradient(90deg, rgba(22,101,52,0.15) 0%, rgba(22,101,52,0.25) 50%, rgba(22,101,52,0.15) 100%)',
                  border: '1px solid rgba(184,134,11,0.15)',
                }}>
                  {/* Grid lines de columnas */}
                  {Array.from({ length: TRACK_LENGTH }).map((_, i) => (
                    <div key={i} className="absolute top-0 bottom-0 border-r border-dashed"
                      style={{
                        left: `${((i + 1) / TRACK_LENGTH) * 100}%`,
                        borderColor: i === TRACK_LENGTH - 1 ? '#B8860B' : 'rgba(184,134,11,0.25)',
                        borderWidth: i === TRACK_LENGTH - 1 ? 2 : 1,
                        borderStyle: i === TRACK_LENGTH - 1 ? 'solid' : 'dashed',
                      }} />
                  ))}
                  {/* Caballo */}
                  <div className="absolute top-1/2 -translate-y-1/2 transition-all duration-500"
                    style={{ left: `calc(${pct}% - 22px)` }}>
                    <HorseMarker suitId={suit.id} isWinner={pos >= TRACK_LENGTH} />
                  </div>
                </div>
                <span className="text-yellow-400 text-sm font-bold text-right">{pos}</span>
              </div>
            );
          })}

          {/* ── Cartas penalizadoras alineadas con las columnas ── */}
          {trackCards && trackCards.length > 0 && (
            <div className="mt-4">
              {/* Label */}
              <div style={{ display: 'grid', gridTemplateColumns: TRACK_GRID, gap: TRACK_GAP }}>
                <div />
                <p className="text-yellow-700 text-xs text-center mb-1" style={{ fontFamily: "'Cinzel', serif", letterSpacing: 2 }}>
                  CARTAS PENALIZADORAS
                </p>
                <div />
              </div>

              {/* Números de columna */}
              <div style={{ display: 'grid', gridTemplateColumns: TRACK_GRID, gap: TRACK_GAP }}>
                <div />
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(${TRACK_LENGTH}, 1fr)` }}>
                  {trackCards.map((_, i) => (
                    <div key={i} className="flex justify-center">
                      <span className="text-xs font-bold" style={{ color: 'rgba(184,134,11,0.5)', fontFamily: "'Cinzel', serif" }}>
                        {i + 1}
                      </span>
                    </div>
                  ))}
                </div>
                <div />
              </div>

              {/* Líneas verticales conectoras (de la barra al número) */}
              <div style={{ display: 'grid', gridTemplateColumns: TRACK_GRID, gap: TRACK_GAP, marginBottom: 4 }}>
                <div />
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(${TRACK_LENGTH}, 1fr)` }}>
                  {trackCards.map((_, i) => (
                    <div key={i} className="flex justify-center">
                      <div style={{ width: 1, height: 8, background: 'rgba(184,134,11,0.3)' }} />
                    </div>
                  ))}
                </div>
                <div />
              </div>

              {/* Cartas */}
              <div style={{ display: 'grid', gridTemplateColumns: TRACK_GRID, gap: TRACK_GAP }}>
                <div />
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(${TRACK_LENGTH}, 1fr)`, gap: 2 }}>
                  {trackCards.map((suit, i) => {
                    const revealed = revealedCount > i;
                    return (
                      <div key={i} className="flex flex-col items-center gap-0.5">
                        {revealed ? (
                          <div className="col-reveal" style={{ position: 'relative' }}>
                            <CasinoCard suitId={suit} small />
                            <div style={{
                              position: 'absolute', inset: 0, borderRadius: 6,
                              boxShadow: `0 0 16px ${getSuit(suit)?.glow ?? '#FFD70060'}`,
                              pointerEvents: 'none',
                            }} />
                          </div>
                        ) : (
                          <CasinoCard faceDown small />
                        )}
                        {revealed && (
                          <span style={{ color: getSuit(suit)?.color, fontSize: 9, fontWeight: 700, textAlign: 'center' }}>
                            ⚠️{getSuit(suit)?.name}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div />
              </div>
            </div>
          )}
        </div>

        {/* Última carta */}
        <div className="flex items-center gap-4 rounded-xl border border-yellow-600/20 bg-black/50 p-4 mb-4">
          <div>
            <p className="text-gray-400 text-xs mb-1" style={{ fontFamily: "'Cinzel', serif", letterSpacing: 2 }}>ÚLTIMA CARTA</p>
            {currentCard ? <CasinoCard suitId={currentCard.suit} /> : <CasinoCard faceDown />}
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
        <div ref={logRef} className="rounded-xl border border-gray-800 bg-black/40 p-3 h-28 overflow-y-auto">
          {log.map((entry) => (
            <p key={entry.id} className="text-gray-400 text-xs leading-5">{entry.msg}</p>
          ))}
          {log.length === 0 && <p className="text-gray-600 text-xs text-center mt-4">Esperando cartas…</p>}
        </div>
      </div>
    </div>
  );
}
