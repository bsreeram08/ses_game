# System Patterns: Indian Cards Against Humanity

## Core Architecture

- **Client-Server Model:** A web-based client (Next.js) interacts with a backend service layer (Firebase Cloud Functions) and databases (Firestore, Realtime Database).
- **Real-time Communication:** Firebase Realtime Database is used for low-latency updates essential for gameplay (player status, card submissions, game state changes).
- **Serverless Backend:** Firebase Cloud Functions handle core game logic, authentication, and database interactions, providing scalability and reducing infrastructure management.
- **Document Database:** Firestore stores persistent data like user profiles, card definitions, and game history in a flexible, scalable NoSQL format.

## Key Technical Decisions & Patterns

- **Framework Choice:**
  - **Frontend:** Next.js (React framework) chosen for its features like server-side rendering (SSR), static site generation (SSG), API routes, image optimization, and strong community support.
  - **Backend & Database:** Firebase suite (Authentication, Firestore, Realtime Database, Cloud Functions) selected for its integrated services, real-time capabilities, scalability, and ease of use, especially for rapid development.
- **State Management:**
  - Client-side state likely managed using React hooks (`useState`, `useContext`, `useEffect`) and potentially custom hooks (`useGame`, `useAuth`) for specific concerns.
  - Real-time synchronization handled via Firebase listeners attached to Firestore and Realtime Database paths.
- **API Design:**
  - Next.js API routes will likely serve as an intermediary layer for certain actions, potentially validating requests before interacting with Firebase or handling specific non-realtime tasks.
- **Component Structure:**
  - UI components organized using a modular approach (e.g., `/components/ui`, `/components/game`).
  - Leveraging a UI library like `shadcn/ui` for pre-built, customizable components to accelerate UI development.
- **Authentication:** Firebase Authentication provides a ready-made solution for email/password and social logins (Google, Facebook).
- **Scalability:** Relying on Firebase's inherent scalability for database and function execution. Firestore sharding and strategic function use are planned for future growth.
- **Optimization:** Employing techniques like code splitting, image optimization, caching (service workers), and efficient database queries (Firebase indexing) to ensure good performance.

## Component Relationships (High-Level)

```mermaid
graph LR
    A[User Browser (Next.js Frontend)] -- HTTPS/WSS --> B(Firebase Services);
    B -- Auth --> BA(Firebase Authentication);
    B -- Realtime Updates --> BRTD(Firebase Realtime Database);
    B -- Data Persistence --> BFS(Firebase Firestore);
    B -- Backend Logic --> BCF(Firebase Cloud Functions);

    A -- API Calls --> C(Next.js API Routes);
    C -- Server-side Logic --> B;

    BCF -- Read/Write --> BFS;
    BCF -- Read/Write --> BRTD;
    BCF -- Triggered By --> BFS(Firestore Events);
    BCF -- Triggered By --> BA(Auth Events);
    BCF -- Triggered By --> BRTD(RTDB Events);

    subgraph Firebase
        direction LR
        BA;
        BRTD;
        BFS;
        BCF;
    end

    subgraph Next.js App
        direction TB
        A;
        C;
    end

```

## Key Implementation Paths

- **Game State Synchronization:** Ensuring consistent game state across all players' clients using Firebase Realtime Database listeners and Cloud Functions for authoritative updates.
- **Card Management:** Efficiently dealing, submitting, and tracking cards, potentially involving Cloud Functions for shuffling and dealing logic and Firestore/RTDB for hand management.
- **Round Lifecycle:** Managing the flow from prompt display, submissions, judging, scoring, and transitioning to the next round, likely orchestrated by Cloud Functions.
- **Special Round Logic:** Implementing the unique triggers and rule modifications for each special round type within Cloud Functions.
