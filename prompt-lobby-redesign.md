# PROMPT PARA CLAUDE CODE — Rediseño del Lobby: Barra de Conexiones + Grid de Salas

## CONTEXTO

Este es el proyecto "Carrera de Caballos", un juego multijugador con React 18 + Tailwind CSS + Framer Motion (frontend) y Node.js + Express + Socket.IO + MySQL (backend). Recientemente se implementó un sistema de perfiles con avatar y un sistema social con amigos. Ahora necesitamos reorganizar el layout del Lobby.

### Archivos que se van a modificar:
- `src/components/Lobby/LobbyPage.jsx` (454 líneas) — **REESCRITURA MAYOR**
- `src/components/Shared/UserBar.jsx` (128 líneas) — **MODIFICACIÓN**
- `src/CarreraDeCaballos.jsx` (745 líneas) — **AJUSTES MENORES**

### Archivos que se pueden eliminar:
- `src/components/Lobby/RoomCard.jsx` (ya no se usa, las salas se renderizan directo en LobbyPage)

---

## CAMBIOS REQUERIDOS

---

### 1. UserBar.jsx — Simplificar

El UserBar actualmente tiene: avatar + nombre + puntos (centro), y botones Amigos, Stats, Puntos, Salir (derecha).

**Cambios:**
- **ELIMINAR** el botón "Amigos" del navbar (los amigos ahora se ven en la barra de conexiones dentro del lobby).
- **ELIMINAR** el botón "Stats" del navbar (los stats ahora se ven en la tarjeta de perfil dentro de la barra de conexiones).
- **MANTENER**: Logo "Sala de Apuestas" (izquierda), Avatar+Nombre+Puntos (centro), botones "Puntos" y "Salir" (derecha).
- **ELIMINAR** las props `onFriends`, `friendsBadge`, `onStats` del componente. Mantener `onPurchase`, `onProfile`.
- El avatar+nombre del centro sigue siendo clickeable para abrir ProfileModal (prop `onProfile`).

### 2. LobbyPage.jsx — REESCRITURA COMPLETA

El LobbyPage actual tiene: título, StatsBar dorada, botones crear/unirse, lista vertical de salas, y barra inferior de usuarios online.

**NUEVO LAYOUT (de arriba a abajo):**

#### A) Barra de conexiones (debajo del navbar, ocupa todo el ancho)

Una barra horizontal con scroll que contiene 3 secciones separadas por divisores verticales sutiles:

**Sección 1: Mi perfil (tarjeta compacta horizontal)**
- Contenedor con fondo `rgba(180,134,20,0.07)`, borde `1px solid rgba(180,134,20,0.2)`, border-radius 14px, padding 8px 14px.
- Dentro: AvatarCircle (44px) con borde dorado brillante + dot verde de "online", al lado un bloque con:
  - Nombre (display_name o username), font-weight 700, 12px, color blanco.
  - Una fila de stats en texto pequeño (9-10px): `{games_played} jugadas · {games_won} ganadas · {win_rate}% win`. El win_rate en verde si >= 50%.
  - Texto "EDITAR PERFIL ✎" en dorado tenue (8px), con onClick que abre ProfileModal.
- Los stats se cargan con `GET /api/users/stats` al montar el componente.
- Click en la tarjeta completa también abre ProfileModal.

**Divisor + Label "AMIGOS"**
- Línea vertical de 1px, alto 40px, color `rgba(180,134,20,0.15)`.
- Texto "AMIGOS" en 8-9px, color `rgba(180,134,20,0.4)`, letter-spacing 1px.

**Sección 2: Amigos**
- Cargar con `GET /api/friends` al montar.
- Cada amigo es un `conn-item`: AvatarCircle (48px) con borde `2px solid rgba(180,134,20,0.4)`, fondo `rgba(180,134,20,0.15)`, y un dot de estado (verde = online, gris = offline).
- Debajo: nombre truncado (9px, max-width 60px).
- Click en un amigo → abrir PublicProfileModal para ese amigo (usar `onViewProfile`).
- Los amigos online van primero, los offline después.

**Divisor + Label "EN LÍNEA"**
- Mismos estilos que el divisor de amigos.

**Sección 3: Otros usuarios online**
- Los usuarios de `onlinePlayers` que NO son amigos y NO son el usuario actual.
- Mismo estilo de avatar pero con borde gris (`2px solid rgba(100,100,100,0.4)`) y fondo `rgba(255,255,255,0.06)`.
- Click → abrir PublicProfileModal.

**Sección 4: Botón "+" Buscar**
- Círculo de 48px con borde dashed dorado, símbolo "+" en el centro.
- Texto "Buscar" debajo (9px, dorado tenue).
- Click → abrir FriendsPanel con la tab de búsqueda activa. Para esto, pasar una prop `onOpenSearch` que venga de CarreraDeCaballos.jsx.

**Estilos de la barra:**
- `overflow-x: auto` con `scrollbar-width: none` (ocultar scrollbar).
- Padding: 14px 24px 12px.
- border-bottom: `1px solid rgba(180,134,20,0.12)`.
- Los items se disponen con `display: flex; gap: 12px; align-items: flex-start`.

#### B) Sección de salas (debajo de la barra de conexiones)

**Cabecera:**
- Título "Salas disponibles" (18px, font-weight 800, letter-spacing 1px) a la izquierda.
- A la derecha, en la misma línea: botón "Crear sala" (dorado), input de código, botón "Unirse" (azul). Flex con gap 8px.
- El botón "Crear sala" abre el modal de selección de modo (caballos/blackjack) que ya existe en el código actual (el AnimatePresence con showModeModal).

**Grid de salas:**
- `display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px` (en pantallas pequeñas, usar `repeat(auto-fill, minmax(220px, 1fr))`).
- Cada sala es una tarjeta vertical con:
  - **Fila superior**: código de sala (font-weight 900, 16px, color dorado, letter-spacing 2px) + badge del modo de juego (Caballos = fondo amarillo tenue + texto amarillo, Blackjack = fondo azul tenue + texto azul).
  - **Fila del medio**: badge "Esperando" (verde) + texto "X/4 jugadores" + mini-avatares a la derecha.
    - Los mini-avatares son círculos de 22px. Los slots ocupados tienen fondo `rgba(180,134,20,0.25)` con la inicial del jugador. Los slots vacíos tienen fondo `rgba(255,255,255,0.08)` con borde dashed gris.
    - **NOTA**: El endpoint actual `GET /api/rooms` devuelve `player_count` pero NO devuelve los jugadores individuales. Por ahora, mostrar solo los slots (ocupados como círculos dorados sin inicial, vacíos como círculos dashed). No modificar el backend para esto.
  - **Botón**: "Unirse a la sala" — ancho completo, borde dorado, fondo transparente, hover con fondo `rgba(180,134,20,0.1)`.
  - **Estilos de la tarjeta**: `padding: 16px`, `border-radius: 14px`, `background: rgba(255,255,255,0.03)`, `border: 1px solid rgba(180,134,20,0.15)`. Hover: border más brillante + fondo ligeramente dorado.
- Toda la tarjeta es clickeable (onClick → onJoinRoom).

**Estado vacío:**
- Si no hay salas: emoji 🎰 grande (110px) + texto "No hay salas disponibles. ¡Crea una!" — igual que el actual.

**Estado cargando:**
- Texto "Cargando salas..." centrado.

#### C) ELIMINAR la barra inferior de "X en línea"

La barra fija del footer con los avatares online y el texto "X en línea" se **elimina completamente**. Esa información ahora está en la barra de conexiones.

#### D) ELIMINAR el componente StatsBar

La función `StatsBar` y la función `Stat` que están dentro de LobbyPage.jsx se eliminan. Las stats ahora se muestran en la tarjeta de perfil de la barra de conexiones.

#### E) MANTENER el modal de modo de juego

El modal `showModeModal` con los botones de Caballos/Blackjack se mantiene exactamente igual. No cambiar nada.

---

### 3. CarreraDeCaballos.jsx — Ajustes

- **Actualizar el componente `<UserBar>`**: Quitar las props `onStats`, `onFriends`, `friendsBadge`. Mantener `onPurchase`, `onProfile`.
- **Agregar prop `onOpenSearch` al `<LobbyPage>`**: Que al hacer click en el botón "+" de buscar, abra el FriendsPanel con la tab de búsqueda. Para esto:
  - Pasar `onOpenSearch={() => { setShowFriends(true); }}` al LobbyPage.
  - En FriendsPanel, agregar una prop `initialTab` (string, default 'friends'). Cuando se abre desde "Buscar", pasar `initialTab="search"`.
  - En CarreraDeCaballos, agregar un estado `friendsInitialTab` (default 'friends'). Cuando se invoque `onOpenSearch`, setear `friendsInitialTab('search')` y `setShowFriends(true)`.
  - Pasar `initialTab={friendsInitialTab}` a FriendsPanel.
  - En el onClose de FriendsPanel, resetear `friendsInitialTab` a 'friends'.
- **El botón Stats se queda en UserBar por ahora** — CORRECCIÓN: como los stats están ahora en la barra de conexiones, el botón Stats del navbar se ELIMINA. Pero el `<StatsModal>` se sigue renderizando en CarreraDeCaballos.jsx para que se pueda abrir desde otras partes si se necesita.
- **MANTENER** `showStats` y `<StatsModal>` en CarreraDeCaballos.jsx, pero ya no se invoca desde UserBar.

---

### 4. FriendsPanel.jsx — Ajuste menor

- Agregar prop `initialTab` (string, default 'friends').
- En el `useEffect` que se dispara cuando `isOpen` cambia a true, usar `initialTab` para setear `tab`:
  ```js
  useEffect(() => {
    if (isOpen) {
      loadAll();
      setTab(initialTab || 'friends');
      setChatTarget(initialChatTarget || null);
    }
  }, [isOpen, loadAll, initialTab]);
  ```
- En el tab "Buscar", el nombre interno del tab es `'search'` (verificar que coincida con `setTab('search')`). Actualmente el tab se llama `'search'` en el mapeo de tabs, así que debería funcionar. Verificar.

---

## PATRONES DE ESTILO A SEGUIR

1. **Fondo del lobby**: Mantener el `CASINO_BG` con el patrón de rombos verde oscuro + líneas doradas.
2. **Animaciones**: Usar `framer-motion` para entrada de la barra de conexiones (`initial={{ opacity: 0, y: -8 }}` → `animate={{ opacity: 1, y: 0 }}`), y para las tarjetas de sala (stagger con variants).
3. **Botones**: `motion.button` con `whileHover`, `whileTap`, y `playSound('click')`.
4. **AvatarCircle**: Importar desde `'../Shared/AvatarCircle'`. Props: `src`, `username`, `size`.
5. **Textos dorados de título**: `fontFamily: "'Cinzel', serif"`, letter-spacing, textShadow dorado.
6. **Responsive**: El grid de salas debe usar `repeat(auto-fill, minmax(220px, 1fr))` para adaptarse a pantallas pequeñas. La barra de conexiones usa scroll horizontal.
7. **Padding del contenido**: `pt-16` o `pt-[68px]` en el contenedor principal para no quedar detrás del navbar fixed.

---

## ORDEN DE IMPLEMENTACIÓN

1. Modificar `UserBar.jsx` (quitar botones Amigos y Stats, quitar props correspondientes).
2. Modificar `FriendsPanel.jsx` (agregar prop `initialTab`).
3. Reescribir `LobbyPage.jsx` completo con el nuevo layout.
4. Actualizar `CarreraDeCaballos.jsx` (ajustar props de UserBar, agregar onOpenSearch y friendsInitialTab).
5. Eliminar `RoomCard.jsx` si ya no se importa en ningún lado.
6. Verificar que no queden imports rotos.

---

## IMPORTANTE

- **No tocar** los archivos del backend.
- **No tocar** los componentes de juego (BettingPhase, RacingPhase, ResultsPhase, BlackjackGame, etc.).
- **No tocar** ProfileModal, PublicProfileModal, AvatarCircle, PurchaseModal, StatsModal — solo usarlos.
- **Mantener** el modal de selección de modo de juego (showModeModal) exactamente como está.
- **Mantener** toda la lógica de fetchRooms, createRoom, joinByCode tal como está en LobbyPage.
- **Los textos** deben estar en español.
