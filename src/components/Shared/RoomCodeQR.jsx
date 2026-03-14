import { motion } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';

export default function RoomCodeQR({ roomCode, onClose }) {
  const joinUrl =
    window.location.origin +
    window.location.pathname +
    '?room=' +
    roomCode;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.85, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.85, y: 20 }}
        transition={{ type: 'spring', stiffness: 320, damping: 26 }}
        onClick={(e) => e.stopPropagation()}
        className="flex flex-col items-center gap-5 rounded-2xl p-7 w-full max-w-xs"
        style={{
          background: 'linear-gradient(160deg, #0D0D0D, #111)',
          border: '1px solid rgba(255,215,0,0.2)',
          boxShadow: '0 0 80px rgba(0,0,0,0.9), 0 0 40px rgba(255,215,0,0.07)',
        }}
      >
        <p
          className="text-yellow-400 font-bold text-sm tracking-widest"
          style={{ fontFamily: "'Cinzel', serif", textShadow: '0 0 18px rgba(255,215,0,0.4)' }}
        >
          CÓDIGO DE SALA
        </p>

        {/* QR */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 260, damping: 22 }}
          className="p-3 rounded-xl"
          style={{
            background: '#fff',
            boxShadow: '0 0 30px rgba(255,215,0,0.2)',
          }}
        >
          <QRCodeSVG value={joinUrl} size={180} />
        </motion.div>

        {/* Code */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-xl px-6 py-2.5"
          style={{
            background: 'rgba(255,215,0,0.07)',
            border: '1px solid rgba(255,215,0,0.25)',
            boxShadow: '0 0 20px rgba(255,215,0,0.1)',
          }}
        >
          <span className="font-mono font-black text-yellow-400 text-3xl tracking-widest"
            style={{ textShadow: '0 0 14px rgba(255,215,0,0.4)' }}>
            {roomCode}
          </span>
        </motion.div>

        <p className="text-gray-500 text-xs text-center leading-relaxed">
          Escanea el QR o ingresa el código<br />para unirte a la partida
        </p>

        <motion.button
          onClick={onClose}
          whileHover={{ scale: 1.04, boxShadow: '0 0 16px rgba(255,255,255,0.08)' }}
          whileTap={{ scale: 0.96 }}
          transition={{ type: 'spring', stiffness: 400, damping: 18 }}
          className="w-full py-2.5 rounded-xl text-gray-400 text-sm font-medium"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          Cerrar
        </motion.button>
      </motion.div>
    </motion.div>
  );
}
