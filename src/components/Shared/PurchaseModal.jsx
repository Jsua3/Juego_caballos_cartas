import { useState } from 'react';
import axios from 'axios';
import { useAuth, API_URL } from '../../context/AuthContext';

export default function PurchaseModal({ onClose }) {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const requestPurchase = async () => {
    setLoading(true);
    setError('');
    try {
      await axios.post(
        `${API_URL}/api/purchases`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setDone(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al procesar solicitud');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-gray-900 border border-yellow-600/40 rounded-2xl p-8 w-full max-w-sm shadow-2xl text-center">
        <div className="text-5xl mb-4">💰</div>
        <h2 className="text-2xl font-bold text-yellow-400 mb-2">Comprar Puntos</h2>

        {!done ? (
          <>
            <p className="text-gray-300 mb-1">Paquete disponible:</p>
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 my-4">
              <div className="text-yellow-300 text-3xl font-bold">1.000 pts</div>
              <div className="text-gray-400 text-sm mt-1">por $10.000 COP</div>
            </div>
            <p className="text-gray-400 text-xs mb-6">
              Al confirmar, registramos tu solicitud. Un administrador verificará el pago y acreditará los puntos.
            </p>

            {error && (
              <div className="text-red-400 text-sm mb-4">{error}</div>
            )}

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium py-2.5 rounded-lg transition"
              >
                Cancelar
              </button>
              <button
                onClick={requestPurchase}
                disabled={loading}
                className="flex-1 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-bold py-2.5 rounded-lg transition"
              >
                {loading ? 'Enviando...' : 'Solicitar'}
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-green-400 text-lg font-semibold mb-2">¡Solicitud enviada!</p>
            <p className="text-gray-400 text-sm mb-6">
              Tu solicitud fue registrada. Los puntos serán acreditados tras verificar el pago.
            </p>
            <button
              onClick={onClose}
              className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-2.5 rounded-lg transition"
            >
              Cerrar
            </button>
          </>
        )}
      </div>
    </div>
  );
}
