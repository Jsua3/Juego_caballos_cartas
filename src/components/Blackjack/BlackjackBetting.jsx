import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';

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
    onPlaceBet(amount);
    setHasBet(true);
  };

  const alreadyBet = hasBet || betsPlaced.includes(user?.id);

  return (
    <div className="flex flex-col items-center gap-6 py-8 px-4 max-w-md mx-auto">
      {/* Timer */}
      <div className="relative flex items-center justify-center">
        <svg width="110" height="110">
          <circle cx="55" cy="55" r={RADIUS} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
          <circle
            cx="55" cy="55" r={RADIUS}
            fill="none"
            stroke={timerColor}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
            transform="rotate(-90 55 55)"
            style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s' }}
          />
        </svg>
        <div className="absolute flex flex-col items-center">
          <span className="text-3xl font-black" style={{ color: timerColor, fontFamily: "'Cinzel', serif" }}>
            {timeLeft}
          </span>
          <span className="text-gray-500 text-xs">seg</span>
        </div>
      </div>

      <div className="text-center">
        <h2 className="text-yellow-400 font-bold text-xl" style={{ fontFamily: "'Cinzel', serif", letterSpacing: 2 }}>
          FASE DE APUESTAS
        </h2>
        <p className="text-gray-400 text-sm mt-1">Elige tu apuesta para esta mano</p>
      </div>

      {/* Bet controls */}
      <div className="w-full rounded-xl border border-yellow-600/20 bg-black/50 p-5 space-y-4">
        {/* Quick chips */}
        <div className="flex gap-2 justify-center flex-wrap">
          {QUICK_CHIPS.map((chip) => (
            <button
              key={chip}
              onClick={() => setBetAmount(Math.min(chip, myPoints))}
              disabled={alreadyBet || !canBet || myPoints < chip}
              className="w-14 h-14 rounded-full font-bold text-sm transition disabled:opacity-30"
              style={{
                background: betAmount === chip ? 'linear-gradient(135deg, #B8860B, #FFD700)' : 'rgba(255,215,0,0.1)',
                border: `2px solid ${betAmount === chip ? '#FFD700' : 'rgba(255,215,0,0.3)'}`,
                color: betAmount === chip ? '#000' : '#FFD700',
              }}
            >
              {chip}
            </button>
          ))}
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
            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-center font-bold focus:outline-none focus:border-yellow-500"
          />
          <span className="text-gray-400 text-sm">pts</span>
        </div>

        <button
          onClick={handleBet}
          disabled={alreadyBet || !canBet || timeLeft === 0}
          className="w-full py-3 rounded-xl font-bold text-sm transition disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            background: alreadyBet
              ? 'rgba(34,197,94,0.2)'
              : 'linear-gradient(180deg, #C09020 0%, #8B6914 50%, #C09020 100%)',
            border: `2px solid ${alreadyBet ? '#22C55E' : '#FFD700'}`,
            color: alreadyBet ? '#22C55E' : '#000',
            fontFamily: "'Cinzel', serif",
          }}
        >
          {alreadyBet ? '✓ APUESTA REGISTRADA' : `APOSTAR ${betAmount.toLocaleString()} PTS`}
        </button>

        {!canBet && (
          <p className="text-red-400 text-xs text-center">Sin puntos suficientes para apostar</p>
        )}
      </div>

      {/* Players list */}
      <div className="w-full rounded-xl border border-gray-700/40 bg-black/30 p-3">
        <p className="text-gray-500 text-xs font-bold mb-2" style={{ fontFamily: "'Cinzel', serif", letterSpacing: 1 }}>
          JUGADORES
        </p>
        <div className="space-y-1.5">
          {players.map((p) => {
            const bet = betsPlaced.includes(p.userId);
            return (
              <div key={p.userId} className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{ background: 'rgba(184,134,11,0.15)', border: '1px solid rgba(184,134,11,0.3)', color: '#FFD700' }}>
                  {p.username.charAt(0).toUpperCase()}
                </div>
                <span className="text-gray-300 text-sm flex-1">{p.username}</span>
                {bet
                  ? <span className="text-green-400 text-xs font-bold">✓ Apostó</span>
                  : <span className="text-gray-600 text-xs">Esperando…</span>
                }
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
