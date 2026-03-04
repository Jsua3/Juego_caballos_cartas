import { useState, useEffect, useCallback, useRef } from "react";

const SUITS = [
    { id: "oros",    name: "Oros",    emoji: "🪙", color: "#D4AF37", bg: "#2a1f00" },
    { id: "copas",   name: "Copas",   emoji: "🏆", color: "#EF4444", bg: "#2a0808" },
    { id: "espadas", name: "Espadas", emoji: "⚔️", color: "#60A5FA", bg: "#0a1a2e" },
    { id: "bastos",  name: "Bastos",  emoji: "🪵", color: "#4ade80", bg: "#0a1f0a" },
];

const TRACK_LENGTH = 7;
const COPIES_PER_SUIT = 9; // 9 copias × 4 palos = 36 cartas en total

function playGameSound(type) {
    try {
        const base = process.env.PUBLIC_URL || '';
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
    const shuffled = [...deck];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

function getSuitInfo(suitId) {
    return SUITS.find((s) => s.id === suitId);
}

// Paleta de colores centralizada
const C = {
    bgBase:       "#040f04",
    bgPanel:      "#071a07",
    bgPanelInner: "#0a200a",
    bgCard:       "#050e05",
    border:       "#2a4a2a",
    borderGold:   "#6b5010",
    gold:         "#D4AF37",
    goldLight:    "#F0D060",
    goldDark:     "#8B6914",
    textPrimary:  "#F0D060",
    textMuted:    "#8a9e8a",
};

function CardDisplay({ card, faceDown = false, small = false, large = false, highlight = false }) {
    const [imgError, setImgError] = useState(false);
    const size = large ? { w: 110, h: 154, text: "text-xl" }
               : small ? { w: 48,  h: 68,  text: "text-xs" }
               :         { w: 64,  h: 90,  text: "text-sm" };

    if (faceDown) {
        return (
            <div
                style={{
                    width: size.w,
                    height: size.h,
                    borderColor: highlight ? C.gold : C.borderGold,
                    boxShadow: highlight ? `0 0 12px ${C.gold}80` : "none",
                }}
                className={`rounded-lg border-2 flex items-center justify-center ${highlight ? "animate-pulse" : ""}`}
                title="Carta boca abajo"
            >
                <div
                    className="w-full h-full rounded-md"
                    style={{
                        background: `repeating-linear-gradient(45deg, ${C.bgBase}, ${C.bgBase} 4px, ${C.bgPanelInner} 4px, ${C.bgPanelInner} 8px)`,
                    }}
                />
            </div>
        );
    }

    const suit = getSuitInfo(card.suit);
    const isHorse = card.number === 11;

    return (
        <div
            style={{
                width: size.w,
                height: size.h,
                borderColor: highlight ? C.gold : suit.color,
                background: "#fff",
                boxShadow: highlight ? `0 0 16px ${suit.color}80` : "0 2px 4px rgba(0,0,0,0.4)",
            }}
            className={`rounded-lg border-2 transition-all duration-300 ${
                isHorse && !imgError
                    ? "overflow-hidden"
                    : `flex flex-col items-center justify-center ${size.text} font-bold`
            }`}
        >
            {isHorse && !imgError ? (
                <img
                    src={`${process.env.PUBLIC_URL}/cards/${card.suit}-11.png`}
                    alt={`Caballo de ${suit.name}`}
                    className="w-full h-full object-cover"
                    onError={() => setImgError(true)}
                />
            ) : (
                <>
                    <span style={{ color: suit.color }}>{card.number}</span>
                    <span className="text-lg">{suit.emoji}</span>
                    <span style={{ color: suit.color, fontSize: 9 }}>{suit.name}</span>
                </>
            )}
        </div>
    );
}

function HorseMarker({ suitId, suitColor, isWinner }) {
    const [imgError, setImgError] = useState(false);
    if (imgError) {
        return (
            <span style={{ filter: isWinner ? `drop-shadow(0 0 6px ${suitColor})` : "none" }}>
                🏇
            </span>
        );
    }
    return (
        <img
            src={`${process.env.PUBLIC_URL}/cards/${suitId}-11.png`}
            alt={suitId}
            style={{
                height: 36,
                width: "auto",
                objectFit: "contain",
                filter: isWinner ? `drop-shadow(0 0 6px ${suitColor})` : "none",
                borderRadius: 3,
            }}
            onError={() => setImgError(true)}
        />
    );
}

function HorseToken({ suit, position, trackLength, isWinner }) {
    const info = getSuitInfo(suit);
    const percent = (position / (trackLength + 1)) * 100;
    return (
        <div
            className="absolute transition-all duration-700 ease-out flex flex-col items-center"
            style={{ left: `${percent}%`, transform: "translateX(-50%)" }}
        >
            <div
                className={`text-2xl ${isWinner ? "animate-bounce" : ""}`}
                style={{ filter: isWinner ? `drop-shadow(0 0 8px ${info.color})` : "none" }}
            >
                🏇
            </div>
            <div
                className="text-xs font-bold px-2 py-0.5 rounded-full mt-0.5"
                style={{ background: info.color, color: "#fff", fontSize: 10 }}
            >
                {info.emoji} {info.name}
            </div>
        </div>
    );
}

export default function CarreraDeCaballos() {
    const [gameState, setGameState] = useState("setup");
    const [deck, setDeck] = useState([]);
    const [trackCards, setTrackCards] = useState([]);
    const [positions, setPositions] = useState({ oros: 0, copas: 0, espadas: 0, bastos: 0 });
    const [currentCard, setCurrentCard] = useState(null);
    const [revealedTrack, setRevealedTrack] = useState([]);
    const [winner, setWinner] = useState(null);
    const [log, setLog] = useState([]);
    const [speed, setSpeed] = useState(1000);
    const [autoPlay, setAutoPlay] = useState(false);
    const [cardsDrawn, setCardsDrawn] = useState(0);
    const [penaltyCard, setPenaltyCard] = useState(null);
    const [bets, setBets] = useState({});
    const [betAmount, setBetAmount] = useState(100);
    const [playerCoins, setPlayerCoins] = useState(500);
    const [selectedBet, setSelectedBet] = useState(null);
    const intervalRef = useRef(null);
    const logRef = useRef(null);
    const [movingEffect, setMovingEffect] = useState(null);

    const initGame = useCallback(() => {
        const fullDeck = shuffleDeck(createDeck());
        const track = fullDeck.slice(0, TRACK_LENGTH);
        const remaining = fullDeck.slice(TRACK_LENGTH);
        setDeck(remaining);
        setTrackCards(track);
        setPositions({ oros: 0, copas: 0, espadas: 0, bastos: 0 });
        setCurrentCard(null);
        setRevealedTrack([]);
        setWinner(null);
        setLog([]);
        setCardsDrawn(0);
        setPenaltyCard(null);
        setGameState("setup");
        setAutoPlay(false);
        setBets({});
        setSelectedBet(null);
    }, []);

    useEffect(() => { initGame(); }, [initGame]);

    useEffect(() => {
        if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
    }, [log]);

    const triggerEffect = useCallback((suit, type) => {
        setMovingEffect({ suit, type });
        setTimeout(() => setMovingEffect(null), 900);
    }, []);

    const placeBet = (suitId) => {
        if (gameState !== "setup") return;
        if (playerCoins < betAmount) return;
        setSelectedBet(suitId);
        setBets({ [suitId]: betAmount });
    };

    const startRace = () => {
        if (!selectedBet) return;
        setPlayerCoins((prev) => prev - betAmount);
        setGameState("racing");
        setAutoPlay(true);
        addLog("🏁 ¡La carrera ha comenzado!");
    };

    const addLog = (msg) => {
        setLog((prev) => [...prev.slice(-50), { msg, time: Date.now() }]);
    };

    const checkTrackPenalty = useCallback(
        (newPositions, revealed) => {
            const minPos = Math.min(...Object.values(newPositions));
            const nextReveal = revealed.length;
            if (minPos > nextReveal && nextReveal < TRACK_LENGTH) {
                const penCard = trackCards[nextReveal];
                const newRevealed = [...revealed, nextReveal];
                const suitInfo = getSuitInfo(penCard.suit);

                if (newPositions[penCard.suit] > 0) {
                    newPositions[penCard.suit] = Math.max(0, newPositions[penCard.suit] - 1);
                    addLog(`⚠️ ¡Penalización! Carta de pista: ${penCard.number} de ${suitInfo.name} ${suitInfo.emoji} — ${suitInfo.name} retrocede 1 paso`);
                    triggerEffect(penCard.suit, 'retreat');
                    playGameSound('retreat');
                } else {
                    addLog(`📋 Carta de pista revelada: ${penCard.number} de ${suitInfo.name} ${suitInfo.emoji} — sin efecto`);
                }

                setPenaltyCard(penCard);
                setTimeout(() => setPenaltyCard(null), 1500);
                setRevealedTrack(newRevealed);
                return { newPositions, newRevealed };
            }
            return { newPositions, newRevealed: revealed };
        },
        [trackCards, triggerEffect]
    );

    const drawCard = useCallback(() => {
        if (deck.length === 0 || winner) {
            if (deck.length === 0 && !winner) {
                let maxPos = -1, maxSuit = null;
                for (const [suit, pos] of Object.entries(positions)) {
                    if (pos > maxPos) { maxPos = pos; maxSuit = suit; }
                }
                setWinner(maxSuit);
                setGameState("finished");
                const suitInfo = getSuitInfo(maxSuit);
                addLog(`🏆 ¡${suitInfo.name} ${suitInfo.emoji} gana la carrera!`);
                setAutoPlay(false);
            }
            return;
        }

        const card = deck[0];
        const newDeck = deck.slice(1);
        const suitInfo = getSuitInfo(card.suit);
        setCurrentCard(card);
        setDeck(newDeck);
        setCardsDrawn((prev) => prev + 1);

        const newPositions = { ...positions };
        newPositions[card.suit] = newPositions[card.suit] + 1;
        addLog(`🃏 Sale: ${card.number} de ${suitInfo.name} ${suitInfo.emoji} → ${suitInfo.name} avanza`);
        triggerEffect(card.suit, 'advance');
        playGameSound('advance');

        if (newPositions[card.suit] > TRACK_LENGTH) {
            setWinner(card.suit);
            setPositions(newPositions);
            setGameState("finished");
            addLog(`🏆 ¡${suitInfo.name} ${suitInfo.emoji} cruza la meta y GANA!`);
            setAutoPlay(false);
            playGameSound('win');

            if (selectedBet === card.suit) {
                const winnings = betAmount * 4;
                setPlayerCoins((prev) => prev + winnings);
                addLog(`💰 ¡Ganaste ${winnings} monedas! (apuesta x4)`);
            } else {
                addLog(`😢 Perdiste tu apuesta de ${betAmount} monedas`);
            }
            return;
        }

        const result = checkTrackPenalty(newPositions, revealedTrack);
        setPositions(result.newPositions);
    }, [deck, winner, positions, revealedTrack, checkTrackPenalty, betAmount, selectedBet, triggerEffect]);

    useEffect(() => {
        if (autoPlay && gameState === "racing" && !winner) {
            intervalRef.current = setInterval(drawCard, speed);
            return () => clearInterval(intervalRef.current);
        }
        return () => clearInterval(intervalRef.current);
    }, [autoPlay, gameState, winner, drawCard, speed]);

    const toggleAutoPlay = () => {
        if (gameState === "setup") return;
        setAutoPlay((prev) => !prev);
    };

    // Estilos reutilizables
    const panelStyle = {
        background: C.bgPanel,
        border: `1px solid ${C.borderGold}`,
        borderRadius: 16,
    };
    const innerCardStyle = {
        background: C.bgPanelInner,
        border: `1px solid ${C.border}`,
        borderRadius: 10,
    };

    const handleButtonClick = (e) => {
        if (e.target.closest('button')) playGameSound('click');
    };

    return (
        <div
            onClick={handleButtonClick}
            className="min-h-screen text-white overflow-auto"
            style={{
                backgroundImage: `linear-gradient(rgba(4,15,4,0.82), rgba(4,15,4,0.82)), url(${process.env.PUBLIC_URL}/background.jpg)`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                backgroundAttachment: "fixed",
                fontFamily: "'Segoe UI', system-ui, sans-serif",
            }}
        >
            {/* Header */}
            <div className="text-center pt-6 pb-3 px-4">
                <h1
                    className="text-3xl md:text-4xl font-black tracking-tight"
                    style={{
                        background: `linear-gradient(135deg, ${C.goldLight}, ${C.gold}, ${C.goldDark}, ${C.gold})`,
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        textShadow: "none",
                    }}
                >
                    🏇 Carrera de Caballos
                </h1>
                <p style={{ color: C.textMuted }} className="text-sm mt-1">
                    Baraja Española — Juego de Apuestas
                </p>
                {/* Línea decorativa dorada */}
                <div
                    className="mx-auto mt-3 h-px w-48"
                    style={{ background: `linear-gradient(90deg, transparent, ${C.gold}, transparent)` }}
                />
            </div>

            <div className="max-w-5xl mx-auto px-4 pb-8 space-y-4">

                {/* Stats Bar */}
                <div className="flex flex-wrap gap-3 justify-center text-xs">
                    {[
                        { label: "Monedas", value: playerCoins, icon: "💰", color: C.gold },
                        { label: "Mazo",    value: deck.length,  icon: "🃏", color: C.gold },
                        { label: "Cartas sacadas", value: cardsDrawn, icon: "📊", color: C.goldLight },
                    ].map(({ label, value, icon, color }) => (
                        <div
                            key={label}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg"
                            style={{ background: C.bgPanel, border: `1px solid ${C.borderGold}` }}
                        >
                            <span>{icon}</span>
                            <span style={{ color: C.textMuted }}>{label}:</span>
                            <span className="font-bold" style={{ color }}>{value}</span>
                        </div>
                    ))}
                    {selectedBet && (
                        <div
                            className="flex items-center gap-2 px-3 py-2 rounded-lg"
                            style={{ background: C.bgPanel, border: `1px solid ${C.borderGold}` }}
                        >
                            <span>🎯</span>
                            <span style={{ color: C.textMuted }}>Apuesta:</span>
                            <span className="font-bold" style={{ color: getSuitInfo(selectedBet).color }}>
                                {getSuitInfo(selectedBet).emoji} {getSuitInfo(selectedBet).name} ({betAmount})
                            </span>
                        </div>
                    )}
                </div>

                {/* Betting Phase */}
                {gameState === "setup" && (
                    <div className="p-5" style={panelStyle}>
                        <h2
                            className="text-lg font-bold text-center mb-1"
                            style={{ color: C.goldLight }}
                        >
                            🎰 Haz tu Apuesta
                        </h2>
                        <p className="text-xs text-center mb-4" style={{ color: C.textMuted }}>
                            Elige el caballo ganador. Paga x4 si gana.
                        </p>

                        {/* Bet amount buttons */}
                        <div className="flex flex-wrap justify-center gap-2 mb-4">
                            {[50, 100, 200].map((amount) => (
                                <button
                                    key={amount}
                                    onClick={() => setBetAmount(amount)}
                                    className="px-4 py-1.5 rounded-lg text-sm font-bold transition-all"
                                    style={
                                        betAmount === amount
                                            ? { background: C.gold, color: C.bgBase, border: `1px solid ${C.goldLight}` }
                                            : { background: C.bgPanelInner, color: C.textMuted, border: `1px solid ${C.border}` }
                                    }
                                >
                                    {amount} 💰
                                </button>
                            ))}
                        </div>

                        {/* Suit selection */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                            {SUITS.map((suit) => (
                                <button
                                    key={suit.id}
                                    onClick={() => placeBet(suit.id)}
                                    disabled={playerCoins < betAmount}
                                    className="p-4 rounded-xl transition-all flex flex-col items-center gap-2"
                                    style={
                                        selectedBet === suit.id
                                            ? {
                                                borderColor: suit.color,
                                                border: `2px solid ${suit.color}`,
                                                background: `${suit.color}18`,
                                                boxShadow: `0 0 20px ${suit.color}40`,
                                                transform: "scale(1.05)",
                                              }
                                            : {
                                                border: `2px solid ${C.border}`,
                                                background: C.bgPanelInner,
                                              }
                                    }
                                >
                                    <span className="text-3xl">{suit.emoji}</span>
                                    <span className="font-bold" style={{ color: suit.color }}>{suit.name}</span>
                                    <span className="text-2xl">🏇</span>
                                </button>
                            ))}
                        </div>

                        {/* Start button */}
                        <div className="flex justify-center">
                            <button
                                onClick={startRace}
                                disabled={!selectedBet}
                                className="px-8 py-3 rounded-xl font-black text-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                                style={{
                                    background: selectedBet
                                        ? `linear-gradient(135deg, ${C.gold}, ${C.goldDark})`
                                        : C.bgPanelInner,
                                    color: selectedBet ? C.bgBase : C.textMuted,
                                    border: `1px solid ${selectedBet ? C.gold : C.border}`,
                                    boxShadow: selectedBet ? `0 4px 24px ${C.gold}50` : "none",
                                }}
                            >
                                🏁 ¡Iniciar Carrera!
                            </button>
                        </div>
                    </div>
                )}

                {/* Race Track */}
                {gameState !== "setup" && (
                    <div className="p-4 md:p-5" style={panelStyle}>
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="text-sm font-bold" style={{ color: C.goldLight }}>
                                🏟️ Pista de Carrera
                            </h2>
                            {winner && (
                                <div
                                    className="text-sm font-black px-3 py-1 rounded-full animate-pulse"
                                    style={{
                                        background: `linear-gradient(135deg, ${C.gold}, ${C.goldDark})`,
                                        color: C.bgBase,
                                    }}
                                >
                                    🏆 ¡{getSuitInfo(winner).name} GANA!
                                </div>
                            )}
                        </div>

                        {/* Track rows */}
                        <div className="space-y-2 mb-4">
                            {SUITS.map((suit) => {
                                const pos = positions[suit.id];
                                return (
                                    <div key={suit.id} className="flex items-center gap-2">
                                        <div
                                            className="w-16 text-xs font-bold text-center py-1 rounded-md shrink-0"
                                            style={{ background: `${suit.color}20`, color: suit.color, border: `1px solid ${suit.color}40` }}
                                        >
                                            {suit.emoji} {suit.name}
                                        </div>
                                        <div
                                            className="flex-1 relative h-10 rounded-lg overflow-hidden"
                                            style={{ background: C.bgCard, border: `1px solid ${C.border}` }}
                                        >
                                            {/* Track markers */}
                                            {Array.from({ length: TRACK_LENGTH + 1 }, (_, i) => (
                                                <div
                                                    key={i}
                                                    className="absolute top-0 bottom-0"
                                                    style={{
                                                        left: `${(i / (TRACK_LENGTH + 1)) * 100}%`,
                                                        borderRight: `1px solid ${C.borderGold}40`,
                                                    }}
                                                />
                                            ))}
                                            {/* Finish line */}
                                            <div
                                                className="absolute top-0 bottom-0 w-1"
                                                style={{
                                                    left: `${(TRACK_LENGTH / (TRACK_LENGTH + 1)) * 100}%`,
                                                    background: `repeating-linear-gradient(0deg, ${C.gold} 0px, ${C.gold} 4px, ${C.bgBase} 4px, ${C.bgBase} 8px)`,
                                                }}
                                            />
                                            {/* Progress bar */}
                                            <div
                                                className="absolute top-1 bottom-1 left-1 rounded transition-all duration-700"
                                                style={{
                                                    width: `${Math.max(0, (pos / (TRACK_LENGTH + 1)) * 100 - 1)}%`,
                                                    background: `linear-gradient(90deg, ${suit.color}30, ${suit.color}70)`,
                                                }}
                                            />
                                            {/* Horse marker */}
                                            <div
                                                className="absolute top-1/2 transition-all duration-700 flex items-center justify-center"
                                                style={{
                                                    left: `${(pos / (TRACK_LENGTH + 1)) * 100}%`,
                                                    transform: "translateX(-50%) translateY(-50%)",
                                                }}
                                            >
                                                <HorseMarker
                                                    suitId={suit.id}
                                                    suitColor={suit.color}
                                                    isWinner={winner === suit.id}
                                                />
                                            </div>
                                            {/* GIF effect overlay */}
                                            {movingEffect && movingEffect.suit === suit.id && (
                                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                                                    <img
                                                        src={movingEffect.type === 'advance'
                                                            ? `${process.env.PUBLIC_URL}/gifs/advance.gif`
                                                            : `${process.env.PUBLIC_URL}/gifs/retreat.gif`}
                                                        alt=""
                                                        className="h-full object-contain opacity-80"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                        <div
                                            className="w-8 text-center text-xs font-mono font-bold shrink-0"
                                            style={{ color: suit.color }}
                                        >
                                            {pos}/{TRACK_LENGTH}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Track Cards */}
                        <div className="mb-4">
                            <div className="text-xs mb-2 font-bold" style={{ color: C.textMuted }}>
                                📋 Cartas de pista ({revealedTrack.length}/{TRACK_LENGTH} reveladas):
                            </div>
                            <div className="flex items-start gap-2">
                                <div className="w-16 shrink-0" />
                                <div className="flex-1 relative" style={{ height: 84 }}>
                                    {trackCards.map((card, idx) => {
                                        const isRevealed = revealedTrack.includes(idx);
                                        const percent = ((idx + 0.5) / (TRACK_LENGTH + 1)) * 100;
                                        return (
                                            <div
                                                key={idx}
                                                className="absolute flex flex-col items-center gap-0.5"
                                                style={{ left: `${percent}%`, transform: "translateX(-50%)" }}
                                            >
                                                <CardDisplay
                                                    card={card}
                                                    faceDown={!isRevealed}
                                                    small
                                                    highlight={penaltyCard && isRevealed && idx === revealedTrack[revealedTrack.length - 1]}
                                                />
                                                <span className="text-xs" style={{ color: C.textMuted }}>#{idx + 1}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className="w-8 shrink-0" />
                            </div>
                        </div>

                        {/* Current Card + Controls */}
                        <div className="flex flex-col md:flex-row items-center gap-6 justify-center">
                            {/* Última carta — destacada */}
                            <div className="flex flex-col items-center gap-2">
                                <span
                                    className="text-sm font-black tracking-widest uppercase"
                                    style={{ color: C.gold, letterSpacing: "0.15em" }}
                                >
                                    ✦ Última carta ✦
                                </span>
                                <div
                                    className="rounded-xl p-2"
                                    style={{
                                        background: C.bgPanelInner,
                                        border: `2px solid ${C.gold}`,
                                        boxShadow: `0 0 24px ${C.gold}50, 0 0 8px ${C.gold}30`,
                                    }}
                                >
                                    {currentCard ? (
                                        <CardDisplay card={currentCard} highlight large />
                                    ) : (
                                        <div
                                            className="rounded-lg border-2 border-dashed flex items-center justify-center text-2xl"
                                            style={{
                                                width: 110, height: 154,
                                                borderColor: C.borderGold,
                                                color: C.textMuted,
                                            }}
                                        >
                                            ?
                                        </div>
                                    )}
                                </div>
                            </div>

                            {!winner && (
                                <div className="flex flex-col gap-2 items-center">
                                    <div className="flex gap-2">
                                        <button
                                            onClick={drawCard}
                                            disabled={autoPlay}
                                            className="px-4 py-2 rounded-lg text-sm font-bold transition-all disabled:opacity-30"
                                            style={{
                                                background: `linear-gradient(135deg, ${C.gold}, ${C.goldDark})`,
                                                color: C.bgBase,
                                                border: `1px solid ${C.gold}`,
                                            }}
                                        >
                                            🃏 Sacar Carta
                                        </button>
                                        <button
                                            onClick={toggleAutoPlay}
                                            className="px-4 py-2 rounded-lg text-sm font-bold transition-all"
                                            style={
                                                autoPlay
                                                    ? { background: "#7f1d1d", color: "#fca5a5", border: "1px solid #991b1b" }
                                                    : { background: C.bgPanelInner, color: C.goldLight, border: `1px solid ${C.borderGold}` }
                                            }
                                        >
                                            {autoPlay ? "⏸ Pausar" : "▶️ Auto"}
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs" style={{ color: C.textMuted }}>
                                        <span>🐢</span>
                                        <input
                                            type="range"
                                            min={200}
                                            max={2000}
                                            step={100}
                                            value={2200 - speed}
                                            onChange={(e) => setSpeed(2200 - Number(e.target.value))}
                                            className="w-24"
                                            style={{ accentColor: C.gold }}
                                        />
                                        <span>🐇</span>
                                    </div>
                                </div>
                            )}

                            {winner && (
                                <button
                                    onClick={initGame}
                                    className="px-6 py-3 rounded-xl font-black text-base transition-all"
                                    style={{
                                        background: `linear-gradient(135deg, ${C.gold}, ${C.goldDark})`,
                                        color: C.bgBase,
                                        border: `1px solid ${C.goldLight}`,
                                        boxShadow: `0 4px 24px ${C.gold}50`,
                                    }}
                                >
                                    🔄 Nueva Carrera
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* Event Log */}
                {gameState !== "setup" && (
                    <div className="p-4" style={panelStyle}>
                        <h3 className="text-sm font-bold mb-2" style={{ color: C.goldLight }}>
                            📜 Registro de Eventos
                        </h3>
                        <div
                            ref={logRef}
                            className="h-32 overflow-y-auto space-y-1 text-xs font-mono"
                            style={{ scrollbarWidth: "thin", scrollbarColor: `${C.borderGold} transparent` }}
                        >
                            {log.map((entry, i) => (
                                <div
                                    key={i}
                                    className="py-0.5"
                                    style={{ color: C.textMuted, borderBottom: `1px solid ${C.border}` }}
                                >
                                    {entry.msg}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Data Model Info */}
                <div className="p-4" style={panelStyle}>
                    <h3 className="text-sm font-bold mb-3" style={{ color: C.goldLight }}>
                        📐 Modelo de Datos y Conceptos Aplicados
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        <div className="p-3" style={innerCardStyle}>
                            <div className="font-bold mb-1" style={{ color: C.gold }}>📦 Modelo de Datos</div>
                            <p style={{ color: C.textMuted }} className="leading-relaxed">
                                Cada <b style={{ color: "#d1d5db" }}>carta</b> es un objeto con propiedades:{" "}
                                <code style={{ color: C.goldLight, background: C.bgCard, padding: "1px 4px", borderRadius: 3 }}>
                                    {"{ suit, number, id }"}
                                </code>
                                . Los <b style={{ color: "#d1d5db" }}>caballos</b> se representan como un mapa de posiciones:{" "}
                                <code style={{ color: C.goldLight, background: C.bgCard, padding: "1px 4px", borderRadius: 3 }}>
                                    {"{ oros: 0, copas: 0, ... }"}
                                </code>
                                . La <b style={{ color: "#d1d5db" }}>pista</b> es un arreglo de cartas boca abajo.
                            </p>
                        </div>
                        <div className="p-3" style={innerCardStyle}>
                            <div className="font-bold mb-1" style={{ color: C.goldLight }}>🏗️ Estructuras</div>
                            <p style={{ color: C.textMuted }} className="leading-relaxed">
                                <b style={{ color: "#d1d5db" }}>Arreglos (Arrays)</b> para el mazo, pista y log de eventos.{" "}
                                <b style={{ color: "#d1d5db" }}>Objetos (Maps)</b> para posiciones de caballos y apuestas.{" "}
                                <b style={{ color: "#d1d5db" }}>Pila (Stack)</b> simulada: el mazo funciona como LIFO al sacar cartas.
                            </p>
                        </div>
                        <div className="p-3" style={innerCardStyle}>
                            <div className="font-bold mb-1" style={{ color: "#4ade80" }}>⚙️ Operadores</div>
                            <p style={{ color: C.textMuted }} className="leading-relaxed">
                                <b style={{ color: "#d1d5db" }}>Aritméticos</b>: incremento/decremento de posiciones, cálculo de apuestas (x4).{" "}
                                <b style={{ color: "#d1d5db" }}>Comparación</b>: verificar ganador (pos {">"} TRACK_LENGTH), mínimo de posiciones.{" "}
                                <b style={{ color: "#d1d5db" }}>Lógicos</b>: condiciones de penalización y fin de juego.
                            </p>
                        </div>
                        <div className="p-3" style={innerCardStyle}>
                            <div className="font-bold mb-1" style={{ color: "#f87171" }}>🚫 Restricciones</div>
                            <p style={{ color: C.textMuted }} className="leading-relaxed">
                                Un caballo <b style={{ color: "#d1d5db" }}>no puede retroceder</b> por debajo de 0.
                                Solo se revela una carta de pista cuando <b style={{ color: "#d1d5db" }}>todos</b> los caballos la han superado.
                                Las apuestas se hacen <b style={{ color: "#d1d5db" }}>antes</b> de iniciar. No se puede apostar más de lo que se tiene.
                            </p>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
