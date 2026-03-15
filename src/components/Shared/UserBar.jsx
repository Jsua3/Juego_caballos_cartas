import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { playSound } from '../../utils/sound';
import AvatarCircle from './AvatarCircle';

export default function UserBar({ onPurchase, onStats, onProfile }) {
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-2"
      style={{
        background: 'rgba(4,8,5,0.97)',
        borderBottom: '1px solid rgba(180,134,20,0.15)',
        boxShadow: '0 2px 20px rgba(0,0,0,0.7)',
      }}
    >
      {/* Izquierda: logo + nombre app + usuario */}
      <div className="flex items-center gap-2.5">
        <span className="text-lg">🎰</span>
        <span
          className="text-white font-bold text-sm"
          style={{ fontFamily: "'Cinzel', serif", letterSpacing: 0.5 }}
        >
          Sala de Apuestas
        </span>
        <motion.button
          onClick={() => { playSound('click'); onProfile?.(); }}
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.94 }}
          className="flex items-center gap-1.5"
          title="Ver mi perfil"
        >
          <AvatarCircle
            src={user.avatar_url}
            username={user.username}
            size={24}
            style={{ border: '1.5px solid rgba(180,134,20,0.4)' }}
          />
          <span className="text-gray-400 text-sm hover:text-gray-200 transition">{user.display_name || user.username}</span>
        </motion.button>
      </div>

      {/* Derecha: puntos + botones */}
      <div className="flex items-center gap-2">
        {/* Puntos */}
        <div className="flex items-baseline gap-1 mr-1">
          <span
            className="font-black text-xl text-white"
            style={{ letterSpacing: -0.5 }}
          >
            {user.points?.toLocaleString()}
          </span>
          <span className="text-gray-400 text-sm font-medium">pts</span>
        </div>

        {/* Stats */}
        <motion.button
          onClick={() => { playSound('click'); onStats?.(); }}
          whileHover={{ scale: 1.06, boxShadow: '0 0 18px rgba(59,130,246,0.5)' }}
          whileTap={{ scale: 0.93 }}
          transition={{ type: 'spring', stiffness: 420, damping: 18 }}
          className="flex items-center gap-1.5 text-white text-xs font-bold px-3 py-1.5 rounded-lg"
          style={{
            background: 'linear-gradient(135deg, #1E3A8A, #2563EB)',
            boxShadow: '0 0 8px rgba(37,99,235,0.25)',
            fontFamily: "'Cinzel', serif",
            letterSpacing: 0.5,
          }}
        >
          <span>📊</span>
          <span>Stats</span>
        </motion.button>

        {/* Puntos / comprar */}
        <motion.button
          onClick={() => { playSound('click'); onPurchase(); }}
          whileHover={{ scale: 1.06, boxShadow: '0 0 18px rgba(212,168,53,0.5)' }}
          whileTap={{ scale: 0.93 }}
          transition={{ type: 'spring', stiffness: 420, damping: 18 }}
          className="flex items-center gap-1.5 text-black text-xs font-bold px-3 py-1.5 rounded-lg"
          style={{
            background: 'linear-gradient(135deg, #8B6400, #C09020, #D4A835)',
            boxShadow: '0 0 8px rgba(180,134,20,0.25)',
            fontFamily: "'Cinzel', serif",
            letterSpacing: 0.5,
          }}
        >
          <span>💰</span>
          <span>Puntos</span>
        </motion.button>

        {/* Salir */}
        <motion.button
          onClick={() => { playSound('click'); logout(); }}
          whileHover={{ scale: 1.06, boxShadow: '0 0 14px rgba(59,130,246,0.4)' }}
          whileTap={{ scale: 0.93 }}
          transition={{ type: 'spring', stiffness: 420, damping: 18 }}
          className="flex items-center gap-1.5 text-white text-xs font-bold px-3 py-1.5 rounded-lg"
          style={{
            background: 'linear-gradient(135deg, #1E3A8A, #2563EB)',
            boxShadow: '0 0 8px rgba(37,99,235,0.2)',
            fontFamily: "'Cinzel', serif",
            letterSpacing: 0.5,
          }}
        >
          <span>🚪</span>
          <span>Salir</span>
        </motion.button>
      </div>
    </div>
  );
}
