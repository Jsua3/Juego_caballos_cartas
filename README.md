# 🏇 Carrera de Caballos — Baraja Española

Juego de carreras automatizado basado en la baraja española. Cuatro caballos compiten en una pista, avanzando según las cartas que se sacan del mazo. El jugador apuesta por el caballo ganador antes de iniciar la carrera.

---

## ▶️ CÓMO EJECUTARLO

> **Requisitos previos:** tener instalado [Node.js](https://nodejs.org) (versión 16 o superior).

Abre una terminal en la carpeta del proyecto y ejecuta:

```bash
npm install
```

```bash
npm start
```

El navegador se abrirá automáticamente en **http://localhost:3000**

---

## 🎮 Cómo se juega

### 1. Hacer una apuesta
- Elige cuántas monedas apostar: **50**, **100** o **200**
- Selecciona el caballo al que le apuestas (Oros, Copas, Espadas o Bastos)
- Pulsa **"¡Iniciar Carrera!"**

### 2. La carrera
- Las cartas se sacan automáticamente del mazo
- Cada carta hace avanzar al caballo de su palo
- La carrera puede pausarse o acelerar/desacelerar con el control de velocidad

### 3. Cartas de pista (penalizaciones)
- Al inicio, **7 cartas** se colocan boca abajo a lo largo de la pista
- Cuando **todos** los caballos superan una posición, esa carta se revela
- Si la carta de pista coincide con el palo de un caballo, ese caballo **retrocede 1 paso**

### 4. Ganar / Perder
- Gana el caballo que **cruce la meta** (posición 7) primero
- Si tu apuesta coincide con el ganador: **cobras x4** tu apuesta
- Si no: pierdes la cantidad apostada

---

## 🃏 Las cartas

Se usa una **baraja española de 40 cartas** (sin los Reyes, que son los caballos):

| Palo | Emoji | Color |
|------|-------|-------|
| Oros | 🪙 | Amarillo |
| Copas | 🏆 | Rojo |
| Espadas | ⚔️ | Azul |
| Bastos | 🪵 | Verde |

Números usados: **1, 2, 3, 4, 5, 6, 7, 10, 11** (9 cartas por palo = 36 cartas en el mazo + 4 Reyes como caballos)

---

## 🏗️ Estructura del proyecto

```
juego_caballos/
├── public/
│   └── index.html          # HTML base
├── src/
│   ├── CarreraDeCaballos.jsx  # Componente principal del juego
│   ├── index.js            # Punto de entrada de React
│   └── index.css           # Estilos (Tailwind CSS)
├── tailwind.config.js      # Configuración de Tailwind
└── package.json            # Dependencias del proyecto
```

---

## 🛠️ Tecnologías usadas

- **React 18** — interfaz y estado del juego
- **Tailwind CSS** — estilos y diseño visual
- **Hooks:** `useState`, `useEffect`, `useCallback`, `useRef`

---

## 📐 Conceptos de programación aplicados

| Concepto | Uso en el juego |
|----------|----------------|
| **Arrays** | Mazo de cartas, pista, registro de eventos |
| **Objetos / Maps** | Posiciones de caballos `{ oros: 0, copas: 0, ... }` |
| **Stack (Pila)** | El mazo funciona como LIFO al sacar cartas |
| **Operadores aritméticos** | Incremento de posición, cálculo de ganancias (x4) |
| **Operadores de comparación** | Detectar ganador, mínimo de posiciones |
| **Operadores lógicos** | Condiciones de penalización y fin de juego |
| **Aleatorización** | Shuffle del mazo con algoritmo Fisher-Yates |
