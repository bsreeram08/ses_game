# Progress: Indian Cards Against Humanity (Post-Custom Rules Definition)

## Current Status

- **Phase:** Project Re-Planning / Pre-Development.
- **Overall:** The initial Memory Bank structure is established. A custom ruleset has been defined, requiring updates to core documents and feature plans. No code implementation has started.
- **Focus:** Finalizing Memory Bank updates and preparing detailed implementation plans for the revised MVP features.

## What Works

- Memory Bank structure established (`.clinerules`, `.windsurfrules`, core `.md` files, feature index, MVP feature overviews).

## What's Left to Build (High-Level based on revised plan)

- **Phase 1: MVP (Revised)**
  - User Authentication (001)
  - Game Creation & Lobby (Custom Settings) (002)
  - Core Gameplay (Custom Rules: Rotating Dealer, Collect Black Cards) (003)
  - Basic UI/UX (004)
  - Firebase Setup & Integration (005)
  - Core Dependencies Setup (006)
- **Phase 2: Enhanced Features**
  - Expanded Card Content (incl. Custom JSON Upload - Paid) (101)
  - Advanced Game Modes (Special Rounds - _Re-evaluate_, Tournament, Team Play) (102)
  - Social Features (103)
  - Progression System (104)
  - Advanced UI & Animations (105)
  - AI Commentary (106)
- **Phase 3: Monetization & Scaling**
  - Premium Features (Ad-free, Customization, Exclusive Content) (201)
  - Analytics & Improvements (202)
  - Localization (203)
  - Community Building (204)
- **Technical Foundations:**
  - Detailed Feature Plans (`memory-bank/feature-plans/`) for all MVP features.
  - Firebase Setup (Actual configuration, detailed rules).
  - Next.js Project Implementation (Code).
  - Dependency Implementation.

## Known Issues

- N/A (No implemented features yet).

## Evolution of Project Decisions

- **[YYYY-MM-DD HH:MM:SS] - Initial Decision:** Adopt the comprehensive plan outlined in `features.md` as the roadmap.
- **[YYYY-MM-DD HH:MM:SS] - Initial Decision:** Establish a Memory Bank system for documentation and context persistence.
- **[YYYY-MM-DD HH:MM:SS] - Initial Decision:** Utilize Next.js, Firebase (Auth, Firestore, RTDB, Functions), TypeScript, and shadcn/ui as the core technology stack.
- **[2025-05-04 17:00:19] - Major Decision:** Adopted a custom ruleset (rotating dealer, collect black cards, custom duration/cards, AI feature) distinct from standard CAH, requiring updates to plans and features. (See `decisionLog.md`).
