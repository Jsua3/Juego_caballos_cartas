import { motion } from 'framer-motion';

const ACTIONS = [
  { id: 'hit',    label: 'HIT',    bg: '#1E3A8A', border: '#3B82F6', glow: 'rgba(59,130,246,0.5)',  emoji: '👊' },
  { id: 'stand',  label: 'STAND',  bg: '#7F1D1D', border: '#EF4444', glow: 'rgba(239,68,68,0.5)',   emoji: '✋' },
  { id: 'double', label: 'DOUBLE', bg: '#78350F', border: '#F59E0B', glow: 'rgba(245,158,11,0.5)',  emoji: '2×' },
  { id: 'split',  label: 'SPLIT',  bg: '#064E3B', border: '#10B981', glow: 'rgba(16,185,129,0.5)',  emoji: '✂️' },
];

export default function BlackjackActions({ availableActions = [], disabled = false, onAction }) {
  return (
    <div className="flex gap-3 justify-center flex-wrap">
      {ACTIONS.map(({ id, label, bg, border, glow, emoji }) => {
        if (!availableActions.includes(id)) return null;
        return (
          <motion.button
            key={id}
            onClick={() => !disabled && onAction(id)}
            disabled={disabled}
            whileHover={disabled ? {} : {
              scale: 1.08,
              boxShadow: `0 0 28px ${glow}, 0 0 8px ${glow}`,
            }}
            whileTap={disabled ? {} : { scale: 0.93 }}
            transition={{ type: 'spring', stiffness: 420, damping: 18 }}
            className="flex flex-col items-center gap-1 px-5 py-3 rounded-xl font-black text-sm disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: `linear-gradient(160deg, ${bg}EE, ${bg}AA)`,
              border: `2px solid ${border}`,
              color: '#fff',
              minWidth: 72,
              fontFamily: "'Cinzel', serif",
              letterSpacing: 1,
              boxShadow: disabled ? 'none' : `0 0 14px ${glow}60`,
            }}
          >
            <span className="text-xl leading-none">{emoji}</span>
            <span>{label}</span>
          </motion.button>
        );
      })}
    </div>
  );
}
