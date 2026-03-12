import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth, API_URL } from '../../context/AuthContext';

export default function StatsModal({ onClose }) {
  const { token } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    axios
      .get(`${API_URL}/api/users/stats`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => setStats(res.data))
      .catch(() => setError('No se pudieron cargar las estadísticas'))
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.80)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl p-6 relative"
        style={{
          background: 'linear-gradient(160deg, #0d1a0d 0%, #111811 60%, #0a1208 100%)',
          border: '2px solid rgba(184,134,11,0.5)',
          boxShadow: '0 0 60px rgba(184,134,11,0.15), inset 0 1px 0 rgba(255,215,0,0.1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="text-center mb-5">
          <span className="text-3xl">📊</span>
          <h2
            className="text-lg font-black mt-1"
            style={{
              background: 'linear-gradient(135deg, #FFD700, #B8860B, #FFD700)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              fontFamily: "'Cinzel', serif",
              letterSpacing: 2,
            }}
          >
            MIS ESTADÍSTICAS
          </h2>
        </div>

        {loading && (
          <p className="text-gray-400 text-center text-sm py-8">Cargando…</p>
        )}

        {error && (
          <p className="text-red-400 text-center text-sm py-8">{error}</p>
        )}

        {stats && !loading && (
          <div className="space-y-3">
            <StatRow label="Partidas jugadas" value={stats.games_played} />
            <StatRow label="Partidas ganadas" value={stats.games_won} color="#22C55E" />
            <StatRow
              label="Tasa de victoria"
              value={`${stats.win_rate}%`}
              color={stats.win_rate >= 50 ? '#22C55E' : '#EF4444'}
            />
            <div className="border-t border-yellow-600/20 my-3" />
            <StatRow label="Puntos ganados totales" value={stats.points_won.toLocaleString()} color="#FFD700" />
            <StatRow label="Puntos apostados totales" value={stats.points_bet.toLocaleString()} color="#94A3B8" />
            <div className="border-t border-yellow-600/20 my-3" />
            <StatRow label="Puntos actuales" value={stats.current_points.toLocaleString()} color="#FFD700" big />
          </div>
        )}

        <button
          onClick={onClose}
          className="mt-6 w-full py-2.5 rounded-xl text-sm font-bold transition"
          style={{
            background: 'rgba(184,134,11,0.15)',
            border: '1px solid rgba(184,134,11,0.3)',
            color: '#B8860B',
          }}
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}

function StatRow({ label, value, color = '#D1D5DB', big = false }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-400 text-sm">{label}</span>
      <span
        className={`font-bold ${big ? 'text-lg' : 'text-sm'}`}
        style={{ color }}
      >
        {value}
      </span>
    </div>
  );
}
