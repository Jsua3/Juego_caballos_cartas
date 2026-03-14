import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { playSound } from '../../utils/sound';

const SUITS = [
  { id: 'oros',    name: 'Oros',    emoji: '🪙', color: '#FFD700', glow: 'rgba(255,215,0,0.45)'  },
  { id: 'copas',   name: 'Copas',   emoji: '🏆', color: '#DC2626', glow: 'rgba(220,38,38,0.45)'  },
  { id: 'espadas', name: 'Espadas', emoji: '⚔️', color: '#94A3B8', glow: 'rgba(148,163,184,0.4)' },
  { id: 'bastos',  name: 'Bastos',  emoji: '🪵', color: '#16A34A', glow: 'rgba(22,163,74,0.45)'  },
];

function getSuit(id) { return SUITS.find((s) => s.id === id); }

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show:   { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } },
};

export default function BettingPhase({ roomState, onPlaceBet, roomCode, onShowQR }) {
  const { user } = useAuth();
  const [selectedSuit, setSelectedSuit] = useState(null);
  const [betAmount, setBetAmount] = useState(100);

  const { players = [], bettingCurrentUserId } = roomState;

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
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="w-full max-w-lg mt-6"
      >
        {/* Header */}
        <motion.div variants={itemVariants} className="text-center mb-6">
          <div className="flex items-center justify-center gap-3 mb-1">
            <h2 className="text-3xl font-bold" style={{
              background: 'linear-gradient(135deg, #FFD700, #B8860B, #FFD700)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              fontFamily: "'Cinzel', serif",
              filter: 'drop-shadow(0 0 20px rgba(255,215,0,0.25))',
            }}>
              Fase de Apuestas
            </h2>
            {roomCode && (
              <motion.button
                onClick={onShowQR}
                whileHover={{ scale: 1.07, boxShadow: '0 0 16px rgba(255,215,0,0.3)' }}
                whileTap={{ scale: 0.94 }}
                className="flex items-center gap-1 text-yellow-500 text-xs font-bold px-2 py-1 rounded-lg"
                style={{ background: 'rgba(255,215,0,0.08)', border: '1px solid rgba(255,215,0,0.2)' }}
              >
                <span>▣</span>
                <span className="hidden sm:inline font-mono">{roomCode}</span>
              </motion.button>
            )}
          </div>
          <p className="text-gray-400 text-sm">
            Turno de:{' '}
            <span className="text-yellow-400 font-bold">{currentPlayer?.username ?? '...'}</span>
          </p>
        </motion.div>

        {/* Players list */}
        <motion.div variants={itemVariants} className="rounded-xl border border-yellow-600/20 bg-black/60 backdrop-blur p-4 mb-6">
          <div className="grid grid-cols-2 gap-2">
            {players.map((p) => {
              const suit = p.betSuit ? getSuit(p.betSuit) : null;
              const isActive = p.userId === bettingCurrentUserId;
              return (
                <motion.div
                  key={p.userId}
                  animate={isActive ? { boxShadow: ['0 0 0px rgba(255,215,0,0)', '0 0 18px rgba(255,215,0,0.25)', '0 0 0px rgba(255,215,0,0)'] } : {}}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="flex items-center gap-2 rounded-lg p-2"
                  style={{
                    background: isActive ? 'rgba(255,215,0,0.08)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${isActive ? 'rgba(255,215,0,0.4)' : 'rgba(255,255,255,0.06)'}`,
                  }}
                >
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
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Betting UI */}
        <AnimatePresence mode="wait">
          {isMyTurn && !myPlayer?.betSuit ? (
            <motion.div
              key="my-turn"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ type: 'spring', stiffness: 280, damping: 22 }}
              className="rounded-xl border border-yellow-600/30 bg-black/70 backdrop-blur p-6"
              style={{ boxShadow: '0 0 50px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,215,0,0.05)' }}
            >
              <h3 className="text-yellow-400 font-bold text-center mb-4" style={{ fontFamily: "'Cinzel', serif", letterSpacing: 1 }}>
                ¡Es tu turno!
              </h3>

              {/* Suit selection */}
              <motion.div
                className="grid grid-cols-2 gap-3 mb-6"
                variants={containerVariants}
                initial="hidden"
                animate="show"
              >
                {SUITS.map((suit) => {
                  const isTaken = takenSuits.includes(suit.id);
                  const isSelected = selectedSuit === suit.id;
                  const takenBy = players.find((p) => p.betSuit === suit.id);
                  return (
                    <motion.button
                      key={suit.id}
                      variants={itemVariants}
                      onClick={() => { if (!isTaken) { playSound('click'); setSelectedSuit(suit.id); } }}
                      disabled={isTaken}
                      whileHover={isTaken ? {} : {
                        scale: 1.05,
                        boxShadow: `0 0 28px ${suit.glow}`,
                      }}
                      whileTap={isTaken ? {} : { scale: 0.96 }}
                      className="rounded-xl p-4 flex flex-col items-center gap-1.5 relative"
                      style={{
                        background: isTaken
                          ? 'rgba(255,255,255,0.02)'
                          : isSelected
                            ? `rgba(${suit.color === '#FFD700' ? '255,215,0' : suit.color === '#DC2626' ? '220,38,38' : suit.color === '#94A3B8' ? '148,163,184' : '22,163,74'},0.12)`
                            : 'rgba(255,255,255,0.04)',
                        border: `2px solid ${isTaken ? 'rgba(255,255,255,0.06)' : isSelected ? suit.color : 'rgba(255,255,255,0.1)'}`,
                        boxShadow: isSelected ? `0 0 24px ${suit.glow}` : 'none',
                        opacity: isTaken ? 0.4 : 1,
                        cursor: isTaken ? 'not-allowed' : 'pointer',
                        transition: 'border 0.2s, box-shadow 0.2s, background 0.2s',
                      }}
                    >
                      <span className="text-3xl">{suit.emoji}</span>
                      <span className="text-white font-bold text-sm" style={{ fontFamily: "'Cinzel', serif" }}>
                        {suit.name}
                      </span>
                      {isTaken && (
                        <span className="text-xs text-gray-500">({takenBy?.username})</span>
                      )}
                    </motion.button>
                  );
                })}
              </motion.div>

              {/* Bet amount */}
              <div className="mb-4">
                <label className="text-gray-300 text-sm mb-2 block">
                  Cantidad (min 50 — max {maxBet.toLocaleString()})
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
                    <motion.button
                      key={v}
                      onClick={() => { playSound('click'); setBetAmount(Math.min(v, maxBet)); }}
                      disabled={v > maxBet}
                      whileHover={v <= maxBet ? { scale: 1.08, boxShadow: '0 0 12px rgba(184,134,11,0.4)' } : {}}
                      whileTap={v <= maxBet ? { scale: 0.93 } : {}}
                      className="flex-1 text-xs py-1.5 rounded-lg font-bold disabled:opacity-30"
                      style={{ background: 'rgba(184,134,11,0.2)', border: '1px solid rgba(184,134,11,0.4)', color: '#FFD700' }}
                    >
                      {v}
                    </motion.button>
                  ))}
                </div>
              </div>

              <motion.button
                onClick={handlePlaceBet}
                disabled={!selectedSuit || betAmount < 50 || betAmount > maxBet}
                whileHover={selectedSuit && betAmount >= 50 && betAmount <= maxBet ? {
                  scale: 1.03,
                  boxShadow: '0 0 36px rgba(255,215,0,0.5), 0 4px 20px rgba(0,0,0,0.5)',
                } : {}}
                whileTap={selectedSuit ? { scale: 0.97 } : {}}
                transition={{ type: 'spring', stiffness: 380, damping: 18 }}
                className="w-full py-3 rounded-xl font-bold text-black disabled:opacity-30 disabled:cursor-not-allowed"
                style={{
                  background: 'linear-gradient(180deg, #C09020 0%, #8B6914 50%, #C09020 100%)',
                  border: '2px solid #FFD700',
                  fontFamily: "'Cinzel', serif",
                  letterSpacing: 2,
                  boxShadow: '0 0 16px rgba(192,144,32,0.25)',
                }}
              >
                APOSTAR {betAmount.toLocaleString()} PTS
                {selectedSuit && ` · ${getSuit(selectedSuit)?.emoji} ${getSuit(selectedSuit)?.name}`}
              </motion.button>
            </motion.div>

          ) : myPlayer?.betSuit ? (
            <motion.div
              key="bet-placed"
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 22 }}
              className="rounded-xl border border-green-600/30 bg-green-900/20 p-6 text-center"
              style={{ boxShadow: '0 0 30px rgba(22,163,74,0.15)' }}
            >
              <motion.div
                animate={{ rotate: [0, -8, 8, 0], scale: [1, 1.15, 1] }}
                transition={{ duration: 0.5 }}
                className="text-4xl mb-2"
              >
                {getSuit(myPlayer.betSuit)?.emoji}
              </motion.div>
              <p className="text-green-400 font-bold">
                Apostaste {myPlayer.betAmount?.toLocaleString()} pts a {getSuit(myPlayer.betSuit)?.name}
              </p>
              <p className="text-gray-400 text-sm mt-1">Esperando a los demás jugadores…</p>
            </motion.div>

          ) : (
            <motion.div
              key="waiting"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="rounded-xl border border-gray-700 bg-black/40 p-6 text-center"
            >
              <div className="text-4xl mb-2">⏳</div>
              <p className="text-gray-400">Esperando el turno de {currentPlayer?.username}…</p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
