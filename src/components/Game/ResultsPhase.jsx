import { useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { playSound } from '../../utils/sound';

const SUITS = [
  { id: 'oros',    name: 'Oros',    emoji: '🪙', color: '#FFD700', glow: '#FFD70060' },
  { id: 'copas',   name: 'Copas',   emoji: '🏆', color: '#DC2626', glow: '#DC262660' },
  { id: 'espadas', name: 'Espadas', emoji: '⚔️', color: '#94A3B8', glow: '#94A3B860' },
  { id: 'bastos',  name: 'Bastos',  emoji: '🪵', color: '#16A34A', glow: '#16A34A60' },
];

function getSuit(id) { return SUITS.find((s) => s.id === id); }

function Confetti() {

  const particles = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    delay: Math.random() * 2,
    dur: 1.5 + Math.random() * 2,
    size: 6 + Math.random() * 12,
    char: ['✦', '✧', '◆', '★', '🪙', '🏆'][Math.floor(Math.random() * 6)],
    color: ['#FFD700', '#DC2626', '#94A3B8', '#16A34A'][Math.floor(Math.random() * 4)],
  }));
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-20">
      <style>{`@keyframes fall{0%{transform:translateY(-20px) rotate(0deg);opacity:1}100%{transform:translateY(calc(100vh + 40px)) rotate(720deg);opacity:0}}`}</style>
      {particles.map((p) => (
        <div key={p.id} className="absolute" style={{
          left: `${p.x}%`, top: '-10%', fontSize: p.size, color: p.color,
          animation: `fall ${p.dur}s ease-in ${p.delay}s infinite`,
        }}>
          {p.char}
        </div>
      ))}
    </div>
  );
}

export default function ResultsPhase({ results, winnerSuit, onPlayAgain, onLeaveLobby }) {
  const { user, updatePoints } = useAuth();
  const suit = getSuit(winnerSuit);
  const myResult = results?.find((r) => r.userId === user?.id);

  useEffect(() => {
    playSound('win');
  }, []);

  // Update points in context
  if (myResult?.pointsAfter !== undefined) {
    updatePoints(myResult.pointsAfter);
  }


  return (
    <div className="min-h-screen pt-16 px-4 pb-8 flex flex-col items-center" style={{
      backgroundImage: `linear-gradient(rgba(4,10,4,0.85), rgba(4,10,4,0.85)), url(${process.env.PUBLIC_URL}/background.jpg)`,
      backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed',
      fontFamily: "'Georgia', serif",
    }}>
      <Confetti />

      <div className="w-full max-w-lg mt-6 relative z-10">
        {/* Winner announcement */}
        <div className="text-center mb-8">
          <div className="text-7xl mb-3">{suit?.emoji}</div>
          <h2 style={{
            background: `linear-gradient(135deg, ${suit?.color}, #B8860B, ${suit?.color})`,
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            fontFamily: "'Cinzel', serif", fontSize: 32, fontWeight: 900,
          }}>
            ¡{suit?.name.toUpperCase()} GANA!
          </h2>
        </div>

        {/* My result highlight */}
        {myResult && (
          <div className="rounded-2xl border mb-6 p-5 text-center" style={{
            borderColor: myResult.betSuit === winnerSuit ? 'rgba(34,197,94,0.5)' : 'rgba(239,68,68,0.3)',
            background: myResult.betSuit === winnerSuit ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.05)',
          }}>
            {myResult.betSuit === winnerSuit ? (
              <>
                <div className="text-4xl mb-2">🎉</div>
                <p className="text-green-400 font-bold text-xl">¡Ganaste!</p>
                <p className="text-gray-300 mt-1">
                  +{(myResult.betAmount * 4).toLocaleString()} pts netos
                </p>
                <p className="text-gray-400 text-sm mt-1">Total: {myResult.pointsAfter?.toLocaleString()} pts</p>
              </>
            ) : (
              <>
                <div className="text-4xl mb-2">😢</div>
                <p className="text-red-400 font-bold text-xl">Perdiste</p>
                <p className="text-gray-300 mt-1">
                  -{myResult.betAmount?.toLocaleString()} pts
                </p>
                <p className="text-gray-400 text-sm mt-1">Total: {myResult.pointsAfter?.toLocaleString()} pts</p>
              </>
            )}
          </div>
        )}

        {/* All results */}
        <div className="rounded-xl border border-yellow-600/20 bg-black/60 p-4 mb-6">
          <h3 className="text-yellow-600 text-xs font-bold mb-3" style={{ fontFamily: "'Cinzel', serif", letterSpacing: 2 }}>
            RESULTADOS FINALES
          </h3>
          <div className="space-y-2">
            {[...(results ?? [])].sort((a, b) => (b.pointsDelta ?? 0) - (a.pointsDelta ?? 0)).map((r) => {
              const rSuit = getSuit(r.betSuit);
              const won = r.betSuit === winnerSuit;
              return (
                <div key={r.userId} className="flex items-center justify-between p-2 rounded-lg" style={{
                  background: won ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.05)',
                  border: `1px solid ${won ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.1)'}`,
                }}>
                  <div className="flex items-center gap-2">
                    <span>{rSuit?.emoji}</span>
                    <div>
                      <p className="text-white text-sm font-medium">{r.username}</p>
                      <p className="text-gray-400 text-xs">apostó {r.betAmount?.toLocaleString()} a {rSuit?.name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold text-sm ${won ? 'text-green-400' : 'text-red-400'}`}>
                      {won ? `+${(r.betAmount * 4).toLocaleString()}` : `-${r.betAmount?.toLocaleString()}`}
                    </p>
                    <p className="text-gray-400 text-xs">{r.pointsAfter?.toLocaleString()} pts</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={() => { playSound('click'); onLeaveLobby(); }}
            className="flex-1 py-3 rounded-xl font-bold text-gray-300 transition"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            Ir al Lobby
          </button>
          <button
            onClick={() => { playSound('click'); onPlayAgain(); }}
            className="flex-1 py-3 rounded-xl font-bold text-black transition"
            style={{
              background: 'linear-gradient(180deg, #C09020 0%, #8B6914 50%, #C09020 100%)',
              border: '2px solid #FFD700',
              fontFamily: "'Cinzel', serif",
            }}
          >
            Jugar de Nuevo
          </button>
        </div>
      </div>
    </div>
  );
}
