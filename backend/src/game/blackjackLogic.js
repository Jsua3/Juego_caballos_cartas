const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const NUM_DECKS = 6;

function createShoe() {
  const shoe = [];
  for (let d = 0; d < NUM_DECKS; d++) {
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        shoe.push({ suit, rank });
      }
    }
  }
  // Fisher-Yates shuffle
  for (let i = shoe.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shoe[i], shoe[j]] = [shoe[j], shoe[i]];
  }
  return shoe;
}

function needsReshuffle(shoe) {
  // Reshuffle when less than 25% remains (< 78 of 312)
  return shoe.length < NUM_DECKS * 52 * 0.25;
}

function cardValue(rank) {
  if (['J', 'Q', 'K'].includes(rank)) return 10;
  if (rank === 'A') return 11;
  return parseInt(rank, 10);
}

function handValue(cards) {
  let sum = 0;
  let aces = 0;
  for (const card of cards) {
    sum += cardValue(card.rank);
    if (card.rank === 'A') aces++;
  }
  while (sum > 21 && aces > 0) {
    sum -= 10;
    aces--;
  }
  return sum;
}

function isBust(cards) {
  return handValue(cards) > 21;
}

function isBlackjack(cards) {
  return cards.length === 2 && handValue(cards) === 21;
}

function getAvailableActions(hand, playerPoints) {
  const val = handValue(hand.cards);
  if (val >= 21) return ['stand'];

  const actions = ['hit', 'stand'];
  if (hand.cards.length === 2 && !hand.isSplit) {
    if (playerPoints >= hand.bet) actions.push('double');
    if (
      cardValue(hand.cards[0].rank) === cardValue(hand.cards[1].rank) &&
      playerPoints >= hand.bet
    ) {
      actions.push('split');
    }
  }
  return actions;
}

module.exports = {
  createShoe,
  needsReshuffle,
  cardValue,
  handValue,
  isBust,
  isBlackjack,
  getAvailableActions,
};
