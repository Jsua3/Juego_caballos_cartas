import { useEffect, useRef } from 'react';

const SUIT_SYMBOLS = {
  hearts:   { symbol: '♥', color: '#DC2626' },
  diamonds: { symbol: '♦', color: '#DC2626' },
  clubs:    { symbol: '♣', color: '#1F2937' },
  spades:   { symbol: '♠', color: '#1F2937' },
};

export default function BlackjackCard({ card, faceDown = false, small = false, animate = false }) {
  const ref = useRef(null);

  useEffect(() => {
    if (animate && ref.current) {
      ref.current.style.transform = 'translateY(-20px)';
      ref.current.style.opacity = '0';
      requestAnimationFrame(() => {
        ref.current.style.transition = 'transform 0.25s ease-out, opacity 0.25s ease-out';
        ref.current.style.transform = 'translateY(0)';
        ref.current.style.opacity = '1';
      });
    }
  }, [animate]);

  const w = small ? 44 : 64;
  const h = small ? 62 : 90;

  if (faceDown) {
    return (
      <div
        ref={ref}
        style={{
          width: w, height: h,
          borderRadius: 6,
          background: 'repeating-linear-gradient(45deg, #7B1F1F, #7B1F1F 4px, #9B2C2C 4px, #9B2C2C 8px)',
          border: '2px solid #B7950B',
          boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
          flexShrink: 0,
        }}
      />
    );
  }

  if (!card) return null;

  const { symbol, color } = SUIT_SYMBOLS[card.suit] || { symbol: '?', color: '#999' };
  const fontSize = small ? 11 : 13;
  const centerSize = small ? 18 : 24;

  return (
    <div
      ref={ref}
      style={{
        width: w, height: h,
        borderRadius: 6,
        background: '#FFFEF5',
        border: '1.5px solid #E5E0D0',
        boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '3px 4px',
        flexShrink: 0,
        userSelect: 'none',
      }}
    >
      {/* Top-left */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1 }}>
        <span style={{ fontSize, fontWeight: 'bold', color, fontFamily: 'serif' }}>{card.rank}</span>
        <span style={{ fontSize: fontSize - 2, color }}>{symbol}</span>
      </div>
      {/* Center */}
      <div style={{ textAlign: 'center', color, fontSize: centerSize, lineHeight: 1 }}>{symbol}</div>
      {/* Bottom-right (rotated) */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', transform: 'rotate(180deg)', lineHeight: 1 }}>
        <span style={{ fontSize, fontWeight: 'bold', color, fontFamily: 'serif' }}>{card.rank}</span>
        <span style={{ fontSize: fontSize - 2, color }}>{symbol}</span>
      </div>
    </div>
  );
}
