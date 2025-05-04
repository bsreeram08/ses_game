# Feature Overview: 002 - Game Creation & Lobby (MVP)

## Goal

Allow authenticated users to create new game rooms, configure basic settings, invite others, and manage a pre-game lobby before starting the game.

## Core Requirements (MVP)

- **Game Creation:**
  - UI form to create a new game.
  - Basic settings: Player limit (3-10), Game duration (e.g., number of dealer turns per player), Card database ID selection (instead of packs), Family mode toggle.
  - Generate a unique game room ID/code upon creation.
  - Store game configuration in Firestore (`/games/{gameId}/settings`).
- **Shareable Link/Code:** Provide a way for the host to easily share the game code or a direct link to join the room.
- **Lobby/Waiting Room:**
  - Display a list of players currently in the room.
  - Show player readiness status.
  - Implement a "Ready Up" button for players.
  - Real-time updates for player joins/leaves/readiness (using Firebase RTDB or Firestore listeners).
- **Host Controls:**
  - Ability for the host (creator) to start the game once minimum players (3) are ready.
  - Ability for the host to kick players from the lobby.

## Related Documents

- `features.md` (Phase 1: MVP - Game Creation & Lobby, Firestore Schema)
- `rules.md` (Firebase Implementation, Room Management)
- `memory-bank/systemPatterns.md` (Real-time Communication, Firestore Usage)
- `memory-bank/techContext.md` (Firebase Firestore, RTDB)
- `memory-bank/decisionLog.md` (Custom ruleset decision)

## Future Enhancements (Phase 2+)

- More advanced game settings (enabling specific special rounds - _priority TBD_).
- Password protection for private rooms.
- Ability to upload/manage custom card sets (Feature 101).
- Spectator mode.
- Displaying player avatars/profiles in the lobby.
- In-lobby chat.
