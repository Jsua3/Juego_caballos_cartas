import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth, API_URL } from '../../context/AuthContext';

export default function LobbyPage({ onJoinRoom }) {
  const { token } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');

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

  const createRoom = async () => {
    setCreating(true);
    setError('');
    try {
      const res = await axios.post(`${API_URL}/api/rooms`, {}, {
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
    <div className="min-h-screen bg-gray-950 pt-16 px-4 pb-8">
      <div className="max-w-2xl mx-auto">
        <h2 className="text-2xl font-bold text-yellow-400 mb-6 mt-4">Salas disponibles</h2>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <button
            onClick={createRoom}
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
              onClick={joinByCode}
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
                onClick={() => onJoinRoom(room.room_code)}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-yellow-400 text-lg">{room.room_code}</span>
                    <span className="text-xs bg-green-900/40 text-green-400 border border-green-700/40 px-2 py-0.5 rounded-full">
                      Esperando
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
    </div>
  );
}
