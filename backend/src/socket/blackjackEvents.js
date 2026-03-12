const pool = require('../db');
const {
  createShoe,
  needsReshuffle,
  handValue,
  isBust,
  isBlackjack,
  getAvailableActions,
} = require('../game/blackjackLogic');

// Module-level rooms reference set by registerBlackjackEvents
let _rooms = null;

function dealCard(room) {
  if (room.bj.shoe.length < 10) {
    room.bj.shoe = createShoe();
  }
  return room.bj.shoe.shift();
}

function initBjState(room, existingShoe) {
  const shoe =
    existingShoe && !needsReshuffle(existingShoe) ? existingShoe : createShoe();
  return {
    shoe,
    phase: 'betting',
    dealing: false,
    bettingTimer: null,
    playerOrder: room.players.map((p) => p.userId),
    playerStates: {},
    betsPlaced: {},
    dealer: { cards: [], hiddenCard: null },
    currentPlayerIdx: 0,
    currentHandIdx: 0,
  };
}

// ── startDeal ────────────────────────────────────────────────────────────────
async function startDeal(io, room) {
  const bj = room.bj;
  if (!bj || bj.dealing) return;
  bj.dealing = true;
  if (bj.bettingTimer) {
    clearTimeout(bj.bettingTimer);
    bj.bettingTimer = null;
  }

  // Auto-assign minimum bet for players who didn't bet
  for (const userId of bj.playerOrder) {
    if (!bj.betsPlaced[userId]) {
      const player = room.players.find((p) => p.userId === userId);
      if (player && player.points >= 50) {
        bj.betsPlaced[userId] = 50;
      }
    }
  }

  const activePlayers = bj.playerOrder.filter((uid) => bj.betsPlaced[uid]);
  if (activePlayers.length === 0) {
    room.status = 'waiting';
    return;
  }

  // Deduct bets and set up hands (skip players who disconnected after betting)
  const dealPlayers = activePlayers.filter((uid) =>
    room.players.some((p) => p.userId === uid)
  );
  if (dealPlayers.length === 0) { room.status = 'waiting'; return; }

  for (const userId of dealPlayers) {
    const amount = bj.betsPlaced[userId];
    const player = room.players.find((p) => p.userId === userId);
    player.points -= amount;

    try {
      await pool.query('UPDATE users SET points = ? WHERE id = ?', [player.points, userId]);
      await pool.query(
        `INSERT INTO transactions (user_id, type, amount, description) VALUES (?, 'bet', ?, ?)`,
        [userId, -amount, `BJ bet in room ${room.roomCode}`]
      );
    } catch (err) {
      console.error('DB error BJ bet', err);
    }

    bj.playerStates[userId] = {
      username: player.username,
      points: player.points,
      hands: [
        { cards: [], bet: amount, doubled: false, isSplit: false, done: false, outcome: null, payout: 0 },
      ],
    };
  }

  // Deal 2 cards to each player + 2 to dealer (standard order)
  for (const uid of dealPlayers) bj.playerStates[uid].hands[0].cards.push(dealCard(room));
  const dealerVisible = dealCard(room);
  for (const uid of dealPlayers) bj.playerStates[uid].hands[0].cards.push(dealCard(room));
  const dealerHidden = dealCard(room);

  bj.dealer.cards = [dealerVisible];
  bj.dealer.hiddenCard = dealerHidden;

  // Check natural blackjacks
  const dealerAllCards = [dealerVisible, dealerHidden];
  const dealerBJ = isBlackjack(dealerAllCards);

  if (dealerBJ) {
    bj.dealer.cards = dealerAllCards;
    bj.dealer.hiddenCard = null;
  }

  for (const uid of dealPlayers) {
    const hand = bj.playerStates[uid].hands[0];
    if (isBlackjack(hand.cards)) {
      hand.outcome = dealerBJ ? 'push' : 'blackjack';
      hand.done = true;
    } else if (dealerBJ) {
      hand.outcome = 'lose';
      hand.done = true;
    }
  }

  bj.phase = 'playing';

  const dealPayload = {
    players: dealPlayers.map((uid) => ({
      userId: uid,
      username: bj.playerStates[uid].username,
      hands: bj.playerStates[uid].hands,
      points: bj.playerStates[uid].points,
    })),
    dealer: { visibleCard: dealerVisible, cardCount: 2 },
    dealerHasBJ: dealerBJ,
  };

  io.to(room.roomCode).emit('bj_deal', dealPayload);

  if (dealerBJ) {
    setTimeout(() => resolveRound(io, room), 1500);
    return;
  }

  const allDone = dealPlayers.every((uid) =>
    bj.playerStates[uid].hands.every((h) => h.done)
  );
  if (allDone) {
    setTimeout(() => startDealerTurn(io, room), 1000);
    return;
  }

  bj.currentPlayerIdx = 0;
  bj.currentHandIdx = 0;
  advanceTurn(io, room);
}

// ── advanceTurn ───────────────────────────────────────────────────────────────
function advanceTurn(io, room) {
  const bj = room.bj;
  const activePlayers = bj.playerOrder.filter(
    (uid) => bj.playerStates[uid]?.hands?.length > 0
  );

  while (bj.currentPlayerIdx < activePlayers.length) {
    const userId = activePlayers[bj.currentPlayerIdx];
    const playerState = bj.playerStates[userId];

    if (!playerState) {
      bj.currentPlayerIdx++;
      bj.currentHandIdx = 0;
      continue;
    }

    // Auto-stand disconnected players
    const isConnected = room.players.some((p) => p.userId === userId);

    while (bj.currentHandIdx < playerState.hands.length) {
      const hand = playerState.hands[bj.currentHandIdx];
      if (!hand.done) {
        if (!isConnected) {
          hand.done = true;
          bj.currentHandIdx++;
          continue;
        }
        const player = room.players.find((p) => p.userId === userId);
        const actions = getAvailableActions(hand, player?.points ?? 0);
        io.to(room.roomCode).emit('bj_your_turn', {
          userId,
          handIndex: bj.currentHandIdx,
          availableActions: actions,
          hand,
        });
        return;
      }
      bj.currentHandIdx++;
    }

    bj.currentPlayerIdx++;
    bj.currentHandIdx = 0;
  }

  startDealerTurn(io, room);
}

// ── startDealerTurn ───────────────────────────────────────────────────────────
function startDealerTurn(io, room) {
  const bj = room.bj;
  bj.phase = 'dealer_turn';

  // Reveal hidden card
  if (bj.dealer.hiddenCard) {
    bj.dealer.cards = [...bj.dealer.cards, bj.dealer.hiddenCard];
    bj.dealer.hiddenCard = null;
  }

  const dealerVal = handValue(bj.dealer.cards);
  io.to(room.roomCode).emit('bj_dealer_reveal', {
    dealer: { cards: bj.dealer.cards, value: dealerVal },
  });

  function dealerDraw() {
    const val = handValue(bj.dealer.cards);
    if (val < 17) {
      const card = dealCard(room);
      bj.dealer.cards.push(card);
      const newVal = handValue(bj.dealer.cards);
      io.to(room.roomCode).emit('bj_dealer_card', {
        card,
        value: newVal,
        cards: bj.dealer.cards,
      });
      setTimeout(dealerDraw, 600);
    } else {
      setTimeout(() => resolveRound(io, room), 600);
    }
  }

  setTimeout(dealerDraw, 800);
}

// ── resolveRound ──────────────────────────────────────────────────────────────
async function resolveRound(io, room) {
  const bj = room.bj;
  bj.phase = 'results';

  const dealerVal = handValue(bj.dealer.cards);
  const dealerBust = isBust(bj.dealer.cards);
  const activePlayers = bj.playerOrder.filter(
    (uid) => bj.playerStates[uid]?.hands?.length > 0
  );
  const results = [];

  for (const userId of activePlayers) {
    const playerState = bj.playerStates[userId];
    const player = room.players.find((p) => p.userId === userId);
    let totalPayout = 0;

    for (const hand of playerState.hands) {
      let outcome = hand.outcome;
      let payout = 0;

      if (!outcome) {
        const playerVal = handValue(hand.cards);
        if (isBust(hand.cards)) {
          outcome = 'bust';
          payout = 0;
        } else if (dealerBust) {
          outcome = 'win';
          payout = hand.bet;
        } else if (playerVal > dealerVal) {
          outcome = 'win';
          payout = hand.bet;
        } else if (playerVal === dealerVal) {
          outcome = 'push';
          payout = hand.bet;
        } else {
          outcome = 'lose';
          payout = 0;
        }
      } else {
        if (outcome === 'blackjack') {
          payout = hand.bet + Math.floor(hand.bet * 1.5);
        } else if (outcome === 'push') {
          payout = hand.bet;
        } else {
          payout = 0;
        }
      }

      hand.outcome = outcome;
      hand.payout = payout;
      totalPayout += payout;
    }

    const newPoints = playerState.points + totalPayout;
    playerState.points = newPoints;
    if (player) player.points = newPoints;

    try {
      await pool.query('UPDATE users SET points = ? WHERE id = ?', [newPoints, userId]);
      if (totalPayout > 0) {
        await pool.query(
          `INSERT INTO transactions (user_id, type, amount, description) VALUES (?, 'win', ?, ?)`,
          [userId, totalPayout, `BJ payout in room ${room.roomCode}`]
        );
      }
    } catch (err) {
      console.error('DB error BJ resolve', err);
    }

    results.push({
      userId,
      username: playerState.username,
      hands: playerState.hands.map((h) => ({
        cards: h.cards,
        value: handValue(h.cards),
        bet: h.bet,
        outcome: h.outcome,
        payout: h.payout,
      })),
      pointsAfter: newPoints,
    });
  }

  io.to(room.roomCode).emit('bj_round_result', {
    results,
    dealerCards: bj.dealer.cards,
    dealerValue: dealerVal,
  });

  setTimeout(() => {
    if (!_rooms || !_rooms.has(room.roomCode)) return;
    startNewRound(io, room);
  }, 5000);
}

// ── startNewRound ─────────────────────────────────────────────────────────────
function startNewRound(io, room) {
  if (!_rooms || !_rooms.has(room.roomCode)) return;
  const oldShoe = room.bj?.shoe;
  room.bj = initBjState(room, oldShoe);
  room.status = 'betting';

  io.to(room.roomCode).emit('bj_betting_phase', { timeLimit: 15 });
  room.bj.bettingTimer = setTimeout(() => startDeal(io, room), 15000);
}

// ── Public: startBlackjackBetting ─────────────────────────────────────────────
function startBlackjackBetting(io, room) {
  room.bj = initBjState(room, null);
  room.status = 'betting';

  io.to(room.roomCode).emit('bj_betting_phase', { timeLimit: 15 });
  room.bj.bettingTimer = setTimeout(() => startDeal(io, room), 15000);
}

// ── registerBlackjackEvents ───────────────────────────────────────────────────
function registerBlackjackEvents(io, rooms) {
  _rooms = rooms;

  io.on('connection', (socket) => {
    // ── bj_place_bet ──────────────────────────────────────────────────────────
    socket.on('bj_place_bet', async ({ amount }) => {
      let room = null;
      for (const r of rooms.values()) {
        if (r.players.some((p) => p.socketId === socket.id)) {
          room = r;
          break;
        }
      }
      if (!room || !room.bj) return;
      if (room.bj.phase !== 'betting') return socket.emit('error', { message: 'Not in betting phase' });

      const player = room.players.find((p) => p.socketId === socket.id);
      if (!player) return;

      const userId = player.userId;
      if (room.bj.betsPlaced[userId]) return socket.emit('error', { message: 'Already placed bet' });

      const betAmount = parseInt(amount, 10);
      if (isNaN(betAmount) || betAmount < 50)
        return socket.emit('error', { message: 'Minimum bet is 50' });
      if (betAmount > player.points)
        return socket.emit('error', { message: 'Insufficient points' });

      room.bj.betsPlaced[userId] = betAmount;

      io.to(room.roomCode).emit('bj_bet_placed', {
        userId,
        username: player.username,
        betsPlaced: Object.keys(room.bj.betsPlaced).map(Number),
        totalPlayers: room.bj.playerOrder.length,
      });

      // If all players have bet, start deal immediately
      const allBet = room.bj.playerOrder.every((uid) => room.bj.betsPlaced[uid]);
      if (allBet) {
        await startDeal(io, room);
      }
    });

    // ── bj_action ─────────────────────────────────────────────────────────────
    socket.on('bj_action', async ({ action, handIndex = 0 }) => {
      let room = null;
      for (const r of rooms.values()) {
        if (r.players.some((p) => p.socketId === socket.id)) {
          room = r;
          break;
        }
      }
      if (!room || !room.bj) return;
      if (room.bj.phase !== 'playing') return;

      const player = room.players.find((p) => p.socketId === socket.id);
      if (!player) return;

      const userId = player.userId;
      const activePlayers = room.bj.playerOrder.filter(
        (uid) => room.bj.playerStates[uid]?.hands?.length > 0
      );
      const expectedUserId = activePlayers[room.bj.currentPlayerIdx];
      if (userId !== expectedUserId)
        return socket.emit('error', { message: 'Not your turn' });

      const playerState = room.bj.playerStates[userId];
      if (!playerState) return;
      const hand = playerState.hands[handIndex];
      if (!hand || hand.done) return socket.emit('error', { message: 'Invalid hand' });

      if (action === 'hit') {
        const card = dealCard(room);
        hand.cards.push(card);
        const val = handValue(hand.cards);
        if (isBust(hand.cards)) {
          hand.done = true;
          hand.outcome = 'bust';
        } else if (val === 21) {
          hand.done = true;
        }
        io.to(room.roomCode).emit('bj_card_dealt', {
          userId,
          handIndex,
          card,
          handValue: val,
          done: hand.done,
          outcome: hand.outcome,
        });

      } else if (action === 'stand') {
        hand.done = true;
        io.to(room.roomCode).emit('bj_stand', { userId, handIndex });

      } else if (action === 'double') {
        if (hand.cards.length !== 2 || hand.isSplit)
          return socket.emit('error', { message: 'Cannot double' });
        if (player.points < hand.bet)
          return socket.emit('error', { message: 'Insufficient points for double' });

        player.points -= hand.bet;
        playerState.points = player.points;
        hand.bet *= 2;
        hand.doubled = true;

        try {
          await pool.query('UPDATE users SET points = ? WHERE id = ?', [player.points, userId]);
          await pool.query(
            `INSERT INTO transactions (user_id, type, amount, description) VALUES (?, 'bet', ?, ?)`,
            [userId, -(hand.bet / 2), `BJ double in room ${room.roomCode}`]
          );
        } catch (err) {
          console.error('DB error BJ double', err);
        }

        const card = dealCard(room);
        hand.cards.push(card);
        hand.done = true;
        if (isBust(hand.cards)) hand.outcome = 'bust';

        io.to(room.roomCode).emit('bj_card_dealt', {
          userId,
          handIndex,
          card,
          handValue: handValue(hand.cards),
          done: true,
          outcome: hand.outcome,
          doubled: true,
          newBet: hand.bet,
          playerPoints: player.points,
        });

      } else if (action === 'split') {
        if (hand.cards.length !== 2 || hand.isSplit)
          return socket.emit('error', { message: 'Cannot split' });
        if (player.points < hand.bet)
          return socket.emit('error', { message: 'Insufficient points for split' });

        player.points -= hand.bet;
        playerState.points = player.points;

        try {
          await pool.query('UPDATE users SET points = ? WHERE id = ?', [player.points, userId]);
          await pool.query(
            `INSERT INTO transactions (user_id, type, amount, description) VALUES (?, 'bet', ?, ?)`,
            [userId, -hand.bet, `BJ split in room ${room.roomCode}`]
          );
        } catch (err) {
          console.error('DB error BJ split', err);
        }

        const card1 = hand.cards[0];
        const card2 = hand.cards[1];
        const extra1 = dealCard(room);
        const extra2 = dealCard(room);

        const newHand1 = {
          cards: [card1, extra1],
          bet: hand.bet,
          doubled: false,
          isSplit: true,
          done: handValue([card1, extra1]) === 21,
          outcome: null,
          payout: 0,
        };
        const newHand2 = {
          cards: [card2, extra2],
          bet: hand.bet,
          doubled: false,
          isSplit: true,
          done: handValue([card2, extra2]) === 21,
          outcome: null,
          payout: 0,
        };

        playerState.hands.splice(handIndex, 1, newHand1, newHand2);
        room.bj.currentHandIdx = handIndex;

        io.to(room.roomCode).emit('bj_split_done', {
          userId,
          hands: playerState.hands,
          playerPoints: player.points,
        });

        advanceTurn(io, room);
        return;
      }

      advanceTurn(io, room);
    });
  });
}

module.exports = { registerBlackjackEvents, startBlackjackBetting };
