import BlackjackCard from './BlackjackCard';
import { useAuth } from '../../context/AuthContext';

function HandDisplay({ hand, small = false, highlight = false }) {
  const val = hand?.cards?.length ? computeHandValue(hand.cards) : 0;
  const bust = val > 21;
  const bj = hand?.cards?.length === 2 && val === 21 && !hand.isSplit;
  const outcome = hand?.outcome;

  return (
    <div
      style={{
        padding: '6px 8px',
        borderRadius: 10,
        background: highlight ? 'rgba(255,215,0,0.06)' : 'transparent',
        border: highlight ? '2px solid rgba(255,215,0,0.5)' : '2px solid transparent',
        animation: highlight ? 'bj-pulse 1.5s ease-in-out infinite' : 'none',
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
      }}
    >
      {/* Cards */}
      <div style={{ display: 'flex', gap: 4 }}>
        {hand?.cards?.map((card, i) => (
          <BlackjackCard key={i} card={card} small={small} animate />
        ))}
      </div>
      {/* Value + outcome */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        {hand?.cards?.length > 0 && (
          <span style={{
            fontSize: 12, fontWeight: 'bold', color: bust ? '#EF4444' : '#E5E7EB',
            background: 'rgba(0,0,0,0.5)', padding: '1px 6px', borderRadius: 4,
          }}>
            {val}
          </span>
        )}
        {hand?.bet && (
          <span style={{
            fontSize: 11, background: 'rgba(184,134,11,0.3)', color: '#FFD700',
            border: '1px solid rgba(184,134,11,0.4)', borderRadius: 20,
            padding: '0px 6px', fontWeight: 'bold',
          }}>
            {hand.bet}
          </span>
        )}
        {bj && <span style={{ fontSize: 11, color: '#FFD700', fontWeight: 'bold', animation: 'bj-pulse 1s infinite' }}>BJ!</span>}
        {bust && <span style={{ fontSize: 11, color: '#EF4444', fontWeight: 'bold' }}>BUST</span>}
        {outcome && !bust && !bj && (
          <OutcomeBadge outcome={outcome} small />
        )}
      </div>
    </div>
  );
}

function OutcomeBadge({ outcome, small }) {
  const map = {
    win:       { label: 'WIN',       bg: '#065F46', color: '#34D399', border: '#10B981' },
    lose:      { label: 'LOSE',      bg: '#7F1D1D', color: '#FCA5A5', border: '#EF4444' },
    push:      { label: 'PUSH',      bg: '#374151', color: '#9CA3AF', border: '#6B7280' },
    blackjack: { label: 'BLACKJACK', bg: '#78350F', color: '#FDE68A', border: '#F59E0B' },
    bust:      { label: 'BUST',      bg: '#7F1D1D', color: '#FCA5A5', border: '#EF4444' },
  };
  const s = map[outcome] || map.lose;
  return (
    <span style={{
      fontSize: small ? 10 : 12, fontWeight: 'bold', padding: small ? '1px 5px' : '2px 8px',
      borderRadius: 4, background: s.bg, color: s.color, border: `1px solid ${s.border}`,
    }}>
      {s.label}
    </span>
  );
}

function computeHandValue(cards) {
  let sum = 0, aces = 0;
  for (const c of cards) {
    const r = c.rank;
    if (['J','Q','K'].includes(r)) sum += 10;
    else if (r === 'A') { sum += 11; aces++; }
    else sum += parseInt(r, 10);
  }
  while (sum > 21 && aces > 0) { sum -= 10; aces--; }
  return sum;
}

export default function BlackjackTable({ players = [], dealer = {}, currentTurn, phase }) {
  const { user } = useAuth();
  const dealerVal = dealer.cards?.length ? computeHandValue(dealer.cards) : null;

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Dealer zone */}
      <div className="rounded-xl border border-gray-700/40 bg-black/40 p-4">
        <p className="text-gray-500 text-xs font-bold mb-3 text-center"
          style={{ fontFamily: "'Cinzel', serif", letterSpacing: 2 }}>
          DEALER
        </p>
        <div className="flex justify-center gap-3 flex-wrap">
          {/* After dealer reveals (dealer_turn / results phase): show all cards */}
          {dealer.cards?.length > 0
            ? dealer.cards.map((card, i) => (
                <BlackjackCard key={i} card={card} small={false} animate={i === dealer.cards.length - 1} />
              ))
            : /* During playing phase: show visible + face-down */ dealer.visibleCard && (
              <>
                <BlackjackCard card={dealer.visibleCard} animate />
                <BlackjackCard faceDown />
              </>
            )
          }
        </div>
        {dealerVal !== null && (
          <p className="text-center mt-2 text-sm font-bold"
            style={{ color: dealerVal > 21 ? '#EF4444' : '#E5E7EB' }}>
            {dealerVal > 21 ? `BUST (${dealerVal})` : dealerVal}
          </p>
        )}
      </div>

      {/* Players zone */}
      <div className="flex flex-wrap gap-3 justify-center">
        {players.map((p) => {
          const isMe = p.userId === user?.id;
          const isMyTurn = currentTurn?.userId === p.userId;
          return (
            <div
              key={p.userId}
              className="rounded-xl p-3 flex flex-col items-center gap-2 min-w-[120px]"
              style={{
                background: isMe ? 'rgba(255,215,0,0.06)' : 'rgba(255,255,255,0.03)',
                border: `2px solid ${isMyTurn ? '#FFD700' : isMe ? 'rgba(255,215,0,0.2)' : 'rgba(255,255,255,0.1)'}`,
                boxShadow: isMyTurn ? '0 0 16px rgba(255,215,0,0.3)' : 'none',
              }}
            >
              {/* Avatar */}
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                style={{ background: 'rgba(184,134,11,0.15)', border: `2px solid ${isMe ? '#FFD700' : 'rgba(184,134,11,0.3)'}`, color: '#FFD700' }}>
                {p.username.charAt(0).toUpperCase()}
              </div>
              <p className="text-white text-xs font-medium">{p.username}{isMe ? ' (tú)' : ''}</p>

              {/* Hands */}
              {p.hands?.map((hand, hi) => (
                <HandDisplay
                  key={hi}
                  hand={hand}
                  small
                  highlight={isMyTurn && currentTurn?.handIndex === hi}
                />
              ))}

              {isMyTurn && (
                <span className="text-yellow-400 text-xs font-bold animate-pulse">TU TURNO</span>
              )}
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes bj-pulse {
          0%, 100% { box-shadow: 0 0 8px rgba(255,215,0,0.4); }
          50% { box-shadow: 0 0 20px rgba(255,215,0,0.8); }
        }
      `}</style>
    </div>
  );
}
