import admin from "firebase-admin";
import * as fs from "fs";
import * as path from "path";
import { BlackCard, WhiteCard, CardDeck } from "@/types/cards";

// Initialize Firebase Admin SDK
const serviceAccount = Bun.env.FIREBASE_SERVICE_ACCOUNT_PATH
  ? require(Bun.env.FIREBASE_SERVICE_ACCOUNT_PATH)
  : null;

if (!serviceAccount) {
  console.error(
    "❌ Error: FIREBASE_SERVICE_ACCOUNT_PATH environment variable is not set"
  );
  console.error(
    "Please set the environment variable to point to your Firebase service account key file"
  );
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

interface ProcessedCards {
  blackCards: BlackCard[];
  whiteCards: WhiteCard[];
  decks: CardDeck[];
}

/**
 * Helper function to commit a batch with retry logic
 * Will progressively reduce the batch size on failure
 */
async function commitBatchWithRetry(batch: admin.firestore.WriteBatch, retries: number, delay = 1000): Promise<void> {
  try {
    await batch.commit();
    return;
  } catch (error) {
    if (retries <= 0) {
      throw error; // No more retries, propagate the error
    }
    
    console.log(`Retrying batch commit in ${delay}ms, ${retries} retries left`);
    
    // Wait before retrying
    await new Promise(resolve => setTimeout(resolve, delay));
    
    // Retry with exponential backoff
    return commitBatchWithRetry(batch, retries - 1, delay * 2);
  }
}

// Get the deck ID from command line arguments
const deckId = process.argv[2];
if (!deckId) {
  console.error("❌ Error: Please provide a deck ID as a command line argument");
  console.error("Usage: bun run scripts/uploadCardsToFirestore.ts <deckId>");
  console.error("Example: bun run scripts/uploadCardsToFirestore.ts 90s");
  process.exit(1);
}

async function uploadCardsToFirestore(targetDeckId: string): Promise<void> {
  try {
    console.log("🔄 Starting card upload to Firestore...");

    // Load the processed cards from the JSON file
    const processedCardsPath = path.join(
      __dirname,
      "../data/processedCards.json"
    );
    const processedCardsJson = fs.readFileSync(processedCardsPath, "utf8");
    const processedCards: ProcessedCards = JSON.parse(processedCardsJson);

    console.log(
      `📊 Found ${processedCards.blackCards.length} black cards, ${processedCards.whiteCards.length} white cards, and ${processedCards.decks.length} decks to upload`
    );

    // Create a batch for more efficient writes
    const batchSize = 200; // Reduced from 500 to avoid gRPC errors
    let currentBatch = db.batch();
    let operationCount = 0;

    // Find the target deck
    const targetDeck = processedCards.decks.find(deck => deck.id === targetDeckId);
    
    if (!targetDeck) {
      console.error(`❌ Error: Deck with ID '${targetDeckId}' not found in the processed cards file.`);
      console.log("Available decks:");
      processedCards.decks.forEach(deck => {
        console.log(`- ${deck.id}: ${deck.name}`);
      });
      process.exit(1);
    }
    
    console.log(`🎯 Found target deck: ${targetDeck.name} (${targetDeckId})`);
    
    // Filter cards for the target deck only
    const blackCards = processedCards.blackCards.filter(card => card.pack === targetDeckId);
    const whiteCards = processedCards.whiteCards.filter(card => card.pack === targetDeckId);
    
    console.log(`📊 Found ${blackCards.length} black cards and ${whiteCards.length} white cards for deck '${targetDeckId}'`);
    
    // Create a structure for the target deck
    const cardsByDeck: Record<string, { black: BlackCard[], white: WhiteCard[] }> = {
      [targetDeckId]: { black: blackCards, white: whiteCards }
    };

    // Upload deck and its cards
    console.log(`🔄 Uploading deck '${targetDeckId}' and its cards...`);
    
    const deckId = targetDeckId;
    const cards = cardsByDeck[deckId];
    
    // Find the deck info
    const deckInfo = processedCards.decks.find(d => d.id === deckId);
    
    if (deckInfo) {
      // Upload deck info
      const deckRef = db.collection("decks").doc(deckId);
      const deckData = {
        ...deckInfo,
        blackCardsCount: cards.black.length,
        whiteCardsCount: cards.white.length,
        updatedAt: new Date().toISOString()
      };
      
      currentBatch.set(deckRef, deckData);
      operationCount++;
      
      if (operationCount >= batchSize) {
        try {
          await currentBatch.commit();
          console.log(`✅ Committed batch with ${operationCount} operations`);
        } catch (batchError) {
          console.error(`❌ Error committing batch: ${batchError.message}`);
          console.log(`🔄 Retrying with exponential backoff...`);
          // If we get an error, try with retry logic
          await commitBatchWithRetry(currentBatch, 3);
        }
        currentBatch = db.batch();
        operationCount = 0;
      }
    }
    
    // Upload black cards
    console.log(`🔄 Uploading ${cards.black.length} black cards for deck ${deckId}...`);
    for (const card of cards.black) {
      const cardRef = db.collection("cards").doc(deckId).collection("black").doc(card.id);
      currentBatch.set(cardRef, card);
      operationCount++;
      
      if (operationCount >= batchSize) {
        try {
          await currentBatch.commit();
          console.log(`✅ Committed batch with ${operationCount} operations`);
        } catch (batchError) {
          console.error(`❌ Error committing batch: ${batchError.message}`);
          console.log(`🔄 Retrying with exponential backoff...`);
          // If we get an error, try with retry logic
          await commitBatchWithRetry(currentBatch, 3);
        }
        currentBatch = db.batch();
        operationCount = 0;
      }
    }
    
    // Upload white cards
    console.log(`🔄 Uploading ${cards.white.length} white cards for deck ${deckId}...`);
    for (const card of cards.white) {
      const cardRef = db.collection("cards").doc(deckId).collection("white").doc(card.id);
      currentBatch.set(cardRef, card);
      operationCount++;
      
      if (operationCount >= batchSize) {
        try {
          await currentBatch.commit();
          console.log(`✅ Committed batch with ${operationCount} operations`);
        } catch (batchError) {
          console.error(`❌ Error committing batch: ${batchError.message}`);
          console.log(`🔄 Retrying with exponential backoff...`);
          // If we get an error, try with retry logic
          await commitBatchWithRetry(currentBatch, 3);
        }
        currentBatch = db.batch();
        operationCount = 0;
      }
    }

    // Commit any remaining operations
    if (operationCount > 0) {
      try {
        await currentBatch.commit();
        console.log(`✅ Committed final batch with ${operationCount} operations`);
      } catch (batchError) {
        console.error(`❌ Error committing final batch: ${batchError.message}`);
        console.log(`🔄 Retrying with smaller batch size...`);
        // If we get an error, try with a smaller batch size
        await commitBatchWithRetry(currentBatch, 3);
      }
    }

    console.log("✅ Card upload to Firestore completed successfully!");
    console.log(
      `📊 Summary: Successfully uploaded cards for deck '${targetDeckId}' (${cards.black.length} black cards, ${cards.white.length} white cards) to Firestore`
    );
  } catch (error) {
    console.error("❌ Error uploading cards to Firestore:", error);
    process.exit(1);
  }
}

// Run the upload with the specified deck ID
uploadCardsToFirestore(deckId)
  .then(() => {
    console.log(`🎮 Your game is now ready with cards from deck '${deckId}' in Firestore!`);
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Unexpected error:", error);
    process.exit(1);
  });
