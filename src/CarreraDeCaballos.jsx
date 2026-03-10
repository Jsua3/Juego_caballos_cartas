import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './context/AuthContext';
import socket from './socket';
import LobbyPage from './components/Lobby/LobbyPage';
import BettingPhase from './components/Game/BettingPhase';
import RacingPhase from './components/Game/RacingPhase';
import ResultsPhase from './components/Game/ResultsPhase';
import UserBar from './components/Shared/UserBar';
import PurchaseModal from './components/Shared/PurchaseModal';

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
  const [roomCode, setRoomCode] = useState(null);
  const [roomState, setRoomState] = useState({ players: [], status: 'waiting', ownerId: null });
  const [raceState, setRaceState] = useState({
    positions: { oros: 0, copas: 0, espadas: 0, bastos: 0 },
    currentCard: null,
    penaltySuit: null,
    trackCards: [],
  });
  const [results, setResults] = useState(null);
  const [winnerSuit, setWinnerSuit] = useState(null);
  const [showPurchase, setShowPurchase] = useState(false);
  const [socketError, setSocketError] = useState('');

  // Connect socket when component mounts
  useEffect(() => {
    if (!token) return;
    if (!socket.connected) socket.connect();

    return () => {
      // Don't disconnect — socket is a singleton; leave_room handles cleanup
    };
  }, [token]);

  // Socket event listeners
  useEffect(() => {
    const onRoomUpdated = ({ players, status, ownerId, bettingCurrentUserId }) => {
      setRoomState((prev) => ({ ...prev, players, status, ownerId, bettingCurrentUserId }));
      if (status === 'waiting') setPhase('waiting');
      if (status === 'betting') setPhase('betting');
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
      });
      setPhase('racing');
    };

    const onCardDrawn = ({ card, positions, penaltySuit }) => {
      setRaceState((prev) => ({ ...prev, currentCard: card, positions, penaltySuit: penaltySuit ?? null }));
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

    socket.on('room_updated', onRoomUpdated);
    socket.on('betting_start', onBettingStart);
    socket.on('bet_confirmed', onBetConfirmed);
    socket.on('race_start', onRaceStart);
    socket.on('card_drawn', onCardDrawn);
    socket.on('race_finished', onRaceFinished);
    socket.on('error', onError);

    return () => {
      socket.off('room_updated', onRoomUpdated);
      socket.off('betting_start', onBettingStart);
      socket.off('bet_confirmed', onBetConfirmed);
      socket.off('race_start', onRaceStart);
      socket.off('card_drawn', onCardDrawn);
      socket.off('race_finished', onRaceFinished);
      socket.off('error', onError);
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

  const handleLeaveRoom = useCallback(() => {
    if (roomCode) socket.emit('leave_room', { roomCode });
    setRoomCode(null);
    setPhase('lobby');
    setRoomState({ players: [], status: 'waiting', ownerId: null });
    setResults(null);
    setWinnerSuit(null);
  }, [roomCode]);

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

  const isOwner = roomState.ownerId === user?.id;

  return (
    <>
      <UserBar onPurchase={() => setShowPurchase(true)} />

      {/* Socket error toast */}
      {socketError && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 bg-red-900/90 border border-red-500/50 text-red-200 px-4 py-2 rounded-lg text-sm shadow-xl">
          ⚠️ {socketError}
        </div>
      )}

      {/* Phase rendering */}
      {phase === 'lobby' && (
        <LobbyPage onJoinRoom={handleJoinRoom} />
      )}

      {phase === 'waiting' && (
        <WaitingRoom
          roomCode={roomCode}
          roomState={roomState}
          isOwner={isOwner}
          onStartBetting={handleStartBetting}
          onLeave={handleLeaveRoom}
        />
      )}

      {phase === 'betting' && (
        <BettingPhase
          roomState={roomState}
          onPlaceBet={handlePlaceBet}
        />
      )}

      {phase === 'racing' && (
        <RacingPhase
          positions={raceState.positions}
          currentCard={raceState.currentCard}
          penaltySuit={raceState.penaltySuit}
          trackCards={raceState.trackCards}
          players={roomState.players}
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

      {showPurchase && <PurchaseModal onClose={() => setShowPurchase(false)} />}
    </>
  );
}

/* ── Waiting Room ── */
function WaitingRoom({ roomCode, roomState, isOwner, onStartBetting, onLeave }) {
  const { players = [], status } = roomState;
  const canStart = players.length >= 2 && status === 'waiting';

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
          <div className="inline-block bg-yellow-500/10 border border-yellow-500/30 rounded-xl px-6 py-3">
            <span className="font-mono font-black text-yellow-400 text-3xl tracking-widest">{roomCode}</span>
          </div>
          <p className="text-gray-500 text-xs mt-2">Comparte este código con tus amigos</p>
        </div>

        {/* Players */}
        <div className="rounded-xl border border-yellow-600/20 bg-black/60 backdrop-blur p-4 mb-6">
          <h3 className="text-yellow-600 text-xs font-bold mb-3" style={{ fontFamily: "'Cinzel', serif", letterSpacing: 2 }}>
            JUGADORES ({players.length}/4)
          </h3>
          <div className="space-y-2">
            {players.map((p, i) => (
              <div key={p.userId} className="flex items-center gap-3 p-2 rounded-lg" style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{ background: 'rgba(184,134,11,0.15)', border: '1px solid rgba(184,134,11,0.3)', color: '#FFD700' }}>
                  {i + 1}
                </div>
                <div className="flex-1">
                  <p className="text-white text-sm font-medium">{p.username}</p>
                  <p className="text-gray-500 text-xs">{p.points?.toLocaleString()} pts</p>
                </div>
                {roomState.ownerId === p.userId && (
                  <span className="text-yellow-400 text-xs">👑 Dueño</span>
                )}
              </div>
            ))}
            {Array.from({ length: 4 - players.length }).map((_, i) => (
              <div key={`empty-${i}`} className="flex items-center gap-3 p-2 rounded-lg border border-dashed border-gray-800">
                <div className="w-8 h-8 rounded-full border border-dashed border-gray-700" />
                <p className="text-gray-700 text-sm italic">Esperando jugador…</p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onLeave}
            className="flex-1 py-3 rounded-xl font-medium text-gray-400 transition"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            Salir
          </button>
          {isOwner && (
            <button
              onClick={onStartBetting}
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
      </div>
    </div>
  );
}
