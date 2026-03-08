import { useState, useEffect, useCallback, useRef } from "react";

/* ─────────────── CONSTANTS ─────────────── */
const SUITS = [
  { id: "oros",    name: "Oros",    emoji: "🪙", symbol: "⬤", color: "#FFD700", glow: "#FFD70060", accent: "#B8860B" },
  { id: "copas",   name: "Copas",   emoji: "🏆", symbol: "♥", color: "#DC2626", glow: "#DC262660", accent: "#991B1B" },
  { id: "espadas", name: "Espadas", emoji: "⚔️", symbol: "♠", color: "#94A3B8", glow: "#94A3B860", accent: "#64748B" },
  { id: "bastos",  name: "Bastos",  emoji: "🪵", symbol: "♣", color: "#16A34A", glow: "#16A34A60", accent: "#166534" },
];

const TRACK_LENGTH   = 7;
const COPIES_PER_SUIT = 9; // 9 × 4 palos = 36 cartas
const INITIAL_COINS  = 500;

/* ─────────────── HELPERS ─────────────── */
function playGameSound(type) {
  try {
    const base  = process.env.PUBLIC_URL || "";
    const audio = new Audio(`${base}/sounds/${type}.mp3`);
    audio.play().catch(() => {});
  } catch (_) {}
}

function createDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (let i = 0; i < COPIES_PER_SUIT; i++) {
      deck.push({ suit: suit.id, number: 11, id: `${suit.id}-11-${i}` });
    }
  }
  return deck;
}

function shuffleDeck(deck) {
  const s = [...deck];
  for (let i = s.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [s[i], s[j]] = [s[j], s[i]];
  }
  return s;
}

function getSuitInfo(suitId) {
  return SUITS.find((s) => s.id === suitId);
}

function makeInitialPlayers(n) {
  return Array.from({ length: n }, (_, i) => ({
    id: i + 1,
    name: `Jugador ${i + 1}`,
    coins: INITIAL_COINS,
    selectedBet: null,
    betAmount: 100,
  }));
}

/* ─────────────── AMBIENT PARTICLES ─────────────── */
function AmbientParticles() {
  const particles = Array.from({ length: 18 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: 2 + Math.random() * 3,
    dur: 6 + Math.random() * 10,
    delay: Math.random() * 8,
    char: ["✦", "◆", "✧", "·"][Math.floor(Math.random() * 4)],
  }));
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute"
          style={{
            left: `${p.x}%`,
            top:  `${p.y}%`,
            fontSize: p.size,
            color: "#B8860B",
            opacity: 0.18,
            animation: `drift ${p.dur}s ease-in-out ${p.delay}s infinite alternate`,
          }}
        >
          {p.char}
        </div>
      ))}
    </div>
  );
}

/* ─────────────── ART DECO DIVIDER ─────────────── */
function ArtDecoDivider({ label }) {
  return (
    <div className="flex items-center gap-3 my-1">
      <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, transparent, #B8860B50)" }} />
      {label && (
        <span style={{ color: "#B8860B", fontSize: 10, letterSpacing: 4, fontFamily: "'Cinzel', serif" }}>
          {label}
        </span>
      )}
      <span style={{ color: "#B8860B60", fontSize: 12 }}>✦</span>
      {label && (
        <span style={{ color: "#B8860B", fontSize: 10, letterSpacing: 4, fontFamily: "'Cinzel', serif" }}>
          {label}
        </span>
      )}
      <div className="flex-1 h-px" style={{ background: "linear-gradient(270deg, transparent, #B8860B50)" }} />
    </div>
  );
}

/* ─────────────── CASINO CARD ─────────────── */
function CasinoCard({ card, faceDown = false, small = false, large = false, highlight = false, className = "" }) {
  const [imgError, setImgError] = useState(false);
  const w = large ? 110 : small ? 52 : 72;
  const h = large ? 154 : small ? 76 : 104;

  if (faceDown) {
    return (
      <div
        className={`relative rounded-lg overflow-hidden ${highlight ? "ring-2 ring-yellow-400" : ""} ${className}`}
        style={{
          width: w, height: h,
          background: "linear-gradient(135deg, #7B1F1F 0%, #991B1B 50%, #7B1F1F 100%)",
          border: "2px solid #B8860B",
          boxShadow: highlight ? "0 0 20px rgba(255,215,0,0.5)" : "0 4px 12px rgba(0,0,0,0.5)",
        }}
      >
        <div className="absolute inset-1 rounded border border-yellow-700/40" style={{
          background: `repeating-conic-gradient(#991B1B22 0% 25%, transparent 0% 50%) 0 0 / 8px 8px`,
        }} />
        <div className="absolute inset-2 rounded border border-yellow-600/30 flex items-center justify-center">
          <span style={{ fontSize: small ? 16 : 22, color: "#B8860B", opacity: 0.6 }}>♠</span>
        </div>
      </div>
    );
  }

  const suit = getSuitInfo(card.suit);

  if (!imgError) {
    return (
      <div
        className={`relative rounded-lg overflow-hidden transition-all duration-500 ${className}`}
        style={{
          width: w, height: h,
          border: `2px solid ${highlight ? "#FFD700" : "#B8860B"}`,
          boxShadow: highlight
            ? `0 0 24px ${suit.glow}, 0 0 8px rgba(255,215,0,0.4)`
            : "0 4px 12px rgba(0,0,0,0.4)",
        }}
      >
        <img
          src={`${process.env.PUBLIC_URL}/cards/${card.suit}-11.png`}
          alt={`Caballo de ${suit.name}`}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          onError={() => setImgError(true)}
        />
      </div>
    );
  }

  // Fallback: diseño casino
  return (
    <div
      className={`relative rounded-lg overflow-hidden transition-all duration-500 ${className}`}
      style={{
        width: w, height: h,
        background: "linear-gradient(180deg, #FFFEF5 0%, #F5F0E0 100%)",
        border: `2px solid ${highlight ? "#FFD700" : "#B8860B"}`,
        boxShadow: highlight
          ? `0 0 24px ${suit.glow}, 0 0 8px rgba(255,215,0,0.4)`
          : "0 4px 12px rgba(0,0,0,0.4)",
      }}
    >
      <div className="absolute top-1 left-1.5 flex flex-col items-center leading-none" style={{ color: suit.color }}>
        <span style={{ fontSize: small ? 11 : 15, fontFamily: "'Georgia', serif", fontWeight: 700 }}>C</span>
        <span style={{ fontSize: small ? 8 : 11 }}>{suit.symbol}</span>
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <span style={{ fontSize: small ? 22 : 32, color: suit.color, filter: `drop-shadow(0 1px 2px ${suit.glow})`, fontFamily: "serif" }}>
          {suit.symbol}
        </span>
      </div>
      <div className="absolute bottom-1 right-1.5 flex flex-col items-center leading-none rotate-180" style={{ color: suit.color }}>
        <span style={{ fontSize: small ? 11 : 15, fontFamily: "'Georgia', serif", fontWeight: 700 }}>C</span>
        <span style={{ fontSize: small ? 8 : 11 }}>{suit.symbol}</span>
      </div>
    </div>
  );
}

/* ─────────────── HORSE MARKER ─────────────── */
function HorseMarker({ suitId, suitColor, isWinner }) {
  const [imgError, setImgError] = useState(false);
  if (imgError) {
    return (
      <span style={{
        fontSize: 22,
        filter: isWinner
          ? `drop-shadow(0 0 10px ${suitColor})`
          : `drop-shadow(0 2px 4px rgba(0,0,0,0.5))`,
      }}>🏇</span>
    );
  }
  return (
    <img
      src={`${process.env.PUBLIC_URL}/cards/${suitId}-11.png`}
      alt={suitId}
      style={{
        height: 38, width: "auto", objectFit: "contain",
        filter: isWinner
          ? `drop-shadow(0 0 10px ${suitColor})`
          : `drop-shadow(0 2px 4px rgba(0,0,0,0.5))`,
        borderRadius: 3,
      }}
      onError={() => setImgError(true)}
    />
  );
}

/* ─────────────── WINNER CELEBRATION ─────────────── */
function WinnerCelebration({ suit }) {
  const info = getSuitInfo(suit);
  const particles = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    delay: Math.random() * 2,
    dur: 1.5 + Math.random() * 2,
    size: 4 + Math.random() * 10,
    char: ["✦", "✧", "◆", "★", "🪙", "🏆", "♠", "♥"][Math.floor(Math.random() * 8)],
  }));
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-20">
      {particles.map((p) => (
        <div key={p.id} className="absolute" style={{
          left: `${p.x}%`, top: "-10%", fontSize: p.size, color: info.color,
          animation: `fall ${p.dur}s ease-in ${p.delay}s infinite`,
          filter: `drop-shadow(0 0 4px ${info.glow})`,
        }}>
          {p.char}
        </div>
      ))}
    </div>
  );
}

/* ─────────────── CHIP BUTTON ─────────────── */
function ChipButton({ amount, selected, onClick, disabled }) {
  const chipColors = {
    50:  { bg: "#1E40AF", ring: "#3B82F6", text: "#DBEAFE" },
    100: { bg: "#DC2626", ring: "#EF4444", text: "#FEE2E2" },
    200: { bg: "#000000", ring: "#FFD700", text: "#FFD700" },
  };
  const c = chipColors[amount] || chipColors[100];
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`relative w-16 h-16 rounded-full transition-all duration-300 font-bold ${
        selected ? "scale-110 -translate-y-1" : "hover:scale-105 hover:-translate-y-0.5"
      } ${disabled ? "opacity-30 cursor-not-allowed" : "cursor-pointer"}`}
      style={{
        background: `radial-gradient(circle at 35% 35%, ${c.ring}, ${c.bg})`,
        border: `3px solid ${c.ring}`,
        boxShadow: selected
          ? `0 0 20px ${c.ring}80, 0 8px 24px rgba(0,0,0,0.6), inset 0 2px 4px rgba(255,255,255,0.2)`
          : `0 4px 12px rgba(0,0,0,0.5), inset 0 2px 4px rgba(255,255,255,0.15)`,
        color: c.text,
        fontFamily: "'Cinzel', serif",
        fontSize: 16,
      }}
    >
      <div className="absolute inset-2 rounded-full" style={{ border: `2px dashed ${c.ring}60` }} />
      <span className="relative z-10">{amount}</span>
    </button>
  );
}

/* ─────────────── PLAYER AVATAR ─────────────── */
function PlayerAvatar({ player, isActive, size = "md" }) {
  const suit = player.selectedBet ? getSuitInfo(player.selectedBet) : null;
  const sz   = size === "sm" ? 32 : 44;
  return (
    <div
      className="flex flex-col items-center gap-1"
      style={{ opacity: isActive ? 1 : 0.55 }}
    >
      <div
        className="rounded-full flex items-center justify-center font-black transition-all"
        style={{
          width: sz, height: sz,
          background: suit
            ? `radial-gradient(circle, ${suit.color}30, ${suit.color}10)`
            : "radial-gradient(circle, rgba(184,134,11,0.2), rgba(184,134,11,0.05))",
          border: `2px solid ${isActive ? "#FFD700" : suit ? suit.color : "rgba(184,134,11,0.3)"}`,
          boxShadow: isActive ? "0 0 16px rgba(255,215,0,0.5)" : "none",
          fontFamily: "'Cinzel', serif",
          color: "#FFD700",
          fontSize: size === "sm" ? 12 : 16,
        }}
      >
        {player.id}
      </div>
      <span style={{ color: "#A89070", fontSize: size === "sm" ? 9 : 11, fontFamily: "'Cinzel', serif" }}>
        {player.name}
      </span>
      {suit && (
        <span style={{ fontSize: size === "sm" ? 12 : 16, filter: `drop-shadow(0 0 4px ${suit.glow})` }}>
          {suit.emoji}
        </span>
      )}
    </div>
  );
}

/* ─────────────── MAIN GAME ─────────────── */
export default function CarreraDeCaballos() {
  // phases: "players" | "betting" | "racing" | "finished"
  const [phase, setPhase]                   = useState("players");
  const [numPlayers, setNumPlayers]         = useState(2);
  const [players, setPlayers]               = useState([]);
  const [currentBettingIdx, setCurrentBettingIdx] = useState(0);
  const [tempBetAmount, setTempBetAmount]   = useState(100);
  const [tempSelectedBet, setTempSelectedBet] = useState(null);

  // Race state
  const [deck, setDeck]                     = useState([]);
  const [trackCards, setTrackCards]         = useState([]);
  const [positions, setPositions]           = useState({ oros: 0, copas: 0, espadas: 0, bastos: 0 });
  const [currentCard, setCurrentCard]       = useState(null);
  const [revealedTrack, setRevealedTrack]   = useState([]);
  const [winner, setWinner]                 = useState(null);
  const [log, setLog]                       = useState([]);
  const [speed, setSpeed]                   = useState(1000);
  const [autoPlay, setAutoPlay]             = useState(false);
  const [cardsDrawn, setCardsDrawn]         = useState(0);
  const [penaltyCard, setPenaltyCard]       = useState(null);
  const [movingEffect, setMovingEffect]     = useState(null);

  const intervalRef = useRef(null);
  const logRef      = useRef(null);

  /* ── Scroll del log ── */
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [log]);

  const addLog = (msg) => setLog((prev) => [...prev.slice(-50), { msg, time: Date.now() }]);

  /* ── Trigger effect GIF ── */
  const triggerEffect = useCallback((suit, type) => {
    setMovingEffect({ suit, type });
    setTimeout(() => setMovingEffect(null), 900);
  }, []);

  /* ── Init race deck ── */
  const initRaceDeck = useCallback(() => {
    const fullDeck   = shuffleDeck(createDeck());
    const track      = fullDeck.slice(0, TRACK_LENGTH);
    const remaining  = fullDeck.slice(TRACK_LENGTH);
    setDeck(remaining);
    setTrackCards(track);
    setPositions({ oros: 0, copas: 0, espadas: 0, bastos: 0 });
    setCurrentCard(null);
    setRevealedTrack([]);
    setWinner(null);
    setLog([]);
    setCardsDrawn(0);
    setPenaltyCard(null);
    setAutoPlay(false);
    setMovingEffect(null);
  }, []);

  /* ── Full reset ── */
  const resetAll = useCallback(() => {
    setPhase("players");
    setPlayers([]);
    setCurrentBettingIdx(0);
    setTempBetAmount(100);
    setTempSelectedBet(null);
    initRaceDeck();
  }, [initRaceDeck]);

  /* ── Phase: players → betting ── */
  const handleStartBetting = () => {
    const p = makeInitialPlayers(numPlayers);
    setPlayers(p);
    setCurrentBettingIdx(0);
    setTempBetAmount(100);
    setTempSelectedBet(null);
    initRaceDeck();
    setPhase("betting");
    playGameSound("click");
  };

  /* ── Phase: betting — confirm bet for current player ── */
  const handleConfirmBet = () => {
    if (!tempSelectedBet) return;
    const updated = players.map((p, i) =>
      i === currentBettingIdx
        ? { ...p, selectedBet: tempSelectedBet, betAmount: tempBetAmount, coins: p.coins - tempBetAmount }
        : p
    );
    setPlayers(updated);

    if (currentBettingIdx + 1 < players.length) {
      setCurrentBettingIdx(currentBettingIdx + 1);
      setTempBetAmount(100);
      setTempSelectedBet(null);
    } else {
      // All players have bet → start race
      setPhase("racing");
      setAutoPlay(true);
      addLog("🏁 ¡La carrera ha comenzado!");
    }
  };

  /* ── Track penalty check ── */
  const checkTrackPenalty = useCallback((newPositions, revealed) => {
    const minPos     = Math.min(...Object.values(newPositions));
    const nextReveal = revealed.length;
    if (minPos > nextReveal && nextReveal < TRACK_LENGTH) {
      const penCard     = trackCards[nextReveal];
      const newRevealed = [...revealed, nextReveal];
      const suitInfo    = getSuitInfo(penCard.suit);
      if (newPositions[penCard.suit] > 0) {
        newPositions[penCard.suit] = Math.max(0, newPositions[penCard.suit] - 1);
        addLog(`⚠️ ¡Penalización! ${suitInfo.name} retrocede`);
        triggerEffect(penCard.suit, "retreat");
        playGameSound("retreat");
      } else {
        addLog(`📋 Carta revelada: ${suitInfo.name} — sin efecto`);
      }
      setPenaltyCard(penCard);
      setTimeout(() => setPenaltyCard(null), 1500);
      setRevealedTrack(newRevealed);
      return { newPositions, newRevealed };
    }
    return { newPositions, newRevealed: revealed };
  }, [trackCards, triggerEffect]);

  /* ── Draw card ── */
  const drawCard = useCallback(() => {
    if (deck.length === 0 || winner) {
      if (deck.length === 0 && !winner) {
        let maxPos = -1, maxSuit = null;
        for (const [suit, pos] of Object.entries(positions)) {
          if (pos > maxPos) { maxPos = pos; maxSuit = suit; }
        }
        finishRace(maxSuit, positions);
      }
      return;
    }
    const card       = deck[0];
    const newDeck    = deck.slice(1);
    const suitInfo   = getSuitInfo(card.suit);
    setCurrentCard(card);
    setDeck(newDeck);
    setCardsDrawn((prev) => prev + 1);

    const newPositions = { ...positions };
    newPositions[card.suit]++;
    addLog(`🃏 ${suitInfo.name} ${suitInfo.symbol} → avanza`);
    triggerEffect(card.suit, "advance");
    playGameSound("advance");

    if (newPositions[card.suit] > TRACK_LENGTH) {
      finishRace(card.suit, newPositions);
      return;
    }
    const result = checkTrackPenalty(newPositions, revealedTrack);
    setPositions(result.newPositions);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deck, winner, positions, revealedTrack, checkTrackPenalty, triggerEffect]);

  const finishRace = (winnerSuit, finalPositions) => {
    setWinner(winnerSuit);
    setPositions(finalPositions);
    setPhase("finished");
    setAutoPlay(false);
    const suitInfo = getSuitInfo(winnerSuit);
    addLog(`🏆 ¡${suitInfo.name} cruza la meta y GANA!`);
    playGameSound("win");

    // Actualizar monedas de jugadores
    setPlayers((prev) =>
      prev.map((p) => {
        if (p.selectedBet === winnerSuit) {
          const winnings = p.betAmount * 4;
          addLog(`💰 ${p.name} gana ${winnings} monedas (×4)!`);
          return { ...p, coins: p.coins + winnings };
        } else {
          addLog(`😢 ${p.name} pierde ${p.betAmount} monedas`);
          return p;
        }
      })
    );
  };

  /* ── Auto play interval ── */
  useEffect(() => {
    if (autoPlay && phase === "racing" && !winner) {
      intervalRef.current = setInterval(drawCard, speed);
      return () => clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [autoPlay, phase, winner, drawCard, speed]);

  /* ── Click sound on any button ── */
  const handleButtonClick = (e) => {
    if (e.target.closest("button")) playGameSound("click");
  };

  /* ─────────────── RENDER ─────────────── */
  const currentBettingPlayer = players[currentBettingIdx];

  return (
    <div
      onClick={handleButtonClick}
      className="min-h-screen text-white overflow-auto relative"
      style={{
        backgroundImage: `linear-gradient(rgba(4,10,4,0.80), rgba(4,10,4,0.80)), url(${process.env.PUBLIC_URL}/background.jpg)`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
        fontFamily: "'Georgia', 'Times New Roman', serif",
      }}
    >
      {/* ── Global styles ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700;900&family=Playfair+Display:wght@400;700;900&family=Cormorant+Garamond:wght@400;600;700&display=swap');

        .felt-texture {
          background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23166534' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
        }
        .glass {
          background: linear-gradient(180deg, rgba(8,8,8,0.88) 0%, rgba(14,14,14,0.92) 100%);
          backdrop-filter: blur(16px);
          border: 1px solid rgba(184,134,11,0.28);
          border-radius: 18px;
        }
        .glass-subtle {
          background: rgba(10,10,10,0.6);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(184,134,11,0.12);
          border-radius: 12px;
        }
        .gold-text {
          background: linear-gradient(135deg, #FFD700 0%, #B8860B 40%, #FFD700 70%, #DAA520 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .glow-gold { box-shadow: 0 0 40px rgba(255,215,0,0.12), 0 0 80px rgba(255,215,0,0.04); }
        .btn-casino {
          background: linear-gradient(180deg, #C09020 0%, #8B6914 50%, #C09020 100%);
          border: 2px solid #FFD700;
          color: #FFF8E7;
          font-family: 'Cinzel', serif;
          font-weight: 700;
          letter-spacing: 2px;
          text-transform: uppercase;
          transition: all 0.3s;
          box-shadow: 0 4px 20px rgba(184,134,11,0.35), inset 0 1px 0 rgba(255,255,255,0.15);
        }
        .btn-casino:hover:not(:disabled) {
          background: linear-gradient(180deg, #DAA520 0%, #B8860B 50%, #DAA520 100%);
          box-shadow: 0 6px 30px rgba(255,215,0,0.5), inset 0 1px 0 rgba(255,255,255,0.25);
          transform: translateY(-2px);
        }
        .btn-casino:disabled { opacity: 0.25; cursor: not-allowed; transform: none; }
        .track-lane {
          background: linear-gradient(90deg, rgba(22,101,52,0.12) 0%, rgba(22,101,52,0.22) 50%, rgba(22,101,52,0.12) 100%);
          border: 1px solid rgba(184,134,11,0.12);
        }
        @keyframes drift {
          from { transform: translateY(0) rotate(0deg); opacity: 0.12; }
          to   { transform: translateY(-20px) rotate(15deg); opacity: 0.25; }
        }
        @keyframes fall {
          0%   { transform: translateY(-20px) rotate(0deg);   opacity: 1; }
          100% { transform: translateY(calc(100vh + 40px)) rotate(720deg); opacity: 0; }
        }
        @keyframes slideIn { from { opacity:0; transform: translateX(-16px); } to { opacity:1; transform: translateX(0); } }
        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position:  200% center; }
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 20px rgba(255,215,0,0.3); }
          50%       { box-shadow: 0 0 40px rgba(255,215,0,0.7); }
        }
        .log-entry  { animation: slideIn 0.3s ease-out; }
        .pulse-ring { animation: pulse-glow 2s ease-in-out infinite; }
      `}</style>

      {/* Textura de tapete */}
      <div className="fixed inset-0 felt-texture pointer-events-none z-0" />

      {/* Partículas ambientales */}
      <AmbientParticles />

      {/* Celebración ganador */}
      {winner && <WinnerCelebration suit={winner} />}

      <div className="relative z-10">
        {/* Borde dorado superior */}
        <div className="h-1" style={{ background: "linear-gradient(90deg, transparent, #B8860B, #FFD700, #B8860B, transparent)" }} />

        {/* ══ HEADER ══ */}
        <div className="text-center pt-8 pb-4 px-4">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span style={{ color: "#B8860B60", fontSize: 10, letterSpacing: 10 }}>♠ ♥ ♣ ♦</span>
          </div>
          <h1
            className="gold-text text-4xl md:text-5xl font-black tracking-widest"
            style={{ fontFamily: "'Cinzel', serif", textShadow: "0 2px 30px rgba(184,134,11,0.3)" }}
          >
            CARRERA DE CABALLOS
          </h1>
          <ArtDecoDivider label="BARAJA ESPAÑOLA" />
        </div>

        <div className="max-w-5xl mx-auto px-4 pb-10 space-y-5 relative z-10">

          {/* ════════════════════════════════
              FASE 1 — SELECCIÓN DE JUGADORES
              ════════════════════════════════ */}
          {phase === "players" && (
            <div className="glass p-8 glow-gold max-w-lg mx-auto">
              <h2 className="gold-text text-2xl font-black text-center mb-1" style={{ fontFamily: "'Cinzel', serif" }}>
                NUEVA PARTIDA
              </h2>
              <p className="text-center mb-6" style={{ color: "#8B7355", fontSize: 13, fontFamily: "'Cormorant Garamond', serif", letterSpacing: 1 }}>
                ¿Cuántos jugadores participan?
              </p>
              <ArtDecoDivider />

              <div className="flex justify-center gap-4 mt-6 mb-8">
                {[1, 2, 3, 4].map((n) => (
                  <button
                    key={n}
                    onClick={() => setNumPlayers(n)}
                    className="transition-all duration-300"
                    style={{
                      width: 64, height: 64,
                      borderRadius: "50%",
                      background: numPlayers === n
                        ? "radial-gradient(circle at 35% 35%, #DAA520, #8B6914)"
                        : "radial-gradient(circle at 35% 35%, rgba(184,134,11,0.2), rgba(184,134,11,0.05))",
                      border: numPlayers === n ? "3px solid #FFD700" : "2px solid rgba(184,134,11,0.3)",
                      color: numPlayers === n ? "#FFF8E7" : "#8B7355",
                      fontFamily: "'Cinzel', serif",
                      fontSize: 22,
                      fontWeight: 900,
                      boxShadow: numPlayers === n ? "0 0 24px rgba(255,215,0,0.5)" : "none",
                      transform: numPlayers === n ? "scale(1.1) translateY(-3px)" : "scale(1)",
                    }}
                  >
                    {n}
                  </button>
                ))}
              </div>

              <div className="flex justify-center gap-5 mb-8">
                {makeInitialPlayers(numPlayers).map((p) => (
                  <PlayerAvatar key={p.id} player={p} isActive size="md" />
                ))}
              </div>

              <div className="flex justify-center">
                <button onClick={handleStartBetting} className="btn-casino px-10 py-3 rounded-xl text-base">
                  🎲 COMENZAR
                </button>
              </div>
            </div>
          )}

          {/* ════════════════════════════════
              FASE 2 — APUESTAS
              ════════════════════════════════ */}
          {phase === "betting" && currentBettingPlayer && (
            <>
              {/* Progreso de apuestas */}
              <div className="flex justify-center gap-4 mb-2">
                {players.map((p, i) => (
                  <PlayerAvatar
                    key={p.id}
                    player={p}
                    isActive={i === currentBettingIdx}
                    size={players.length > 2 ? "sm" : "md"}
                  />
                ))}
              </div>

              <div className="glass p-6 glow-gold max-w-2xl mx-auto">
                <div className="text-center mb-4">
                  <div
                    className="inline-block px-4 py-1 rounded-full mb-2"
                    style={{
                      background: "linear-gradient(90deg, rgba(184,134,11,0.2), rgba(184,134,11,0.1))",
                      border: "1px solid rgba(184,134,11,0.4)",
                      color: "#B8860B",
                      fontFamily: "'Cinzel', serif",
                      fontSize: 11,
                      letterSpacing: 3,
                    }}
                  >
                    APUESTA {currentBettingIdx + 1} / {players.length}
                  </div>
                  <h2 className="gold-text text-xl font-black" style={{ fontFamily: "'Cinzel', serif" }}>
                    {currentBettingPlayer.name}
                  </h2>
                  <p style={{ color: "#8B7355", fontSize: 13, fontFamily: "'Cormorant Garamond', serif" }}>
                    💰 {currentBettingPlayer.coins} monedas disponibles
                  </p>
                </div>

                <ArtDecoDivider />

                {/* Fichas */}
                <div className="flex justify-center gap-4 my-5">
                  {[50, 100, 200].map((amount) => (
                    <ChipButton
                      key={amount}
                      amount={amount}
                      selected={tempBetAmount === amount}
                      onClick={() => setTempBetAmount(amount)}
                      disabled={currentBettingPlayer.coins < amount}
                    />
                  ))}
                </div>

                {/* Selección de caballo */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                  {SUITS.map((suit) => {
                    const isSel = tempSelectedBet === suit.id;
                    return (
                      <button
                        key={suit.id}
                        onClick={() => setTempSelectedBet(suit.id)}
                        disabled={currentBettingPlayer.coins < tempBetAmount}
                        className="relative p-4 rounded-xl transition-all duration-300 flex flex-col items-center gap-2 overflow-hidden"
                        style={{
                          background: isSel
                            ? `linear-gradient(180deg, ${suit.color}18, ${suit.color}08)`
                            : "linear-gradient(180deg, rgba(18,18,18,0.8), rgba(8,8,8,0.9))",
                          border: `2px solid ${isSel ? suit.color : "rgba(184,134,11,0.18)"}`,
                          boxShadow: isSel ? `0 0 28px ${suit.glow}` : "none",
                          transform: isSel ? "scale(1.06) translateY(-2px)" : "scale(1)",
                        }}
                      >
                        {isSel && (
                          <div
                            className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center"
                            style={{ background: suit.color, fontSize: 10, color: "#fff" }}
                          >✓</div>
                        )}
                        <span style={{ fontSize: 32, filter: `drop-shadow(0 2px 8px ${suit.glow})` }}>{suit.emoji}</span>
                        <span
                          className="font-bold tracking-wider"
                          style={{ color: suit.color, fontFamily: "'Cinzel', serif", fontSize: 12 }}
                        >
                          {suit.name.toUpperCase()}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="flex justify-center">
                  <button
                    onClick={handleConfirmBet}
                    disabled={!tempSelectedBet || currentBettingPlayer.coins < tempBetAmount}
                    className="btn-casino px-10 py-3 rounded-xl text-base"
                  >
                    {currentBettingIdx + 1 < players.length
                      ? `✓ APOSTAR ${tempBetAmount} — SIGUIENTE JUGADOR`
                      : `🏁 APOSTAR ${tempBetAmount} — ¡INICIAR CARRERA!`}
                  </button>
                </div>
              </div>
            </>
          )}

          {/* ════════════════════════════════
              FASE 3 & 4 — CARRERA / RESULTADO
              ════════════════════════════════ */}
          {(phase === "racing" || phase === "finished") && (
            <>
              {/* Stats bar */}
              <div className="flex flex-wrap gap-2 justify-center">
                {[
                  { icon: "🃏", label: "Mazo",    value: deck.length,  color: "#94A3B8" },
                  { icon: "📊", label: "Jugadas", value: cardsDrawn,   color: "#16A34A" },
                ].map((s) => (
                  <div key={s.label} className="glass-subtle px-4 py-2 flex items-center gap-2 text-sm">
                    <span>{s.icon}</span>
                    <span style={{ color: "#8B7355", fontSize: 11 }}>{s.label}</span>
                    <span className="font-bold" style={{ color: s.color, fontFamily: "'Cinzel', serif", fontSize: 15 }}>
                      {s.value}
                    </span>
                  </div>
                ))}
                {/* Apuestas de jugadores */}
                {players.map((p) => {
                  const suit = getSuitInfo(p.selectedBet);
                  return (
                    <div key={p.id} className="glass-subtle px-3 py-2 flex items-center gap-1.5 text-sm">
                      <span style={{ color: "#8B7355", fontSize: 11, fontFamily: "'Cinzel', serif" }}>{p.name}</span>
                      <span style={{ color: suit.color, fontSize: 13 }}>{suit.symbol}</span>
                      <span style={{ color: "#B8860B", fontSize: 11 }}>{p.betAmount}🪙</span>
                    </div>
                  );
                })}
              </div>

              {/* PISTA */}
              <div className="glass p-5 relative">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-bold tracking-widest" style={{ color: "#B8860B", fontFamily: "'Cinzel', serif" }}>
                    🏟️ PISTA DE CARRERA
                  </h2>
                  {winner && (
                    <div
                      className="px-4 py-1.5 rounded-full font-bold tracking-wider pulse-ring"
                      style={{
                        background: `linear-gradient(90deg, ${getSuitInfo(winner).color}, ${getSuitInfo(winner).accent})`,
                        color: "#FFF",
                        fontSize: 13,
                        fontFamily: "'Cinzel', serif",
                      }}
                    >
                      🏆 ¡{getSuitInfo(winner).name.toUpperCase()} GANA!
                    </div>
                  )}
                </div>

                {/* Carriles */}
                <div className="space-y-2 mb-5">
                  {SUITS.map((suit) => {
                    const pos      = positions[suit.id];
                    const isWinner = winner === suit.id;
                    return (
                      <div key={suit.id} className="flex items-center gap-2">
                        {/* Etiqueta */}
                        <div
                          className="w-20 text-center py-1.5 rounded-lg shrink-0 flex items-center justify-center gap-1"
                          style={{
                            background: `linear-gradient(135deg, ${suit.color}18, ${suit.color}06)`,
                            border: `1px solid ${suit.color}28`,
                            color: suit.color, fontSize: 11, fontWeight: 700,
                            fontFamily: "'Cinzel', serif", letterSpacing: 1,
                          }}
                        >
                          <span style={{ fontSize: 14 }}>{suit.symbol}</span>
                          {suit.name}
                        </div>

                        {/* Pista */}
                        <div className="flex-1 relative h-12 track-lane rounded-lg overflow-hidden">
                          {/* Divisiones */}
                          {Array.from({ length: TRACK_LENGTH + 1 }, (_, i) => (
                            <div key={i} className="absolute top-0 bottom-0" style={{
                              left: `${(i / (TRACK_LENGTH + 1)) * 100}%`,
                              borderRight: "1px solid rgba(184,134,11,0.08)",
                            }} />
                          ))}
                          {/* Línea de meta */}
                          <div className="absolute top-0 bottom-0 w-1" style={{
                            left: `${(TRACK_LENGTH / (TRACK_LENGTH + 1)) * 100}%`,
                            background: "repeating-linear-gradient(0deg, #FFD700 0px, #FFD700 4px, #000 4px, #000 8px)",
                          }} />
                          {/* Barra de progreso */}
                          <div className="absolute top-1 bottom-1 left-1 rounded transition-all duration-700" style={{
                            width: `${Math.max(0, (pos / (TRACK_LENGTH + 1)) * 100 - 1)}%`,
                            background: `linear-gradient(90deg, ${suit.color}18, ${suit.color}45)`,
                            borderRight: pos > 0 ? `2px solid ${suit.color}` : "none",
                          }} />
                          {/* Marcador caballo */}
                          <div
                            className="absolute top-1/2 transition-all duration-700 flex items-center justify-center"
                            style={{
                              left: `${(pos / (TRACK_LENGTH + 1)) * 100}%`,
                              transform: "translateX(-50%) translateY(-50%)",
                            }}
                          >
                            <HorseMarker suitId={suit.id} suitColor={suit.color} isWinner={isWinner} />
                          </div>
                          {/* GIF effect */}
                          {movingEffect && movingEffect.suit === suit.id && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                              <img
                                src={movingEffect.type === "advance"
                                  ? `${process.env.PUBLIC_URL}/gifs/advance.gif`
                                  : `${process.env.PUBLIC_URL}/gifs/retreat.gif`}
                                alt=""
                                className="h-full object-contain opacity-80"
                              />
                            </div>
                          )}
                        </div>

                        {/* Posición */}
                        <div
                          className="w-10 text-center text-xs font-bold shrink-0 py-1 rounded"
                          style={{
                            color: suit.color,
                            background: `${suit.color}10`,
                            border: `1px solid ${suit.color}18`,
                            fontFamily: "'Cinzel', serif",
                          }}
                        >
                          {pos}/{TRACK_LENGTH}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Cartas de pista */}
                <div className="mb-5">
                  <div className="text-xs mb-2 font-bold tracking-wider" style={{ color: "#8B7355", fontFamily: "'Cinzel', serif" }}>
                    📋 CARTAS DE PISTA ({revealedTrack.length}/{TRACK_LENGTH})
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-20 shrink-0" />
                    <div className="flex-1 relative" style={{ height: 92 }}>
                      {trackCards.map((card, idx) => {
                        const isRevealed = revealedTrack.includes(idx);
                        const percent    = ((idx + 0.5) / (TRACK_LENGTH + 1)) * 100;
                        return (
                          <div
                            key={idx}
                            className="absolute flex flex-col items-center gap-0.5"
                            style={{ left: `${percent}%`, transform: "translateX(-50%)" }}
                          >
                            <CasinoCard
                              card={card}
                              faceDown={!isRevealed}
                              small
                              highlight={penaltyCard && isRevealed && idx === revealedTrack[revealedTrack.length - 1]}
                            />
                            <span style={{ fontSize: 9, color: "#8B7355" }}>#{idx + 1}</span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="w-10 shrink-0" />
                  </div>
                </div>

                {/* Última carta + controles */}
                <div className="flex flex-col md:flex-row items-center gap-5 justify-center">
                  <div className="flex flex-col items-center gap-2">
                    <span
                      className="text-xs font-bold tracking-widest"
                      style={{ color: "#B8860B", fontFamily: "'Cinzel', serif", letterSpacing: "0.25em" }}
                    >
                      ✦ ÚLTIMA CARTA ✦
                    </span>
                    <div
                      className="rounded-xl p-2"
                      style={{
                        background: "rgba(8,8,8,0.75)",
                        border: "2px solid #FFD700",
                        boxShadow: "0 0 28px rgba(255,215,0,0.4), 0 0 10px rgba(255,215,0,0.2)",
                      }}
                    >
                      {currentCard ? (
                        <CasinoCard card={currentCard} highlight large />
                      ) : (
                        <div
                          className="rounded-lg border-2 border-dashed flex items-center justify-center"
                          style={{ width: 110, height: 154, borderColor: "rgba(184,134,11,0.3)", color: "#8B7355" }}
                        >
                          <span style={{ fontSize: 28 }}>?</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Controles de carrera */}
                  {phase === "racing" && !winner && (
                    <div className="flex flex-col gap-3 items-center">
                      <div className="flex gap-3">
                        <button onClick={drawCard} disabled={autoPlay} className="btn-casino px-5 py-2 rounded-lg text-sm">
                          🃏 SACAR
                        </button>
                        <button
                          onClick={() => setAutoPlay((p) => !p)}
                          className="px-5 py-2 rounded-lg text-sm font-bold tracking-wider transition-all"
                          style={{
                            background: autoPlay
                              ? "linear-gradient(180deg, #DC2626, #991B1B)"
                              : "linear-gradient(180deg, #166534, #14532D)",
                            border: `2px solid ${autoPlay ? "#EF4444" : "#22C55E"}`,
                            color: "#FFF",
                            fontFamily: "'Cinzel', serif",
                            boxShadow: `0 4px 16px ${autoPlay ? "rgba(220,38,38,0.3)" : "rgba(22,163,74,0.3)"}`,
                          }}
                        >
                          {autoPlay ? "⏸ PAUSAR" : "▶ AUTO"}
                        </button>
                      </div>
                      <div className="flex items-center gap-2 text-xs" style={{ color: "#8B7355" }}>
                        <span>🐢</span>
                        <input
                          type="range" min={200} max={2000} step={100}
                          value={2200 - speed}
                          onChange={(e) => setSpeed(2200 - Number(e.target.value))}
                          className="w-28"
                          style={{ accentColor: "#B8860B" }}
                        />
                        <span>🐇</span>
                      </div>
                    </div>
                  )}

                  {/* Resultado final */}
                  {phase === "finished" && (
                    <div className="flex flex-col items-center gap-3">
                      <button onClick={resetAll} className="btn-casino px-8 py-3 rounded-xl text-base">
                        🔄 NUEVA PARTIDA
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* ════ RESULTADOS JUGADORES (fase finished) ════ */}
              {phase === "finished" && (
                <div className="glass p-5 glow-gold">
                  <h3
                    className="text-center font-black tracking-widest mb-4"
                    style={{ color: "#B8860B", fontFamily: "'Cinzel', serif", fontSize: 14 }}
                  >
                    🏆 RESULTADOS FINALES
                  </h3>
                  <ArtDecoDivider />
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                    {players.map((p) => {
                      const won  = p.selectedBet === winner;
                      const suit = getSuitInfo(p.selectedBet);
                      const delta = won ? p.betAmount * 3 : -p.betAmount; // net change
                      return (
                        <div
                          key={p.id}
                          className="rounded-xl p-4 flex flex-col items-center gap-2"
                          style={{
                            background: won
                              ? `linear-gradient(180deg, ${suit.color}15, ${suit.color}06)`
                              : "linear-gradient(180deg, rgba(20,20,20,0.7), rgba(10,10,10,0.8))",
                            border: `2px solid ${won ? suit.color : "rgba(184,134,11,0.15)"}`,
                            boxShadow: won ? `0 0 24px ${suit.glow}` : "none",
                          }}
                        >
                          <div
                            className="w-10 h-10 rounded-full flex items-center justify-center font-black"
                            style={{
                              background: won
                                ? `radial-gradient(circle, ${suit.color}40, ${suit.color}15)`
                                : "rgba(184,134,11,0.1)",
                              border: `2px solid ${won ? suit.color : "rgba(184,134,11,0.3)"}`,
                              color: "#FFD700",
                              fontFamily: "'Cinzel', serif",
                              fontSize: 16,
                            }}
                          >
                            {p.id}
                          </div>
                          <span style={{ color: "#D4B896", fontFamily: "'Cinzel', serif", fontSize: 12 }}>
                            {p.name}
                          </span>
                          <span style={{ fontSize: 28 }}>{suit.emoji}</span>
                          <span
                            className="font-black text-lg"
                            style={{
                              color: won ? "#FFD700" : "#DC2626",
                              fontFamily: "'Cinzel', serif",
                            }}
                          >
                            {won ? `+${delta}` : `${delta}`} 🪙
                          </span>
                          <span style={{ color: "#8B7355", fontSize: 11 }}>
                            Total: {p.coins} monedas
                          </span>
                          {won && (
                            <span
                              className="px-2 py-0.5 rounded-full text-xs font-bold"
                              style={{
                                background: suit.color,
                                color: "#fff",
                                fontFamily: "'Cinzel', serif",
                                letterSpacing: 1,
                              }}
                            >
                              ×4 GANADOR
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* EVENT LOG */}
              <div className="glass p-4">
                <h3
                  className="text-xs font-bold tracking-widest mb-2"
                  style={{ color: "#8B7355", fontFamily: "'Cinzel', serif" }}
                >
                  📜 REGISTRO DE EVENTOS
                </h3>
                <div
                  ref={logRef}
                  className="overflow-y-auto space-y-0.5"
                  style={{ height: 120, scrollbarWidth: "thin", scrollbarColor: "#B8860B30 transparent" }}
                >
                  {log.map((entry, i) => (
                    <div
                      key={i}
                      className="log-entry py-1 px-2 rounded text-xs"
                      style={{
                        color: "#A89070",
                        borderBottom: "1px solid rgba(184,134,11,0.07)",
                        fontFamily: "'Cormorant Garamond', serif",
                        fontSize: 13,
                      }}
                    >
                      {entry.msg}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ════ DATA MODEL ════ */}
          <div className="glass p-5">
            <h3
              className="text-sm font-bold tracking-widest mb-4"
              style={{ color: "#B8860B", fontFamily: "'Cinzel', serif" }}
            >
              📐 MODELO DE DATOS Y CONCEPTOS
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                { title: "📦 Modelo de Datos", color: "#FFD700",
                  text: <>Cada <b style={{color:"#FFD700"}}>carta</b> = objeto <code style={{color:"#B8860B",background:"rgba(0,0,0,0.4)",padding:"1px 4px",borderRadius:3}}>{"{ suit, number, id }"}</code>. Los <b style={{color:"#FFD700"}}>caballos</b> = mapa de posiciones. La <b style={{color:"#FFD700"}}>pista</b> = arreglo de cartas boca abajo.</> },
                { title: "🏗️ Estructuras", color: "#94A3B8",
                  text: <><b style={{color:"#94A3B8"}}>Arrays</b> para mazo, pista y log. <b style={{color:"#94A3B8"}}>Objetos/Maps</b> para posiciones y apuestas. <b style={{color:"#94A3B8"}}>Pila (Stack)</b> — el mazo funciona como LIFO.</> },
                { title: "⚙️ Operadores", color: "#16A34A",
                  text: <><b style={{color:"#16A34A"}}>Aritméticos</b>: incremento/decremento, cálculo ×4. <b style={{color:"#16A34A"}}>Comparación</b>: verificar ganador, mínimo de posiciones. <b style={{color:"#16A34A"}}>Lógicos</b>: penalización y fin de juego.</> },
                { title: "👥 Multi-jugador", color: "#DC2626",
                  text: <><b style={{color:"#DC2626"}}>1–4 jugadores</b> apuestan de forma secuencial antes de la carrera. Cada uno apuesta a un palo distinto o al mismo. Premio: <b style={{color:"#DC2626"}}>×4</b> la apuesta al ganador.</> },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-lg p-3"
                  style={{
                    background: "linear-gradient(180deg, rgba(18,18,18,0.6), rgba(8,8,8,0.8))",
                    border: `1px solid ${item.color}18`,
                  }}
                >
                  <div
                    className="font-bold mb-1"
                    style={{ color: item.color, fontSize: 12, fontFamily: "'Cinzel', serif", letterSpacing: 1 }}
                  >
                    {item.title}
                  </div>
                  <p style={{ color: "#A89070", fontSize: 12, lineHeight: 1.5, fontFamily: "'Cormorant Garamond', serif" }}>
                    {item.text}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="text-center py-4">
            <ArtDecoDivider />
            <span style={{ color: "#8B7355", fontSize: 11, letterSpacing: 3, fontFamily: "'Cinzel', serif" }}>
              ♠ ♥ CARRERA DE CABALLOS ♣ ♦
            </span>
          </div>

        </div>
      </div>
    </div>
  );
}
