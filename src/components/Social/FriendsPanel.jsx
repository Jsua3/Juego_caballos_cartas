import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { useAuth, API_URL } from '../../context/AuthContext';
import { playSound } from '../../utils/sound';
import AvatarCircle from '../Shared/AvatarCircle';
import DirectChat from './DirectChat';
import socket from '../../socket';

const TAB_STYLE = (active) => ({
  padding: '6px 12px',
  borderRadius: 8,
  fontSize: 11,
  fontWeight: 'bold',
  fontFamily: "'Cinzel', serif",
  letterSpacing: 0.5,
  cursor: 'pointer',
  background: active ? 'rgba(255,215,0,0.15)' : 'transparent',
  border: active ? '1px solid rgba(255,215,0,0.35)' : '1px solid transparent',
  color: active ? '#FFD700' : '#6B7280',
  transition: 'all 0.2s',
});

export default function FriendsPanel({ isOpen, onClose, roomCode, onJoinRoom, initialChatTarget }) {
  const { token, user } = useAuth();
  const [tab, setTab] = useState('friends');
  const [chatTarget, setChatTarget] = useState(null);

  const [friends, setFriends]         = useState([]);
  const [requests, setRequests]       = useState([]);
  const [sentReqs, setSentReqs]       = useState([]);
  const [loadingFriends, setLoadingFriends] = useState(false);

  const [searchQuery, setSearchQuery]   = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const headers = { Authorization: `Bearer ${token}` };

  const loadAll = useCallback(async () => {
    setLoadingFriends(true);
    try {
      const [f, r, s] = await Promise.all([
        axios.get(`${API_URL}/api/friends`, { headers }),
        axios.get(`${API_URL}/api/friends/requests`, { headers }),
        axios.get(`${API_URL}/api/friends/sent`, { headers }),
      ]);
      setFriends(f.data);
      setRequests(r.data);
      setSentReqs(s.data);
    } catch { /* ignore */ }
    setLoadingFriends(false);
  }, [token]); // eslint-disable-line

  useEffect(() => {
    if (isOpen) {
      loadAll();
      setTab('friends');
      setChatTarget(initialChatTarget || null);
    }
  }, [isOpen, loadAll]); // eslint-disable-line

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    setSearchLoading(true);
    const timer = setTimeout(() => {
      axios
        .get(`${API_URL}/api/users/search?q=${encodeURIComponent(searchQuery)}`, { headers })
        .then((res) => { setSearchResults(res.data); setSearchLoading(false); })
        .catch(() => setSearchLoading(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]); // eslint-disable-line

  // Socket events while panel is open
  useEffect(() => {
    const onRequestReceived = (data) => {
      setRequests((prev) => [data, ...prev]);
    };
    const onRequestAccepted = (data) => {
      setSentReqs((prev) => prev.filter((r) => r.id !== data.id));
      setFriends((prev) => [...prev, { ...data, isOnline: true }]);
    };
    socket.on('friend_request_received', onRequestReceived);
    socket.on('friend_request_accepted', onRequestAccepted);
    return () => {
      socket.off('friend_request_received', onRequestReceived);
      socket.off('friend_request_accepted', onRequestAccepted);
    };
  }, []);

  const sendRequest = async (userId) => {
    playSound('click');
    try {
      const res = await axios.post(`${API_URL}/api/friends/request`, { userId }, { headers });
      setSentReqs((prev) => [...prev, { id: userId, friendshipId: res.data.friendshipId }]);
    } catch (err) {
      console.error(err.response?.data?.error || 'Error');
    }
  };

  const acceptRequest = async (friendshipId, fromUser) => {
    playSound('click');
    try {
      await axios.put(`${API_URL}/api/friends/${friendshipId}/accept`, {}, { headers });
      setRequests((prev) => prev.filter((r) => r.friendshipId !== friendshipId));
      setFriends((prev) => [...prev, { ...fromUser, friendshipId, isOnline: false }]);
    } catch { /* ignore */ }
  };

  const rejectRequest = async (friendshipId) => {
    playSound('click');
    try {
      await axios.put(`${API_URL}/api/friends/${friendshipId}/reject`, {}, { headers });
      setRequests((prev) => prev.filter((r) => r.friendshipId !== friendshipId));
    } catch { /* ignore */ }
  };

  const removeFriend = async (friendshipId) => {
    playSound('click');
    try {
      await axios.delete(`${API_URL}/api/friends/${friendshipId}`, { headers });
      setFriends((prev) => prev.filter((f) => f.friendshipId !== friendshipId));
    } catch { /* ignore */ }
  };

  const getFriendshipStatus = (userId) => {
    if (friends.some((f) => f.id === userId)) return 'accepted';
    if (sentReqs.some((r) => r.id === userId)) return 'sent';
    if (requests.some((r) => r.id === userId)) return 'received';
    return 'none';
  };

  const requestsBadge = requests.length;

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ x: '100%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '100%', opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="fixed top-0 right-0 bottom-0 z-50 flex flex-col"
      style={{
        width: 310,
        background: 'linear-gradient(180deg, #0d1f12 0%, #091508 100%)',
        borderLeft: '1px solid rgba(180,134,20,0.25)',
        boxShadow: '-8px 0 40px rgba(0,0,0,0.7)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: '1px solid rgba(180,134,20,0.2)' }}
      >
        <span
          className="text-yellow-400 font-black text-base"
          style={{ fontFamily: "'Cinzel', serif", letterSpacing: 1 }}
        >
          {chatTarget ? 'CHAT' : 'AMIGOS'}
        </span>
        <button
          onClick={() => { playSound('click'); chatTarget ? setChatTarget(null) : onClose(); }}
          className="text-gray-400 hover:text-white text-lg transition"
        >
          {chatTarget ? '←' : '✕'}
        </button>
      </div>

      {chatTarget ? (
        <DirectChat
          friend={chatTarget}
          onBack={() => setChatTarget(null)}
          roomCode={roomCode}
        />
      ) : (
        <>
          {/* Tabs */}
          <div className="flex gap-1 p-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <button style={TAB_STYLE(tab === 'friends')} onClick={() => { playSound('click'); setTab('friends'); }}>
              Amigos
            </button>
            <button style={TAB_STYLE(tab === 'requests')} onClick={() => { playSound('click'); setTab('requests'); }}>
              Solicitudes {requestsBadge > 0 && (
                <span className="ml-1 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5">
                  {requestsBadge}
                </span>
              )}
            </button>
            <button style={TAB_STYLE(tab === 'search')} onClick={() => { playSound('click'); setTab('search'); setSearchQuery(''); setSearchResults([]); }}>
              Buscar
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            <AnimatePresence mode="wait">
              {/* ── Amigos ── */}
              {tab === 'friends' && (
                <motion.div key="friends" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  {loadingFriends ? (
                    <p className="text-gray-500 text-xs text-center py-8">Cargando…</p>
                  ) : friends.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 py-10 px-4 text-center">
                      <span className="text-3xl">👥</span>
                      <p className="text-gray-500 text-xs">Aún no tienes amigos.<br />¡Búscalos en la pestaña "Buscar"!</p>
                    </div>
                  ) : (
                    <div className="space-y-1 p-2">
                      {friends.map((f) => (
                        <div
                          key={f.friendshipId}
                          className="flex items-center gap-2 p-2 rounded-xl"
                          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                        >
                          <div className="relative">
                            <AvatarCircle src={f.avatar_url} username={f.username} size={32} />
                            <span
                              className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-gray-900"
                              style={{ background: f.isOnline ? '#22C55E' : '#4B5563' }}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-xs font-medium truncate">
                              {f.display_name || f.username}
                            </p>
                            <p className="text-gray-600 text-xs">{f.isOnline ? 'En línea' : 'Desconectado'}</p>
                          </div>
                          <div className="flex gap-1">
                            <button
                              onClick={() => { playSound('click'); setChatTarget(f); }}
                              className="text-xs px-2 py-1 rounded-lg transition"
                              style={{ background: 'rgba(255,215,0,0.1)', border: '1px solid rgba(255,215,0,0.2)', color: '#FFD700' }}
                              title="Enviar mensaje"
                            >
                              💬
                            </button>
                            {roomCode && (
                              <button
                                onClick={() => { playSound('click'); socket.emit('send_game_invite', { receiverId: f.id, roomCode }); }}
                                className="text-xs px-2 py-1 rounded-lg transition"
                                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#9CA3AF' }}
                                title="Invitar a la partida"
                              >
                                🎮
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

              {/* ── Solicitudes ── */}
              {tab === 'requests' && (
                <motion.div key="requests" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  {requests.length === 0 ? (
                    <p className="text-gray-500 text-xs text-center py-8">Sin solicitudes pendientes</p>
                  ) : (
                    <div className="space-y-1 p-2">
                      {requests.map((r) => (
                        <div
                          key={r.friendshipId}
                          className="flex items-center gap-2 p-2 rounded-xl"
                          style={{ background: 'rgba(255,215,0,0.04)', border: '1px solid rgba(255,215,0,0.12)' }}
                        >
                          <AvatarCircle src={r.avatar_url} username={r.username} size={30} />
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-xs font-medium truncate">{r.display_name || r.username}</p>
                            <p className="text-gray-600 text-xs">@{r.username}</p>
                          </div>
                          <div className="flex gap-1">
                            <button
                              onClick={() => acceptRequest(r.friendshipId, r)}
                              className="text-xs px-2 py-1 rounded-lg font-bold transition"
                              style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)', color: '#4ADE80' }}
                            >
                              ✓
                            </button>
                            <button
                              onClick={() => rejectRequest(r.friendshipId)}
                              className="text-xs px-2 py-1 rounded-lg font-bold transition"
                              style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', color: '#F87171' }}
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Sent requests */}
                  {sentReqs.length > 0 && (
                    <div className="mt-4 px-2">
                      <p className="text-gray-600 text-xs font-bold mb-1" style={{ fontFamily: "'Cinzel', serif", letterSpacing: 1 }}>
                        ENVIADAS
                      </p>
                      <div className="space-y-1">
                        {sentReqs.map((r) => (
                          <div
                            key={r.friendshipId}
                            className="flex items-center gap-2 p-2 rounded-xl"
                            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
                          >
                            <AvatarCircle src={r.avatar_url} username={r.username} size={28} />
                            <div className="flex-1 min-w-0">
                              <p className="text-gray-400 text-xs truncate">{r.display_name || r.username}</p>
                            </div>
                            <span className="text-gray-600 text-xs">Pendiente</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {/* ── Buscar ── */}
              {tab === 'search' && (
                <motion.div key="search" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div className="p-2">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Buscar por usuario o nombre…"
                      className="w-full bg-gray-800/60 border border-gray-600 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-yellow-600/50"
                    />
                  </div>

                  {searchLoading && (
                    <p className="text-gray-500 text-xs text-center py-4">Buscando…</p>
                  )}

                  {!searchLoading && searchQuery.trim() && searchResults.length === 0 && (
                    <p className="text-gray-500 text-xs text-center py-4">Sin resultados</p>
                  )}

                  {!searchLoading && searchResults.length > 0 && (
                    <div className="space-y-1 px-2">
                      {searchResults.map((u) => {
                        const status = getFriendshipStatus(u.id);
                        return (
                          <div
                            key={u.id}
                            className="flex items-center gap-2 p-2 rounded-xl"
                            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                          >
                            <AvatarCircle src={u.avatar_url} username={u.username} size={30} />
                            <div className="flex-1 min-w-0">
                              <p className="text-white text-xs font-medium truncate">{u.display_name || u.username}</p>
                              <p className="text-gray-600 text-xs">@{u.username}</p>
                            </div>
                            {status === 'none' && (
                              <button
                                onClick={() => sendRequest(u.id)}
                                className="text-xs px-2 py-1 rounded-lg font-bold transition"
                                style={{ background: 'rgba(255,215,0,0.12)', border: '1px solid rgba(255,215,0,0.3)', color: '#FFD700' }}
                              >
                                + Agregar
                              </button>
                            )}
                            {status === 'accepted' && (
                              <span className="text-green-400 text-xs">✓ Amigo</span>
                            )}
                            {status === 'sent' && (
                              <span className="text-gray-500 text-xs">Pendiente</span>
                            )}
                            {status === 'received' && (
                              <span className="text-yellow-500 text-xs">Te envió solicitud</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </>
      )}
    </motion.div>
  );
}
