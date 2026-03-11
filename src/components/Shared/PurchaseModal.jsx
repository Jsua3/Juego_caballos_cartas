import { useState } from 'react';
import axios from 'axios';
import { useAuth, API_URL } from '../../context/AuthContext';

export default function PurchaseModal({ onClose }) {
  const { token, updatePoints } = useAuth();
  const [tab, setTab] = useState('redeem'); // 'redeem' | 'request'
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const handleRedeem = async () => {
    if (!code.trim()) return setError('Ingresa un código');
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await axios.post(
        `${API_URL}/api/purchases/redeem`,
        { code: code.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      updatePoints(res.data.totalPoints);
      setSuccess(`✅ ¡Canjeaste ${res.data.pointsAdded} puntos! Total: ${res.data.totalPoints.toLocaleString()} pts`);
      setCode('');
    } catch (err) {
      setError(err.response?.data?.error || 'Error al canjear código');
    } finally {
      setLoading(false);
    }
  };

  const handleRequest = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await axios.post(
        `${API_URL}/api/purchases`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuccess(res.data.message);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al registrar solicitud');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-gray-900 border border-yellow-600/40 rounded-2xl p-8 w-full max-w-sm shadow-2xl">
        <div className="text-center mb-5">
          <div className="text-4xl mb-2">💰</div>
          <h2 className="text-2xl font-bold text-yellow-400">Obtener Puntos</h2>
        </div>

        {/* Tabs */}
        <div className="flex rounded-xl overflow-hidden border border-gray-700 mb-6">
          <button
            onClick={() => { setTab('redeem'); setError(''); setSuccess(''); }}
            className="flex-1 py-2 text-sm font-bold transition"
            style={{
              background: tab === 'redeem' ? 'rgba(255,215,0,0.15)' : 'transparent',
              color: tab === 'redeem' ? '#FFD700' : '#6B7280',
              borderRight: '1px solid #374151',
            }}
          >
            🎟️ Canjear código
          </button>
          <button
            onClick={() => { setTab('request'); setError(''); setSuccess(''); }}
            className="flex-1 py-2 text-sm font-bold transition"
            style={{
              background: tab === 'request' ? 'rgba(255,215,0,0.15)' : 'transparent',
              color: tab === 'request' ? '#FFD700' : '#6B7280',
            }}
          >
            💳 Comprar
          </button>
        </div>

        {error && <div className="text-red-400 text-sm mb-4 text-center">{error}</div>}
        {success && <div className="text-green-400 text-sm mb-4 text-center">{success}</div>}

        {tab === 'redeem' ? (
          <>
            <p className="text-gray-400 text-sm mb-3 text-center">
              Ingresa el código que recibiste para acreditar tus puntos
            </p>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="XXXXX-XXXXX"
              maxLength={11}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-center font-mono text-lg tracking-widest focus:outline-none focus:border-yellow-500 mb-4"
            />
            <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-gray-400 text-sm transition"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                Cancelar
              </button>
              <button
                onClick={handleRedeem}
                disabled={loading || !code.trim()}
                className="flex-1 py-2.5 rounded-xl font-bold text-black transition disabled:opacity-40"
                style={{ background: 'linear-gradient(180deg,#C09020,#8B6914,#C09020)', border: '2px solid #FFD700' }}
              >
                {loading ? 'Canjeando...' : 'Canjear'}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-4 text-center">
              <div className="text-yellow-300 text-3xl font-bold">1.000 pts</div>
              <div className="text-gray-400 text-sm mt-1">por $10.000 COP</div>
            </div>
            <p className="text-gray-400 text-xs mb-5 text-center">
              Registra tu solicitud y realiza el pago. Te enviaremos un código de canje una vez confirmado.
            </p>
            <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-gray-400 text-sm transition"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                Cancelar
              </button>
              <button
                onClick={handleRequest}
                disabled={loading}
                className="flex-1 py-2.5 rounded-xl font-bold text-white transition disabled:opacity-40"
                style={{ background: '#16A34A', border: '1px solid #15803D' }}
              >
                {loading ? 'Enviando...' : 'Solicitar'}
              </button>
            </div>
          </>
        )}

        {success && (
          <button onClick={onClose} className="w-full mt-3 py-2 rounded-xl text-yellow-400 text-sm font-bold transition"
            style={{ background: 'rgba(255,215,0,0.08)', border: '1px solid rgba(255,215,0,0.2)' }}>
            Cerrar
          </button>
        )}
      </div>
    </div>
  );
}
