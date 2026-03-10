export default function RoomCard({ room, onClick }) {
  return (
    <div
      onClick={onClick}
      className="bg-gray-900 border border-gray-700 hover:border-yellow-600/50 rounded-xl p-4 flex items-center justify-between transition cursor-pointer"
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
  );
}
