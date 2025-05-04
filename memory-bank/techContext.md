# Tech Context: Indian Cards Against Humanity

## Core Technologies

- **Frontend Framework:** Next.js (v13+ assumed, using App Router based on structure)
- **UI Library:** shadcn/ui (built on Radix UI and Tailwind CSS)
- **Backend-as-a-Service (BaaS):** Firebase
  - **Authentication:** Firebase Authentication (Email/Password, Google, Facebook)
  - **Database (Persistent):** Firestore (NoSQL Document Database)
  - **Database (Real-time):** Firebase Realtime Database
  - **Serverless Functions:** Firebase Cloud Functions
- **Language:** TypeScript (implied by `.ts`/`.tsx` file extensions in the plan)
- **Package Manager:** Likely `npm` or `yarn` (based on `package.json`), or `bun` (based on `bun.lock` in CWD) - _Confirmation needed if specific manager is preferred._
- **Styling:** Tailwind CSS (via shadcn/ui) and potentially global CSS (`globals.css`).

## Development Setup & Environment

- **Operating System:** User is on macOS. Development should be compatible.
- **Node.js:** Required for Next.js and Firebase tools. Specific version TBD, but likely a recent LTS version.
- **Firebase CLI:** Needed for deploying Cloud Functions and managing Firebase projects.
- **Code Editor:** VS Code (as indicated by environment details).
- **Version Control:** Git (implied by `.gitignore` in CWD). Repository hosting not specified (e.g., GitHub, GitLab).

## Technical Constraints & Considerations

- **Firebase Usage:** Heavy reliance on Firebase services means understanding its pricing model, quotas, and limitations is crucial.
- **Real-time Synchronization:** Managing real-time updates efficiently across potentially many concurrent users requires careful structuring of Realtime Database paths and Cloud Function triggers.
- **Scalability:** While Firebase scales, optimizing Firestore queries (indexing) and Cloud Function performance (cold starts, execution time) will be important as the user base grows.
- **Offline Support:** Basic offline functionality is desired (Phase 2), requiring strategies like service workers and local caching.
- **Cross-Browser/Device Compatibility:** Need to test thoroughly on target browsers and devices (Chrome, Firefox, Safari, Edge; iOS 12+, Android 8+).
- **Accessibility:** Adherence to WCAG guidelines is a stated goal.

## Key Dependencies (from `features.md` plan)

- `next`
- `react`, `react-dom`
- `firebase` (client SDK)
- `firebase-admin` (for Cloud Functions)
- `firebase-functions`
- `shadcn-ui` (and its dependencies: `tailwindcss`, `radix-ui`, `lucide-react`, etc.)
- `typescript`
- Potentially state management libraries if React Context isn't sufficient (e.g., Zustand, Jotai - though not explicitly mentioned).

## Tool Usage Patterns

- **Firebase Console:** For managing database rules, monitoring usage, viewing logs.
- **Firebase CLI:** For deployment and local emulation.
- **Next.js CLI:** For development server, builds.
- **Git:** For version control and collaboration.
