import { useAuth } from '../../context/AuthContext';

export default function UserBar({ onPurchase }) {
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-gray-900/95 backdrop-blur border-b border-yellow-600/20 px-4 py-2 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span className="text-yellow-400 font-bold text-sm">🏇 Caballos</span>
        <span className="text-white font-medium">{user.username}</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-3 py-1">
          <span className="text-yellow-400 text-sm font-bold">{user.points?.toLocaleString()}</span>
          <span className="text-yellow-600 text-xs">pts</span>
        </div>
        {user.points < 50 && (
          <button
            onClick={onPurchase}
            className="bg-green-600 hover:bg-green-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition"
          >
            + Comprar puntos
          </button>
        )}
        <button
          onClick={logout}
          className="text-gray-400 hover:text-white text-xs transition"
        >
          Salir
        </button>
      </div>
    </div>
  );
}
