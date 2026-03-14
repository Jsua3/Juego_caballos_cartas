import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './context/AuthContext';
import { playSound } from './utils/sound';
import socket from './socket';
import LobbyPage from './components/Lobby/LobbyPage';
import BettingPhase from './components/Game/BettingPhase';
import RacingPhase from './components/Game/RacingPhase';
import ResultsPhase from './components/Game/ResultsPhase';
import UserBar from './components/Shared/UserBar';
import PurchaseModal from './components/Shared/PurchaseModal';
import StatsModal from './components/Shared/StatsModal';
import BlackjackGame from './components/Blackjack/BlackjackGame';
import RoomCodeQR from './components/Shared/RoomCodeQR';

/*
 * App phases:
 *  "lobby"   → room list / create
 *  "waiting" → in room, waiting for owner to start
 *  "betting" → sequential betting
 *  "racing"  → live race
 *  "results" → winner screen
 */

export default function CarreraDeCaballos() {
  const { token, user, updatePoints } = useAuth();

  const [phase, setPhase] = useState('lobby');
  const [gameMode, setGameMode] = useState('caballos');
  const [bjData, setBjData] = useState(null);
  const [roomCode, setRoomCode] = useState(null);
  const [onlinePlayers, setOnlinePlayers] = useState([]);
  const [roomState, setRoomState] = useState({ players: [], status: 'waiting', ownerId: null });
  const [raceState, setRaceState] = useState({
    positions: { oros: 0, copas: 0, espadas: 0, bastos: 0 },
    currentCard: null,
    penaltySuit: null,
    trackCards: [],
    revealedCount: 0,
  });
  const [results, setResults] = useState(null);
  const [winnerSuit, setWinnerSuit] = useState(null);
  const [showPurchase, setShowPurchase] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [socketError, setSocketError] = useState('');
  const [notification, setNotification] = useState('');
  const [showQR, setShowQR] = useState(false);

  // Connect socket and authenticate for online presence
  useEffect(() => {
    if (!token) return;
    if (!socket.connected) {
      socket.connect();
      socket.once('connect', () => socket.emit('authenticate', { token }));
    } else {
      socket.emit('authenticate', { token });
    }
  }, [token]);

  // Socket event listeners
  useEffect(() => {
    const onRoomUpdated = ({ players, status, ownerId, bettingCurrentUserId, gameMode: gm }) => {
      setRoomState((prev) => ({ ...prev, players, status, ownerId, bettingCurrentUserId }));
      if (gm) setGameMode(gm);
      // Only drive phase from room_updated for caballos; BJ uses bj_* events
      const mode = gm || 'caballos';
      if (mode === 'caballos') {
        if (status === 'waiting') setPhase('waiting');
        if (status === 'betting') setPhase('betting');
      } else {
        // For BJ, only go back to waiting if explicitly reset
        if (status === 'waiting') setPhase('waiting');
      }
    };

    const onBettingStart = ({ currentUserId }) => {
      setRoomState((prev) => ({ ...prev, status: 'betting', bettingCurrentUserId: currentUserId }));
      setPhase('betting');
    };

    const onBetConfirmed = ({ userId, suit, amount, nextUserId }) => {
      setRoomState((prev) => ({
        ...prev,
        bettingCurrentUserId: nextUserId,
        players: prev.players.map((p) =>
          p.userId === userId ? { ...p, betSuit: suit, betAmount: amount } : p
        ),
      }));
      // Update own points in context if it's us
      if (userId === user?.id) {
        updatePoints((user?.points ?? 0) - amount);
      }
    };

    const onRaceStart = ({ trackCards }) => {
      setRaceState({
        positions: { oros: 0, copas: 0, espadas: 0, bastos: 0 },
        currentCard: null,
        penaltySuit: null,
        trackCards,
        revealedCount: 0,
      });
      setPhase('racing');
    };

    const onCardDrawn = ({ card, positions, penaltySuit, revealedCount }) => {
      setRaceState((prev) => ({
        ...prev,
        currentCard: card,
        positions,
        penaltySuit: penaltySuit ?? null,
        revealedCount: revealedCount ?? prev.revealedCount,
      }));
    };

    const onRaceFinished = ({ winnerSuit, results }) => {
      setWinnerSuit(winnerSuit);
      setResults(results);
      setPhase('results');
      // Update my points from results
      const myResult = results?.find((r) => r.userId === user?.id);
      if (myResult) updatePoints(myResult.pointsAfter);
    };

    const onError = ({ message }) => {
      setSocketError(message);
      setTimeout(() => setSocketError(''), 4000);
    };

    const onPlayerLeft = ({ username }) => {
      setNotification(`${username} abandonó la partida`);
      setTimeout(() => setNotification(''), 4000);
    };

    const onMessageReceived = (msg) => setChatMessages((prev) => [...prev.slice(-199), msg]);

    const onOnlineUsers = (list) => setOnlinePlayers(list);

    const onRaceCancelled = ({ message }) => {
      setSocketError(message);
      setPhase('waiting');
      setTimeout(() => setSocketError(''), 5000);
    };

    // ── Blackjack events ──────────────────────────────────────────────────────
    const onBjBettingPhase = ({ timeLimit }) => {
      setBjData({ phase: 'betting', timeLimit, players: [], betsPlaced: [] });
      setPhase('blackjack');
    };

    const onBjBetPlaced = ({ userId, username, betsPlaced, totalPlayers }) => {
      setBjData((prev) => prev ? { ...prev, betsPlaced } : prev);
    };

    const onBjDeal = (data) => {
      setBjData((prev) => ({
        ...prev,
        ...data,
        phase: 'playing',
        currentTurn: null,
      }));
    };

    const onBjYourTurn = (data) => {
      setBjData((prev) => prev ? { ...prev, currentTurn: data } : prev);
    };

    const onBjCardDealt = (data) => {
      setBjData((prev) => {
        if (!prev) return prev;
        const newPlayers = (prev.players || []).map((p) => {
          if (p.userId !== data.userId) return p;
          const newHands = p.hands.map((h, i) =>
            i === data.handIndex
              ? { ...h, cards: [...h.cards, data.card], done: data.done, outcome: data.outcome,
                  bet: data.newBet ?? h.bet }
              : h
          );
          return { ...p, hands: newHands, points: data.playerPoints ?? p.points };
        });
        return { ...prev, players: newPlayers, currentTurn: null };
      });
    };

    const onBjStand = ({ userId, handIndex }) => {
      setBjData((prev) => {
        if (!prev) return prev;
        const newPlayers = (prev.players || []).map((p) => {
          if (p.userId !== userId) return p;
          const newHands = p.hands.map((h, i) => i === handIndex ? { ...h, done: true } : h);
          return { ...p, hands: newHands };
        });
        return { ...prev, players: newPlayers, currentTurn: null };
      });
    };

    const onBjSplitDone = ({ userId, hands, playerPoints }) => {
      setBjData((prev) => {
        if (!prev) return prev;
        const newPlayers = (prev.players || []).map((p) =>
          p.userId === userId ? { ...p, hands, points: playerPoints } : p
        );
        return { ...prev, players: newPlayers, currentTurn: null };
      });
    };

    const onBjDealerReveal = ({ dealer }) => {
      setBjData((prev) => prev ? { ...prev, dealer, phase: 'dealer_turn' } : prev);
    };

    const onBjDealerCard = ({ card, value, cards }) => {
      setBjData((prev) => prev ? { ...prev, dealer: { ...prev.dealer, cards, value } } : prev);
    };

    const onBjRoundResult = (data) => {
      setBjData((prev) => prev ? { ...prev, ...data, phase: 'results' } : prev);
      const myResult = data.results?.find((r) => r.userId === user?.id);
      if (myResult) updatePoints(myResult.pointsAfter);
    };

    socket.on('message_received', onMessageReceived);
    socket.on('room_updated', onRoomUpdated);
    socket.on('betting_start', onBettingStart);
    socket.on('bet_confirmed', onBetConfirmed);
    socket.on('race_start', onRaceStart);
    socket.on('card_drawn', onCardDrawn);
    socket.on('race_finished', onRaceFinished);
    socket.on('error', onError);
    socket.on('player_left', onPlayerLeft);
    socket.on('race_cancelled', onRaceCancelled);
    socket.on('online_users', onOnlineUsers);
    socket.on('bj_betting_phase', onBjBettingPhase);
    socket.on('bj_bet_placed', onBjBetPlaced);
    socket.on('bj_deal', onBjDeal);
    socket.on('bj_your_turn', onBjYourTurn);
    socket.on('bj_card_dealt', onBjCardDealt);
    socket.on('bj_stand', onBjStand);
    socket.on('bj_split_done', onBjSplitDone);
    socket.on('bj_dealer_reveal', onBjDealerReveal);
    socket.on('bj_dealer_card', onBjDealerCard);
    socket.on('bj_round_result', onBjRoundResult);

    return () => {
      socket.off('message_received', onMessageReceived);
      socket.off('room_updated', onRoomUpdated);
      socket.off('betting_start', onBettingStart);
      socket.off('bet_confirmed', onBetConfirmed);
      socket.off('race_start', onRaceStart);
      socket.off('card_drawn', onCardDrawn);
      socket.off('race_finished', onRaceFinished);
      socket.off('error', onError);
      socket.off('player_left', onPlayerLeft);
      socket.off('race_cancelled', onRaceCancelled);
      socket.off('online_users', onOnlineUsers);
      socket.off('bj_betting_phase', onBjBettingPhase);
      socket.off('bj_bet_placed', onBjBetPlaced);
      socket.off('bj_deal', onBjDeal);
      socket.off('bj_your_turn', onBjYourTurn);
      socket.off('bj_card_dealt', onBjCardDealt);
      socket.off('bj_stand', onBjStand);
      socket.off('bj_split_done', onBjSplitDone);
      socket.off('bj_dealer_reveal', onBjDealerReveal);
      socket.off('bj_dealer_card', onBjDealerCard);
      socket.off('bj_round_result', onBjRoundResult);
    };
  }, [user, updatePoints]);

  // Show purchase modal when points drop below 50
  useEffect(() => {
    if (user?.points !== undefined && user.points < 50 && phase === 'results') {
      setShowPurchase(true);
    }
  }, [user?.points, phase]);

  const handleJoinRoom = useCallback((code) => {
    setRoomCode(code);
    setPhase('waiting');
    socket.emit('join_room', { roomCode: code, token });
  }, [token]);

  // Auto-join via URL param ?room=CODE (from QR scan)
  useEffect(() => {
    if (!token) return;
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
      window.history.replaceState({}, '', window.location.pathname);
      handleJoinRoom(roomParam.toUpperCase());
    }
  }, [token, handleJoinRoom]);

  const handleLeaveRoom = useCallback(() => {
    if (roomCode) socket.emit('leave_room', { roomCode });
    setRoomCode(null);
    setPhase('lobby');
    setGameMode('caballos');
    setRoomState({ players: [], status: 'waiting', ownerId: null });
    setResults(null);
    setWinnerSuit(null);
    setChatMessages([]);
    setBjData(null);
  }, [roomCode]);

  const handleSendMessage = useCallback((text) => {
    socket.emit('send_message', { message: text });
  }, []);

  const handleStartBetting = useCallback(() => {
    socket.emit('start_betting', { roomCode });
  }, [roomCode]);

  const handlePlaceBet = useCallback((suit, amount) => {
    socket.emit('place_bet', { suit, amount });
  }, []);

  const handlePlayAgain = useCallback(() => {
    // Room resets automatically after 5s on server; re-join to trigger room_updated
    setResults(null);
    setWinnerSuit(null);
    setPhase('waiting');
    socket.emit('join_room', { roomCode, token });
  }, [roomCode, token]);

  const handleBjAction = useCallback((action, handIndex) => {
    socket.emit('bj_action', { action, handIndex });
  }, []);

  const handleBjPlaceBet = useCallback((amount) => {
    socket.emit('bj_place_bet', { amount });
  }, []);

  const isOwner = roomState.ownerId === user?.id;

  return (
    <>
      <UserBar onPurchase={() => setShowPurchase(true)} onStats={() => setShowStats(true)} />

      {/* Socket error toast */}
      {socketError && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 bg-red-900/90 border border-red-500/50 text-red-200 px-4 py-2 rounded-lg text-sm shadow-xl">
          ⚠️ {socketError}
        </div>
      )}

      {/* Notification toast */}
      {notification && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 bg-yellow-900/90 border border-yellow-600/50 text-yellow-200 px-4 py-2 rounded-lg text-sm shadow-xl">
          👋 {notification}
        </div>
      )}

      {/* Phase rendering */}
      {phase === 'lobby' && (
        <LobbyPage onJoinRoom={handleJoinRoom} onlinePlayers={onlinePlayers} />
      )}

      {phase === 'waiting' && (
        <WaitingRoom
          roomCode={roomCode}
          roomState={roomState}
          isOwner={isOwner}
          onStartBetting={handleStartBetting}
          onLeave={handleLeaveRoom}
          chatMessages={chatMessages}
          onSendMessage={handleSendMessage}
          onShowQR={() => setShowQR(true)}
        />
      )}

      {phase === 'betting' && (
        <BettingPhase
          roomState={roomState}
          onPlaceBet={handlePlaceBet}
          roomCode={roomCode}
          onShowQR={() => setShowQR(true)}
        />
      )}

      {phase === 'racing' && (
        <RacingPhase
          positions={raceState.positions}
          currentCard={raceState.currentCard}
          penaltySuit={raceState.penaltySuit}
          trackCards={raceState.trackCards}
          revealedCount={raceState.revealedCount}
          players={roomState.players}
          chatMessages={chatMessages}
          onSendMessage={handleSendMessage}
          roomCode={roomCode}
          onShowQR={() => setShowQR(true)}
        />
      )}

      {phase === 'results' && (
        <ResultsPhase
          results={results}
          winnerSuit={winnerSuit}
          onPlayAgain={handlePlayAgain}
          onLeaveLobby={handleLeaveRoom}
        />
      )}

      {phase === 'blackjack' && (
        <BlackjackGame
          bjData={bjData}
          onAction={handleBjAction}
          onPlaceBet={handleBjPlaceBet}
          chatMessages={chatMessages}
          onSendMessage={handleSendMessage}
          onLeave={handleLeaveRoom}
          players={roomState.players}
          roomCode={roomCode}
          onShowQR={() => setShowQR(true)}
        />
      )}

      {showQR && roomCode && <RoomCodeQR roomCode={roomCode} onClose={() => setShowQR(false)} />}
      {showPurchase && <PurchaseModal onClose={() => setShowPurchase(false)} />}
      {showStats && <StatsModal onClose={() => setShowStats(false)} />}
    </>
  );
}

/* ── Waiting Room ── */
function WaitingRoom({ roomCode, roomState, isOwner, onStartBetting, onLeave, chatMessages = [], onSendMessage, onShowQR }) {
  const { players = [], status } = roomState;
  const { user } = useAuth();
  const canStart = players.length >= 2 && status === 'waiting';
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const sendChat = () => {
    const text = chatInput.trim();
    if (!text) return;
    onSendMessage?.(text);
    setChatInput('');
  };

  return (
    <div className="min-h-screen pt-16 px-4 pb-8 flex flex-col items-center" style={{
      backgroundImage: `linear-gradient(rgba(4,10,4,0.88), rgba(4,10,4,0.88)), url(${process.env.PUBLIC_URL}/background.jpg)`,
      backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed',
    }}>
      <div className="w-full max-w-md mt-8">
        {/* Room code */}
        <div className="text-center mb-6">
          <p className="text-gray-400 text-sm mb-1" style={{ fontFamily: "'Cinzel', serif", letterSpacing: 3 }}>
            CÓDIGO DE SALA
          </p>
          <div className="inline-flex items-center gap-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl px-6 py-3">
            <span className="font-mono font-black text-yellow-400 text-3xl tracking-widest">{roomCode}</span>
            <button
              onClick={onShowQR}
              title="Ver código QR"
              className="text-yellow-400 hover:text-yellow-300 text-xl transition"
            >
              ▣
            </button>
          </div>
          <p className="text-gray-500 text-xs mt-2">Comparte este código con tus amigos</p>
        </div>

        {/* Players */}
        <div className="rounded-xl border border-yellow-600/20 bg-black/60 backdrop-blur p-4 mb-6">
          <h3 className="text-yellow-600 text-xs font-bold mb-3" style={{ fontFamily: "'Cinzel', serif", letterSpacing: 2 }}>
            JUGADORES ({players.length}/4)
          </h3>
          <div className="space-y-2">
            {players.map((p, i) => {
              const isMe = p.userId === user?.id;
              return (
              <div key={p.userId} className="flex items-center gap-3 p-2 rounded-lg transition" style={{
                background: isMe ? 'rgba(255,215,0,0.06)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${isMe ? 'rgba(255,215,0,0.2)' : 'rgba(255,255,255,0.06)'}`,
              }}>
                {/* Avatar con número */}
                <div className="relative">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold"
                    style={{ background: 'rgba(184,134,11,0.15)', border: `2px solid ${isMe ? '#FFD700' : 'rgba(184,134,11,0.3)'}`, color: '#FFD700' }}>
                    {p.username.charAt(0).toUpperCase()}
                  </div>
                  {/* Punto verde online */}
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-gray-900"
                    style={{ background: '#22C55E', boxShadow: '0 0 6px #22C55E' }} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-white text-sm font-medium truncate">{p.username}</p>
                    {isMe && <span className="text-yellow-500 text-xs">(tú)</span>}
                  </div>
                  <p className="text-gray-500 text-xs">{p.points?.toLocaleString()} pts</p>
                </div>

                <div className="flex items-center gap-2">
                  {roomState.ownerId === p.userId && (
                    <span className="text-yellow-400 text-xs">👑</span>
                  )}
                  <span className="text-green-400 text-xs font-medium">● En línea</span>
                </div>
              </div>
              );
            })}
            {Array.from({ length: 4 - players.length }).map((_, i) => (
              <div key={`empty-${i}`} className="flex items-center gap-3 p-2 rounded-lg border border-dashed border-gray-800">
                <div className="w-9 h-9 rounded-full border border-dashed border-gray-700 flex items-center justify-center">
                  <span className="text-gray-700 text-xs">?</span>
                </div>
                <div>
                  <p className="text-gray-700 text-sm italic">Esperando jugador…</p>
                  <p className="text-gray-800 text-xs">● Desconectado</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => { playSound('click'); onLeave(); }}
            className="flex-1 py-3 rounded-xl font-medium text-gray-400 transition"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            Salir
          </button>
          {isOwner && (
            <button
              onClick={() => { playSound('click'); onStartBetting(); }}
              disabled={!canStart}
              className="flex-1 py-3 rounded-xl font-bold text-black transition disabled:opacity-30 disabled:cursor-not-allowed"
              style={{
                background: 'linear-gradient(180deg, #C09020 0%, #8B6914 50%, #C09020 100%)',
                border: '2px solid #FFD700',
                fontFamily: "'Cinzel', serif",
              }}
            >
              {canStart ? 'INICIAR JUEGO' : `Mínimo 2 jugadores`}
            </button>
          )}
          {!isOwner && (
            <div className="flex-1 py-3 rounded-xl text-center text-gray-500 text-sm" style={{ border: '1px dashed rgba(255,255,255,0.1)' }}>
              Esperando al dueño…
            </div>
          )}
        </div>

        {/* Chat */}
        <div className="mt-4 rounded-xl border border-gray-700/50 bg-black/40 overflow-hidden">
          <div className="px-3 py-2 border-b border-gray-700/40">
            <span className="text-gray-400 text-xs font-bold" style={{ fontFamily: "'Cinzel', serif", letterSpacing: 1 }}>
              CHAT
            </span>
          </div>
          <div className="h-32 overflow-y-auto px-3 py-2 space-y-1">
            {chatMessages.length === 0 && (
              <p className="text-gray-600 text-xs text-center mt-4">Nadie ha escrito aún…</p>
            )}
            {chatMessages.map((m, i) => (
              <p key={i} className="text-xs leading-5">
                <span className="font-bold" style={{ color: m.userId === user?.id ? '#FFD700' : '#94A3B8' }}>
                  {m.username}:
                </span>{' '}
                <span className="text-gray-300">{m.message}</span>
              </p>
            ))}
            <div ref={chatEndRef} />
          </div>
          <div className="flex gap-2 p-2 border-t border-gray-700/40">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendChat()}
              maxLength={200}
              placeholder="Escribe un mensaje…"
              className="flex-1 bg-gray-800/60 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-yellow-600/50"
            />
            <button
              onClick={() => { playSound('click'); sendChat(); }}
              className="bg-yellow-700/60 hover:bg-yellow-600/80 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition"
            >
              Enviar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
