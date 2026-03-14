import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { playSound } from '../../utils/sound';

export default function UserBar({ onPurchase, onStats }) {
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-gray-950/97 backdrop-blur border-b border-yellow-600/15 px-4 py-2 flex items-center justify-between"
      style={{ boxShadow: '0 1px 30px rgba(0,0,0,0.6), 0 1px 0 rgba(255,215,0,0.06)' }}
    >
      <div className="flex items-center gap-3">
        <span className="text-yellow-400 font-bold text-sm" style={{ fontFamily: "'Cinzel', serif", letterSpacing: 1, textShadow: '0 0 14px rgba(255,215,0,0.35)' }}>
          🎰 Sala de Apuestas
        </span>
        <span className="text-white font-medium text-sm opacity-70">{user.username}</span>
      </div>

      <div className="flex items-center gap-2">
        {/* Points badge */}
        <motion.div
          whileHover={{ scale: 1.05, boxShadow: '0 0 16px rgba(255,215,0,0.3)' }}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1 cursor-default"
          style={{ background: 'rgba(255,215,0,0.07)', border: '1px solid rgba(255,215,0,0.22)' }}
        >
          <span className="text-yellow-400 text-sm font-bold">{user.points?.toLocaleString()}</span>
          <span className="text-yellow-700 text-xs">pts</span>
        </motion.div>

        {/* Stats */}
        <motion.button
          onClick={() => { playSound('click'); onStats?.(); }}
          whileHover={{ scale: 1.07, boxShadow: '0 0 18px rgba(59,130,246,0.45)' }}
          whileTap={{ scale: 0.93 }}
          transition={{ type: 'spring', stiffness: 420, damping: 18 }}
          title="Ver estadísticas"
          className="flex items-center gap-1 text-white text-xs font-bold px-2.5 py-1.5 rounded-lg"
          style={{
            background: 'linear-gradient(135deg, #1E3A8A, #2563EB)',
            border: '1px solid rgba(59,130,246,0.35)',
            boxShadow: '0 0 8px rgba(37,99,235,0.2)',
          }}
        >
          <span>📊</span>
          <span className="hidden sm:inline">Stats</span>
        </motion.button>

        {/* Points purchase */}
        <motion.button
          onClick={() => { playSound('click'); onPurchase(); }}
          whileHover={{ scale: 1.07, boxShadow: '0 0 18px rgba(34,197,94,0.45)' }}
          whileTap={{ scale: 0.93 }}
          transition={{ type: 'spring', stiffness: 420, damping: 18 }}
          title="Comprar o canjear puntos"
          className="flex items-center gap-1 text-white text-xs font-bold px-2.5 py-1.5 rounded-lg"
          style={{
            background: 'linear-gradient(135deg, #14532D, #16A34A)',
            border: '1px solid rgba(34,197,94,0.35)',
            boxShadow: '0 0 8px rgba(22,163,74,0.2)',
          }}
        >
          <span>+</span>
          <span className="hidden sm:inline">Puntos</span>
        </motion.button>

        {/* Logout */}
        <motion.button
          onClick={() => { playSound('click'); logout(); }}
          whileHover={{ scale: 1.06, color: '#ffffff' }}
          whileTap={{ scale: 0.94 }}
          className="text-gray-500 text-xs transition-colors"
        >
          Salir
        </motion.button>
      </div>
    </div>
  );
}
