import { QRCodeSVG } from 'qrcode.react';

export default function RoomCodeQR({ roomCode, onClose }) {
  const joinUrl =
    window.location.origin +
    window.location.pathname +
    '?room=' +
    roomCode;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm px-4"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 border border-yellow-600/30 rounded-2xl p-6 w-full max-w-xs shadow-2xl flex flex-col items-center gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <p
          className="text-yellow-400 font-bold text-sm tracking-widest"
          style={{ fontFamily: "'Cinzel', serif" }}
        >
          CÓDIGO DE SALA
        </p>

        <div className="bg-white p-3 rounded-xl">
          <QRCodeSVG value={joinUrl} size={180} />
        </div>

        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl px-6 py-2">
          <span className="font-mono font-black text-yellow-400 text-3xl tracking-widest">
            {roomCode}
          </span>
        </div>

        <p className="text-gray-500 text-xs text-center">
          Comparte el código o escanea el QR para unirte
        </p>

        <button
          onClick={onClose}
          className="mt-1 w-full py-2.5 rounded-xl text-gray-400 text-sm font-medium transition"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}
