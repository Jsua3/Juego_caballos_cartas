import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { useAuth, API_URL } from '../../context/AuthContext';
import AvatarCircle from './AvatarCircle';
import { playSound } from '../../utils/sound';

function StatBox({ label, value, highlight }) {
  return (
    <div className="flex flex-col items-center gap-0.5 min-w-[56px]">
      <span
        className="font-black text-lg leading-none"
        style={{ color: highlight ? '#34D399' : '#FFD700' }}
      >
        {value}
      </span>
      <span className="text-gray-500 text-xs">{label}</span>
    </div>
  );
}

export default function PublicProfileModal({ userId, onClose }) {
  const { token } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    setError('');
    axios
      .get(`${API_URL}/api/users/${userId}/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => { setProfile(res.data); setLoading(false); })
      .catch(() => { setError('No se pudo cargar el perfil'); setLoading(false); });
  }, [userId, token]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.88, y: 24 }}
        animate={{ opacity: 1, scale: 1,    y: 0  }}
        exit={{    opacity: 0, scale: 0.88, y: 24 }}
        transition={{ type: 'spring', stiffness: 320, damping: 26 }}
        onClick={(e) => e.stopPropagation()}
        className="rounded-2xl p-6 w-full max-w-sm flex flex-col gap-4"
        style={{
          background: 'linear-gradient(180deg, #0d1f12 0%, #091508 100%)',
          border:     '1px solid rgba(180,134,20,0.3)',
          boxShadow:  '0 0 70px rgba(0,0,0,0.9), 0 0 30px rgba(180,134,20,0.08)',
        }}
      >
        {loading ? (
          <p className="text-gray-500 text-sm text-center py-8">Cargando…</p>
        ) : error ? (
          <p className="text-red-400 text-sm text-center py-8">{error}</p>
        ) : profile && (
          <>
            {/* Avatar + nombre */}
            <div className="flex flex-col items-center gap-2">
              <AvatarCircle
                src={profile.avatar_url}
                username={profile.username}
                size={72}
                style={{ border: '3px solid rgba(180,134,20,0.45)', boxShadow: '0 0 18px rgba(180,134,20,0.2)' }}
              />
              <div className="text-center">
                <p className="text-white font-bold text-base">
                  {profile.display_name || profile.username}
                </p>
                {profile.display_name && (
                  <p className="text-gray-500 text-xs">@{profile.username}</p>
                )}
              </div>
            </div>

            {/* Bio */}
            {profile.bio && (
              <p className="text-gray-300 text-sm text-center px-2 leading-relaxed">
                {profile.bio}
              </p>
            )}

            {/* Divider */}
            <div style={{ height: 1, background: 'rgba(180,134,20,0.15)' }} />

            {/* Stats */}
            <div className="flex justify-center gap-5 flex-wrap">
              <StatBox label="Jugadas"  value={profile.games_played} />
              <StatBox label="Ganadas"  value={profile.games_won} />
              <StatBox label="Win Rate" value={`${profile.win_rate}%`} highlight={profile.win_rate >= 50} />
              <StatBox label="Pts ganados" value={(profile.points_won || 0).toLocaleString()} />
            </div>

            {/* Fecha */}
            <p className="text-gray-600 text-xs text-center">
              Miembro desde {new Date(profile.created_at).toLocaleDateString('es-ES', { year: 'numeric', month: 'long' })}
            </p>
          </>
        )}

        <motion.button
          onClick={() => { playSound('click'); onClose(); }}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="w-full py-2.5 rounded-xl text-gray-400 text-sm font-medium mt-1"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          Cerrar
        </motion.button>
      </motion.div>
    </motion.div>
  );
}
