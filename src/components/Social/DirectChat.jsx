import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth, API_URL } from '../../context/AuthContext';
import { playSound } from '../../utils/sound';
import AvatarCircle from '../Shared/AvatarCircle';
import socket from '../../socket';

export default function DirectChat({ friend, onBack, roomCode, hideHeader = false }) {
  const { token, user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const endRef = useRef(null);

  // Load message history
  useEffect(() => {
    setLoading(true);
    setMessages([]);
    axios
      .get(`${API_URL}/api/messages/${friend.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => { setMessages(res.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [friend.id, token]);

  // Auto-scroll
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Listen for incoming DMs
  useEffect(() => {
    const onReceived = (data) => {
      if (data.senderId === friend.id) {
        setMessages((prev) => [...prev, {
          id:        data.id,
          senderId:  data.senderId,
          message:   data.message,
          timestamp: data.timestamp,
        }]);
      }
    };
    socket.on('direct_message_received', onReceived);
    return () => socket.off('direct_message_received', onReceived);
  }, [friend.id]);

  const send = () => {
    const text = input.trim().slice(0, 500);
    if (!text) return;
    playSound('click');
    // Optimistic update
    setMessages((prev) => [...prev, {
      senderId:  user?.id,
      message:   text,
      timestamp: new Date().toISOString(),
    }]);
    socket.emit('send_direct_message', { receiverId: friend.id, message: text });
    setInput('');
  };

  const sendInvite = () => {
    if (!roomCode) return;
    playSound('click');
    socket.emit('send_game_invite', { receiverId: friend.id, roomCode });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      {!hideHeader && <div className="flex items-center gap-2 p-3 border-b border-yellow-600/20">
        <button
          onClick={onBack}
          className="text-gray-400 hover:text-white text-lg leading-none px-1 transition"
          title="Volver"
        >
          ←
        </button>
        <AvatarCircle src={friend.avatar_url} username={friend.username} size={28} />
        <span className="text-white text-sm font-medium flex-1 truncate">
          {friend.display_name || friend.username}
        </span>
        {roomCode && (
          <button
            onClick={sendInvite}
            className="text-xs px-2 py-1 rounded-lg font-bold transition"
            style={{
              background: 'rgba(255,215,0,0.12)',
              border: '1px solid rgba(255,215,0,0.3)',
              color: '#FFD700',
            }}
            title="Invitar a la partida actual"
          >
            🎮 Invitar
          </button>
        )}
      </div>}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {loading ? (
          <p className="text-gray-500 text-xs text-center mt-4">Cargando mensajes…</p>
        ) : messages.length === 0 ? (
          <p className="text-gray-500 text-xs text-center mt-6">
            Sin mensajes aún.<br />¡Di hola!
          </p>
        ) : (
          messages.map((msg, i) => {
            const isMe = msg.senderId === user?.id;
            return (
              <div key={msg.id || i} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div
                  className="max-w-[80%] px-3 py-1.5 rounded-xl text-xs break-words"
                  style={{
                    background: isMe ? 'rgba(255,215,0,0.13)' : 'rgba(255,255,255,0.06)',
                    border:     isMe ? '1px solid rgba(255,215,0,0.25)' : '1px solid rgba(255,255,255,0.08)',
                    color: '#E5E7EB',
                  }}
                >
                  {msg.message}
                </div>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div className="p-2 border-t border-gray-700/40 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          maxLength={500}
          placeholder="Escribe un mensaje…"
          className="flex-1 bg-gray-800/60 border border-gray-600 rounded-lg px-2 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-yellow-600/50"
        />
        <button
          onClick={send}
          disabled={!input.trim()}
          className="bg-yellow-600/80 hover:bg-yellow-500 disabled:opacity-40 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition"
        >
          ✈
        </button>
      </div>
    </div>
  );
}
