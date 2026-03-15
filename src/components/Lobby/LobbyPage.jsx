import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { useAuth, API_URL } from '../../context/AuthContext';
import { playSound } from '../../utils/sound';
import AvatarCircle from '../Shared/AvatarCircle';

// ── fondo casino: patrón de rombos verde oscuro + líneas doradas ──────────────
const CASINO_BG = {
  backgroundColor: '#072318',
  backgroundImage: `
    repeating-linear-gradient(45deg,  rgba(180,134,20,0.13) 0px, rgba(180,134,20,0.13) 1px, transparent 1px, transparent 42px),
    repeating-linear-gradient(-45deg, rgba(180,134,20,0.13) 0px, rgba(180,134,20,0.13) 1px, transparent 1px, transparent 42px)
  `,
};

function StatsBar({ token }) {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    axios
      .get(`${API_URL}/api/users/stats`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => setStats(res.data))
      .catch(() => {});
  }, [token]);

  if (!stats) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex items-center gap-6 rounded-xl px-5 py-3 mb-6 flex-wrap"
      style={{
        background: 'linear-gradient(90deg, #8B6400, #C09020, #D4A835, #C09020, #8B6400)',
        boxShadow: '0 2px 20px rgba(180,134,20,0.35)',
      }}
    >
      <span className="text-black/70 text-xs font-black tracking-widest" style={{ fontFamily: "'Cinzel', serif" }}>
        TUS STATS
      </span>
      <Stat label="Jugadas"    value={stats.games_played} />
      <Stat label="Ganadas"    value={stats.games_won} />
      <Stat label="Victoria"   value={`${stats.win_rate}%`} highlight={stats.win_rate >= 50} />
      <Stat label="Pts ganados" value={stats.points_won.toLocaleString()} />
    </motion.div>
  );
}

function Stat({ label, value, highlight }) {
  return (
    <div className="flex flex-col items-center min-w-[52px]">
      <span
        className="font-black text-base leading-tight"
        style={{ color: highlight ? '#14532D' : '#000', textShadow: '0 1px 0 rgba(255,255,255,0.2)' }}
      >
        {value}
      </span>
      <span className="text-black/55 text-xs leading-tight">{label}</span>
    </div>
  );
}

export default function LobbyPage({ onJoinRoom, onlinePlayers = [] }) {
  const { token, user } = useAuth();
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
    <div className="min-h-screen pt-14 pb-12 px-4" style={CASINO_BG}>
      <div className="max-w-2xl mx-auto pt-6">

        {/* Título */}
        <motion.h2
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-white font-bold text-3xl mb-5"
          style={{ fontFamily: "'Cinzel', serif", textShadow: '0 2px 12px rgba(0,0,0,0.5)' }}
        >
          Salas disponibles
        </motion.h2>

        <StatsBar token={token} />

        {/* Acciones */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <motion.button
            onClick={() => { playSound('click'); setShowModeModal(true); }}
            disabled={creating}
            whileHover={!creating ? { scale: 1.02, boxShadow: '0 0 32px rgba(212,168,53,0.5)' } : {}}
            whileTap={!creating ? { scale: 0.98 } : {}}
            transition={{ type: 'spring', stiffness: 400, damping: 18 }}
            className="flex-1 disabled:opacity-50 font-bold py-3 rounded-xl text-base"
            style={{
              background: 'linear-gradient(90deg, #8B6400, #C09020, #D4A835, #C09020, #8B6400)',
              color: '#000',
              boxShadow: '0 0 18px rgba(180,134,20,0.35)',
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
              onKeyDown={(e) => e.key === 'Enter' && joinByCode()}
              maxLength={8}
              placeholder="Código de sala"
              className="flex-1 rounded-xl px-4 py-3 text-white font-medium text-base focus:outline-none focus:ring-2 focus:ring-yellow-600/40 transition"
              style={{
                background: 'rgba(0,0,0,0.45)',
                border: '1px solid rgba(255,255,255,0.12)',
                caretColor: '#FFD700',
              }}
            />
            <motion.button
              onClick={() => { playSound('click'); joinByCode(); }}
              whileHover={{ scale: 1.04, boxShadow: '0 0 22px rgba(59,130,246,0.5)' }}
              whileTap={{ scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 400, damping: 18 }}
              className="text-white font-bold px-6 rounded-xl text-base"
              style={{
                background: 'linear-gradient(135deg, #1E3A8A, #2563EB, #1E3A8A)',
                boxShadow: '0 0 12px rgba(37,99,235,0.35)',
                fontFamily: "'Cinzel', serif",
              }}
            >
              Unirse
            </motion.button>
          </div>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-900/50 border border-red-500/40 text-red-300 rounded-xl px-4 py-3 mb-4 text-sm"
          >
            {error}
          </motion.div>
        )}

        {/* Lista de salas */}
        {loading ? (
          <div className="text-gray-400 text-center py-12">Cargando salas...</div>
        ) : rooms.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="flex flex-col items-center justify-center py-20 gap-4"
          >
            <span style={{ fontSize: 110, lineHeight: 1, filter: 'drop-shadow(0 0 24px rgba(180,134,20,0.4))' }}>
              🎰
            </span>
            <p className="text-gray-300 text-base" style={{ textShadow: '0 1px 8px rgba(0,0,0,0.6)' }}>
              No hay salas disponibles. ¡Crea una!
            </p>
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
                  hidden: { opacity: 0, y: 14 },
                  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 280, damping: 24 } },
                }}
                whileHover={{
                  scale: 1.015,
                  boxShadow: '0 0 28px rgba(180,134,20,0.2), 0 4px 20px rgba(0,0,0,0.6)',
                }}
                whileTap={{ scale: 0.99 }}
                onClick={() => { playSound('click'); onJoinRoom(room.room_code); }}
                className="rounded-xl p-4 flex items-center justify-between cursor-pointer"
                style={{
                  background: 'rgba(0,0,0,0.5)',
                  border: '1px solid rgba(180,134,20,0.2)',
                  backdropFilter: 'blur(6px)',
                }}
              >
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className="font-mono font-black text-xl"
                      style={{ color: '#FFD700', textShadow: '0 0 12px rgba(255,215,0,0.35)' }}
                    >
                      {room.room_code}
                    </span>
                    <span className="text-xs bg-green-900/50 text-green-300 border border-green-700/40 px-2 py-0.5 rounded-full">
                      Esperando
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${
                      room.game_mode === 'blackjack'
                        ? 'bg-blue-900/40 text-blue-300 border-blue-700/40'
                        : 'bg-yellow-900/30 text-yellow-400 border-yellow-700/30'
                    }`}>
                      {room.game_mode === 'blackjack' ? '🃏 Blackjack' : '🏇 Caballos'}
                    </span>
                  </div>
                  <p className="text-gray-400 text-sm mt-0.5">
                    {room.player_count}/{room.max_players} jugadores
                  </p>
                </div>
                <motion.button
                  whileHover={{ scale: 1.08, boxShadow: '0 0 20px rgba(212,168,53,0.5)' }}
                  whileTap={{ scale: 0.93 }}
                  className="font-bold px-5 py-2 rounded-xl text-sm"
                  style={{
                    background: 'linear-gradient(135deg, #8B6400, #C09020, #D4A835)',
                    color: '#000',
                    fontFamily: "'Cinzel', serif",
                    boxShadow: '0 0 10px rgba(180,134,20,0.3)',
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

      {/* Modal modo de juego */}
      <AnimatePresence>
        {showModeModal && (
          <motion.div
            key="mode-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4"
            onClick={() => setShowModeModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.88, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.88, y: 24 }}
              transition={{ type: 'spring', stiffness: 320, damping: 26 }}
              onClick={(e) => e.stopPropagation()}
              className="rounded-2xl p-6 w-full max-w-sm"
              style={{
                background: '#0a1f12',
                border: '1px solid rgba(180,134,20,0.3)',
                boxShadow: '0 0 70px rgba(0,0,0,0.9), 0 0 30px rgba(180,134,20,0.08)',
              }}
            >
              <h3
                className="text-center text-yellow-400 font-bold text-lg mb-5"
                style={{ fontFamily: "'Cinzel', serif", letterSpacing: 2, textShadow: '0 0 20px rgba(255,215,0,0.3)' }}
              >
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
                    onClick={() => { playSound('advance'); setSelectedMode(mode.id); }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full flex items-center gap-4 p-4 rounded-xl"
                    style={{
                      background: selectedMode === mode.id ? 'rgba(180,134,20,0.12)' : 'rgba(255,255,255,0.03)',
                      border: `2px solid ${selectedMode === mode.id ? '#C09020' : 'rgba(255,255,255,0.08)'}`,
                      boxShadow: selectedMode === mode.id ? '0 0 18px rgba(180,134,20,0.25)' : 'none',
                      transition: 'all 0.2s',
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
                        >✓</motion.span>
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
                  whileHover={{ scale: 1.04, boxShadow: '0 0 28px rgba(212,168,53,0.55)' }}
                  whileTap={{ scale: 0.96 }}
                  className="flex-1 py-2.5 rounded-xl font-bold text-black text-sm"
                  style={{
                    background: 'linear-gradient(90deg, #8B6400, #C09020, #D4A835, #C09020, #8B6400)',
                    fontFamily: "'Cinzel', serif",
                    boxShadow: '0 0 14px rgba(180,134,20,0.3)',
                  }}
                >
                  CREAR SALA
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Barra inferior */}
      <div
        className="fixed bottom-0 left-0 right-0 px-5 py-2.5 z-40 flex items-center gap-3"
        style={{ background: 'rgba(4,12,6,0.97)', borderTop: '1px solid rgba(180,134,20,0.12)' }}
      >
        <span className="w-2 h-2 rounded-full bg-green-400 shrink-0" style={{ boxShadow: '0 0 6px #22C55E' }} />
        <span className="text-green-400 text-xs font-bold">{onlinePlayers.length} en línea</span>
        {onlinePlayers.length > 0 && (
          <>
            <span className="text-gray-600 text-xs">|</span>
            {onlinePlayers.map((p, i) => (
              <span key={p.userId} className="flex items-center gap-1.5 text-xs text-gray-300">
                <AvatarCircle src={p.avatar_url} username={p.username} size={16} />
                {p.username}
                {i < onlinePlayers.length - 1 && <span className="text-gray-600 ml-1">·</span>}
              </span>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
