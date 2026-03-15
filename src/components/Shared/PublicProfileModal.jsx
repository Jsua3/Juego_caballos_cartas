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

export default function PublicProfileModal({ userId, onClose, onSendMessage }) {
  const { token } = useAuth();
  const [profile, setProfile]           = useState(null);
  const [loading, setLoading]           = useState(true);
  const [error,   setError]             = useState('');
  const [friendship, setFriendship]     = useState({ status: 'none', friendshipId: null });
  const [fsLoading, setFsLoading]       = useState(false);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    setError('');
    setFriendship({ status: 'none', friendshipId: null });
    const headers = { Authorization: `Bearer ${token}` };
    Promise.all([
      axios.get(`${API_URL}/api/users/${userId}/profile`, { headers }),
      axios.get(`${API_URL}/api/friends/status/${userId}`, { headers }),
    ])
      .then(([profileRes, fsRes]) => {
        setProfile(profileRes.data);
        setFriendship(fsRes.data);
        setLoading(false);
      })
      .catch(() => { setError('No se pudo cargar el perfil'); setLoading(false); });
  }, [userId, token]);

  const sendFriendRequest = async () => {
    setFsLoading(true);
    playSound('click');
    try {
      const res = await axios.post(
        `${API_URL}/api/friends/request`,
        { userId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setFriendship({ status: 'sent', friendshipId: res.data.friendshipId });
    } catch (err) {
      console.error(err.response?.data?.error);
    }
    setFsLoading(false);
  };

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

            {/* Friendship actions */}
            {friendship.status !== 'self' && (
              <div className="flex gap-2 mt-1">
                {friendship.status === 'none' && (
                  <motion.button
                    onClick={sendFriendRequest}
                    disabled={fsLoading}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    className="flex-1 py-2 rounded-xl text-xs font-bold disabled:opacity-50"
                    style={{ background: 'rgba(255,215,0,0.13)', border: '1px solid rgba(255,215,0,0.3)', color: '#FFD700', fontFamily: "'Cinzel', serif" }}
                  >
                    + Agregar amigo
                  </motion.button>
                )}
                {friendship.status === 'sent' && (
                  <div className="flex-1 py-2 rounded-xl text-xs text-center text-gray-500" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
                    Solicitud enviada
                  </div>
                )}
                {friendship.status === 'received' && (
                  <div className="flex-1 py-2 rounded-xl text-xs text-center text-yellow-500" style={{ border: '1px solid rgba(255,215,0,0.2)' }}>
                    Te envió solicitud
                  </div>
                )}
                {friendship.status === 'accepted' && (
                  <motion.button
                    onClick={() => { playSound('click'); onClose(); onSendMessage?.({ id: userId, username: profile.username, display_name: profile.display_name, avatar_url: profile.avatar_url }); }}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    className="flex-1 py-2 rounded-xl text-xs font-bold"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#E5E7EB' }}
                  >
                    💬 Enviar mensaje
                  </motion.button>
                )}
              </div>
            )}
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
