const jwt = require('jsonwebtoken');
const pool = require('../db');
const {
  createDeck,
  shuffleDeck,
  dealTrackCards,
  processCardDraw,
  checkWinner,
  SUITS,
} = require('../game/gameLogic');
const { registerBlackjackEvents, startBlackjackBetting } = require('./blackjackEvents');
const { onlineUsers, userSockets } = require('./state');

/**
 * In-memory room state. Key = roomCode.
 * {
 *   roomCode, dbRoomId, status,
 *   players: [{ socketId, userId, username, points, betSuit, betAmount, isReady }],
 *   ownerId,
 *   deck, trackCards, positions, raceInterval
 * }
 */
const rooms = new Map();

const IDLE_TIMEOUT_MS = 2 * 60 * 1000; // 2 minutos

function broadcastOnlineUsers(io) {
  const userRooms = new Map();
  for (const room of rooms.values()) {
    if (room.status === 'waiting') {
      for (const p of room.players) userRooms.set(p.userId, room.roomCode);
    }
  }
  const list = Array.from(onlineUsers.values()).map(u => ({
    ...u,
    roomCode: userRooms.get(u.userId) || null,
  }));
  io.emit('online_users', list);
}

function scheduleIdleClose(io, room) {
  if (room.idleTimer) clearTimeout(room.idleTimer);
  room.idleTimer = setTimeout(async () => {
    if (!rooms.has(room.roomCode)) return;
    if (room.status !== 'waiting') return;
    // Notificar a los jugadores conectados
    io.to(room.roomCode).emit('room_closed', { message: 'La sala fue cerrada por inactividad.' });
    // Actualizar DB
    try {
      await pool.query(
        `UPDATE game_rooms SET status = 'finished', finished_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [room.dbRoomId]
      );
    } catch (err) {
      console.error('DB error closing idle room', err);
    }
    rooms.delete(room.roomCode);
  }, IDLE_TIMEOUT_MS);
}

function cancelIdleClose(room) {
  if (room.idleTimer) {
    clearTimeout(room.idleTimer);
    room.idleTimer = null;
  }
}

function getRoomBySocket(socketId) {
  for (const room of rooms.values()) {
    if (room.players.some((p) => p.socketId === socketId)) return room;
  }
  return null;
}

function broadcastRoom(io, room) {
  io.to(room.roomCode).emit('room_updated', {
    players: room.players.map((p) => ({
      userId:    p.userId,
      username:  p.username,
      avatar_url: p.avatar_url ?? null,
      points:    p.points,
      betSuit:   p.betSuit,
      betAmount: p.betAmount,
      isReady:   p.isReady,
    })),
    status:               room.status,
    ownerId:              room.ownerId,
    gameMode:             room.gameMode || 'caballos',
    bettingCurrentUserId: room.bettingOrder?.[room.currentBetIdx] ?? null,
  });
}

async function finishRace(io, room, winnerSuit) {
  clearInterval(room.raceInterval);
  room.raceInterval = null;
  room.status = 'finished';

  const results = [];

  for (const player of room.players) {
    let pointsDelta = 0;
    let pointsAfter = player.points;

    if (player.betSuit && player.betSuit === winnerSuit) {
      pointsDelta = player.betAmount * 5;
      pointsAfter = player.points + pointsDelta;
    }

    try {
      await pool.query('UPDATE users SET points = ? WHERE id = ?', [pointsAfter, player.userId]);

      if (pointsDelta !== 0) {
        await pool.query(
          `INSERT INTO transactions (user_id, type, amount, description)
           VALUES (?, 'win', ?, ?)`,
          [player.userId, pointsDelta, `Win in room ${room.roomCode} — ${winnerSuit}`]
        );
      }

      await pool.query(
        `UPDATE room_players SET points_after = ?
         WHERE room_id = ? AND user_id = ?`,
        [pointsAfter, room.dbRoomId, player.userId]
      );
    } catch (err) {
      console.error('DB error finalising race for', player.username, err);
    }

    player.points = pointsAfter;
    results.push({
      userId:      player.userId,
      username:    player.username,
      betSuit:     player.betSuit,
      betAmount:   player.betAmount,
      pointsDelta,
      pointsAfter,
    });
  }

  await pool.query(
    `UPDATE game_rooms SET status = 'finished', finished_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [room.dbRoomId]
  );

  io.to(room.roomCode).emit('race_finished', { winnerSuit, results });

  // Reset room for new game after 5 s
  setTimeout(() => {
    if (!rooms.has(room.roomCode)) return;
    room.status = 'waiting';
    for (const p of room.players) {
      p.betSuit   = null;
      p.betAmount = null;
      p.isReady   = false;
    }
    room.deck       = null;
    room.trackCards = null;
    room.positions  = null;
    broadcastRoom(io, room);
  }, 5000);
}

function startRace(io, room) {
  room.status = 'racing';

  const deck = shuffleDeck(createDeck());
  const { trackCards, remainingDeck } = dealTrackCards(deck);
  room.deck          = remainingDeck;
  room.trackCards    = trackCards;
  room.positions     = Object.fromEntries(SUITS.map((s) => [s, 0]));
  room.revealedCount = 0;

  pool.query('UPDATE game_rooms SET status = ? WHERE id = ?', ['racing', room.dbRoomId]).catch(console.error);

  io.to(room.roomCode).emit('race_start', { trackCards });

  room.raceInterval = setInterval(async () => {
    if (!room.deck || room.deck.length === 0) {
      clearInterval(room.raceInterval);
      return;
    }

    const card = room.deck.shift();
    const { newPositions, penaltySuit, revealedCount } = processCardDraw(
      room.positions, card.suit, room.trackCards, room.revealedCount
    );
    room.positions     = newPositions;
    room.revealedCount = revealedCount;

    io.to(room.roomCode).emit('card_drawn', {
      card,
      positions:     room.positions,
      penaltySuit,
      revealedCount: room.revealedCount,
    });

    const winner = checkWinner(room.positions);
    if (winner) {
      await finishRace(io, room, winner);
    }
  }, 500);
}

async function startBetting(io, room) {
  room.status       = 'betting';
  room.bettingOrder = room.players.map((p) => p.userId);
  room.currentBetIdx = 0;

  await pool.query('UPDATE game_rooms SET status = ? WHERE id = ?', ['betting', room.dbRoomId]);

  io.to(room.roomCode).emit('betting_start', {
    order:         room.bettingOrder,
    currentUserId: room.bettingOrder[0],
  });
}

module.exports = function registerGameEvents(io) {
  registerBlackjackEvents(io, rooms);
  io.on('connection', (socket) => {
    console.log('Socket connected:', socket.id);

    // ── authenticate (lobby online presence) ─────────────────────────────────
    socket.on('authenticate', async ({ token }) => {
      try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        const [rows] = await pool.query('SELECT avatar_url FROM users WHERE id = ?', [payload.id]);
        const avatar_url = rows[0]?.avatar_url ?? null;
        onlineUsers.set(socket.id, { userId: payload.id, username: payload.username, avatar_url });
        userSockets.set(payload.id, socket.id);
        broadcastOnlineUsers(io);
      } catch { /* token inválido, ignorar */ }
    });

    // ── join_room ────────────────────────────────────────────────────────────
    socket.on('join_room', async ({ roomCode, token }) => {
      let payload;
      try {
        payload = jwt.verify(token, process.env.JWT_SECRET);
      } catch {
        return socket.emit('error', { message: 'Invalid token' });
      }

      const { id: userId, username } = payload;

      let userRow;
      try {
        const [rows] = await pool.query('SELECT points, avatar_url FROM users WHERE id = ?', [userId]);
        if (rows.length === 0) return socket.emit('error', { message: 'User not found' });
        userRow = rows[0];
      } catch {
        return socket.emit('error', { message: 'DB error' });
      }

      let room = rooms.get(roomCode);
      if (!room) {
        try {
          const [rows] = await pool.query('SELECT * FROM game_rooms WHERE room_code = ?', [roomCode]);
          if (rows.length === 0) return socket.emit('error', { message: 'Room not found' });
          const dbRoom = rows[0];
          room = {
            roomCode,
            dbRoomId:      dbRoom.id,
            status:        dbRoom.status === 'finished' ? 'waiting' : dbRoom.status,
            gameMode:      dbRoom.game_mode || 'caballos',
            players:       [],
            ownerId:       null,
            deck:          null,
            trackCards:    null,
            positions:     null,
            raceInterval:  null,
            bettingOrder:  [],
            currentBetIdx: 0,
            idleTimer:     null,
          };
          rooms.set(roomCode, room);
          scheduleIdleClose(io, room);
        } catch {
          return socket.emit('error', { message: 'DB error loading room' });
        }
      }

      if (room.status === 'racing' || room.status === 'betting') {
        return socket.emit('error', { message: 'Game already in progress' });
      }
      if (room.players.length >= 4) {
        return socket.emit('error', { message: 'Room is full' });
      }

      // Re-join: actualizar socketId
      const existing = room.players.find((p) => p.userId === userId);
      if (existing) {
        existing.socketId = socket.id;
        socket.join(roomCode);
        broadcastRoom(io, room);
        return;
      }

      const player = {
        socketId:   socket.id,
        userId,
        username,
        avatar_url: userRow.avatar_url ?? null,
        points:     userRow.points,
        betSuit:    null,
        betAmount:  null,
        isReady:    false,
      };
      room.players.push(player);
      if (!room.ownerId) room.ownerId = userId;

      socket.join(roomCode);

      try {
        await pool.query(
          `INSERT IGNORE INTO room_players (room_id, user_id, points_before)
           VALUES (?, ?, ?)`,
          [room.dbRoomId, userId, userRow.points]
        );
      } catch (err) {
        console.error('room_players insert error', err);
      }

      broadcastRoom(io, room);
    });

    // ── leave_room ───────────────────────────────────────────────────────────
    socket.on('leave_room', ({ roomCode }) => {
      const room = rooms.get(roomCode);
      if (!room) return;
      room.players = room.players.filter((p) => p.socketId !== socket.id);
      socket.leave(roomCode);
      if (room.players.length === 0) {
        cancelIdleClose(room);
        rooms.delete(roomCode);
        return;
      }
      if (room.ownerId === socket.id) room.ownerId = room.players[0]?.userId;
      broadcastRoom(io, room);
    });

    // ── start_betting (owner only) ────────────────────────────────────────────
    socket.on('start_betting', async ({ roomCode }) => {
      const room = rooms.get(roomCode);
      if (!room) return socket.emit('error', { message: 'Room not found' });
      const player = room.players.find((p) => p.socketId === socket.id);
      if (!player)                    return socket.emit('error', { message: 'Not in room' });
      if (player.userId !== room.ownerId) return socket.emit('error', { message: 'Only owner can start' });
      if (room.status !== 'waiting')  return socket.emit('error', { message: 'Cannot start now' });
      if (room.players.length < 2)    return socket.emit('error', { message: 'Need at least 2 players' });

      cancelIdleClose(room);
      if (room.gameMode === 'blackjack') {
        return startBlackjackBetting(io, room);
      }
      await startBetting(io, room);
    });

    // ── place_bet ────────────────────────────────────────────────────────────
    socket.on('place_bet', async ({ suit, amount }) => {
      const room = getRoomBySocket(socket.id);
      if (!room)                       return socket.emit('error', { message: 'Not in any room' });
      if (room.status !== 'betting')   return socket.emit('error', { message: 'Not in betting phase' });

      const player = room.players.find((p) => p.socketId === socket.id);
      if (!player) return socket.emit('error', { message: 'Player not found' });

      const expectedUserId = room.bettingOrder[room.currentBetIdx];
      if (player.userId !== expectedUserId) {
        return socket.emit('error', { message: 'Not your turn to bet' });
      }

      const betAmount = parseInt(amount, 10);
      if (isNaN(betAmount) || betAmount < 50)  return socket.emit('error', { message: 'Minimum bet is 50 points' });
      if (betAmount > player.points)            return socket.emit('error', { message: 'Insufficient points' });
      if (!['oros', 'copas', 'espadas', 'bastos'].includes(suit)) {
        return socket.emit('error', { message: 'Invalid suit' });
      }

      player.points   -= betAmount;
      player.betSuit   = suit;
      player.betAmount = betAmount;

      try {
        await pool.query('UPDATE users SET points = ? WHERE id = ?', [player.points, player.userId]);
        await pool.query(
          `INSERT INTO transactions (user_id, type, amount, description)
           VALUES (?, 'bet', ?, ?)`,
          [player.userId, -betAmount, `Bet on ${suit} in room ${room.roomCode}`]
        );
        await pool.query(
          `UPDATE room_players SET bet_suit = ?, bet_amount = ?
           WHERE room_id = ? AND user_id = ?`,
          [suit, betAmount, room.dbRoomId, player.userId]
        );
      } catch (err) {
        console.error('DB bet error', err);
      }

      room.currentBetIdx++;

      io.to(room.roomCode).emit('bet_confirmed', {
        userId:     player.userId,
        username:   player.username,
        suit,
        amount:     betAmount,
        nextUserId: room.bettingOrder[room.currentBetIdx] ?? null,
      });

      broadcastRoom(io, room);

      if (room.currentBetIdx >= room.bettingOrder.length) {
        setTimeout(() => startRace(io, room), 1500);
      }
    });

    // ── send_message ─────────────────────────────────────────────────────────
    socket.on('send_message', ({ message }) => {
      const room = getRoomBySocket(socket.id);
      const player = room?.players.find((p) => p.socketId === socket.id);
      if (!room || !player) return;
      const msg = message?.trim().slice(0, 200);
      if (!msg) return;
      io.to(room.roomCode).emit('message_received', {
        userId:    player.userId,
        username:  player.username,
        message:   msg,
        timestamp: Date.now(),
      });
    });

    // ── send_direct_message ───────────────────────────────────────────────────
    socket.on('send_direct_message', async ({ receiverId, message }) => {
      const sender = onlineUsers.get(socket.id);
      if (!sender) return;
      const msg = message?.trim().slice(0, 500);
      if (!msg) return;
      try {
        const [friendRows] = await pool.query(
          `SELECT id FROM friendships WHERE status = 'accepted'
           AND ((user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?))`,
          [sender.userId, receiverId, receiverId, sender.userId]
        );
        if (friendRows.length === 0) return;

        const [result] = await pool.query(
          `INSERT INTO direct_messages (sender_id, receiver_id, message) VALUES (?, ?, ?)`,
          [sender.userId, receiverId, msg]
        );
        const timestamp = new Date().toISOString();

        const receiverSocketId = userSockets.get(parseInt(receiverId));
        if (receiverSocketId) {
          io.to(receiverSocketId).emit('direct_message_received', {
            id:             result.insertId,
            senderId:       sender.userId,
            senderUsername: sender.username,
            senderAvatar:   sender.avatar_url,
            message:        msg,
            timestamp,
          });
        }
        // Confirm to sender
        socket.emit('direct_message_sent', {
          id:         result.insertId,
          receiverId: parseInt(receiverId),
          message:    msg,
          timestamp,
        });
      } catch (err) {
        console.error('DM error', err);
      }
    });

    // ── send_game_invite ──────────────────────────────────────────────────────
    socket.on('send_game_invite', async ({ receiverId, roomCode }) => {
      const sender = onlineUsers.get(socket.id);
      if (!sender) return;
      try {
        const [friendRows] = await pool.query(
          `SELECT id FROM friendships WHERE status = 'accepted'
           AND ((user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?))`,
          [sender.userId, receiverId, receiverId, sender.userId]
        );
        if (friendRows.length === 0) return;

        const [result] = await pool.query(
          `INSERT INTO game_invites (sender_id, receiver_id, room_code) VALUES (?, ?, ?)`,
          [sender.userId, receiverId, roomCode]
        );

        const receiverSocketId = userSockets.get(parseInt(receiverId));
        if (receiverSocketId) {
          io.to(receiverSocketId).emit('game_invite_received', {
            inviteId:       result.insertId,
            senderId:       sender.userId,
            senderUsername: sender.username,
            senderAvatar:   sender.avatar_url,
            roomCode,
          });
        }
      } catch (err) {
        console.error('Game invite error', err);
      }
    });

    // ── respond_game_invite ───────────────────────────────────────────────────
    socket.on('respond_game_invite', async ({ inviteId, accept }) => {
      const me = onlineUsers.get(socket.id);
      if (!me) return;
      try {
        const [rows] = await pool.query(
          `SELECT * FROM game_invites WHERE id = ? AND receiver_id = ? AND status = 'pending'`,
          [inviteId, me.userId]
        );
        if (rows.length === 0) return;

        const invite = rows[0];
        await pool.query(
          `UPDATE game_invites SET status = ? WHERE id = ?`,
          [accept ? 'accepted' : 'declined', inviteId]
        );

        if (accept) {
          const senderSocketId = userSockets.get(invite.sender_id);
          if (senderSocketId) {
            io.to(senderSocketId).emit('game_invite_accepted', {
              receiverUsername: me.username,
              roomCode:         invite.room_code,
            });
          }
        }
      } catch (err) {
        console.error('Respond invite error', err);
      }
    });

    // ── disconnect ───────────────────────────────────────────────────────────
    socket.on('disconnect', () => {
      console.log('Socket disconnected:', socket.id);
      const userInfo = onlineUsers.get(socket.id);
      if (userInfo) userSockets.delete(userInfo.userId);
      onlineUsers.delete(socket.id);
      broadcastOnlineUsers(io);
      const room = getRoomBySocket(socket.id);
      if (!room) return;

      const leaving = room.players.find((p) => p.socketId === socket.id);
      room.players = room.players.filter((p) => p.socketId !== socket.id);

      if (room.players.length === 0) {
        if (room.raceInterval) clearInterval(room.raceInterval);
        cancelIdleClose(room);
        rooms.delete(room.roomCode);
        return;
      }

      // Si el dueño se va, el siguiente jugador toma el control
      if (room.ownerId === leaving?.userId) {
        room.ownerId = room.players[0].userId;
      }

      // Notificar a todos que alguien se fue
      io.to(room.roomCode).emit('player_left', {
        username: leaving?.username ?? 'Un jugador',
      });

      // Si se va durante apuestas, ajustar el orden
      if (room.status === 'betting' && leaving) {
        const leavingIdx = room.bettingOrder.indexOf(leaving.userId);
        if (leavingIdx !== -1) {
          room.bettingOrder.splice(leavingIdx, 1);
          // Si era su turno o anterior, ajustar índice
          if (leavingIdx < room.currentBetIdx) {
            room.currentBetIdx--;
          }
          // Si ya todos los restantes apostaron → iniciar carrera
          if (room.currentBetIdx >= room.bettingOrder.length) {
            broadcastRoom(io, room);
            setTimeout(() => startRace(io, room), 1500);
            return;
          }
          // Si solo queda 1 jugador → cancelar y volver a waiting
          if (room.players.length < 2) {
            room.status = 'waiting';
            room.bettingOrder = [];
            room.currentBetIdx = 0;
            room.players.forEach((p) => { p.betSuit = null; p.betAmount = null; });
            broadcastRoom(io, room);
            return;
          }
          // Avisar quién apuesta ahora
          io.to(room.roomCode).emit('betting_start', {
            order:         room.bettingOrder,
            currentUserId: room.bettingOrder[room.currentBetIdx],
          });
        }
      }

      // Si se va durante la carrera y solo queda 1 jugador → cancelar carrera
      if (room.status === 'racing' && room.players.length < 2) {
        if (room.raceInterval) {
          clearInterval(room.raceInterval);
          room.raceInterval = null;
        }
        room.status = 'waiting';
        room.players.forEach((p) => { p.betSuit = null; p.betAmount = null; });
        io.to(room.roomCode).emit('race_cancelled', {
          message: 'La carrera fue cancelada porque un jugador abandonó.',
        });
        broadcastRoom(io, room);
        return;
      }

      broadcastRoom(io, room);
    });
  });
};
