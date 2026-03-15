import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { useAuth, API_URL } from '../../context/AuthContext';
import AvatarCircle from './AvatarCircle';
import { playSound } from '../../utils/sound';

export default function ProfileModal({ onClose }) {
  const { user, token, updateUser } = useAuth();

  const [displayName, setDisplayName] = useState(user?.display_name || '');
  const [bio,         setBio]         = useState(user?.bio || '');
  const [saving,      setSaving]      = useState(false);
  const [uploading,   setUploading]   = useState(false);
  const [error,       setError]       = useState('');
  const [success,     setSuccess]     = useState('');
  const fileRef = useRef(null);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const res = await axios.put(
        `${API_URL}/api/users/me`,
        { display_name: displayName, bio },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      updateUser(res.data);
      setSuccess('¡Perfil actualizado!');
      setTimeout(() => setSuccess(''), 2500);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    setError('');
    const formData = new FormData();
    formData.append('avatar', file);
    try {
      const res = await axios.post(`${API_URL}/api/users/me/avatar`, formData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
      });
      updateUser({ avatar_url: res.data.avatar_url });
    } catch (err) {
      setError(err.response?.data?.error || 'Error al subir imagen');
    } finally {
      setUploading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.88, y: 24 }}
        animate={{ opacity: 1, scale: 1,    y: 0  }}
        exit={{    opacity: 0, scale: 0.88, y: 24 }}
        transition={{ type: 'spring', stiffness: 320, damping: 26 }}
        onClick={(e) => e.stopPropagation()}
        className="rounded-2xl p-6 w-full max-w-sm flex flex-col gap-4"
        style={{
          background: 'linear-gradient(180deg, #0d1f12 0%, #091508 100%)',
          border:     '1px solid rgba(180,134,20,0.3)',
          boxShadow:  '0 0 70px rgba(0,0,0,0.9), 0 0 30px rgba(180,134,20,0.08)',
        }}
      >
        {/* Título */}
        <h2
          className="text-center text-yellow-400 font-bold text-lg"
          style={{ fontFamily: "'Cinzel', serif", letterSpacing: 2, textShadow: '0 0 20px rgba(255,215,0,0.3)' }}
        >
          MI PERFIL
        </h2>

        {/* Avatar */}
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <AvatarCircle
              src={user?.avatar_url}
              username={user?.username}
              size={80}
              style={{ border: '3px solid rgba(180,134,20,0.5)', boxShadow: '0 0 20px rgba(180,134,20,0.2)' }}
            />
            {uploading && (
              <div className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center">
                <span className="text-xs text-yellow-400">...</span>
              </div>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          <motion.button
            onClick={() => { playSound('click'); fileRef.current?.click(); }}
            disabled={uploading}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            className="text-xs font-bold px-4 py-1.5 rounded-lg disabled:opacity-40"
            style={{
              background: 'rgba(180,134,20,0.15)',
              border:     '1px solid rgba(180,134,20,0.35)',
              color:      '#FFD700',
              fontFamily: "'Cinzel', serif",
            }}
          >
            {uploading ? 'Subiendo…' : 'Cambiar avatar'}
          </motion.button>
        </div>

        {/* Username (readonly) */}
        <div>
          <label className="text-gray-500 text-xs mb-1 block" style={{ fontFamily: "'Cinzel', serif", letterSpacing: 1 }}>
            USUARIO
          </label>
          <div
            className="px-3 py-2 rounded-xl text-gray-400 text-sm"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            {user?.username}
          </div>
        </div>

        {/* Display name */}
        <div>
          <label className="text-gray-500 text-xs mb-1 block" style={{ fontFamily: "'Cinzel', serif", letterSpacing: 1 }}>
            NOMBRE A MOSTRAR
          </label>
          <input
            type="text"
            maxLength={50}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder={user?.username}
            className="w-full px-3 py-2 rounded-xl text-white text-sm focus:outline-none transition"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border:     '1px solid rgba(184,134,11,0.3)',
              caretColor: '#FFD700',
            }}
            onFocus={(e) => (e.target.style.borderColor = 'rgba(184,134,11,0.6)')}
            onBlur={(e)  => (e.target.style.borderColor = 'rgba(184,134,11,0.3)')}
          />
        </div>

        {/* Bio */}
        <div>
          <label className="text-gray-500 text-xs mb-1 flex justify-between" style={{ fontFamily: "'Cinzel', serif", letterSpacing: 1 }}>
            <span>BIO</span>
            <span className="text-gray-600">{bio.length}/200</span>
          </label>
          <textarea
            maxLength={200}
            rows={3}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Cuéntanos sobre ti…"
            className="w-full px-3 py-2 rounded-xl text-white text-sm focus:outline-none resize-none transition"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border:     '1px solid rgba(184,134,11,0.3)',
              caretColor: '#FFD700',
            }}
            onFocus={(e) => (e.target.style.borderColor = 'rgba(184,134,11,0.6)')}
            onBlur={(e)  => (e.target.style.borderColor = 'rgba(184,134,11,0.3)')}
          />
        </div>

        {/* Feedback */}
        <AnimatePresence>
          {error && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-red-400 text-xs text-center">{error}</motion.p>
          )}
          {success && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-green-400 text-xs text-center">{success}</motion.p>
          )}
        </AnimatePresence>

        {/* Botones */}
        <div className="flex gap-3 mt-1">
          <motion.button
            onClick={() => { playSound('click'); onClose(); }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="flex-1 py-2.5 rounded-xl text-gray-400 text-sm font-medium"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            Cerrar
          </motion.button>
          <motion.button
            onClick={() => { playSound('click'); handleSave(); }}
            disabled={saving}
            whileHover={!saving ? { scale: 1.04, boxShadow: '0 0 28px rgba(212,168,53,0.5)' } : {}}
            whileTap={!saving ? { scale: 0.96 } : {}}
            transition={{ type: 'spring', stiffness: 380, damping: 18 }}
            className="flex-1 py-2.5 rounded-xl font-bold text-black text-sm disabled:opacity-50"
            style={{
              background: 'linear-gradient(90deg, #8B6400, #C09020, #D4A835, #C09020, #8B6400)',
              fontFamily: "'Cinzel', serif",
              boxShadow:  '0 0 14px rgba(180,134,20,0.3)',
            }}
          >
            {saving ? 'Guardando…' : 'GUARDAR'}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}
