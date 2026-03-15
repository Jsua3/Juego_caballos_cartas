import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { playSound } from '../../utils/sound';
import AvatarCircle from '../Shared/AvatarCircle';
import DirectChat from './DirectChat';

export default function FloatingChat({ friend, onClose, roomCode }) {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const dragging = useRef(false);
  const offset = useRef({ x: 0, y: 0 });

  // ── Drag handlers ───────────────────────────────────────────────────────────
  const clamp = (val, min, max) => Math.max(min, Math.min(max, val));

  const startDrag = (clientX, clientY) => {
    dragging.current = true;
    offset.current = { x: clientX - pos.x, y: clientY - pos.y };
  };

  const moveDrag = (clientX, clientY) => {
    if (!dragging.current) return;
    const W = 350;
    const H = 450;
    const maxX = window.innerWidth  - W - 20;
    const maxY = window.innerHeight - H - 20;
    setPos({
      x: clamp(clientX - offset.current.x, -(window.innerWidth  - W - 20), maxX),
      y: clamp(clientY - offset.current.y, -(window.innerHeight - H - 20), maxY),
    });
  };

  const stopDrag = () => { dragging.current = false; };

  // Mouse
  const onMouseDown = (e) => { e.preventDefault(); startDrag(e.clientX, e.clientY); };
  useEffect(() => {
    const onMove = (e) => moveDrag(e.clientX, e.clientY);
    const onUp   = () => stopDrag();
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup',   onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup',   onUp);
    };
  });

  // Touch
  const onTouchStart = (e) => {
    const t = e.touches[0];
    startDrag(t.clientX, t.clientY);
  };
  useEffect(() => {
    const onMove = (e) => { const t = e.touches[0]; moveDrag(t.clientX, t.clientY); };
    const onEnd  = () => stopDrag();
    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('touchend',  onEnd);
    return () => {
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend',  onEnd);
    };
  });

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 30 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 30 }}
      transition={{ type: 'spring', stiffness: 340, damping: 28 }}
      style={{
        position: 'fixed',
        bottom: 20,
        right: 20,
        width: 350,
        height: 450,
        zIndex: 55,
        transform: `translate(${pos.x}px, ${pos.y}px)`,
        display: 'flex',
        flexDirection: 'column',
        background: 'linear-gradient(180deg, #0d1f12 0%, #091508 100%)',
        border: '1px solid rgba(180,134,20,0.3)',
        borderRadius: 14,
        boxShadow: '0 8px 40px rgba(0,0,0,0.7), 0 0 20px rgba(180,134,20,0.08)',
        overflow: 'hidden',
      }}
    >
      {/* Header (zona de arrastre) */}
      <div
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 14px',
          background: 'linear-gradient(135deg, #0d1f12, #0a1508)',
          borderBottom: '1px solid rgba(180,134,20,0.2)',
          borderRadius: '14px 14px 0 0',
          cursor: dragging.current ? 'grabbing' : 'grab',
          userSelect: 'none',
          flexShrink: 0,
        }}
      >
        <AvatarCircle src={friend.avatar_url} username={friend.username} size={28} />
        <span
          style={{
            flex: 1,
            color: '#fff',
            fontSize: 13,
            fontWeight: 600,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {friend.display_name || friend.username}
        </span>
        <button
          onMouseDown={(e) => e.stopPropagation()}
          onClick={() => { playSound('click'); onClose(); }}
          style={{
            background: 'none',
            border: 'none',
            color: '#9CA3AF',
            fontSize: 16,
            cursor: 'pointer',
            lineHeight: 1,
            padding: '2px 4px',
          }}
        >
          ✕
        </button>
      </div>

      {/* Cuerpo: DirectChat sin su propio header */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <DirectChat
          friend={friend}
          onBack={onClose}
          roomCode={roomCode}
          hideHeader
        />
      </div>
    </motion.div>
  );
}
