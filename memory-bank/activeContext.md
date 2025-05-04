# Active Context: Indian Cards Against Humanity (Post-Custom Rules Definition)

## Current Work Focus

- **Project Re-Planning:** Updating Memory Bank (core docs, feature index, feature overviews) to reflect the newly defined custom ruleset (rotating dealer, collect black cards, custom duration/cards, AI commentary).
- **Phase 1 Planning (Revised):** Preparing to create detailed implementation plans for the MVP features, starting with User Authentication, considering the impact of the custom rules.

## Immediate Next Steps

1.  **Finalize MVP Feature Plans:** Create/update detailed `feature-plans` for the MVP features (001-006), ensuring they align with the custom ruleset. Start with `001-user-authentication`.
2.  **Firebase Project Setup:**
    - Create/confirm a Firebase project.
    - Configure necessary services (Authentication, Firestore, Realtime Database, Cloud Functions).
    - Set up initial Firestore security rules (referencing `rules.md` and custom game logic).
    - Integrate Firebase SDK into the Next.js application (`lib/firebase.ts`) using a placeholder for credentials (Option 1).
3.  **Core Dependencies Installation:** Install necessary packages (`firebase`, `shadcn-ui`, `react-hook-form`, `zod`, `@tanstack/react-query`, etc.) using `bun`.
4.  **Begin MVP Feature 1:** Start implementation of User Authentication (`001-user-authentication`) based on its feature plan.

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

- The project has pivoted to a custom ruleset, significantly differentiating it from standard CAH. This requires careful re-planning of core features.
- Flexibility in planning is key; the Memory Bank structure allows us to adapt to major requirement changes.
