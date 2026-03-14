import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { useAuth, API_URL } from '../../context/AuthContext';
import { playSound } from '../../utils/sound';

function MiniStats({ token }) {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    axios
      .get(`${API_URL}/api/users/stats`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => setStats(res.data))
      .catch(() => {});
  }, [token]);

  if (!stats) return null;

  return (
    <div className="flex items-center gap-4 bg-black/40 border border-yellow-600/15 rounded-xl px-4 py-2 mb-5 flex-wrap">
      <span className="text-yellow-700 text-xs font-bold" style={{ fontFamily: "'Cinzel', serif", letterSpacing: 1 }}>
        TUS STATS
      </span>
      <MiniStat label="Jugadas" value={stats.games_played} />
      <MiniStat label="Ganadas" value={stats.games_won} color="#22C55E" />
      <MiniStat label="Victoria" value={`${stats.win_rate}%`} color={stats.win_rate >= 50 ? '#22C55E' : '#EF4444'} />
      <MiniStat label="Pts ganados" value={stats.points_won.toLocaleString()} color="#FFD700" />
    </div>
  );
}

function MiniStat({ label, value, color = '#D1D5DB' }) {
  return (
    <div className="flex flex-col items-center">
      <span className="font-bold text-sm" style={{ color }}>{value}</span>
      <span className="text-gray-600 text-xs">{label}</span>
    </div>
  );
}

export default function LobbyPage({ onJoinRoom, onlinePlayers = [] }) {
  const { token } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');
  const [showModeModal, setShowModeModal] = useState(false);
  const [selectedMode, setSelectedMode] = useState('caballos');

  const fetchRooms = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/api/rooms`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRooms(res.data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchRooms();
    const interval = setInterval(fetchRooms, 5000);
    return () => clearInterval(interval);
  }, [fetchRooms]);

  const createRoom = async (gameMode) => {
    setCreating(true);
    setError('');
    setShowModeModal(false);
    try {
      const res = await axios.post(`${API_URL}/api/rooms`, { gameMode }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      onJoinRoom(res.data.room_code);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al crear sala');
    } finally {
      setCreating(false);
    }
  };

  const joinByCode = () => {
    const code = joinCode.trim().toUpperCase();
    if (code.length < 4) return setError('Ingresa un código válido');
    onJoinRoom(code);
  };

  return (
    <div className="min-h-screen pt-16 px-4 pb-20" style={{
      backgroundImage: `linear-gradient(rgba(4,10,4,0.85), rgba(4,10,4,0.85)), url(${process.env.PUBLIC_URL}/background.jpg)`,
      backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed',
    }}>
      <div className="max-w-2xl mx-auto">
        <h2 className="text-2xl font-bold text-yellow-400 mb-4 mt-4">Salas disponibles</h2>
        <MiniStats token={token} />

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <motion.button
            onClick={() => { playSound('click'); setShowModeModal(true); }}
            disabled={creating}
            whileHover={!creating ? { scale: 1.03, boxShadow: '0 0 28px rgba(255,215,0,0.45)' } : {}}
            whileTap={!creating ? { scale: 0.97 } : {}}
            transition={{ type: 'spring', stiffness: 400, damping: 18 }}
            className="flex-1 disabled:opacity-50 text-black font-bold py-3 rounded-xl"
            style={{
              background: 'linear-gradient(135deg, #C09020, #FFD700, #C09020)',
              boxShadow: '0 0 16px rgba(192,144,32,0.3)',
              fontFamily: "'Cinzel', serif",
              letterSpacing: 1,
            }}
          >
            {creating ? 'Creando...' : '+ Crear nueva sala'}
          </motion.button>
          <div className="flex flex-1 gap-2">
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              maxLength={8}
              placeholder="Código de sala"
              className="flex-1 bg-gray-800/80 border border-gray-700 rounded-xl px-4 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500/60 transition"
            />
            <motion.button
              onClick={() => { playSound('click'); joinByCode(); }}
              whileHover={{ scale: 1.05, boxShadow: '0 0 20px rgba(59,130,246,0.45)' }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 18 }}
              className="text-white font-bold px-4 rounded-xl"
              style={{
                background: 'linear-gradient(135deg, #1E40AF, #2563EB)',
                boxShadow: '0 0 10px rgba(37,99,235,0.3)',
              }}
            >
              Unirse
            </motion.button>
          </div>
        </div>

        {error && (
          <div className="bg-red-900/40 border border-red-500/50 text-red-300 rounded-lg px-4 py-3 mb-4 text-sm">
            {error}
          </div>
        )}

        {/* Room list */}
        {loading ? (
          <div className="text-gray-400 text-center py-12">Cargando salas...</div>
        ) : rooms.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <div className="text-5xl mb-4">🎰</div>
            <p className="text-gray-400">No hay salas disponibles. ¡Crea una!</p>
          </motion.div>
        ) : (
          <motion.div
            className="space-y-3"
            initial="hidden"
            animate="show"
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.07 } } }}
          >
            {rooms.map((room) => (
              <motion.div
                key={room.id}
                variants={{
                  hidden: { opacity: 0, y: 12 },
                  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 280, damping: 24 } },
                }}
                whileHover={{
                  scale: 1.015,
                  boxShadow: '0 0 24px rgba(255,215,0,0.12), 0 4px 20px rgba(0,0,0,0.5)',
                  borderColor: 'rgba(255,215,0,0.4)',
                }}
                whileTap={{ scale: 0.99 }}
                onClick={() => { playSound('click'); onJoinRoom(room.room_code); }}
                className="rounded-xl p-4 flex items-center justify-between cursor-pointer"
                style={{
                  background: 'rgba(17,17,17,0.9)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  transition: 'border-color 0.2s',
                }}
              >
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-bold text-yellow-400 text-lg" style={{ textShadow: '0 0 10px rgba(255,215,0,0.3)' }}>
                      {room.room_code}
                    </span>
                    <span className="text-xs bg-green-900/40 text-green-400 border border-green-700/40 px-2 py-0.5 rounded-full">
                      Esperando
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${
                      room.game_mode === 'blackjack'
                        ? 'bg-blue-900/40 text-blue-300 border-blue-700/40'
                        : 'bg-yellow-900/30 text-yellow-500 border-yellow-700/30'
                    }`}>
                      {room.game_mode === 'blackjack' ? '🃏 Blackjack' : '🏇 Caballos'}
                    </span>
                  </div>
                  <p className="text-gray-400 text-sm mt-0.5">
                    {room.player_count}/{room.max_players} jugadores
                  </p>
                </div>
                <motion.button
                  whileHover={{ scale: 1.07, boxShadow: '0 0 18px rgba(255,215,0,0.4)' }}
                  whileTap={{ scale: 0.94 }}
                  className="text-black font-bold px-4 py-2 rounded-lg text-sm"
                  style={{
                    background: 'linear-gradient(135deg, #B8860B, #FFD700)',
                    boxShadow: '0 0 10px rgba(184,134,11,0.3)',
                    fontFamily: "'Cinzel', serif",
                  }}
                  onClick={(e) => { e.stopPropagation(); playSound('click'); onJoinRoom(room.room_code); }}
                >
                  Unirse
                </motion.button>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>

      {/* Mode selector modal */}
      <AnimatePresence>
        {showModeModal && (
          <motion.div
            key="mode-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm px-4"
            onClick={() => setShowModeModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.88, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.88, y: 24 }}
              transition={{ type: 'spring', stiffness: 320, damping: 26 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-gray-900 border border-yellow-600/30 rounded-2xl p-6 w-full max-w-sm shadow-2xl"
              style={{ boxShadow: '0 0 60px rgba(0,0,0,0.8), 0 0 30px rgba(255,215,0,0.06)' }}
            >
              <h3 className="text-center text-yellow-400 font-bold text-lg mb-5"
                style={{ fontFamily: "'Cinzel', serif", letterSpacing: 2, textShadow: '0 0 20px rgba(255,215,0,0.3)' }}>
                MODO DE JUEGO
              </h3>

              <div className="space-y-3 mb-6">
                {[
                  { id: 'caballos',  emoji: '🏇', label: 'Carrera de Caballos', desc: 'Apuesta al palo ganador' },
                  { id: 'blackjack', emoji: '🃏', label: 'Blackjack',            desc: 'Vence al dealer con 21' },
                ].map((mode, i) => (
                  <motion.button
                    key={mode.id}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.08 }}
                    onClick={() => setSelectedMode(mode.id)}
                    whileHover={{ scale: 1.02, boxShadow: selectedMode === mode.id ? '0 0 22px rgba(255,215,0,0.3)' : '0 0 12px rgba(255,255,255,0.05)' }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full flex items-center gap-4 p-4 rounded-xl"
                    style={{
                      background: selectedMode === mode.id ? 'rgba(255,215,0,0.08)' : 'rgba(255,255,255,0.03)',
                      border: `2px solid ${selectedMode === mode.id ? '#FFD700' : 'rgba(255,255,255,0.1)'}`,
                      boxShadow: selectedMode === mode.id ? '0 0 16px rgba(255,215,0,0.2)' : 'none',
                      transition: 'border 0.2s, box-shadow 0.2s, background 0.2s',
                    }}
                  >
                    <span className="text-3xl">{mode.emoji}</span>
                    <div className="text-left">
                      <p className="text-white font-bold text-sm">{mode.label}</p>
                      <p className="text-gray-400 text-xs">{mode.desc}</p>
                    </div>
                    <AnimatePresence>
                      {selectedMode === mode.id && (
                        <motion.span
                          initial={{ opacity: 0, scale: 0.4 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.4 }}
                          className="ml-auto text-yellow-400 text-lg"
                        >
                          ✓
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </motion.button>
                ))}
              </div>

              <div className="flex gap-3">
                <motion.button
                  onClick={() => setShowModeModal(false)}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="flex-1 py-2.5 rounded-xl text-gray-400 text-sm font-medium"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  Cancelar
                </motion.button>
                <motion.button
                  onClick={() => { playSound('click'); createRoom(selectedMode); }}
                  whileHover={{ scale: 1.04, boxShadow: '0 0 28px rgba(255,215,0,0.5)' }}
                  whileTap={{ scale: 0.96 }}
                  transition={{ type: 'spring', stiffness: 380, damping: 18 }}
                  className="flex-1 py-2.5 rounded-xl font-bold text-black text-sm"
                  style={{
                    background: 'linear-gradient(180deg, #C09020 0%, #8B6914 50%, #C09020 100%)',
                    border: '2px solid #FFD700',
                    fontFamily: "'Cinzel', serif",
                    boxShadow: '0 0 14px rgba(192,144,32,0.3)',
                  }}
                >
                  CREAR SALA
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Jugadores en línea — barra inferior fija */}
      <div className="fixed bottom-0 left-0 right-0 bg-gray-900/95 backdrop-blur border-t border-green-600/20 px-4 py-2 z-40">
        <div className="max-w-2xl mx-auto flex items-center gap-3 overflow-x-auto">
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="w-2 h-2 rounded-full bg-green-400" style={{ boxShadow: '0 0 6px #22C55E' }} />
            <span className="text-green-400 text-xs font-bold whitespace-nowrap">
              {onlinePlayers.length} en línea
            </span>
          </div>
          <div className="w-px h-4 bg-gray-700 shrink-0" />
          <div className="flex items-center gap-2 overflow-x-auto">
            {onlinePlayers.length === 0 ? (
              <span className="text-gray-600 text-xs italic">Nadie conectado aún…</span>
            ) : (
              onlinePlayers.map((p) => (
                <div key={p.userId} className="flex items-center gap-1.5 shrink-0 bg-green-900/20 border border-green-700/30 rounded-full px-2.5 py-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                  <span className="text-green-300 text-xs font-medium">{p.username}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
