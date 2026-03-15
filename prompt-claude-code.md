# PROMPT PARA CLAUDE CODE — Sistema de Perfil + Sistema Social

## CONTEXTO DEL PROYECTO

Este es un juego multijugador de "Carrera de Caballos" con baraja española, hecho en **React 18 + Tailwind CSS** (frontend) y **Node.js + Express + Socket.IO + MySQL** (backend). El proyecto tiene también un modo Blackjack.

### Stack actual:
- **Frontend**: React 18, Tailwind CSS, Framer Motion, Axios, Socket.IO Client, qrcode.react
- **Backend**: Express 4, Socket.IO 4, mysql2/promise, bcrypt, jsonwebtoken, dotenv
- **DB**: MySQL/MariaDB (pool via mysql2/promise)
- **No tiene**: multer, ni manejo de archivos/uploads

### Estructura actual del proyecto:
```
backend/
  src/
    index.js              ← Express + Socket.IO server (puerto 4000)
    db.js                 ← Pool MySQL con mysql2/promise
    middleware/
      authMiddleware.js   ← JWT verify → req.user = { id, username }
    routes/
      auth.js             ← POST /api/auth/register, POST /api/auth/login
      users.js            ← GET /api/users/me, GET /api/users/stats
      rooms.js            ← CRUD de salas
      purchases.js        ← Compras y códigos de canje
    socket/
      gameEvents.js       ← Socket events (authenticate, join_room, send_message, etc.)
      blackjackEvents.js  ← Socket events del blackjack
    game/
      gameLogic.js        ← Lógica de carrera
      blackjackLogic.js   ← Lógica de blackjack
  schema.sql              ← Schema actual de la DB
  package.json

src/
  index.js                ← Entry point React
  index.css               ← Tailwind CSS
  socket.js               ← Socket.IO client connection
  CarreraDeCaballos.jsx   ← Componente principal (maneja phases: lobby, waiting, betting, racing, results)
  context/
    AuthContext.jsx        ← Context con: token, user, login, logout, updatePoints, API_URL
  utils/
    sound.js              ← playSound utility
  components/
    Auth/
      LoginPage.jsx
      RegisterPage.jsx
    Lobby/
      LobbyPage.jsx       ← Lista de salas, crear sala, stats bar
      RoomCard.jsx
    Game/
      BettingPhase.jsx
      RacingPhase.jsx      ← Incluye chat de sala (tabs eventos/chat en mobile)
      ResultsPhase.jsx
    Blackjack/
      BlackjackGame.jsx, BlackjackBetting.jsx, BlackjackCard.jsx,
      BlackjackTable.jsx, BlackjackActions.jsx, BlackjackResults.jsx
    Shared/
      UserBar.jsx          ← Barra superior: nombre, puntos, botones Stats/Puntos/Salir
      PurchaseModal.jsx
      StatsModal.jsx       ← Modal con stats personales (solo propias)
      RoomCodeQR.jsx
```

### Schema actual de la DB (schema.sql):
```sql
CREATE TABLE users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  username      VARCHAR(50)  UNIQUE NOT NULL,
  email         VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  points        INT DEFAULT 1000,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE game_rooms (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  room_code   VARCHAR(8) UNIQUE NOT NULL,
  status      VARCHAR(20) DEFAULT 'waiting',
  max_players INT DEFAULT 4,
  game_mode   VARCHAR(20) NOT NULL DEFAULT 'caballos',
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  finished_at TIMESTAMP NULL DEFAULT NULL
);

CREATE TABLE room_players (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  room_id       INT,
  user_id       INT,
  bet_suit      VARCHAR(20),
  bet_amount    INT,
  points_before INT,
  points_after  INT,
  is_ready      BOOLEAN DEFAULT FALSE,
  joined_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (room_id) REFERENCES game_rooms(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE transactions (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT,
  type        VARCHAR(20),
  amount      INT,
  description TEXT,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE redemption_codes (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  code       VARCHAR(20) UNIQUE NOT NULL,
  points     INT DEFAULT 1000,
  used_by    INT NULL,
  used_at    TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (used_by) REFERENCES users(id)
);

CREATE TABLE point_purchases (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  user_id       INT,
  points_bought INT DEFAULT 1000,
  price_cop     INT DEFAULT 10000,
  status        VARCHAR(20) DEFAULT 'pending',
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### Patrones importantes del código actual:

1. **AuthContext** expone: `{ token, user, loading, login, logout, updatePoints }`. El objeto `user` tiene: `{ id, username, email, points }`.

2. **Todas las rutas protegidas** usan `authMiddleware` que añade `req.user = { id, username }` (payload del JWT).

3. **API_URL** se importa desde AuthContext: `import { useAuth, API_URL } from '../../context/AuthContext'`.

4. **El estilo visual** es temática de casino lujoso: fondos verde oscuro (#072318, #0d1a0d), acentos dorados (gradientes con #8B6400, #C09020, #D4A835), bordes rgba(180,134,20,0.15), fuente Cinzel para títulos, glassmorphism con backdrop-blur. Todos los componentes usan `framer-motion` para animaciones.

5. **Socket events de chat** ya existen: el frontend emite `send_message` y recibe `message_received` con `{ userId, username, message, timestamp }`.

6. **Los botones** usan `motion.button` con `whileHover`, `whileTap`, y llaman `playSound('click')`.

7. **En gameEvents.js** hay un `onlineUsers` Map (socketId → { userId, username }) y una función `broadcastOnlineUsers(io)`.

8. **broadcastRoom()** emite `room_updated` con players mapeados como `{ userId, username, points, betSuit, betAmount, isReady }`.

---

## TAREA: Implementar en DOS FASES

---

## FASE 1: PERFIL DE USUARIO ROBUSTO

### 1.1 — Migración de base de datos

Agregar columnas a la tabla `users`:

```sql
ALTER TABLE users ADD COLUMN display_name VARCHAR(50) NULL AFTER username;
ALTER TABLE users ADD COLUMN avatar_url VARCHAR(255) NULL AFTER display_name;
ALTER TABLE users ADD COLUMN bio VARCHAR(200) NULL AFTER avatar_url;
```

Crear archivo `backend/migrations/001_profile_fields.sql` con esas sentencias.

### 1.2 — Backend: Subida de avatares con Multer

- Instalar multer: `npm install multer` en la carpeta `backend/`.
- Crear carpeta `backend/uploads/avatars/`.
- En `backend/src/index.js`, servir archivos estáticos: `app.use('/uploads', express.static(path.join(__dirname, '../uploads')));`
- Crear middleware de upload en `backend/src/middleware/upload.js`:
  - Destino: `uploads/avatars/`
  - Nombre del archivo: `avatar-{userId}-{timestamp}.{ext}`
  - Límite: 2MB
  - Solo permitir imágenes (jpeg, png, gif, webp)

### 1.3 — Backend: Rutas de perfil (modificar `backend/src/routes/users.js`)

Agregar estas rutas al archivo existente:

**PUT /api/users/me** (autenticado) — Editar perfil
- Body: `{ display_name, bio }` (opcionales)
- Validar: display_name max 50 chars, bio max 200 chars
- Actualizar en DB y devolver el usuario actualizado

**POST /api/users/me/avatar** (autenticado) — Subir avatar
- Usar middleware de multer para un solo archivo campo "avatar"
- Guardar ruta relativa en DB (`/uploads/avatars/avatar-{userId}-{timestamp}.ext`)
- Si el usuario ya tenía avatar, borrar el archivo anterior del disco
- Devolver `{ avatar_url: "/uploads/avatars/..." }`

**GET /api/users/:id/profile** (autenticado) — Perfil público de cualquier usuario
- Devolver: `{ id, username, display_name, avatar_url, bio, created_at }` + stats calculadas (games_played, games_won, win_rate, points_won)
- NO devolver email ni password_hash

**GET /api/users/search?q=xxx** (autenticado) — Buscar usuarios
- Buscar donde `username LIKE '%xxx%' OR display_name LIKE '%xxx%'`
- Excluir al propio usuario del resultado
- Limitar a 10 resultados
- Devolver: `[{ id, username, display_name, avatar_url }]`

### 1.4 — Backend: Actualizar rutas existentes

- **GET /api/users/me**: Agregar `display_name, avatar_url, bio` al SELECT.
- **POST /api/auth/login**: Agregar `display_name, avatar_url` al SELECT y al objeto `safeUser`.
- **POST /api/auth/register**: No necesita cambios (los nuevos campos son NULL por defecto).
- **broadcastRoom() en gameEvents.js**: Incluir `avatar_url` en el mapeo de players. Para esto, al hacer `authenticate` o `join_room`, guardar también el avatar_url en el objeto del player en memoria.
- **broadcastOnlineUsers()**: Incluir `avatar_url` en la lista.

### 1.5 — Frontend: Actualizar AuthContext

En `AuthContext.jsx`:
- El objeto `user` ahora incluirá `display_name, avatar_url, bio`.
- Agregar función `updateUser(fields)` que haga: `setUser(prev => prev ? { ...prev, ...fields } : prev)`.
- Exportar `updateUser` en el contexto.

### 1.6 — Frontend: Componente ProfileModal

Crear `src/components/Shared/ProfileModal.jsx`:
- Modal con el mismo estilo visual que StatsModal (fondo oscuro, borde dorado, glassmorphism).
- Mostrar avatar actual (o un ícono default si no tiene — usar un círculo gris con la inicial del username).
- Botón para cambiar avatar (input file hidden, al seleccionar archivo se sube con POST a `/api/users/me/avatar`).
- Campo editable para `display_name` (input text, placeholder: username actual).
- Campo editable para `bio` (textarea, max 200 chars, placeholder: "Cuéntanos sobre ti...").
- Botón "Guardar" que hace PUT a `/api/users/me` y actualiza el AuthContext con `updateUser()`.
- Botón "Cerrar".
- Estilo: inputs con fondo `rgba(255,255,255,0.05)`, borde `rgba(184,134,11,0.3)`, texto blanco.

### 1.7 — Frontend: Componente PublicProfileModal

Crear `src/components/Shared/PublicProfileModal.jsx`:
- Se abre al hacer click en el nombre/avatar de otro usuario (en lobby, sala de espera, carrera, resultados).
- Hace GET a `/api/users/:id/profile`.
- Muestra: avatar, display_name (o username), bio, fecha de registro, y estadísticas (partidas jugadas, ganadas, win rate, puntos ganados).
- Mismo estilo visual que los otros modales.
- Botón "Cerrar".

### 1.8 — Frontend: Integrar avatar en componentes existentes

- **UserBar.jsx**: Mostrar avatar pequeño (28x28px, circular) antes del username. Si no tiene avatar, mostrar círculo con inicial. Agregar un botón o hacer clickeable el avatar/nombre para abrir ProfileModal.
- **LobbyPage.jsx**: En la lista de jugadores online, mostrar mini avatares.
- **WaitingRoom** (dentro de CarreraDeCaballos.jsx): Mostrar avatares de los jugadores en la sala.
- **RacingPhase.jsx**: En la lista de jugadores/chat, mostrar avatares.
- **ResultsPhase.jsx**: Mostrar avatares de los jugadores junto a sus resultados.
- **broadcastRoom players**: Ahora incluyen `avatar_url`, usarlo para renderizar.

### 1.9 — Frontend: Componente helper AvatarCircle

Crear `src/components/Shared/AvatarCircle.jsx`:
- Props: `{ src, username, size = 28 }` (size en px)
- Si `src` existe: renderizar `<img>` circular con `object-cover`.
- Si no: renderizar círculo con fondo `rgba(184,134,11,0.3)` y la primera letra del username en mayúscula, centrada, color dorado.
- Usar en todos los lugares donde se necesite mostrar avatar.

### 1.10 — CarreraDeCaballos.jsx

- Agregar estado `showProfile` y el handler para abrirlo/cerrarlo.
- Agregar estado `publicProfileId` para abrir el perfil público de otro user.
- Pasar `onViewProfile={(userId) => setPublicProfileId(userId)}` a los componentes que muestran otros jugadores.
- Renderizar `<ProfileModal>` y `<PublicProfileModal>` condicionalmente.

---

## FASE 2: SISTEMA SOCIAL (Amigos + Chat Privado + Invitaciones)

### 2.1 — Migración de base de datos

Crear `backend/migrations/002_social_system.sql`:

```sql
CREATE TABLE IF NOT EXISTS friendships (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  user_id    INT NOT NULL,
  friend_id  INT NOT NULL,
  status     ENUM('pending', 'accepted', 'blocked') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (friend_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_friendship (user_id, friend_id)
);

CREATE TABLE IF NOT EXISTS direct_messages (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  sender_id   INT NOT NULL,
  receiver_id INT NOT NULL,
  message     VARCHAR(500) NOT NULL,
  is_read     BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS game_invites (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  sender_id   INT NOT NULL,
  receiver_id INT NOT NULL,
  room_code   VARCHAR(8) NOT NULL,
  status      ENUM('pending', 'accepted', 'declined', 'expired') DEFAULT 'pending',
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### 2.2 — Backend: Rutas de amigos

Crear `backend/src/routes/friends.js`:

**GET /api/friends** — Lista de amigos aceptados
- Query: friendships WHERE (user_id = me OR friend_id = me) AND status = 'accepted'
- JOIN con users para devolver: `[{ friendshipId, id, username, display_name, avatar_url, isOnline }]`
- `isOnline` se determina si el userId está en el Map de `onlineUsers` (exportar la referencia o hacer un endpoint para eso).

**GET /api/friends/requests** — Solicitudes pendientes recibidas
- Query: friendships WHERE friend_id = me AND status = 'pending'
- JOIN con users para devolver info del solicitante.

**GET /api/friends/sent** — Solicitudes enviadas pendientes
- Query: friendships WHERE user_id = me AND status = 'pending'

**POST /api/friends/request** — Enviar solicitud
- Body: `{ userId }` (ID del usuario al que se le envía)
- Validar: no mandarse a sí mismo, no duplicar, no si ya son amigos.
- Insertar en friendships con status 'pending'.
- Emitir evento de socket `friend_request_received` al receptor si está online.

**PUT /api/friends/:friendshipId/accept** — Aceptar solicitud
- Validar que friend_id = req.user.id (solo el receptor puede aceptar).
- Actualizar status a 'accepted'.
- Emitir socket `friend_request_accepted` a ambos.

**PUT /api/friends/:friendshipId/reject** — Rechazar solicitud
- Validar que friend_id = req.user.id.
- Eliminar el registro de friendships.

**DELETE /api/friends/:friendshipId** — Eliminar amistad
- Validar que el usuario es parte de la amistad.
- Eliminar registro.

### 2.3 — Backend: Rutas de mensajes directos

Crear `backend/src/routes/messages.js`:

**GET /api/messages/:userId** — Historial de chat con un usuario
- Validar que son amigos.
- Query: direct_messages WHERE (sender=me AND receiver=userId) OR (sender=userId AND receiver=me)
- Ordenar por created_at ASC.
- Limitar a últimos 50 mensajes (paginación opcional con `?before=timestamp`).
- Marcar como leídos los mensajes recibidos.

**GET /api/messages/unread/count** — Conteo de mensajes no leídos
- Query: COUNT de direct_messages WHERE receiver_id = me AND is_read = false, agrupado por sender_id.
- Devolver: `[{ senderId, username, display_name, avatar_url, unreadCount }]`

### 2.4 — Backend: Socket events sociales

En `backend/src/socket/gameEvents.js`, agregar estos eventos dentro del `socket.on('connection')`:

**socket.on('send_direct_message', { receiverId, message })**
- Validar que son amigos.
- Insertar en direct_messages.
- Si el receptor está online (buscar en onlineUsers por userId), emitirle `direct_message_received` con `{ senderId, senderUsername, senderAvatar, message, timestamp }`.

**socket.on('send_game_invite', { receiverId, roomCode })**
- Validar que son amigos.
- Insertar en game_invites.
- Si el receptor está online, emitirle `game_invite_received` con `{ senderId, senderUsername, senderAvatar, roomCode, inviteId }`.

**socket.on('respond_game_invite', { inviteId, accept })**
- Actualizar status en game_invites.
- Si acepta, emitir `game_invite_accepted` al sender.

Para poder buscar sockets por userId (y no solo socketId), modificar el Map `onlineUsers` para que también permita búsqueda inversa. Crear un Map adicional `userSockets` (userId → socketId) que se actualice junto con `onlineUsers`.

### 2.5 — Backend: Registrar nuevas rutas

En `backend/src/index.js`, agregar:
```js
const friendsRoutes = require('./routes/friends');
const messagesRoutes = require('./routes/messages');

app.use('/api/friends', friendsRoutes);
app.use('/api/messages', messagesRoutes);
```

### 2.6 — Frontend: Componente FriendsPanel

Crear `src/components/Social/FriendsPanel.jsx`:
- Panel lateral o modal que muestra:
  - **Tab "Amigos"**: Lista de amigos con avatar, nombre, indicador online (punto verde), botón "Mensaje" y botón "Invitar a sala" (si estás en una sala).
  - **Tab "Solicitudes"**: Solicitudes pendientes con botones Aceptar/Rechazar.
  - **Tab "Buscar"**: Input de búsqueda con debounce de 300ms que llama a `GET /api/users/search?q=xxx`. Los resultados muestran avatar, nombre, y un botón "Agregar" que envía solicitud. Si ya es amigo, mostrar "Ya son amigos". Si ya hay solicitud pendiente, mostrar "Pendiente".
- Estilo consistente con el resto: fondo oscuro, acentos dorados, Cinzel para títulos.

### 2.7 — Frontend: Componente DirectChat

Crear `src/components/Social/DirectChat.jsx`:
- Chat 1 a 1 con un amigo.
- Se abre desde FriendsPanel al hacer click en "Mensaje".
- Carga historial con GET /api/messages/:userId.
- Input de texto + envío via socket 'send_direct_message'.
- Escucha socket 'direct_message_received' para mensajes nuevos.
- Estilo: similar al chat de sala existente en RacingPhase.jsx.
- Botón para invitar a partida desde el chat.

### 2.8 — Frontend: Componente GameInviteNotification

Crear `src/components/Social/GameInviteNotification.jsx`:
- Toast/notificación flotante que aparece cuando recibes una invitación (socket 'game_invite_received').
- Muestra: avatar del invitante, "Te invita a jugar en sala XXXX".
- Botones: "Unirse" (acepta y redirige a la sala) y "Rechazar".
- Usar framer-motion para animación de entrada/salida.

### 2.9 — Frontend: Integración en componentes existentes

- **UserBar.jsx**: Agregar botón "Amigos" (ícono 👥) que abre FriendsPanel. Mostrar badge con conteo de solicitudes pendientes + mensajes no leídos.
- **ResultsPhase.jsx**: Después de una partida, al lado de cada jugador que NO sea tu amigo, mostrar botón "Agregar amigo".
- **PublicProfileModal.jsx**: Agregar botón "Agregar amigo" si no son amigos, o "Enviar mensaje" si ya lo son.
- **CarreraDeCaballos.jsx**: 
  - Agregar estados para FriendsPanel, DirectChat, y GameInviteNotification.
  - Escuchar sockets: `friend_request_received`, `direct_message_received`, `game_invite_received`.
  - Renderizar los nuevos componentes.

---

## REGLAS GENERALES PARA LA IMPLEMENTACIÓN

1. **No borrar código existente** que no necesite cambio. Solo modificar lo necesario.
2. **Mantener el estilo visual** de casino lujoso: fondos oscuros (#072318, #0d1a0d), dorados, Cinzel serif, glassmorphism, motion animations.
3. **Todos los botones nuevos** deben usar `motion.button` con `whileHover`, `whileTap` y llamar `playSound('click')`.
4. **Todos los modales nuevos** deben seguir el patrón de StatsModal: overlay con blur, fondo con gradiente oscuro, borde dorado.
5. **Todas las rutas nuevas del backend** deben usar `authMiddleware`.
6. **Los textos de la UI** deben estar en español.
7. **Errores del backend** deben seguir el patrón existente: `res.status(XXX).json({ error: 'mensaje' })`.
8. **Manejar errores en frontend** con try/catch y mostrar mensajes al usuario.
9. **Implementar FASE 1 completa primero**, verificar que funcione, y luego FASE 2.

---

## ORDEN DE IMPLEMENTACIÓN SUGERIDO

### Fase 1 (hacer en este orden):
1. Migración SQL (nuevas columnas en users)
2. Middleware de upload (multer)
3. Rutas backend de perfil (PUT /me, POST /me/avatar, GET /:id/profile, GET /search)
4. Actualizar rutas existentes (/me, /login, broadcastRoom, broadcastOnlineUsers)
5. Actualizar AuthContext (agregar updateUser)
6. Crear AvatarCircle
7. Crear ProfileModal
8. Crear PublicProfileModal
9. Integrar avatares en UserBar, LobbyPage, WaitingRoom, RacingPhase, ResultsPhase
10. Actualizar CarreraDeCaballos.jsx con nuevos estados y modales

### Fase 2 (hacer en este orden):
1. Migración SQL (friendships, direct_messages, game_invites)
2. Rutas backend de amigos
3. Rutas backend de mensajes
4. Socket events sociales (send_direct_message, send_game_invite, respond_game_invite)
5. Map adicional userSockets en gameEvents.js
6. Registrar rutas en index.js
7. Crear FriendsPanel
8. Crear DirectChat
9. Crear GameInviteNotification
10. Integrar en UserBar, ResultsPhase, PublicProfileModal, CarreraDeCaballos.jsx
