import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { playSound } from '../../utils/sound';
import AvatarCircle from './AvatarCircle';

function NavBtn({ icon, label, badge, onClick, gradient, glow, textColor }) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.07, boxShadow: `0 0 24px ${glow}` }}
      whileTap={{ scale: 0.92 }}
      transition={{ type: 'spring', stiffness: 420, damping: 18 }}
      className={`relative flex items-center gap-2 ${textColor} font-bold px-4 py-2.5 rounded-xl text-sm`}
      style={{
        background: gradient,
        boxShadow: `0 0 8px ${glow}`,
        fontFamily: "'Cinzel', serif",
        letterSpacing: 0.5,
      }}
    >
      <span className="text-base">{icon}</span>
      <span className="hidden sm:inline">{label}</span>
      {badge > 0 && (
        <span
          className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-white font-black"
          style={{ fontSize: 10, background: '#EF4444', boxShadow: '0 0 8px rgba(239,68,68,0.6)' }}
        >
          {badge > 9 ? '9+' : badge}
        </span>
      )}
    </motion.button>
  );
}

export default function UserBar({ onPurchase, onStats, onProfile, onFriends, friendsBadge = 0 }) {
  const { user, logout } = useAuth();
  if (!user) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-5"
      style={{
        background: 'rgba(4,8,5,0.97)',
        borderBottom: '1px solid rgba(180,134,20,0.18)',
        boxShadow: '0 2px 24px rgba(0,0,0,0.7)',
        minHeight: 64,
      }}
    >
      {/* Izquierda: logo */}
      <div className="flex items-center gap-2.5 min-w-[48px] sm:min-w-[160px]">
        <span className="text-2xl">🎰</span>
        <span
          className="text-white font-bold text-sm hidden sm:block"
          style={{ fontFamily: "'Cinzel', serif", letterSpacing: 0.5 }}
        >
          Sala de Apuestas
        </span>
      </div>

      {/* Centro: perfil personal */}
      <motion.button
        onClick={() => { playSound('click'); onProfile?.(); }}
        whileHover={{ scale: 1.04, boxShadow: '0 0 28px rgba(180,134,20,0.35)' }}
        whileTap={{ scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 380, damping: 18 }}
        className="flex items-center gap-3 px-4 py-2 rounded-xl"
        style={{
          background: 'rgba(180,134,20,0.1)',
          border: '1px solid rgba(180,134,20,0.28)',
        }}
        title="Ver mi perfil"
      >
        <AvatarCircle
          src={user.avatar_url}
          username={user.username}
          size={38}
          style={{ border: '2px solid rgba(180,134,20,0.55)', boxShadow: '0 0 12px rgba(180,134,20,0.25)' }}
        />
        <div className="text-left">
          <p className="text-white font-bold text-sm leading-tight">
            {user.display_name || user.username}
          </p>
          <p className="leading-tight">
            <span className="text-yellow-400 font-black text-sm">{user.points?.toLocaleString()}</span>
            <span className="text-gray-400 text-xs font-normal ml-1">pts</span>
          </p>
        </div>
      </motion.button>

      {/* Derecha: botones de acción */}
      <div className="flex items-center gap-2">
        <NavBtn
          icon="👥"
          label="Amigos"
          badge={friendsBadge}
          onClick={() => { playSound('click'); onFriends?.(); }}
          gradient="linear-gradient(135deg, #78350F, #B45309)"
          glow="rgba(180,83,9,0.35)"
          textColor="text-yellow-100"
        />
        <NavBtn
          icon="📊"
          label="Stats"
          onClick={() => { playSound('click'); onStats?.(); }}
          gradient="linear-gradient(135deg, #1E3A8A, #2563EB)"
          glow="rgba(37,99,235,0.3)"
          textColor="text-white"
        />
        <NavBtn
          icon="💰"
          label="Puntos"
          onClick={() => { playSound('click'); onPurchase?.(); }}
          gradient="linear-gradient(135deg, #8B6400, #C09020, #D4A835)"
          glow="rgba(180,134,20,0.3)"
          textColor="text-black"
        />
        <NavBtn
          icon="🚪"
          label="Salir"
          onClick={() => { playSound('click'); logout(); }}
          gradient="linear-gradient(135deg, #1E3A8A, #2563EB)"
          glow="rgba(37,99,235,0.25)"
          textColor="text-white"
        />
      </div>
    </div>
  );
}
