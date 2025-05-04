/**
 * Utility for generating random Indian-themed names for anonymous users
 */

// First part of the name (adjectives or characteristics)
const firstParts = [
  "Clever", "Swift", "Mighty", "Brave", "Wise", "Calm", "Bold", 
  "Bright", "Noble", "Royal", "Mystic", "Cosmic", "Vibrant", "Joyful",
  "Daring", "Witty", "Nimble", "Radiant", "Serene", "Fierce"
];

// Second part of the name (Indian-themed nouns)
const secondParts = [
  "Peacock", "Tiger", "Lotus", "Elephant", "Cobra", "Mango", "Banyan",
  "Jasmine", "Monsoon", "Mountain", "River", "Spice", "Flame", "Warrior",
  "Dancer", "Poet", "Scholar", "Voyager", "Sage", "Dreamer"
];

/**
 * Generates a random display name for anonymous users
 * @returns A random Indian-themed name
 */
export function generateRandomName(): string {
  const firstPart = firstParts[Math.floor(Math.random() * firstParts.length)];
  const secondPart = secondParts[Math.floor(Math.random() * secondParts.length)];
  
  // Add a random number between 1-999 for uniqueness
  const randomNum = Math.floor(Math.random() * 999) + 1;
  
  return `${firstPart}${secondPart}${randomNum}`;
}
