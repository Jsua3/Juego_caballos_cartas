import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { useAuth, API_URL } from '../../context/AuthContext';
import { playSound } from '../../utils/sound';
import AvatarCircle from '../Shared/AvatarCircle';

// ── Fondo casino ───────────────────────────────────────────────────────────────
const CASINO_BG = {
  backgroundColor: '#072318',
  backgroundImage: `
    repeating-linear-gradient(45deg,  rgba(180,134,20,0.13) 0px, rgba(180,134,20,0.13) 1px, transparent 1px, transparent 42px),
    repeating-linear-gradient(-45deg, rgba(180,134,20,0.13) 0px, rgba(180,134,20,0.13) 1px, transparent 1px, transparent 42px)
  `,
};

// ── Separador vertical ─────────────────────────────────────────────────────────
function Separator({ label }) {
  return (
    <div className="flex flex-col items-center gap-1 self-center shrink-0 mx-1">
      <div style={{ width: 1, height: 52, background: 'rgba(180,134,20,0.18)' }} />
      <span
        style={{
          fontSize: 9,
          color: 'rgba(180,134,20,0.45)',
          letterSpacing: 1,
          fontFamily: "'Cinzel', serif",
          textTransform: 'uppercase',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </span>
    </div>
  );
}

// ── Avatar de conexión (usuario online) ───────────────────────────────────────
function ConnAvatar({ player, isFriend, isOnline = true, onClick }) {
  const borderColor = isFriend
    ? 'rgba(180,134,20,0.55)'
    : 'rgba(100,100,100,0.45)';
  const bgColor = isFriend ? 'rgba(180,134,20,0.12)' : 'rgba(255,255,255,0.06)';
  const nameColor = isFriend ? 'rgba(255,215,0,0.85)' : 'rgba(200,200,200,0.75)';
  const dotColor = isOnline ? '#22C55E' : '#6B7280';

  return (
    <motion.div
      onClick={onClick}
      whileHover={{ scale: 1.1, y: -3 }}
      whileTap={{ scale: 0.93 }}
      transition={{ type: 'spring', stiffness: 420, damping: 18 }}
      className="flex flex-col items-center gap-1 shrink-0 cursor-pointer"
      style={{ opacity: isOnline ? 1 : 0.5 }}
    >
      <div style={{ position: 'relative' }}>
        <div
          style={{
            border: `2px solid ${borderColor}`,
            background: bgColor,
            borderRadius: '50%',
            padding: 2,
          }}
        >
          <AvatarCircle src={player.avatar_url} username={player.username} size={54} />
        </div>
        <span
          style={{
            position: 'absolute',
            bottom: 2,
            right: 2,
            width: 12,
            height: 12,
            borderRadius: '50%',
            background: dotColor,
            border: '2px solid #072318',
          }}
        />
      </div>
      <span
        className="text-center leading-tight truncate"
        style={{ fontSize: 11, maxWidth: 68, color: nameColor }}
      >
        {player.display_name || player.username}
      </span>
    </motion.div>
  );
}

// ── Barra de conexiones ────────────────────────────────────────────────────────
function ConnectionBar({ token, user, onlinePlayers, onViewProfile, onOpenSearch, onProfile }) {
  const [stats, setStats] = useState(null);
  const [friends, setFriends] = useState([]);

  useEffect(() => {
    if (!token) return;
    const h = { Authorization: `Bearer ${token}` };
    axios.get(`${API_URL}/api/users/stats`, { headers: h }).then((r) => setStats(r.data)).catch(() => {});
    axios.get(`${API_URL}/api/friends`, { headers: h }).then((r) => setFriends(r.data)).catch(() => {});
  }, [token]);

  const onlineIds = new Set(onlinePlayers.map((p) => p.userId));
  const friendIds = new Set(friends.map((f) => f.id));

  // Amigos online primero, offline después
  const onlineFriends = friends
    .filter((f) => onlineIds.has(f.id))
    .map((f) => {
      const playerData = onlinePlayers.find((p) => p.userId === f.id);
      return { ...f, userId: f.id, roomCode: playerData?.roomCode || null };
    });
  const offlineFriends = friends.filter((f) => !onlineIds.has(f.id));

  // Otros online (no amigos, no yo)
  const otherOnline = onlinePlayers.filter(
    (p) => !friendIds.has(p.userId) && p.userId !== user?.id
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="sticky top-16 z-30"
      style={{
        background: 'rgba(4,12,6,0.97)',
        borderBottom: '1px solid rgba(180,134,20,0.12)',
      }}
    >
      <div
        className="flex items-start gap-4 overflow-x-auto"
        style={{ padding: '20px 28px 18px', scrollbarWidth: 'none' }}
      >
        {/* ── Mi perfil ── */}
        <motion.div
          onClick={() => { playSound('click'); onProfile?.(); }}
          whileHover={{ scale: 1.02, boxShadow: '0 0 18px rgba(180,134,20,0.2)' }}
          whileTap={{ scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 380, damping: 18 }}
          className="flex items-center gap-3.5 shrink-0 cursor-pointer rounded-xl"
          style={{
            background: 'rgba(180,134,20,0.07)',
            border: '1px solid rgba(180,134,20,0.2)',
            padding: '12px 18px',
          }}
        >
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <AvatarCircle
              src={user?.avatar_url}
              username={user?.username}
              size={56}
              style={{
                border: '2px solid rgba(255,215,0,0.55)',
                boxShadow: '0 0 10px rgba(180,134,20,0.2)',
              }}
            />
            <span
              style={{
                position: 'absolute',
                bottom: 1,
                right: 1,
                width: 13,
                height: 13,
                borderRadius: '50%',
                background: '#22C55E',
                border: '1.5px solid #040c06',
              }}
            />
          </div>
          <div>
            <p
              className="text-white font-bold"
              style={{ fontSize: 15, lineHeight: 1.35 }}
            >
              {user?.display_name || user?.username}
            </p>
            {stats ? (
              <p style={{ fontSize: 12, color: 'rgba(200,200,200,0.65)', lineHeight: 1.5 }}>
                {stats.games_played} jugadas · {stats.games_won} ganadas ·{' '}
                <span
                  style={{
                    color: stats.win_rate >= 50 ? '#34D399' : 'rgba(200,200,200,0.65)',
                  }}
                >
                  {stats.win_rate}% win
                </span>
              </p>
            ) : (
              <p style={{ fontSize: 12, color: 'rgba(200,200,200,0.4)' }}>Cargando…</p>
            )}
            <p
              onClick={(e) => { e.stopPropagation(); playSound('click'); onProfile?.(); }}
              style={{
                fontSize: 10,
                color: 'rgba(180,134,20,0.6)',
                cursor: 'pointer',
                marginTop: 3,
                letterSpacing: 0.5,
              }}
            >
              EDITAR PERFIL ✎
            </p>
          </div>
        </motion.div>

        {/* ── Sección Amigos ── */}
        <Separator label="Amigos" />

        {onlineFriends.map((f) => (
          <ConnAvatar
            key={f.id}
            player={f}
            isFriend
            isOnline
            onClick={() => { playSound('click'); onViewProfile?.(f); }}
          />
        ))}
        {offlineFriends.map((f) => (
          <ConnAvatar
            key={f.id}
            player={{ ...f, userId: f.id }}
            isFriend
            isOnline={false}
            onClick={() => {
              playSound('click');
              onViewProfile?.({ userId: f.id, roomCode: null, username: f.username, avatar_url: f.avatar_url });
            }}
          />
        ))}
        {friends.length === 0 && (
          <span
            className="self-center"
            style={{ fontSize: 10, color: 'rgba(180,134,20,0.35)', whiteSpace: 'nowrap' }}
          >
            Sin amigos aún
          </span>
        )}

        {/* ── Sección En línea ── */}
        {otherOnline.length > 0 && (
          <>
            <Separator label="En línea" />
            {otherOnline.map((p) => (
              <ConnAvatar
                key={p.userId}
                player={p}
                isFriend={false}
                isOnline
                onClick={() => { playSound('click'); onViewProfile?.(p); }}
              />
            ))}
          </>
        )}

        {/* ── Botón Buscar ── */}
        <div className="flex flex-col items-center gap-1 shrink-0 self-center ml-1">
          <motion.button
            onClick={() => { playSound('click'); onOpenSearch?.(); }}
            whileHover={{ scale: 1.1, boxShadow: '0 0 14px rgba(180,134,20,0.3)' }}
            whileTap={{ scale: 0.92 }}
            transition={{ type: 'spring', stiffness: 420, damping: 18 }}
            style={{
              width: 60,
              height: 60,
              borderRadius: '50%',
              border: '2px dashed rgba(180,134,20,0.5)',
              background: 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'rgba(180,134,20,0.75)',
              fontSize: 28,
              cursor: 'pointer',
            }}
          >
            +
          </motion.button>
          <span style={{ fontSize: 11, color: 'rgba(180,134,20,0.5)', letterSpacing: 0.5 }}>
            Buscar
          </span>
        </div>
      </div>
    </motion.div>
  );
}

// ── Tarjeta de sala ────────────────────────────────────────────────────────────
function RoomCard({ room, onJoin }) {
  const slots = Array.from({ length: room.max_players || 4 }, (_, i) => i < room.player_count);

  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 16 },
        show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 280, damping: 22 } },
      }}
      whileHover={{
        borderColor: 'rgba(180,134,20,0.45)',
        background: 'rgba(180,134,20,0.04)',
        boxShadow: '0 0 22px rgba(180,134,20,0.14)',
        y: -2,
      }}
      whileTap={{ scale: 0.98 }}
      onClick={() => { playSound('click'); onJoin(room.room_code); }}
      className="flex flex-col gap-3 cursor-pointer rounded-2xl"
      style={{
        padding: 16,
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(180,134,20,0.15)',
      }}
    >
      {/* Código + modo */}
      <div className="flex items-center justify-between gap-2">
        <span
          className="font-mono font-black"
          style={{ fontSize: 16, letterSpacing: 2, color: '#FFD700', textShadow: '0 0 10px rgba(255,215,0,0.3)' }}
        >
          {room.room_code}
        </span>
        <span
          className="text-xs px-2 py-0.5 rounded-full"
          style={
            room.game_mode === 'blackjack'
              ? { background: 'rgba(37,99,235,0.15)', color: '#93C5FD', border: '1px solid rgba(37,99,235,0.25)' }
              : { background: 'rgba(180,134,20,0.13)', color: '#FDE68A', border: '1px solid rgba(180,134,20,0.25)' }
          }
        >
          {room.game_mode === 'blackjack' ? '🃏 Blackjack' : '🏇 Caballos'}
        </span>
      </div>

      {/* Estado + jugadores + slots */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs bg-green-900/40 text-green-300 border border-green-700/30 px-2 py-0.5 rounded-full">
            Esperando
          </span>
          <span className="text-gray-400 text-xs">
            {room.player_count}/{room.max_players} jugadores
          </span>
        </div>
        <div className="flex gap-1 shrink-0">
          {slots.map((occupied, i) => (
            <div
              key={i}
              style={{
                width: 22,
                height: 22,
                borderRadius: '50%',
                background: occupied ? 'rgba(180,134,20,0.28)' : 'rgba(255,255,255,0.07)',
                border: occupied
                  ? '1.5px solid rgba(180,134,20,0.5)'
                  : '1.5px dashed rgba(100,100,100,0.35)',
              }}
            />
          ))}
        </div>
      </div>

      {/* Botón unirse */}
      <motion.button
        onClick={(e) => { e.stopPropagation(); playSound('click'); onJoin(room.room_code); }}
        whileHover={{ background: 'rgba(180,134,20,0.12)', boxShadow: '0 0 16px rgba(180,134,20,0.2)' }}
        whileTap={{ scale: 0.96 }}
        className="w-full py-2 rounded-xl text-xs font-bold"
        style={{
          background: 'transparent',
          border: '1px solid rgba(180,134,20,0.35)',
          color: 'rgba(255,215,0,0.85)',
          fontFamily: "'Cinzel', serif",
          letterSpacing: 0.5,
        }}
      >
        Unirse a la sala
      </motion.button>
    </motion.div>
  );
}

// ── LobbyPage ──────────────────────────────────────────────────────────────────
export default function LobbyPage({
  onJoinRoom,
  onlinePlayers = [],
  onViewProfile,
  onOpenChat,
  onOpenSearch,
  onProfile,
}) {
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
      const res = await axios.post(
        `${API_URL}/api/rooms`,
        { gameMode },
        { headers: { Authorization: `Bearer ${token}` } }
      );
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
    <div className="min-h-screen pt-16" style={CASINO_BG}>

      {/* ── Barra de conexiones ── */}
      <ConnectionBar
        token={token}
        user={user}
        onlinePlayers={onlinePlayers}
        onViewProfile={onViewProfile}
        onOpenSearch={onOpenSearch}
        onProfile={onProfile}
      />

      {/* ── Contenido principal ── */}
      <div className="px-4 sm:px-6 py-5 max-w-screen-xl mx-auto">

        {/* Cabecera: título + acciones */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <motion.h2
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-white font-black"
            style={{
              fontSize: 18,
              letterSpacing: 1,
              fontFamily: "'Cinzel', serif",
              textShadow: '0 1px 10px rgba(0,0,0,0.5)',
            }}
          >
            Salas disponibles
          </motion.h2>

          <div className="flex items-center gap-2">
            <motion.button
              onClick={() => { playSound('click'); setShowModeModal(true); }}
              disabled={creating}
              whileHover={!creating ? { scale: 1.04, boxShadow: '0 0 24px rgba(212,168,53,0.5)' } : {}}
              whileTap={!creating ? { scale: 0.96 } : {}}
              transition={{ type: 'spring', stiffness: 400, damping: 18 }}
              className="disabled:opacity-50 font-bold py-2 px-4 rounded-xl text-sm"
              style={{
                background: 'linear-gradient(90deg, #8B6400, #C09020, #D4A835, #C09020, #8B6400)',
                color: '#000',
                boxShadow: '0 0 12px rgba(180,134,20,0.3)',
                fontFamily: "'Cinzel', serif",
              }}
            >
              {creating ? 'Creando…' : '+ Crear sala'}
            </motion.button>

            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && joinByCode()}
              maxLength={8}
              placeholder="Código"
              className="rounded-xl px-3 py-2 text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-yellow-600/40 transition"
              style={{
                background: 'rgba(0,0,0,0.45)',
                border: '1px solid rgba(255,255,255,0.12)',
                caretColor: '#FFD700',
                width: 110,
              }}
            />

            <motion.button
              onClick={() => { playSound('click'); joinByCode(); }}
              whileHover={{ scale: 1.05, boxShadow: '0 0 18px rgba(59,130,246,0.5)' }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 18 }}
              className="text-white font-bold px-4 py-2 rounded-xl text-sm"
              style={{
                background: 'linear-gradient(135deg, #1E3A8A, #2563EB)',
                boxShadow: '0 0 8px rgba(37,99,235,0.3)',
                fontFamily: "'Cinzel', serif",
              }}
            >
              Unirse
            </motion.button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-900/50 border border-red-500/40 text-red-300 rounded-xl px-4 py-3 mb-4 text-sm"
          >
            {error}
          </motion.div>
        )}

        {/* Grid de salas / estado vacío */}
        {loading ? (
          <div className="text-gray-400 text-center py-12">Cargando salas...</div>
        ) : rooms.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="flex flex-col items-center justify-center py-20 gap-4"
          >
            <span
              style={{ fontSize: 110, lineHeight: 1, filter: 'drop-shadow(0 0 24px rgba(180,134,20,0.4))' }}
            >
              🎰
            </span>
            <p
              className="text-gray-300 text-base"
              style={{ textShadow: '0 1px 8px rgba(0,0,0,0.6)' }}
            >
              No hay salas disponibles. ¡Crea una!
            </p>
          </motion.div>
        ) : (
          <motion.div
            className="grid gap-3"
            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}
            initial="hidden"
            animate="show"
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}
          >
            {rooms.map((room) => (
              <RoomCard key={room.id} room={room} onJoin={onJoinRoom} />
            ))}
          </motion.div>
        )}
      </div>

      {/* ── Modal modo de juego — sin cambios ── */}
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
                style={{
                  fontFamily: "'Cinzel', serif",
                  letterSpacing: 2,
                  textShadow: '0 0 20px rgba(255,215,0,0.3)',
                }}
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
    </div>
  );
}
