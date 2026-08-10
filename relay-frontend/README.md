# Relay — video chat frontend

A React (Vite) frontend for the Spring Boot video-chat backend: JWT auth, rooms, live chat, and
WebRTC video calls signaled over STOMP/WebSocket.

## Setup

```bash
npm install
npm run dev
```

This starts a dev server at `http://localhost:5173`. Open it in your browser while your Spring
Boot backend is running (default expected at `http://localhost:8080` — editable from the input in
the top-right corner of the app).

To build for production:

```bash
npm run build
npm run preview   # serve the production build locally
```

## What it does

- **Auth** — `POST /auth/register`, `POST /auth/login`, then `GET /users/me`. The JWT is kept in
  React state only (never `localStorage`), so refreshing the page logs you out.
- **Rooms** — `POST /rooms` to create, `POST /rooms/{code}/join` + `GET /rooms/{code}` to join,
  `POST /rooms/{code}/leave` on exit.
- **Realtime** — connects to `/ws` with SockJS + STOMP, subscribes to `/topic/room.{code}.chat`
  and `/topic/room.{code}.roster`, and publishes to `/app/chat.send/{code}`,
  `/app/room.join/{code}`, `/app/room.leave/{code}`.
- **Video calls** — uses `/app/signal.send` and `/user/queue/signal` to exchange WebRTC
  offers/answers/ICE candidates (STUN only, no TURN — fine on the same network, may not traverse
  strict NATs).

## Known backend gaps to be aware of

1. **CORS** — no CORS configuration was found in the backend. If the dev server (a different
   origin/port than the backend) gets blocked, add a `CorsConfigurationSource` on the Spring side
   allowing `http://localhost:5173`.
2. **Per-user signaling** — `ChatController.relaySignal` uses `convertAndSendToUser(target, ...)`,
   which requires Spring to know each STOMP session's `Principal`. `WebSocketConfig` doesn't
   currently set one up, so `/user/queue/signal` may not deliver until the backend associates the
   JWT-authenticated user with the WebSocket session (typically via a `HandshakeInterceptor`).
   Chat and the participant roster work regardless.

## Project structure

```
src/
  App.jsx        — the entire app: auth, dashboard, room/video/chat screens
  main.jsx        — React entry point
  index.css       — Tailwind entry + small global styles
index.html
tailwind.config.js
vite.config.js
```
