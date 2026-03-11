// Pure game logic — no I/O, no DB, no sockets

const SUITS = ['oros', 'copas', 'espadas', 'bastos'];
const COPIES_PER_SUIT = 9; // 9 × 4 = 36 cards
const TRACK_LENGTH = 7;

function createDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (let i = 0; i < COPIES_PER_SUIT; i++) {
      deck.push({ suit, id: `${suit}-${i}` });
    }
  }
  return deck;
}

function shuffleDeck(deck) {
  const s = [...deck];
  for (let i = s.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [s[i], s[j]] = [s[j], s[i]];
  }
  return s;
}

/**
 * Deal TRACK_LENGTH (7) penalty cards face-down, one per column.
 * Suits can repeat. Cards are taken from the top of the shuffled deck.
 * Returns { trackCards, remainingDeck }
 * trackCards[i] = the suit that will penalise at column i+1
 */
function dealTrackCards(deck) {
  const trackCards = deck.slice(0, TRACK_LENGTH).map((c) => c.suit);
  const remainingDeck = deck.slice(TRACK_LENGTH);
  return { trackCards, remainingDeck };
}

/**
 * Advance drawnSuit by 1 and check if the SLOWEST horse just crossed
 * the next penalty threshold (same rule as the real card game).
 *
 * trackCards[i] = suit penalised when ALL horses have passed column i+1,
 * i.e. when min(positions) > i  (after the advance).
 *
 * revealedCount = how many penalty cards have already been revealed this race.
 *
 * Returns { newPositions, penaltySuit | null, revealedCount }
 */
function processCardDraw(positions, drawnSuit, trackCards, revealedCount) {
  const newPositions = { ...positions };

  // Advance drawn suit
  newPositions[drawnSuit] = (newPositions[drawnSuit] || 0) + 1;

  let penaltySuit = null;
  let newRevealedCount = revealedCount;

  // Reveal next card when the SLOWEST horse clears the threshold
  const minPos = Math.min(...SUITS.map((s) => newPositions[s] || 0));
  if (newRevealedCount < trackCards.length && minPos > newRevealedCount) {
    const penalisedSuit = trackCards[newRevealedCount];
    newRevealedCount++;
    if (newPositions[penalisedSuit] > 0) {
      newPositions[penalisedSuit] = Math.max(0, newPositions[penalisedSuit] - 1);
      penaltySuit = penalisedSuit;
    }
  }

  return { newPositions, penaltySuit, revealedCount: newRevealedCount };
}

/**
 * Check if any suit has reached TRACK_LENGTH (finish line).
 * Returns winning suit string or null.
 */
function checkWinner(positions) {
  for (const suit of SUITS) {
    if ((positions[suit] || 0) >= TRACK_LENGTH) return suit;
  }
  return null;
}

module.exports = {
  SUITS,
  TRACK_LENGTH,
  createDeck,
  shuffleDeck,
  dealTrackCards,
  processCardDraw,
  checkWinner,
};
