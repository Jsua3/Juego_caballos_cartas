import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { playSound } from '../../utils/sound';

const QUICK_CHIPS = [50, 100, 200, 500];
const RADIUS = 45;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function BlackjackBetting({ timeLimit, players, betsPlaced = [], onPlaceBet }) {
  const { user } = useAuth();
  const [timeLeft, setTimeLeft] = useState(timeLimit);
  const [betAmount, setBetAmount] = useState(50);
  const [hasBet, setHasBet] = useState(false);
  const intervalRef = useRef(null);

  const myPoints = user?.points ?? 0;
  const canBet = myPoints >= 50;

  useEffect(() => {
    setTimeLeft(timeLimit);
    setHasBet(false);
    setBetAmount(Math.min(50, myPoints));
    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) { clearInterval(intervalRef.current); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [timeLimit]); // eslint-disable-line

  const dashOffset = CIRCUMFERENCE * (1 - timeLeft / timeLimit);
  const timerColor = timeLeft > 7 ? '#22C55E' : timeLeft > 3 ? '#F59E0B' : '#EF4444';

  const handleBet = () => {
    if (hasBet || !canBet) return;
    const amount = Math.max(50, Math.min(betAmount, myPoints));
    playSound('click');
    onPlaceBet(amount);
    setHasBet(true);
  };

  const alreadyBet = hasBet || betsPlaced.includes(user?.id);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col items-center gap-6 py-8 px-4 max-w-md mx-auto"
    >
      {/* Timer */}
      <motion.div
        className="relative flex items-center justify-center"
        animate={{ scale: timeLeft <= 3 ? [1, 1.05, 1] : 1 }}
        transition={{ repeat: timeLeft <= 3 ? Infinity : 0, duration: 0.5 }}
      >
        <svg width="110" height="110">
          <circle cx="55" cy="55" r={RADIUS} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="8" />
          <circle
            cx="55" cy="55" r={RADIUS}
            fill="none"
            stroke={timerColor}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
            transform="rotate(-90 55 55)"
            style={{
              transition: 'stroke-dashoffset 1s linear, stroke 0.3s',
              filter: `drop-shadow(0 0 6px ${timerColor}80)`,
            }}
          />
        </svg>
        <div className="absolute flex flex-col items-center">
          <span className="text-3xl font-black" style={{ color: timerColor, fontFamily: "'Cinzel', serif", textShadow: `0 0 12px ${timerColor}80` }}>
            {timeLeft}
          </span>
          <span className="text-gray-500 text-xs">seg</span>
        </div>
      </motion.div>

      <div className="text-center">
        <h2 className="text-yellow-400 font-bold text-xl" style={{ fontFamily: "'Cinzel', serif", letterSpacing: 2, textShadow: '0 0 20px rgba(255,215,0,0.3)' }}>
          FASE DE APUESTAS
        </h2>
        <p className="text-gray-400 text-sm mt-1">Elige tu apuesta para esta mano</p>
      </div>

      {/* Bet controls */}
      <motion.div
        className="w-full rounded-2xl border border-yellow-600/20 bg-black/50 p-5 space-y-4"
        style={{ boxShadow: '0 0 40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,215,0,0.06)' }}
      >
        {/* Quick chips */}
        <div className="flex gap-2 justify-center flex-wrap">
          {QUICK_CHIPS.map((chip, i) => {
            const isSelected = betAmount === chip;
            const unavailable = alreadyBet || !canBet || myPoints < chip;
            return (
              <motion.button
                key={chip}
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.06, type: 'spring', stiffness: 400, damping: 20 }}
                onClick={() => { if (!unavailable) { playSound('click'); setBetAmount(Math.min(chip, myPoints)); } }}
                disabled={unavailable}
                whileHover={unavailable ? {} : { scale: 1.12, boxShadow: isSelected ? '0 0 22px rgba(255,215,0,0.6)' : '0 0 14px rgba(255,215,0,0.3)' }}
                whileTap={unavailable ? {} : { scale: 0.9 }}
                className="w-14 h-14 rounded-full font-bold text-sm disabled:opacity-30 disabled:cursor-not-allowed"
                style={{
                  background: isSelected
                    ? 'linear-gradient(135deg, #B8860B, #FFD700, #B8860B)'
                    : 'rgba(255,215,0,0.08)',
                  border: `2px solid ${isSelected ? '#FFD700' : 'rgba(255,215,0,0.25)'}`,
                  color: isSelected ? '#000' : '#FFD700',
                  boxShadow: isSelected ? '0 0 16px rgba(255,215,0,0.4)' : 'none',
                  transition: 'background 0.2s, border 0.2s, box-shadow 0.2s',
                }}
              >
                {chip}
              </motion.button>
            );
          })}
        </div>

        {/* Slider */}
        <div>
          <input
            type="range"
            min={50}
            max={Math.max(50, myPoints)}
            step={10}
            value={betAmount}
            onChange={(e) => setBetAmount(Number(e.target.value))}
            disabled={alreadyBet || !canBet}
            className="w-full accent-yellow-500"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>50</span>
            <span>{myPoints.toLocaleString()}</span>
          </div>
        </div>

        {/* Manual input */}
        <div className="flex gap-2 items-center">
          <input
            type="number"
            min={50}
            max={myPoints}
            value={betAmount}
            onChange={(e) => setBetAmount(Math.max(50, Math.min(Number(e.target.value), myPoints)))}
            disabled={alreadyBet || !canBet}
            className="flex-1 bg-gray-800/80 border border-gray-700 rounded-xl px-3 py-2 text-white text-center font-bold focus:outline-none focus:border-yellow-500/60 transition"
          />
          <span className="text-gray-400 text-sm">pts</span>
        </div>

        <AnimatePresence mode="wait">
          {alreadyBet ? (
            <motion.div
              key="confirmed"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full py-3 rounded-xl font-bold text-sm text-center"
              style={{
                background: 'rgba(34,197,94,0.15)',
                border: '2px solid #22C55E',
                color: '#22C55E',
                fontFamily: "'Cinzel', serif",
                boxShadow: '0 0 20px rgba(34,197,94,0.2)',
              }}
            >
              ✓ APUESTA REGISTRADA
            </motion.div>
          ) : (
            <motion.button
              key="bet"
              onClick={handleBet}
              disabled={!canBet || timeLeft === 0}
              whileHover={canBet && timeLeft > 0 ? {
                scale: 1.03,
                boxShadow: '0 0 32px rgba(255,215,0,0.45), 0 4px 20px rgba(0,0,0,0.5)',
              } : {}}
              whileTap={canBet && timeLeft > 0 ? { scale: 0.97 } : {}}
              transition={{ type: 'spring', stiffness: 380, damping: 18 }}
              className="w-full py-3 rounded-xl font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: 'linear-gradient(180deg, #C09020 0%, #8B6914 50%, #C09020 100%)',
                border: '2px solid #FFD700',
                color: '#000',
                fontFamily: "'Cinzel', serif",
                letterSpacing: 1,
                boxShadow: '0 0 16px rgba(192,144,32,0.3)',
              }}
            >
              APOSTAR {betAmount.toLocaleString()} PTS
            </motion.button>
          )}
        </AnimatePresence>

        {!canBet && (
          <p className="text-red-400 text-xs text-center">Sin puntos suficientes para apostar</p>
        )}
      </motion.div>

      {/* Players list */}
      <motion.div
        className="w-full rounded-xl border border-gray-700/40 bg-black/30 p-3"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <p className="text-gray-500 text-xs font-bold mb-2" style={{ fontFamily: "'Cinzel', serif", letterSpacing: 1 }}>
          JUGADORES
        </p>
        <div className="space-y-1.5">
          {players.map((p) => {
            const bet = betsPlaced.includes(p.userId);
            return (
              <motion.div
                key={p.userId}
                className="flex items-center gap-2"
                animate={bet ? { x: [0, 4, 0] } : {}}
                transition={{ duration: 0.3 }}
              >
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{ background: 'rgba(184,134,11,0.15)', border: '1px solid rgba(184,134,11,0.3)', color: '#FFD700' }}>
                  {p.username.charAt(0).toUpperCase()}
                </div>
                <span className="text-gray-300 text-sm flex-1">{p.username}</span>
                <AnimatePresence>
                  {bet ? (
                    <motion.span
                      key="bet"
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="text-green-400 text-xs font-bold"
                    >
                      ✓ Apostó
                    </motion.span>
                  ) : (
                    <span className="text-gray-600 text-xs">Esperando…</span>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </motion.div>
  );
}
