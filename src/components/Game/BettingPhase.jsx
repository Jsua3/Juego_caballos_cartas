import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { playSound } from '../../utils/sound';

const SUITS = [
  { id: 'oros',    name: 'Oros',    emoji: '🪙', color: '#FFD700', glow: '#FFD70060' },
  { id: 'copas',   name: 'Copas',   emoji: '🏆', color: '#DC2626', glow: '#DC262660' },
  { id: 'espadas', name: 'Espadas', emoji: '⚔️', color: '#94A3B8', glow: '#94A3B860' },
  { id: 'bastos',  name: 'Bastos',  emoji: '🪵', color: '#16A34A', glow: '#16A34A60' },
];

function getSuit(id) { return SUITS.find((s) => s.id === id); }

export default function BettingPhase({ roomState, onPlaceBet }) {
  const { user } = useAuth();
  const [selectedSuit, setSelectedSuit] = useState(null);
  const [betAmount, setBetAmount] = useState(100);

  const { players = [], bettingCurrentUserId } = roomState;

  // Palos ya tomados por otros jugadores
  const takenSuits = players
    .filter((p) => p.betSuit && p.userId !== user?.id)
    .map((p) => p.betSuit);
  const myPlayer = players.find((p) => p.userId === user?.id);
  const currentPlayer = players.find((p) => p.userId === bettingCurrentUserId);
  const isMyTurn = bettingCurrentUserId === user?.id;

  const maxBet = myPlayer?.points ?? 0;

  const handlePlaceBet = () => {
    if (!selectedSuit || betAmount < 50 || betAmount > maxBet) return;
    playSound('click');
    onPlaceBet(selectedSuit, betAmount);
  };

  return (
    <div className="min-h-screen pt-16 px-4 pb-8 flex flex-col items-center" style={{
      backgroundImage: `linear-gradient(rgba(4,10,4,0.85), rgba(4,10,4,0.85)), url(${process.env.PUBLIC_URL}/background.jpg)`,
      backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed',
    }}>
      <div className="w-full max-w-lg mt-6">
        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="text-3xl font-bold mb-1" style={{
            background: 'linear-gradient(135deg, #FFD700, #B8860B, #FFD700)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            fontFamily: "'Cinzel', serif",
          }}>
            Fase de Apuestas
          </h2>
          <p className="text-gray-400 text-sm">
            Turno de:{' '}
            <span className="text-yellow-400 font-bold">
              {currentPlayer?.username ?? '...'}
            </span>
          </p>
        </div>

        {/* Players list */}
        <div className="rounded-xl border border-yellow-600/20 bg-black/60 backdrop-blur p-4 mb-6">
          <div className="grid grid-cols-2 gap-2">
            {players.map((p) => {
              const suit = p.betSuit ? getSuit(p.betSuit) : null;
              const isActive = p.userId === bettingCurrentUserId;
              return (
                <div key={p.userId} className="flex items-center gap-2 rounded-lg p-2 transition" style={{
                  background: isActive ? 'rgba(255,215,0,0.08)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${isActive ? 'rgba(255,215,0,0.4)' : 'rgba(255,255,255,0.06)'}`,
                  boxShadow: isActive ? '0 0 16px rgba(255,215,0,0.2)' : 'none',
                }}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold" style={{
                    background: 'rgba(184,134,11,0.15)',
                    border: `1px solid ${isActive ? '#FFD700' : 'rgba(184,134,11,0.3)'}`,
                    color: '#FFD700',
                  }}>
                    {p.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-xs font-medium truncate">{p.username}</div>
                    <div className="text-gray-400 text-xs">{p.points?.toLocaleString()} pts</div>
                  </div>
                  {suit ? (
                    <span className="text-lg" title={`Apostó: ${suit.name}`}>{suit.emoji}</span>
                  ) : isActive ? (
                    <span className="text-yellow-400 text-xs animate-pulse">apostando…</span>
                  ) : (
                    <span className="text-gray-600 text-xs">pendiente</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Betting UI — only shown when it's my turn */}
        {isMyTurn && !myPlayer?.betSuit ? (
          <div className="rounded-xl border border-yellow-600/30 bg-black/70 backdrop-blur p-6">
            <h3 className="text-yellow-400 font-bold text-center mb-4" style={{ fontFamily: "'Cinzel', serif" }}>
              ¡Es tu turno!
            </h3>

            {/* Suit selection */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              {SUITS.map((suit) => {
                const isTaken = takenSuits.includes(suit.id);
                const isSelected = selectedSuit === suit.id;
                const takenBy = players.find((p) => p.betSuit === suit.id);
                return (
                <button
                  key={suit.id}
                  onClick={() => { if (!isTaken) { playSound('click'); setSelectedSuit(suit.id); } }}
                  disabled={isTaken}
                  className="rounded-xl p-4 flex flex-col items-center gap-1.5 transition-all duration-200 relative"
                  style={{
                    background: isTaken ? 'rgba(255,255,255,0.02)' : isSelected ? `${suit.color}20` : 'rgba(255,255,255,0.04)',
                    border: `2px solid ${isTaken ? 'rgba(255,255,255,0.06)' : isSelected ? suit.color : 'rgba(255,255,255,0.1)'}`,
                    boxShadow: isSelected ? `0 0 20px ${suit.glow}` : 'none',
                    transform: isSelected ? 'scale(1.03)' : 'scale(1)',
                    opacity: isTaken ? 0.4 : 1,
                    cursor: isTaken ? 'not-allowed' : 'pointer',
                  }}
                >
                  <span className="text-3xl">{suit.emoji}</span>
                  <span className="text-white font-bold text-sm" style={{ fontFamily: "'Cinzel', serif" }}>
                    {suit.name}
                  </span>
                  {isTaken && (
                    <span className="text-xs text-gray-500">({takenBy?.username})</span>
                  )}
                </button>
                );
              })}
            </div>

            {/* Bet amount */}
            <div className="mb-4">
              <label className="text-gray-300 text-sm mb-2 block">
                Cantidad a apostar (min 50 — max {maxBet.toLocaleString()})
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={50}
                  max={Math.max(50, maxBet)}
                  step={50}
                  value={Math.min(betAmount, maxBet)}
                  onChange={(e) => setBetAmount(Number(e.target.value))}
                  className="flex-1 accent-yellow-400"
                />
                <input
                  type="number"
                  min={50}
                  max={maxBet}
                  value={betAmount}
                  onChange={(e) => setBetAmount(Math.min(Number(e.target.value), maxBet))}
                  className="w-24 bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-white text-center text-sm focus:outline-none focus:border-yellow-500"
                />
              </div>
              <div className="flex gap-2 mt-2">
                {[50, 100, 200, 500].map((v) => (
                  <button
                    key={v}
                    onClick={() => { playSound('click'); setBetAmount(Math.min(v, maxBet)); }}
                    disabled={v > maxBet}
                    className="flex-1 text-xs py-1.5 rounded-lg font-bold transition disabled:opacity-30"
                    style={{ background: 'rgba(184,134,11,0.2)', border: '1px solid rgba(184,134,11,0.4)', color: '#FFD700' }}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handlePlaceBet}
              disabled={!selectedSuit || betAmount < 50 || betAmount > maxBet}
              className="w-full py-3 rounded-xl font-bold text-black transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed"
              style={{
                background: 'linear-gradient(180deg, #C09020 0%, #8B6914 50%, #C09020 100%)',
                border: '2px solid #FFD700',
                fontFamily: "'Cinzel', serif",
                letterSpacing: 2,
              }}
            >
              APOSTAR {betAmount.toLocaleString()} PTS
              {selectedSuit && ` por ${getSuit(selectedSuit)?.emoji} ${getSuit(selectedSuit)?.name}`}
            </button>
          </div>
        ) : myPlayer?.betSuit ? (
          <div className="rounded-xl border border-green-600/30 bg-green-900/20 p-6 text-center">
            <div className="text-4xl mb-2">{getSuit(myPlayer.betSuit)?.emoji}</div>
            <p className="text-green-400 font-bold">
              Apostaste {myPlayer.betAmount?.toLocaleString()} pts a {getSuit(myPlayer.betSuit)?.name}
            </p>
            <p className="text-gray-400 text-sm mt-1">Esperando a los demás jugadores…</p>
          </div>
        ) : (
          <div className="rounded-xl border border-gray-700 bg-black/40 p-6 text-center">
            <div className="text-4xl mb-2">⏳</div>
            <p className="text-gray-400">Esperando el turno de {currentPlayer?.username}…</p>
          </div>
        )}
      </div>
    </div>
  );
}
