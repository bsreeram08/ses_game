/**
 * Type definitions for card-related data structures
 */

/**
 * Card type (black or white)
 */
export enum CardType {
  BLACK = "black", // Question/prompt card
  WHITE = "white", // Answer card
}

/**
 * Base card interface
 */
export interface Card {
  id: string;
  type: CardType;
  text: string;
  pack: string; // ID of the card pack this belongs to
  isNsfw: boolean; // Whether the card contains adult content
}

/**
 * Black card (prompt/question)
 */
export interface BlackCard extends Card {
  type: CardType.BLACK;
  pick: number; // Number of white cards to pick (usually 1 or 2)
  draw?: number; // Number of extra cards to draw (for special cards)
}

/**
 * White card (answer)
 */
export interface WhiteCard extends Card {
  type: CardType.WHITE;
}

/**
 * Card deck information
 */
export interface CardDeck {
  id: string;
  name: string;
  description: string;
  language: string; // e.g., "en-IN", "hi", "ta"
  isOfficial: boolean;
  isNsfw: boolean;
  blackCardsCount: number;
  whiteCardsCount: number;
  createdAt: string;
  updatedAt: string;
  createdBy?: string; // User ID of creator (for custom decks)
}

/**
 * Player's hand of cards
 */
export interface PlayerHand {
  playerId: string;
  cards: WhiteCard[];
}

/**
 * Player's submission for a round
 */
export interface PlayerSubmission {
  playerId: string;
  cards: WhiteCard[];
  submittedAt: string;
}

/**
 * Round result
 */
export interface RoundResult {
  roundNumber: number;
  blackCard: BlackCard;
  submissions: PlayerSubmission[];
  winnerId?: string;
  winningSubmission?: PlayerSubmission;
  dealerId: string;
  startedAt: string;
  endedAt?: string;
}
