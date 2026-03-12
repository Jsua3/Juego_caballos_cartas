import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import BlackjackBetting from './BlackjackBetting';
import BlackjackTable from './BlackjackTable';
import BlackjackActions from './BlackjackActions';
import BlackjackResults from './BlackjackResults';

export default function BlackjackGame({
  bjData,
  onAction,
  onPlaceBet,
  chatMessages = [],
  onSendMessage,
  onLeave,
  players = [],
}) {
  const { user } = useAuth();
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

  if (!bjData) return null;

  const { phase } = bjData;
  const myTurn = bjData.currentTurn?.userId === user?.id;
  const availableActions = myTurn ? (bjData.currentTurn?.availableActions || []) : [];

  const handleAction = (action) => {
    const hi = bjData.currentTurn?.handIndex ?? 0;
    onAction(action, hi);
  };

  return (
    <div
      className="min-h-screen pt-16 flex flex-col lg:flex-row"
      style={{
        backgroundImage: `linear-gradient(rgba(0,10,0,0.92), rgba(0,10,0,0.92)), url(${process.env.PUBLIC_URL}/background.jpg)`,
        backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed',
      }}
    >
      {/* Main game area */}
      <div className="flex-1 overflow-y-auto px-4 pb-6">
        {/* Title bar */}
        <div className="flex items-center justify-between py-3 mb-2">
          <h1 className="text-yellow-400 font-black text-lg" style={{ fontFamily: "'Cinzel', serif", letterSpacing: 2 }}>
            🃏 BLACKJACK
          </h1>
          <button
            onClick={onLeave}
            className="text-gray-500 hover:text-gray-300 text-sm transition px-3 py-1 rounded-lg"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            Salir
          </button>
        </div>

        {phase === 'betting' && (
          <BlackjackBetting
            timeLimit={bjData.timeLimit ?? 15}
            players={players}
            betsPlaced={bjData.betsPlaced || []}
            onPlaceBet={onPlaceBet}
          />
        )}

        {(phase === 'playing' || phase === 'dealer_turn') && (
          <div className="flex flex-col gap-4">
            <BlackjackTable
              players={bjData.players || []}
              dealer={bjData.dealer || {}}
              currentTurn={bjData.currentTurn}
              phase={phase}
            />

            {phase === 'playing' && (
              <div className="flex flex-col items-center gap-3 py-2">
                {myTurn ? (
                  <>
                    <p className="text-yellow-400 text-sm font-bold animate-pulse"
                      style={{ fontFamily: "'Cinzel', serif" }}>
                      TU TURNO — ELIGE UNA ACCIÓN
                    </p>
                    <BlackjackActions
                      availableActions={availableActions}
                      disabled={false}
                      onAction={handleAction}
                    />
                  </>
                ) : (
                  <p className="text-gray-500 text-sm">
                    Turno de{' '}
                    <span className="text-yellow-400 font-medium">
                      {bjData.players?.find(p => p.userId === bjData.currentTurn?.userId)?.username ?? '…'}
                    </span>
                  </p>
                )}
              </div>
            )}

            {phase === 'dealer_turn' && (
              <p className="text-center text-gray-400 text-sm animate-pulse">
                El dealer está jugando…
              </p>
            )}
          </div>
        )}

        {phase === 'results' && (
          <BlackjackResults
            results={bjData.results || []}
            dealerCards={bjData.dealerCards || []}
            dealerValue={bjData.dealerValue}
            onLeave={onLeave}
          />
        )}
      </div>

      {/* Chat sidebar */}
      <div className="lg:w-72 border-t lg:border-t-0 lg:border-l border-gray-700/40 flex flex-col bg-black/30">
        <div className="px-3 py-2 border-b border-gray-700/40">
          <span className="text-gray-400 text-xs font-bold" style={{ fontFamily: "'Cinzel', serif", letterSpacing: 1 }}>
            CHAT
          </span>
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1 min-h-[120px] max-h-48 lg:max-h-none">
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
            placeholder="Escribe…"
            className="flex-1 bg-gray-800/60 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-yellow-600/50"
          />
          <button
            onClick={sendChat}
            className="bg-yellow-700/60 hover:bg-yellow-600/80 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition"
          >
            →
          </button>
        </div>
      </div>
    </div>
  );
}
