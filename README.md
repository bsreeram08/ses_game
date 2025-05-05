# Samudhayam Ethirkum Attai

A party game for horrible people, with an Indian twist. Built with Next.js, TypeScript, and Firebase.

## Features

### Authentication
- **Multiple Login Options**: Email/password, Google, Facebook, and anonymous (guest) login
- **Anonymous Login**: Play as a guest with a randomly generated Indian-themed name
- **Account Conversion**: Convert anonymous accounts to permanent ones without losing progress

### UI/UX
- **Modern Interface**: Clean, responsive design using shadcn/ui components
- **Tailwind CSS**: Utility-first styling for consistent design
- **Mobile-First**: Optimized for all device sizes

### Backend
- **Firebase Authentication**: Secure user management
- **Firestore Database**: Real-time data synchronization
- **Error Handling**: Graceful degradation and non-blocking operations

See [features.md](./features.md) for a complete list of features and upcoming additions.

## Tech Stack

- **Frontend**: Next.js 14+ (App Router)
- **UI**: shadcn/ui + Tailwind CSS
- **Backend**: Firebase (Auth, Firestore, RTDB, Functions)
- **State**: React Context + Firebase RTDB + TanStack Query
- **Forms**: React Hook Form + Zod
- **Language**: TypeScript

## Getting Started

### Prerequisites
- Node.js 18+ or Bun
- Firebase account

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   # or
   yarn
   # or
   pnpm install
   # or
   bun install
   ```
3. Create a `.env.local` file with your Firebase configuration:
   ```
   NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
   NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id
   ```
4. Run the development server:
   ```bash
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   # or
   bun dev
   ```
5. Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Project Structure

```
├── app/                # Next.js app directory (routes)
├── components/         # Reusable UI components
│   ├── auth/           # Authentication components
│   └── ui/             # shadcn/ui components
├── context/            # React context providers
├── hooks/              # Custom React hooks
├── lib/                # Utility functions and libraries
│   ├── firebase/       # Firebase configuration
│   └── utils/          # Helper utilities
└── types/              # TypeScript type definitions
```

## Development Workflow

1. **Feature Branches**: Create a branch for each new feature
2. **TypeScript**: Use explicit types for all components and functions
3. **Components**: Keep components small and focused
4. **Testing**: Test components and utilities thoroughly

## Deployment

The application is configured for deployment on Vercel (frontend) and Firebase (backend).

```bash
# Deploy to Vercel
vercel

# Deploy Firebase rules and functions
firebase deploy
```
