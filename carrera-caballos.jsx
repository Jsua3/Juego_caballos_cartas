import { useState, useEffect, useCallback, useRef } from "react";

const SUITS = [
    { id: "oros", name: "Oros", emoji: "🪙", color: "#F59E0B", bg: "#FEF3C7" },
    { id: "copas", name: "Copas", emoji: "🏆", color: "#EF4444", bg: "#FEE2E2" },
    { id: "espadas", name: "Espadas", emoji: "⚔️", color: "#3B82F6", bg: "#DBEAFE" },
    { id: "bastos", name: "Bastos", emoji: "🪵", color: "#22C55E", bg: "#DCFCE7" },
];

const CARD_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 10, 11, 12];
const TRACK_LENGTH = 7;
const HORSE_CARD = 12; // Rey = caballo

function createDeck() {
    const deck = [];
    for (const suit of SUITS) {
        for (const num of CARD_NUMBERS) {
            if (num === HORSE_CARD) continue;
            deck.push({ suit: suit.id, number: num, id: `${suit.id}-${num}` });
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

function CardDisplay({ card, faceDown = false, small = false, highlight = false }) {
    const size = small ? { w: 48, h: 68, text: "text-xs" } : { w: 64, h: 90, text: "text-sm" };
    if (faceDown) {
        return (
            <div
                style={{ width: size.w, height: size.h }}
                className={`rounded-lg border-2 border-gray-600 flex items-center justify-center ${
                    highlight ? "border-yellow-400 shadow-lg shadow-yellow-400/50 animate-pulse" : ""
                }`}
                title="Carta boca abajo"
            >
                <div
                    className="w-full h-full rounded-md"
                    style={{
                        background: "repeating-linear-gradient(45deg, #1e293b, #1e293b 4px, #334155 4px, #334155 8px)",
                    }}
                />
            </div>
        );
    }
    const suit = getSuitInfo(card.suit);
    return (
        <div
            style={{
                width: size.w,
                height: size.h,
                borderColor: highlight ? "#facc15" : suit.color,
                background: "#fff",
                boxShadow: highlight ? `0 0 16px ${suit.color}80` : "0 2px 4px rgba(0,0,0,0.2)",
            }}
            className={`rounded-lg border-2 flex flex-col items-center justify-center ${size.text} font-bold transition-all duration-300`}
        >
            <span style={{ color: suit.color }}>{card.number}</span>
            <span className="text-lg">{suit.emoji}</span>
            <span style={{ color: suit.color, fontSize: 9 }}>{suit.name}</span>
        </div>
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
                style={{
                    filter: isWinner ? `drop-shadow(0 0 8px ${info.color})` : "none",
                }}
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
    const [gameState, setGameState] = useState("setup"); // setup | racing | paused | finished
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

    useEffect(() => {
        initGame();
    }, [initGame]);

    useEffect(() => {
        if (logRef.current) {
            logRef.current.scrollTop = logRef.current.scrollHeight;
        }
    }, [log]);

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
                    addLog(
                        `⚠️ ¡Penalización! Carta de pista: ${penCard.number} de ${suitInfo.name} ${suitInfo.emoji} — ${suitInfo.name} retrocede 1 paso`
                    );
                } else {
                    addLog(
                        `📋 Carta de pista revelada: ${penCard.number} de ${suitInfo.name} ${suitInfo.emoji} — sin efecto`
                    );
                }

                setPenaltyCard(penCard);
                setTimeout(() => setPenaltyCard(null), 1500);
                setRevealedTrack(newRevealed);
                return { newPositions, newRevealed: newRevealed };
            }
            return { newPositions, newRevealed: revealed };
        },
        [trackCards]
    );

    const drawCard = useCallback(() => {
        if (deck.length === 0 || winner) {
            if (deck.length === 0 && !winner) {
                let maxPos = -1;
                let maxSuit = null;
                for (const [suit, pos] of Object.entries(positions)) {
                    if (pos > maxPos) {
                        maxPos = pos;
                        maxSuit = suit;
                    }
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

        if (newPositions[card.suit] > TRACK_LENGTH) {
            setWinner(card.suit);
            setPositions(newPositions);
            setGameState("finished");
            addLog(`🏆 ¡${suitInfo.name} ${suitInfo.emoji} cruza la meta y GANA!`);
            setAutoPlay(false);

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
    }, [deck, winner, positions, revealedTrack, checkTrackPenalty, betAmount, selectedBet]);

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

    return (
        <div
            className="min-h-screen text-white overflow-auto"
            style={{
                background: "linear-gradient(135deg, #0c0a09 0%, #1c1917 40%, #292524 100%)",
                fontFamily: "'Segoe UI', system-ui, sans-serif",
            }}
        >
            {/* Header */}
            <div className="text-center pt-6 pb-3 px-4">
                <h1
                    className="text-3xl md:text-4xl font-black tracking-tight"
                    style={{
                        background: "linear-gradient(135deg, #F59E0B, #EF4444, #3B82F6, #22C55E)",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                    }}
                >
                    🏇 Carrera de Caballos
                </h1>
                <p className="text-gray-400 text-sm mt-1">Baraja Española — Juego Automatizado</p>
            </div>

            <div className="max-w-5xl mx-auto px-4 pb-8 space-y-4">
                {/* Stats Bar */}
                <div className="flex flex-wrap gap-3 justify-center text-xs">
                    <div className="bg-gray-800/80 border border-gray-700 rounded-lg px-3 py-2 flex items-center gap-2">
                        <span className="text-yellow-400">💰</span>
                        <span className="text-gray-300">Monedas:</span>
                        <span className="font-bold text-yellow-400">{playerCoins}</span>
                    </div>
                    <div className="bg-gray-800/80 border border-gray-700 rounded-lg px-3 py-2 flex items-center gap-2">
                        <span className="text-blue-400">🃏</span>
                        <span className="text-gray-300">Mazo:</span>
                        <span className="font-bold text-blue-400">{deck.length}</span>
                    </div>
                    <div className="bg-gray-800/80 border border-gray-700 rounded-lg px-3 py-2 flex items-center gap-2">
                        <span className="text-green-400">📊</span>
                        <span className="text-gray-300">Cartas sacadas:</span>
                        <span className="font-bold text-green-400">{cardsDrawn}</span>
                    </div>
                    {selectedBet && (
                        <div className="bg-gray-800/80 border border-gray-700 rounded-lg px-3 py-2 flex items-center gap-2">
                            <span>🎯</span>
                            <span className="text-gray-300">Apuesta:</span>
                            <span className="font-bold" style={{ color: getSuitInfo(selectedBet).color }}>
                {getSuitInfo(selectedBet).emoji} {getSuitInfo(selectedBet).name} ({betAmount})
              </span>
                        </div>
                    )}
                </div>

                {/* Betting Phase */}
                {gameState === "setup" && (
                    <div className="bg-gray-900/80 border border-gray-700 rounded-xl p-5">
                        <h2 className="text-lg font-bold text-center mb-1">🎰 Haz tu Apuesta</h2>
                        <p className="text-gray-400 text-xs text-center mb-4">
                            Elige el caballo ganador. Paga x4 si gana.
                        </p>
                        <div className="flex flex-wrap justify-center gap-2 mb-4">
                            {[50, 100, 200].map((amount) => (
                                <button
                                    key={amount}
                                    onClick={() => setBetAmount(amount)}
                                    className={`px-4 py-1.5 rounded-lg text-sm font-bold border transition-all ${
                                        betAmount === amount
                                            ? "bg-yellow-500 text-black border-yellow-400"
                                            : "bg-gray-800 text-gray-300 border-gray-600 hover:border-gray-400"
                                    }`}
                                >
                                    {amount} 💰
                                </button>
                            ))}
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                            {SUITS.map((suit) => (
                                <button
                                    key={suit.id}
                                    onClick={() => placeBet(suit.id)}
                                    disabled={playerCoins < betAmount}
                                    className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                                        selectedBet === suit.id
                                            ? "scale-105 shadow-lg"
                                            : "bg-gray-800/60 border-gray-700 hover:border-gray-500"
                                    }`}
                                    style={
                                        selectedBet === suit.id
                                            ? { borderColor: suit.color, background: `${suit.color}22`, boxShadow: `0 0 20px ${suit.color}40` }
                                            : {}
                                    }
                                >
                                    <span className="text-3xl">{suit.emoji}</span>
                                    <span className="font-bold" style={{ color: suit.color }}>
                    {suit.name}
                  </span>
                                    <span className="text-2xl">🏇</span>
                                </button>
                            ))}
                        </div>
                        <div className="flex justify-center">
                            <button
                                onClick={startRace}
                                disabled={!selectedBet}
                                className="px-8 py-3 rounded-xl font-black text-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                                style={{
                                    background: selectedBet
                                        ? "linear-gradient(135deg, #F59E0B, #EF4444)"
                                        : "#374151",
                                    color: "#fff",
                                    boxShadow: selectedBet ? "0 4px 20px rgba(245,158,11,0.4)" : "none",
                                }}
                            >
                                🏁 ¡Iniciar Carrera!
                            </button>
                        </div>
                    </div>
                )}

                {/* Race Track */}
                {gameState !== "setup" && (
                    <div className="bg-gray-900/80 border border-gray-700 rounded-xl p-4 md:p-5">
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="text-sm font-bold text-gray-300">🏟️ Pista de Carrera</h2>
                            {winner && (
                                <div
                                    className="text-sm font-black px-3 py-1 rounded-full animate-pulse"
                                    style={{
                                        background: getSuitInfo(winner).color,
                                        color: "#fff",
                                    }}
                                >
                                    🏆 ¡{getSuitInfo(winner).name} GANA!
                                </div>
                            )}
                        </div>

                        {/* Track visualization */}
                        <div className="space-y-2 mb-4">
                            {SUITS.map((suit) => {
                                const pos = positions[suit.id];
                                return (
                                    <div key={suit.id} className="flex items-center gap-2">
                                        <div
                                            className="w-16 text-xs font-bold text-center py-1 rounded-md shrink-0"
                                            style={{ background: `${suit.color}30`, color: suit.color }}
                                        >
                                            {suit.emoji} {suit.name}
                                        </div>
                                        <div className="flex-1 relative h-10 bg-gray-800/80 rounded-lg border border-gray-700 overflow-hidden">
                                            {/* Track markers */}
                                            {Array.from({ length: TRACK_LENGTH + 1 }, (_, i) => (
                                                <div
                                                    key={i}
                                                    className="absolute top-0 bottom-0 border-r border-gray-700"
                                                    style={{ left: `${(i / (TRACK_LENGTH + 1)) * 100}%` }}
                                                />
                                            ))}
                                            {/* Finish line */}
                                            <div
                                                className="absolute top-0 bottom-0 w-1"
                                                style={{
                                                    left: `${(TRACK_LENGTH / (TRACK_LENGTH + 1)) * 100}%`,
                                                    background: "repeating-linear-gradient(0deg, #fff 0px, #fff 4px, #000 4px, #000 8px)",
                                                }}
                                            />
                                            {/* Progress bar */}
                                            <div
                                                className="absolute top-1 bottom-1 left-1 rounded transition-all duration-700"
                                                style={{
                                                    width: `${Math.max(0, (pos / (TRACK_LENGTH + 1)) * 100 - 1)}%`,
                                                    background: `linear-gradient(90deg, ${suit.color}60, ${suit.color})`,
                                                }}
                                            />
                                            {/* Horse position marker */}
                                            <div
                                                className="absolute top-1/2 -translate-y-1/2 text-lg transition-all duration-700"
                                                style={{
                                                    left: `${(pos / (TRACK_LENGTH + 1)) * 100}%`,
                                                    transform: `translateX(-50%) translateY(-50%)`,
                                                    filter:
                                                        winner === suit.id
                                                            ? `drop-shadow(0 0 6px ${suit.color})`
                                                            : "none",
                                                }}
                                            >
                                                🏇
                                            </div>
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

                        {/* Track Cards — aligned below track positions */}
                        <div className="mb-4">
                            <div className="text-xs text-gray-400 mb-2 font-bold">
                                📋 Cartas de pista ({revealedTrack.length}/{TRACK_LENGTH} reveladas):
                            </div>
                            <div className="flex items-start gap-2">
                                {/* Spacer matching the suit label width */}
                                <div className="w-16 shrink-0" />
                                {/* Cards positioned across the track */}
                                <div className="flex-1 relative" style={{ height: 84 }}>
                                    {trackCards.map((card, idx) => {
                                        const isRevealed = revealedTrack.includes(idx);
                                        // Position each card at the center of its corresponding track segment
                                        // Track segments go from position 1 to TRACK_LENGTH, out of TRACK_LENGTH+1 total
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
                                                <span className="text-xs text-gray-500">#{idx + 1}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                                {/* Spacer matching the position counter width */}
                                <div className="w-8 shrink-0" />
                            </div>
                        </div>

                        {/* Current Card + Controls */}
                        <div className="flex flex-col md:flex-row items-center gap-4 justify-center">
                            <div className="flex flex-col items-center gap-1">
                                <span className="text-xs text-gray-400 font-bold">Última carta:</span>
                                {currentCard ? (
                                    <CardDisplay card={currentCard} highlight />
                                ) : (
                                    <div className="w-16 h-24 rounded-lg border-2 border-dashed border-gray-700 flex items-center justify-center text-gray-600 text-xs">
                                        ?
                                    </div>
                                )}
                            </div>

                            {!winner && (
                                <div className="flex flex-col gap-2 items-center">
                                    <div className="flex gap-2">
                                        <button
                                            onClick={drawCard}
                                            disabled={autoPlay}
                                            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-bold transition-all disabled:opacity-30"
                                        >
                                            🃏 Sacar Carta
                                        </button>
                                        <button
                                            onClick={toggleAutoPlay}
                                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                                                autoPlay
                                                    ? "bg-red-600 hover:bg-red-500"
                                                    : "bg-green-600 hover:bg-green-500"
                                            }`}
                                        >
                                            {autoPlay ? "⏸ Pausar" : "▶️ Auto"}
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-gray-400">
                                        <span>🐢</span>
                                        <input
                                            type="range"
                                            min={200}
                                            max={2000}
                                            step={100}
                                            value={2200 - speed}
                                            onChange={(e) => setSpeed(2200 - Number(e.target.value))}
                                            className="w-24 accent-yellow-500"
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
                                        background: "linear-gradient(135deg, #F59E0B, #EF4444)",
                                        boxShadow: "0 4px 20px rgba(245,158,11,0.4)",
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
                    <div className="bg-gray-900/80 border border-gray-700 rounded-xl p-4">
                        <h3 className="text-sm font-bold text-gray-300 mb-2">📜 Registro de Eventos</h3>
                        <div
                            ref={logRef}
                            className="h-32 overflow-y-auto space-y-1 text-xs font-mono scrollbar-thin"
                            style={{ scrollbarWidth: "thin", scrollbarColor: "#4B5563 transparent" }}
                        >
                            {log.map((entry, i) => (
                                <div key={i} className="text-gray-400 py-0.5 border-b border-gray-800">
                                    {entry.msg}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Data Model Info */}
                <div className="bg-gray-900/80 border border-gray-700 rounded-xl p-4">
                    <h3 className="text-sm font-bold text-gray-300 mb-3">
                        📐 Modelo de Datos y Conceptos Aplicados
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        <div className="bg-gray-800/60 rounded-lg p-3 border border-gray-700">
                            <div className="font-bold text-yellow-400 mb-1">📦 Modelo de Datos</div>
                            <p className="text-gray-400 leading-relaxed">
                                Cada <b className="text-gray-200">carta</b> es un objeto con propiedades:{" "}
                                <code className="text-yellow-300 bg-gray-900 px-1 rounded">
                                    {"{ suit, number, id }"}
                                </code>
                                . Los <b className="text-gray-200">caballos</b> se representan como un mapa de posiciones:{" "}
                                <code className="text-yellow-300 bg-gray-900 px-1 rounded">
                                    {"{ oros: 0, copas: 0, ... }"}
                                </code>
                                . La <b className="text-gray-200">pista</b> es un arreglo de cartas boca abajo.
                            </p>
                        </div>
                        <div className="bg-gray-800/60 rounded-lg p-3 border border-gray-700">
                            <div className="font-bold text-blue-400 mb-1">🏗️ Estructuras</div>
                            <p className="text-gray-400 leading-relaxed">
                                <b className="text-gray-200">Arreglos (Arrays)</b> para el mazo, pista y log de eventos.{" "}
                                <b className="text-gray-200">Objetos (Maps)</b> para posiciones de caballos y apuestas.{" "}
                                <b className="text-gray-200">Pila (Stack)</b> simulada: el mazo funciona como LIFO al sacar cartas.
                            </p>
                        </div>
                        <div className="bg-gray-800/60 rounded-lg p-3 border border-gray-700">
                            <div className="font-bold text-green-400 mb-1">⚙️ Operadores</div>
                            <p className="text-gray-400 leading-relaxed">
                                <b className="text-gray-200">Aritméticos</b>: incremento/decremento de posiciones, cálculo de apuestas (x4).{" "}
                                <b className="text-gray-200">Comparación</b>: verificar ganador (pos {">"} TRACK_LENGTH), mínimo de posiciones.{" "}
                                <b className="text-gray-200">Lógicos</b>: condiciones de penalización y fin de juego.
                            </p>
                        </div>
                        <div className="bg-gray-800/60 rounded-lg p-3 border border-gray-700">
                            <div className="font-bold text-red-400 mb-1">🚫 Restricciones</div>
                            <p className="text-gray-400 leading-relaxed">
                                Un caballo <b className="text-gray-200">no puede retroceder</b> por debajo de 0.
                                Solo se revela una carta de pista cuando <b className="text-gray-200">todos</b> los caballos la han superado.
                                Las apuestas se hacen <b className="text-gray-200">antes</b> de iniciar. No se puede apostar más de lo que se tiene.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}