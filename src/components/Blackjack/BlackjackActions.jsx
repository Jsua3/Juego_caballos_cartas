const ACTIONS = [
  { id: 'hit',    label: 'HIT',    color: '#1D4ED8', border: '#3B82F6', emoji: '👊' },
  { id: 'stand',  label: 'STAND',  color: '#991B1B', border: '#EF4444', emoji: '✋' },
  { id: 'double', label: 'DOUBLE', color: '#92400E', border: '#F59E0B', emoji: '2×' },
  { id: 'split',  label: 'SPLIT',  color: '#065F46', border: '#10B981', emoji: '✂️' },
];

export default function BlackjackActions({ availableActions = [], disabled = false, onAction }) {
  return (
    <div className="flex gap-3 justify-center flex-wrap">
      {ACTIONS.map(({ id, label, color, border, emoji }) => {
        const available = availableActions.includes(id);
        if (!available) return null;
        return (
          <button
            key={id}
            onClick={() => !disabled && onAction(id)}
            disabled={disabled}
            className="flex flex-col items-center gap-1 px-5 py-3 rounded-xl font-black text-sm transition active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: `${color}CC`,
              border: `2px solid ${border}`,
              color: '#fff',
              minWidth: 72,
              fontFamily: "'Cinzel', serif",
              letterSpacing: 1,
              boxShadow: disabled ? 'none' : `0 0 12px ${border}60`,
            }}
          >
            <span className="text-xl leading-none">{emoji}</span>
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}
