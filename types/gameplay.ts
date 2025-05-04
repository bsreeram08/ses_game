/**
 * Type definitions for gameplay mechanics
 */

import { Timestamp } from "firebase/firestore";
import { BlackCard, PlayerSubmission, WhiteCard } from "./cards";
import { Game, GamePlayer } from "./game";

/**
 * Round phase
 */
export enum RoundPhase {
  DEALING = "dealing",       // Cards are being dealt
  SUBMITTING = "submitting", // Players are submitting cards
  JUDGING = "judging",       // Dealer is judging submissions
  REVEALING = "revealing",   // Submissions are being revealed
  COMPLETE = "complete",     // Round is complete, winner selected
}

/**
 * Round information
 */
export interface GameRound {
  roundNumber: number;
  phase: RoundPhase;
  blackCard: BlackCard;
  dealerId: string;
  submissions: Record<string, PlayerSubmission>; // Map of player ID to submission
  submissionsRevealed: boolean;
  winnerId?: string;
  startedAt: Timestamp;
  submissionDeadline?: Timestamp;
  judgeDeadline?: Timestamp;
  endedAt?: Timestamp;
}

/**
 * Game state with gameplay information
 */
export interface GameState extends Game {
  rounds?: Record<number, GameRound>; // Map of round number to round data
  currentRound?: number;
  currentDealerId?: string;
  playerHands?: Record<string, string[]>; // Map of player ID to card IDs
  playedBlackCards?: string[]; // IDs of black cards that have been played in this game
  cardDeck?: {
    blackCards: string[]; // IDs of black cards in the deck
    whiteCards: string[]; // IDs of white cards in the deck
    discardedBlackCards: string[]; // IDs of black cards that have been used
    discardedWhiteCards: string[]; // IDs of white cards that have been used
  };
}

/**
 * Player action types
 */
export enum PlayerActionType {
  SUBMIT_CARDS = "submit_cards",
  SELECT_WINNER = "select_winner",
  SKIP_ROUND = "skip_round",
  DRAW_CARD = "draw_card",
}

/**
 * Submit cards action
 */
export interface SubmitCardsAction {
  type: PlayerActionType.SUBMIT_CARDS;
  playerId: string;
  roundNumber: number;
  cardIds: string[];
}

/**
 * Select winner action
 */
export interface SelectWinnerAction {
  type: PlayerActionType.SELECT_WINNER;
  dealerId: string;
  roundNumber: number;
  winnerId: string;
}

/**
 * Skip round action
 */
export interface SkipRoundAction {
  type: PlayerActionType.SKIP_ROUND;
  dealerId: string;
  roundNumber: number;
  reason: string;
}

/**
 * Draw card action
 */
export interface DrawCardAction {
  type: PlayerActionType.DRAW_CARD;
  playerId: string;
  count: number;
}

/**
 * Player action union type
 */
export type PlayerAction = 
  | SubmitCardsAction
  | SelectWinnerAction
  | SkipRoundAction
  | DrawCardAction;

/**
 * Game event types
 */
export enum GameEventType {
  ROUND_STARTED = "round_started",
  CARDS_SUBMITTED = "cards_submitted",
  JUDGING_STARTED = "judging_started",
  WINNER_SELECTED = "winner_selected",
  ROUND_ENDED = "round_ended",
  GAME_ENDED = "game_ended",
}

/**
 * Base game event
 */
export interface GameEvent {
  type: GameEventType;
  gameId: string;
  timestamp: Timestamp;
}

/**
 * Round started event
 */
export interface RoundStartedEvent extends GameEvent {
  type: GameEventType.ROUND_STARTED;
  roundNumber: number;
  dealerId: string;
  blackCardId: string;
}

/**
 * Cards submitted event
 */
export interface CardsSubmittedEvent extends GameEvent {
  type: GameEventType.CARDS_SUBMITTED;
  roundNumber: number;
  playerId: string;
}

/**
 * Judging started event
 */
export interface JudgingStartedEvent extends GameEvent {
  type: GameEventType.JUDGING_STARTED;
  roundNumber: number;
  dealerId: string;
}

/**
 * Winner selected event
 */
export interface WinnerSelectedEvent extends GameEvent {
  type: GameEventType.WINNER_SELECTED;
  roundNumber: number;
  winnerId: string;
  dealerId: string;
}

/**
 * Round ended event
 */
export interface RoundEndedEvent extends GameEvent {
  type: GameEventType.ROUND_ENDED;
  roundNumber: number;
  winnerId: string;
}

/**
 * Game ended event
 */
export interface GameEndedEvent extends GameEvent {
  type: GameEventType.GAME_ENDED;
  winnerIds: string[]; // Could have multiple winners with same score
  finalScores: Record<string, number>;
}

/**
 * Game event union type
 */
export type GameEventUnion = 
  | RoundStartedEvent
  | CardsSubmittedEvent
  | JudgingStartedEvent
  | WinnerSelectedEvent
  | RoundEndedEvent
  | GameEndedEvent;
