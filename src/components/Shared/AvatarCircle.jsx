import { useState } from 'react';
import { API_URL } from '../../context/AuthContext';

export default function AvatarCircle({ src, username, size = 28, style, className }) {
  const [imgError, setImgError] = useState(false);
  // Las rutas /uploads/... vienen del backend, no del servidor React
  const imgSrc = src && src.startsWith('/uploads/') ? `${API_URL}${src}` : src;

  const base = {
    width: size, height: size, borderRadius: '50%', flexShrink: 0,
    ...style,
  };

  if (imgSrc && !imgError) {
    return (
      <img
        src={imgSrc}
        alt={username}
        onError={() => setImgError(true)}
        className={className}
        style={{ ...base, objectFit: 'cover' }}
      />
    );
  }

  return (
    <div
      className={className}
      style={{
        ...base,
        background:     'rgba(184,134,11,0.25)',
        border:         '1.5px solid rgba(184,134,11,0.45)',
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        color:          '#FFD700',
        fontWeight:     'bold',
        fontSize:       Math.round(size * 0.42),
        userSelect:     'none',
      }}
    >
      {(username || '?').charAt(0).toUpperCase()}
    </div>
  );
}
