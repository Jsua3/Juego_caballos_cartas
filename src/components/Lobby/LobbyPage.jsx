import { useState, useEffect, useCallback } from 'react';
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
          <button
            onClick={() => { playSound('click'); setShowModeModal(true); }}
            disabled={creating}
            className="flex-1 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-black font-bold py-3 rounded-xl transition"
          >
            {creating ? 'Creando...' : '+ Crear nueva sala'}
          </button>
          <div className="flex flex-1 gap-2">
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              maxLength={8}
              placeholder="Código de sala"
              className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500"
            />
            <button
              onClick={() => { playSound('click'); joinByCode(); }}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 rounded-xl transition"
            >
              Unirse
            </button>
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
          <div className="text-center py-16">
            <div className="text-5xl mb-4">🎪</div>
            <p className="text-gray-400">No hay salas disponibles. ¡Crea una!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {rooms.map((room) => (
              <div
                key={room.id}
                className="bg-gray-900 border border-gray-700 hover:border-yellow-600/50 rounded-xl p-4 flex items-center justify-between transition cursor-pointer"
                onClick={() => { playSound('click'); onJoinRoom(room.room_code); }}
              >
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-bold text-yellow-400 text-lg">{room.room_code}</span>
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
                <button className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold px-4 py-2 rounded-lg text-sm transition">
                  Unirse
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Mode selector modal */}
      {showModeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <div className="bg-gray-900 border border-yellow-600/30 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-center text-yellow-400 font-bold text-lg mb-5"
              style={{ fontFamily: "'Cinzel', serif", letterSpacing: 2 }}>
              MODO DE JUEGO
            </h3>

            <div className="space-y-3 mb-6">
              {[
                { id: 'caballos', emoji: '🏇', label: 'Carrera de Caballos', desc: 'Apuesta al palo ganador' },
                { id: 'blackjack', emoji: '🃏', label: 'Blackjack', desc: 'Vence al dealer con 21' },
              ].map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => setSelectedMode(mode.id)}
                  className="w-full flex items-center gap-4 p-4 rounded-xl border transition"
                  style={{
                    background: selectedMode === mode.id ? 'rgba(255,215,0,0.08)' : 'rgba(255,255,255,0.03)',
                    border: `2px solid ${selectedMode === mode.id ? '#FFD700' : 'rgba(255,255,255,0.1)'}`,
                  }}
                >
                  <span className="text-3xl">{mode.emoji}</span>
                  <div className="text-left">
                    <p className="text-white font-bold text-sm">{mode.label}</p>
                    <p className="text-gray-400 text-xs">{mode.desc}</p>
                  </div>
                  {selectedMode === mode.id && (
                    <span className="ml-auto text-yellow-400 text-lg">✓</span>
                  )}
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowModeModal(false)}
                className="flex-1 py-2.5 rounded-xl text-gray-400 text-sm font-medium transition"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                Cancelar
              </button>
              <button
                onClick={() => { playSound('click'); createRoom(selectedMode); }}
                className="flex-1 py-2.5 rounded-xl font-bold text-black text-sm transition"
                style={{
                  background: 'linear-gradient(180deg, #C09020 0%, #8B6914 50%, #C09020 100%)',
                  border: '2px solid #FFD700',
                  fontFamily: "'Cinzel', serif",
                }}
              >
                CREAR SALA
              </button>
            </div>
          </div>
        </div>
      )}

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
