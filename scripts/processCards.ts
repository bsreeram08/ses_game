import fs from "fs";
import path from "path";
import { nanoid } from "nanoid";
import { BlackCard, CardType, WhiteCard, CardDeck } from "@/types/cards";

/**
 * Script to process card data from JSON files and prepare them for the game
 *
 * This script:
 * 1. Loads cards from india.json and github.cards.json
 * 2. Converts them to the game's card format
 * 3. Generates unique IDs for each card
 * 4. Creates card decks
 * 5. Outputs the processed data to a file for use in the game
 */

interface ProcessedCards {
  blackCards: BlackCard[];
  whiteCards: WhiteCard[];
  decks: CardDeck[];
}

async function processCards(): Promise<void> {
  try {
    console.log("🔄 Starting card processing...");

    // Define paths to card data files
    const indiaJsonPath = path.join(__dirname, "../data/india.json");
    const githubCardsJsonPath = path.join(
      __dirname,
      "../data/github.cards.json"
    );

    // Load card data
    console.log("📂 Loading card data files...");
    const indiaJson = JSON.parse(fs.readFileSync(indiaJsonPath, "utf8"));
    const githubCardsJson = JSON.parse(
      fs.readFileSync(githubCardsJsonPath, "utf8")
    );

    // Process GitHub cards
    console.log("🔄 Processing GitHub cards...");
    const githubBlackCards: Omit<BlackCard, "id">[] = [];
    const githubWhiteCards: Omit<WhiteCard, "id">[] = [];

    // Process GitHub black cards
    if (githubCardsJson.black && Array.isArray(githubCardsJson.black)) {
      for (const card of githubCardsJson.black) {
        githubBlackCards.push({
          type: CardType.BLACK,
          text: card.text,
          pack: `${card.deck || "default"}`,
          isNsfw: true, // All GitHub cards are NSFW
          pick: card.pick || 1,
        });
      }
    }

    // Process GitHub white cards
    if (githubCardsJson.white && Array.isArray(githubCardsJson.white)) {
      for (const card of githubCardsJson.white) {
        githubWhiteCards.push({
          type: CardType.WHITE,
          text: card.text,
          pack: `${card.deck || "default"}`,
          isNsfw: true, // All GitHub cards are NSFW
        });
      }
    }

    // Add IDs to all cards
    console.log("🔄 Adding IDs to cards...");
    const allBlackCards: BlackCard[] = [
      ...githubBlackCards.map((card) => ({
        ...card,
        id: `black-${card.pack}-${nanoid(8)}`,
      })),
    ];

    const allWhiteCards: WhiteCard[] = [
      ...githubWhiteCards.map((card) => ({
        ...card,
        id: `white-${card.pack}-${nanoid(8)}`,
      })),
    ];

    // Create card decks dynamically based on pack identifiers
    console.log("🔄 Creating card decks...");

    // Get all unique pack identifiers from both black and white cards
    const uniquePacks = new Set<string>();
    allBlackCards.forEach((card) => uniquePacks.add(card.pack));
    allWhiteCards.forEach((card) => uniquePacks.add(card.pack));

    console.log(`🔍 Found ${uniquePacks.size} unique card packs`);

    // Create a deck for each unique pack
    const decks: CardDeck[] = [];

    // Define deck metadata
    const deckMetadata: Record<
      string,
      {
        name: string;
        description: string;
        language: string;
        isOfficial: boolean;
        isNsfw: boolean;
      }
    > = {};

    // Default metadata for GitHub decks
    const defaultGithubDeckMetadata = {
      language: "en",
      isOfficial: false,
      isNsfw: true,
    };

    // Process each unique pack
    uniquePacks.forEach((packId) => {
      // Count cards in this pack
      const blackCardsInPack = allBlackCards.filter(
        (card) => card.pack === packId
      );
      const whiteCardsInPack = allWhiteCards.filter(
        (card) => card.pack === packId
      );

      // Skip packs with no cards
      if (blackCardsInPack.length === 0 && whiteCardsInPack.length === 0) {
        return;
      }

      // Generate metadata for the deck
      let metadata = deckMetadata[packId];

      if (!metadata) {
        const formattedName = packId
          .split("-")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ");

        metadata = {
          name: formattedName,
          description: `A custom deck of cards with ${formattedName.toLowerCase()} themed content.`,
          language: "en",
          isOfficial: false,
          isNsfw: false,
        };
      }

      // Create the deck
      decks.push({
        id: packId,
        name: metadata.name,
        description: metadata.description,
        language: metadata.language,
        isOfficial: metadata.isOfficial,
        isNsfw: metadata.isNsfw,
        blackCardsCount: blackCardsInPack.length,
        whiteCardsCount: whiteCardsInPack.length,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    });

    // Sort decks: first non-NSFW, then NSFW, and alphabetically within each group
    decks.sort((a, b) => {
      if (a.isNsfw !== b.isNsfw) {
        return a.isNsfw ? 1 : -1; // Non-NSFW decks first
      }
      return a.name.localeCompare(b.name); // Alphabetical within groups
    });

    console.log(`✅ Created ${decks.length} card decks`);

    // Create the processed cards object
    const processedCards: ProcessedCards = {
      blackCards: allBlackCards,
      whiteCards: allWhiteCards,
      decks,
    };

    // Write the processed cards to a file
    const outputPath = path.join(__dirname, "../data/processedCards.json");
    fs.writeFileSync(outputPath, JSON.stringify(processedCards, null, 2));

    console.log("✅ Card processing completed successfully!");
    console.log(
      `📊 Summary: Processed ${allBlackCards.length} black cards and ${allWhiteCards.length} white cards.`
    );
    console.log(`📄 Output file: ${outputPath}`);
  } catch (error) {
    console.error("❌ Error processing cards:", error);
    process.exit(1);
  }
}

// Run the processing
processCards()
  .then(() => {
    console.log("🎮 Your game is now ready with actual cards!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Unexpected error:", error);
    process.exit(1);
  });
