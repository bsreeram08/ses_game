# Feature Overview: 003 - Core Gameplay (Custom Rules - MVP)

## Goal

Implement the fundamental turn-based gameplay loop based on the **custom ruleset**, including rotating dealers, card dealing, submissions based on prompt requirements, dealer judging, and collecting black cards for scoring.

## Core Requirements (MVP)

- **Dealer Rotation:**
  - Implement logic to rotate the "dealer" role among players sequentially each round.
  - Track the current dealer for each round.
- **Round Structure:**
  - The current dealer draws and displays a black prompt card.
  - The prompt card may specify if 1 or 2 answer cards are required. (Default to 1 for MVP if not specified).
- **Card Dealing:**
  - Deal 10 white answer cards to each player at the start of the game.
  - Allow players (including the dealer when not judging) to draw back up to 10 cards after playing cards in a round.
  - Manage prompt and answer card decks (shuffling, drawing based on selected Card DB ID).
- **Submission Flow:**
  - Allow non-dealer players to select the required number of answer cards (1 or 2, default 1 for MVP) from their hand to submit.
  - Anonymously display submitted cards/combinations to the dealer after all submissions are in (or timer expires).
- **Judging Flow:**
  - Allow the dealer to review all submitted answer cards/combinations against the prompt card.
  - The dealer reads the prompt + answer combination aloud (implicitly through UI presentation).
  - Allow the dealer to select one winning submission.
- **Scoring (Card Collection):**
  - The player whose submission was chosen as the winner receives the black prompt card for that round.
  - Track the black cards collected by each player.
- **Game End Condition:**
  - End the game after a pre-defined number of rounds (calculated based on player count and dealer turns per player setting from game creation).
  - The player with the most collected black cards at the end is the winner. Announce the winner.
- **State Management:** Use Firebase (Firestore/RTDB) and potentially React Context/reducers to manage and synchronize the custom game state across clients.

## Related Documents

- `features.md` (Custom Rules Description)
- `rules.md` (Game Logic Implementation, Card Management, Client-Server Synchronization)
- `memory-bank/systemPatterns.md` (Real-time Communication, Key Implementation Paths)
- `memory-bank/techContext.md` (Firebase Firestore, RTDB)
- `memory-bank/decisionLog.md` (Custom ruleset decision)
- `memory-bank/features/002-game-creation-lobby.md` (Game duration setting)

## Future Enhancements (Phase 2+)

- Explicitly handling prompts that require 2 answer cards.
- Implementation of special rounds (Chai Break, Jugaad, etc. - _priority TBD_).
- Tie-breaker logic if multiple players have the same number of black cards at the end.
- Visual effects for card reveals/winner selection (Feature 105).
- AI Commentary integration (Feature 106).
