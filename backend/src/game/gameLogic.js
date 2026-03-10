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
 * Deal the 4 track cards (one per suit) face-down.
 * Returns { trackCards, remainingDeck }
 * trackCards[i] = the suit that will penalise at position i (1-indexed, 4 cards total)
 */
function dealTrackCards(deck) {
  // Take 4 cards (one of each suit) from the shuffled deck for the track
  const trackCards = [];
  const used = new Set();
  const remainingDeck = [];

  for (const card of deck) {
    if (!used.has(card.suit) && trackCards.length < 4) {
      used.add(card.suit);
      trackCards.push(card.suit); // penalises this suit
    } else {
      remainingDeck.push(card);
    }
  }
  return { trackCards, remainingDeck };
}

/**
 * Given current positions (map suit→position) and a drawn card suit,
 * advance that suit by 1 and check for track penalty.
 *
 * trackCards[i] = suit penalised when any horse reaches position (i+1).
 * A penalised horse steps BACK 1 from its current position (minimum 0).
 *
 * Returns { newPositions, penaltySuit | null }
 */
function processCardDraw(positions, drawnSuit, trackCards) {
  const newPositions = { ...positions };

  // Advance drawn suit
  newPositions[drawnSuit] = (newPositions[drawnSuit] || 0) + 1;

  // Check if this advance triggers a track penalty (only for non-drawn suits)
  // Track card at index i triggers when ANY horse reaches position (i+1)
  let penaltySuit = null;
  for (let i = 0; i < trackCards.length; i++) {
    const triggerPos = i + 1; // positions 1,2,3,4
    const penalisedSuit = trackCards[i];
    // Trigger when drawnSuit just reached triggerPos AND penalisedSuit != drawnSuit
    if (
      newPositions[drawnSuit] === triggerPos &&
      penalisedSuit !== drawnSuit &&
      newPositions[penalisedSuit] > 0
    ) {
      newPositions[penalisedSuit] = Math.max(0, newPositions[penalisedSuit] - 1);
      penaltySuit = penalisedSuit;
      break; // only one penalty per draw
    }
  }

  return { newPositions, penaltySuit };
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
