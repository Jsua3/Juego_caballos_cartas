import { useAuth } from '../../context/AuthContext';
import { playSound } from '../../utils/sound';

export default function UserBar({ onPurchase, onStats }) {
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-gray-900/95 backdrop-blur border-b border-yellow-600/20 px-4 py-2 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span className="text-yellow-400 font-bold text-sm">🎰 Sala de Apuestas</span>
        <span className="text-white font-medium">{user.username}</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-3 py-1">
          <span className="text-yellow-400 text-sm font-bold">{user.points?.toLocaleString()}</span>
          <span className="text-yellow-600 text-xs">pts</span>
        </div>
        <button
          onClick={() => { playSound('click'); onStats?.(); }}
          title="Ver estadísticas"
          className="flex items-center gap-1 bg-blue-700/80 hover:bg-blue-600 border border-blue-500/40 text-white text-xs font-bold px-2.5 py-1.5 rounded-lg transition"
        >
          <span>📊</span>
          <span className="hidden sm:inline">Stats</span>
        </button>
        <button
          onClick={() => { playSound('click'); onPurchase(); }}
          title="Comprar o canjear puntos"
          className="flex items-center gap-1 bg-green-700/80 hover:bg-green-600 border border-green-500/40 text-white text-xs font-bold px-2.5 py-1.5 rounded-lg transition"
        >
          <span>+</span>
          <span className="hidden sm:inline">Puntos</span>
        </button>
        <button
          onClick={() => { playSound('click'); logout(); }}
          className="text-gray-400 hover:text-white text-xs transition"
        >
          Salir
        </button>
      </div>
    </div>
  );
}
