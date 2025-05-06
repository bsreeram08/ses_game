/**
 * Type definitions for game-related data structures
 */

import { Timestamp } from "firebase/firestore";

/**
 * Player status in a game lobby
 */
export enum PlayerStatus {
  JOINED = "joined",     // Player has joined but not ready
  READY = "ready",       // Player is ready to start
  PLAYING = "playing",   // Game has started and player is active
  SPECTATING = "spectating", // Player is in spectator mode (future)
  DISCONNECTED = "disconnected", // Player has disconnected but can rejoin
}

/**
 * Game status
 */
export enum GameStatus {
  LOBBY = "lobby",       // Game is in lobby/waiting state
  PLAYING = "playing",   // Game is in progress
  ENDED = "ended",       // Game has ended
  CANCELLED = "cancelled", // Game was cancelled before starting
}

/**
 * Player information in a game
 */
export interface GamePlayer {
  uid: string;           // User ID
  displayName: string;   // Display name
  photoURL?: string;     // Profile picture URL
  status: PlayerStatus;  // Current status in the game
  isHost: boolean;       // Whether the player is the host
  score?: number;        // Player's score (during gameplay)
  hand?: string[];       // IDs of cards in player's hand
  joinedAt: Timestamp;   // When the player joined
  lastActive: Timestamp; // Last activity timestamp
}

/**
 * Game settings configured during creation
 */
export interface GameSettings {
  playerLimit: number;   // Maximum number of players (3-10)
  minPlayers?: number;    // Minimum number of players to start (e.g., 3)
  roundsPerPlayer: number; // Number of rounds each player will be the dealer
  cardsPerPlayer?: number; // Number of white cards dealt to each player (e.g., 10)
  submissionTimeLimit?: number; // Time limit in seconds for players to submit cards
  familyMode: boolean;   // Whether family-friendly mode is enabled
  cardDeckId: string;    // ID of the card deck to use
  deckId?: string;       // ID of the card deck to use
  timeLimit?: number;    // Time limit for each round in seconds (optional) - perhaps DEPRECATE in favor of submissionTimeLimit/judgeTimeLimit
  password?: string;     // Optional password for private games (future)
}

/**
 * Game document structure in Firestore
 */
export interface Game {
  id: string;            // Game ID (same as document ID)
  status: GameStatus;    // Current game status
  settings: GameSettings; // Game settings
  players: Record<string, GamePlayer>; // Map of player IDs to player data
  hostId: string;        // ID of the host player
  currentRound?: number; // Current round number (during gameplay)
  currentDealerId?: string; // ID of the current dealer (during gameplay)
  createdAt: Timestamp;  // When the game was created
  updatedAt: Timestamp;  // Last update timestamp
  startedAt?: Timestamp; // When the game started (if playing)
  endedAt?: Timestamp;   // When the game ended (if ended)
  inviteCode: string;    // Unique code for inviting players
}

/**
 * Parameters for creating a new game
 */
export interface CreateGameParams {
  hostId: string;        // ID of the host creating the game
  hostDisplayName: string; // Display name of the host
  hostPhotoURL?: string; // Profile picture URL of the host
  settings: Omit<GameSettings, 'password'> & { password?: string }; // Game settings
}

/**
 * Parameters for joining a game
 */
export interface JoinGameParams {
  gameId: string;        // ID of the game to join
  userId: string;        // ID of the user joining
  displayName: string;   // Display name of the user
  photoURL?: string;     // Profile picture URL of the user
  password?: string;     // Password for private games (future)
}

/**
 * Response for game creation
 */
export interface CreateGameResponse {
  gameId: string;        // ID of the created game
  inviteCode: string;    // Invite code for the game
  success: boolean;      // Whether the operation was successful
  error?: string;        // Error message if unsuccessful
}

/**
 * Response for game operations
 */
export interface GameResponse {
  success: boolean;      // Whether the operation was successful
  error?: string;        // Error message if unsuccessful
  gameId?: string;       // ID of the game (if applicable)
}
