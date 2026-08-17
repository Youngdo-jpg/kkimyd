# CLAUDE.md

Guidance for Claude Code (and other AI assistants) working in this repository.

## Repository note (read this first)

This repo has **no `main`/`master` history** — `master` is an empty, commit-less
branch. GitHub's configured default branch (and the branch this checkout tracks)
is `claude/cross-device-messaging-app-SAVvb`, which contains the actual
application described below.

There is also an unrelated `claude/breakout-game-python-if7tys` branch (a
standalone Python/Pygame Breakout clone). It shares no code, dependencies, or
history with the messenger app — treat it as a separate one-off project, not
part of this codebase. Everything below describes the messenger app only.

## What this is

**kkimyd** (`package.json` description: "P2P 크로스 디바이스 메신저 - Gun.js 로컬
퍼스트") is a P2P, local-first cross-device chat app. There is deliberately
**no central application server or database**. Each device/browser holds its
own copy of the data (IndexedDB via Gun's `rindexed`), and devices sync
directly with each other over Gun.js's P2P protocol — optionally routed
through a "relay" peer that any user can run on their own machine.

Visually it mimics KakaoTalk (yellow/brown theme, rounded chat bubbles).

## Layout

```
client/    React 18 + Vite PWA frontend — the actual chat app (start here for UI/logic work)
relay/     Optional Node/Express relay peer — NOT a backend/API server, just P2P routing + file storage
```

Root `package.json` only wires convenience scripts across the two workspaces
(there is no root `node_modules`; `client` and `relay` install independently).

### `client/` structure

```
src/
  lib/gun.js                 Gun instance, SEA export, peer list (localStorage), session recall
  stores/                    Zustand stores — all app state and Gun read/write logic lives here
    authStore.js              SEA login/register/logout/session restore
    chatStore.js               rooms, messages, typing indicators, all chat Gun graph operations
    peerStore.js                relay peer list (persisted to localStorage as `kkimyd_peers`)
  pages/                     Route-level screens: LoginPage, RegisterPage, ChatPage
  components/
    Chat/                     ChatRoom, MessageBubble, MessageInput, EmptyChat
    Sidebar/                  Sidebar (room list), NewChatModal
    Common/                   PeerSettings (relay peer config UI)
  App.jsx                    Route table + auth gate (ProtectedRoute) + session bootstrap
  main.jsx                   ReactDOM root, wraps App in BrowserRouter
  index.css                  Tailwind layers + shared component classes (btn-kakao, input-field, chat-bubble-*)
```

### `relay/` structure

```
server.js   Express app: Gun.serve (P2P relay + graph persistence to radata/), /upload + /files
            (multer, 500MB limit) for out-of-band file transfer, /health
```

## Architecture: how data flows

- **Auth**: Gun's SEA module (`gun/sea`). `user.create()` / `user.auth()`
  generate/verify a public/private keypair from alias+password — there is no
  server-side account store. `currentUser` in `authStore` is just `{ alias, pub }`.
- **Storage**: every device persists the full graph it has seen to its own
  IndexedDB (`gun/lib/rindexed`, `radisk: true` in `client/src/lib/gun.js`).
  Nothing is required to be online centrally for a device to read its own data.
- **Sync**: devices connect to each other as Gun "peers". Peers are just relay
  WebSocket URLs (`ws://<ip>:8765/gun`) stored in `localStorage` under
  `kkimyd_peers` (see `peerStore.js` / `lib/gun.js:getPeers`). No relay is
  strictly required on the same LAN (Gun can multicast-discover), but a relay
  is needed for cross-network sync and is required for file transfer.
  **Adding/removing a peer requires a full page reload** — Gun's peer list is
  only read at construction time (see `PeerSettings.jsx` and `peerStore.js`
  comments).
- **Relay peer** (`relay/server.js`): explicitly *not* a central server — it's
  just a routing/buffering node any user can run (`npm run relay` /
  `cd relay && node server.js`). It also serves `/upload` for file messages
  (files are too large for the Gun graph, so they're relayed via plain HTTP
  and referenced by URL in the message).
- **Gun graph paths** (all under top-level `kkimyd` namespace):
  - `kkimyd/users/<pub>` — public profile: `{ alias, pub, status, updatedAt }`,
    plus a mirrored `rooms/<roomId>` sub-node used to notify the other member
    of a new room.
  - `kkimyd/rooms/<roomId>` — room metadata `{ id, type: 'direct'|'group', members, name?, createdAt, updatedAt, lastMsg }`.
  - `kkimyd/rooms/<roomId>/msgs/<msgId>` — individual messages.
  - `kkimyd/rooms/<roomId>/typing/<pub>` — ephemeral typing indicator, expires client-side after 4s.
  - `gun.user().get('kkimyd/rooms')` — the current user's own private index of
    room IDs they belong to (used to rebuild `rooms[]` on login).
  - Direct-room IDs are deterministic: `[pubA, pubB].sort().join('__')`
    (`chatStore.js:getRoomId`) so both sides derive the same room without a
    handshake.
- All reads/writes to Gun happen inside the Zustand stores — components never
  call `gun.get(...)` directly except `NewChatModal` (user search) and
  `authStore`/`chatStore`/`lib/gun.js` themselves. Keep new chat logic in
  `chatStore.js` rather than in components.

## Development workflow

```bash
npm run install:all   # installs both client/ and relay/ deps
npm run dev            # client/: vite dev server
npm run relay          # relay/: optional relay peer on :8765 (PORT env overrides)
npm run build           # client/: vite build (PWA output)
```

There is no test suite and no lint script configured in either package —
don't invent a `npm test`/`npm run lint` invocation; verify changes by running
the dev server.

To exercise cross-device sync locally: run `npm run relay`, then in
`PeerSettings` (gear/lightning icon in the sidebar or login screen) add
`ws://<relay-host>:8765/gun`, reload, and open the client from a second
device/browser profile on the relay's network.

## Conventions

- **Imports use explicit `.js`/`.jsx` extensions** (this is a native ESM
  project — `type: "module"` in `client/package.json`). Keep doing this for
  new files.
- **State**: Zustand only (`create((set, get) => ({...}))`), no Redux/Context
  for app state. One store per domain (auth/chat/peer); add new domains as new
  stores rather than growing existing ones indefinitely.
- **Styling**: Tailwind utility classes inline in JSX; shared patterns are
  defined once in `index.css` under `@layer components` (`btn-kakao`,
  `input-field`, `chat-bubble-mine`, `chat-bubble-other`) — reuse those rather
  than re-writing the same utility strings. Brand colors live in
  `tailwind.config.js` under the `kakao` key (`yellow #FEE500`, `brown
  #3C1E1E`, chat background `#B2C8E0`).
- **UI copy is Korean.** Match the existing tone/register (informal but
  polite) for any new user-facing strings. Code identifiers and comments are
  a mix of English identifiers with occasional Korean comments explaining
  *why* (especially around Gun.js quirks) — follow that pattern rather than
  translating existing comments.
- **Icons**: inline SVGs (Heroicons-style `stroke="currentColor"` paths)
  copy-pasted per component; no icon library dependency. Follow the same
  pattern for consistency rather than adding a new icon package.
- **No central error/loading abstraction** — each store exposes its own
  `loading`/`error` fields (see `authStore`) and components branch on them
  directly. Follow that per-store pattern rather than introducing global
  error handling.
- **Commit messages**: Conventional Commits prefixes (`feat:`, `chore:`, …)
  with Korean descriptions, e.g. `feat: P2P 로컬 퍼스트 아키텍처로 전면 재설계`.

## Things to watch for

- Gun's live subscriptions (`.on(...)`) are never explicitly torn down in
  `chatStore.js` (`listeners` is tracked but not used to `.off()` anything) —
  be aware of this when touching subscription logic; it's an existing gap,
  not a pattern to copy into new features without considering cleanup.
- `PeerSettings` / `peerStore.addPeer` mutates `localStorage` but Gun only
  reads peers at init — any change needs the reload prompt that's already
  wired up; don't assume runtime peer updates take effect without it.
- File upload (`MessageInput.jsx:uploadFiles`) hard-requires a relay peer
  (`getRelayHttp()` reads the first entry in `kkimyd_peers`); it fails
  gracefully with an alert if none is configured — preserve that fallback if
  you touch this path.
- `relay/radata/` and `relay/uploads/` are runtime-generated (gitignored) —
  don't check them in or assume they exist in a fresh clone.
