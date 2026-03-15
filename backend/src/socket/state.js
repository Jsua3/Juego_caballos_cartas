// Shared in-memory maps for online presence tracking.
// Imported by both gameEvents.js and routes that need socket access.

const onlineUsers = new Map(); // socketId → { userId, username, avatar_url }
const userSockets = new Map(); // userId  → socketId

module.exports = { onlineUsers, userSockets };
