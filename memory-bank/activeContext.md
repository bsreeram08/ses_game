# Active Context: Samudhayam Ethirkum Attai

## Current Work Focus

- **Game Stability & Error Handling:** Implementing robust error tracking with Firebase Analytics and improving game state recovery mechanisms to address issues with corrupted game states.
- **Core Gameplay Enhancement:** Fixing critical issues with game state management, particularly around player readiness and game initialization.
- **User Experience Improvements:** Converting full-page errors to toast notifications for a better user experience and providing clear feedback about game state.

## Immediate Next Steps

1. **Expand Error Tracking Coverage:**
   - Implement error tracking in remaining critical components
   - Add more detailed analytics events for key user actions
   - Create a dashboard for monitoring errors in production

2. **Further Game State Improvements:**
   - Add automated detection of corrupted game states
   - Implement proactive fixes that run before issues affect gameplay
   - Add more robust validation for game state transitions

3. **Testing & Validation:**
   - Conduct thorough testing of the error tracking system
   - Test game state recovery mechanisms in various scenarios
   - Verify that toast notifications work correctly across the application

4. **Documentation:**
   - Update technical documentation with error handling patterns
   - Document common error scenarios and their solutions
   - Create troubleshooting guides for users

## Active Decisions & Considerations

- **Package Manager:** Confirmed use of `bun`.
- **Firebase Configuration:** Proceeding with Option 1 (placeholder file `lib/firebase.ts` to be created). User will add credentials manually.
- **Initial Card Data:** Confirmed cards will exist in the database; games will reference a card DB ID during creation.
- **Custom Rules Impact:** Need to carefully consider how the rotating dealer, black card collection, and customizable duration affect the implementation of Core Gameplay (003) and Game Creation (002) features during detailed planning.
- **AI Feature (106):** Integration details (specific AI service, API keys, prompt engineering) deferred to Phase 2 planning.
- **Original Special Mechanics (Chai Break, etc.):** Priority needs re-evaluation in light of the new core ruleset during Phase 2 planning.

## Important Patterns & Preferences (Emerging)

- **Memory Bank Driven:** Development relies heavily on maintaining and referencing the core Memory Bank files (`projectbrief.md`, `productContext.md`, `activeContext.md`, `systemPatterns.md`, `techContext.md`, `progress.md`, `decisionLog.md`), the feature index (`feature-index.md`), and specific feature/plan files.
- **Feature Management:** Adhering to the structure defined in `.clinerules` (`feature-index.md`, `features/`, `feature-plans/`).
- **Phased Approach:** Following the MVP -> Enhanced Features -> Scaling plan outlined in `features.md` and tracked via `feature-index.md`, adapted for the custom rules.
- **Technology Stack:** Adherence to Next.js, Firebase, TypeScript, and shadcn/ui as defined in `.windsurfrules`.

## Learnings & Insights (Initial)

- The project has pivoted to a custom ruleset, significantly differentiating it. This requires careful re-planning of core features.
- Flexibility in planning is key; the Memory Bank structure allows us to adapt to major requirement changes.
