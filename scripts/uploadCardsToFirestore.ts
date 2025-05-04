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

async function uploadCardsToFirestore(): Promise<void> {
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
    const batchSize = 500; // Firestore has a limit of 500 operations per batch
    let currentBatch = db.batch();
    let operationCount = 0;

    // Upload card decks
    console.log("🔄 Uploading card decks...");
    for (const deck of processedCards.decks) {
      const deckRef = db.collection("decks").doc(deck.id);
      currentBatch.set(deckRef, deck);
      operationCount++;

      if (operationCount >= batchSize) {
        await currentBatch.commit();
        console.log(`✅ Committed batch with ${operationCount} operations`);
        currentBatch = db.batch();
        operationCount = 0;
      }
    }

    // Upload black cards
    console.log("🔄 Uploading black cards...");
    for (const card of processedCards.blackCards) {
      const cardRef = db.collection("cards").doc(card.id);
      currentBatch.set(cardRef, card);
      operationCount++;

      if (operationCount >= batchSize) {
        await currentBatch.commit();
        console.log(`✅ Committed batch with ${operationCount} operations`);
        currentBatch = db.batch();
        operationCount = 0;
      }
    }

    // Upload white cards
    console.log("🔄 Uploading white cards...");
    for (const card of processedCards.whiteCards) {
      const cardRef = db.collection("cards").doc(card.id);
      currentBatch.set(cardRef, card);
      operationCount++;

      if (operationCount >= batchSize) {
        await currentBatch.commit();
        console.log(`✅ Committed batch with ${operationCount} operations`);
        currentBatch = db.batch();
        operationCount = 0;
      }
    }

    // Commit any remaining operations
    if (operationCount > 0) {
      await currentBatch.commit();
      console.log(`✅ Committed final batch with ${operationCount} operations`);
    }

    console.log("✅ Card upload to Firestore completed successfully!");
    console.log(
      `📊 Summary: Uploaded ${processedCards.blackCards.length} black cards, ${processedCards.whiteCards.length} white cards, and ${processedCards.decks.length} decks to Firestore`
    );
  } catch (error) {
    console.error("❌ Error uploading cards to Firestore:", error);
    process.exit(1);
  }
}

// Run the upload
uploadCardsToFirestore()
  .then(() => {
    console.log("🎮 Your game is now ready with actual cards in Firestore!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Unexpected error:", error);
    process.exit(1);
  });
