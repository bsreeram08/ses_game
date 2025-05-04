# Feature Overview: 006 - Core Dependencies Setup (MVP)

## Goal

Install and perform initial configuration for the core third-party libraries required for the MVP, ensuring the project has the necessary tools for UI, state, forms, and data fetching.

## Core Requirements (MVP)

- **Package Manager:** Use the confirmed package manager (`bun` assumed, pending confirmation) to install dependencies.
- **Firebase Client SDK:** Install `firebase`. (Configuration handled in Feature 005).
- **UI Library (shadcn/ui):**
  - Install `tailwindcss`, `postcss`, `autoprefixer`.
  - Initialize `tailwind.config.js` and `postcss.config.js`.
  - Run `shadcn-ui init` to set up `components.json` and base UI directory structure (`@/components/ui`).
  - Install necessary base components (e.g., `button`, `input`, `dialog`).
- **Form Handling:**
  - Install `react-hook-form`.
  - Install `zod` for schema validation.
  - Install `@hookform/resolvers` for integrating Zod with React Hook Form.
- **Data Fetching (Client-side):**
  - Install `@tanstack/react-query`.
  - Set up a basic QueryClientProvider in the application layout.

## Related Documents

- `features.md` (Technology Stack Overview)
- `rules.md` (Technology Stack Overview, Core Stack)
- `memory-bank/techContext.md` (Core Technologies, Key Dependencies)
- `memory-bank/activeContext.md` (Core Dependencies Installation step)

## Future Enhancements (Phase 2+)

- Installation of testing libraries (React Testing Library, Jest).
- Installation of state management libraries if needed beyond Context (e.g., Zustand).
- Installation of internationalization libraries (e.g., `i18next`).
- Installation of analytics/error tracking libraries (Sentry, Firebase Analytics).
