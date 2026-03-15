import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { API_URL } from '../../context/AuthContext';
import { playSound } from '../../utils/sound';
import AvatarCircle from '../Shared/AvatarCircle';
import socket from '../../socket';

export default function InviteFriendsModal({ onClose, roomCode, token, onlinePlayers = [] }) {
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [invitedIds, setInvitedIds] = useState(new Set());

  useEffect(() => {
    axios
      .get(`${API_URL}/api/friends`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => {
        // Online first
        const onlineIds = new Set((onlinePlayers || []).map((p) => p.userId));
        const sorted = [...res.data].sort((a, b) => {
          const aOnline = onlineIds.has(a.id) ? 0 : 1;
          const bOnline = onlineIds.has(b.id) ? 0 : 1;
          return aOnline - bOnline;
        });
        setFriends(sorted);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [token]); // eslint-disable-line

  const onlineIds = new Set((onlinePlayers || []).map((p) => p.userId));

  const invite = (friend) => {
    if (invitedIds.has(friend.id)) return;
    playSound('click');
    socket.emit('send_game_invite', { receiverId: friend.id, roomCode });
    setInvitedIds((prev) => new Set([...prev, friend.id]));
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
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.88, y: 24 }}
        transition={{ type: 'spring', stiffness: 320, damping: 26 }}
        onClick={(e) => e.stopPropagation()}
        className="rounded-2xl w-full max-w-sm flex flex-col"
        style={{
          background: 'linear-gradient(180deg, #0d1f12 0%, #091508 100%)',
          border: '1px solid rgba(180,134,20,0.3)',
          boxShadow: '0 0 70px rgba(0,0,0,0.9), 0 0 30px rgba(180,134,20,0.08)',
          maxHeight: '80vh',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid rgba(180,134,20,0.15)' }}
        >
          <span
            className="text-yellow-400 font-black text-base"
            style={{ fontFamily: "'Cinzel', serif", letterSpacing: 2, textShadow: '0 0 16px rgba(255,215,0,0.25)' }}
          >
            INVITAR AMIGOS
          </span>
          <button
            onClick={() => { playSound('click'); onClose(); }}
            className="text-gray-400 hover:text-white text-lg transition"
          >
            ✕
          </button>
        </div>

        {/* Lista */}
        <div className="overflow-y-auto flex-1 p-3" style={{ maxHeight: 300 }}>
          {loading ? (
            <p className="text-gray-500 text-xs text-center py-8">Cargando amigos…</p>
          ) : friends.length === 0 ? (
            <p className="text-gray-500 text-xs text-center py-8">No tienes amigos aún.</p>
          ) : (
            <div className="space-y-2">
              {friends.map((f) => {
                const isOnline = onlineIds.has(f.id);
                const invited = invitedIds.has(f.id);
                return (
                  <motion.div
                    key={f.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-3 p-2.5 rounded-xl"
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    <div className="relative shrink-0">
                      <AvatarCircle src={f.avatar_url} username={f.username} size={36} />
                      <span
                        className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-gray-900"
                        style={{ background: isOnline ? '#22C55E' : '#4B5563' }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">
                        {f.display_name || f.username}
                      </p>
                      <p className="text-xs" style={{ color: isOnline ? '#4ADE80' : '#6B7280' }}>
                        {isOnline ? 'En línea' : 'Desconectado'}
                      </p>
                    </div>
                    <motion.button
                      onClick={() => invite(f)}
                      disabled={invited}
                      whileHover={!invited ? { scale: 1.05 } : {}}
                      whileTap={!invited ? { scale: 0.95 } : {}}
                      className="text-xs font-bold px-3 py-1.5 rounded-lg disabled:opacity-60"
                      style={invited
                        ? { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#6B7280' }
                        : { background: 'rgba(255,215,0,0.12)', border: '1px solid rgba(255,215,0,0.3)', color: '#FFD700' }
                      }
                    >
                      {invited ? 'Enviada ✓' : 'Invitar'}
                    </motion.button>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <motion.button
            onClick={() => { playSound('click'); onClose(); }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full py-2.5 rounded-xl text-gray-400 text-sm font-medium"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            Cerrar
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}
