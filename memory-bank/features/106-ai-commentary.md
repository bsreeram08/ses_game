# Feature Overview: 106 - AI Commentary

## Goal

Enhance the game's entertainment value by integrating an AI feature that provides random, humorous prompts or commentary based on the winning answer selected by the dealer each round.

## Core Requirements (Phase 2+)

- **AI Integration:**
  - Choose and integrate an appropriate AI model or service capable of generating short, contextually relevant (or humorously irrelevant) text snippets. (e.g., OpenAI GPT models, Google Gemini, or a simpler pre-trained model).
  - Consider API costs, latency, and content filtering needs.
- **Triggering Mechanism:**
  - After the dealer selects a winning answer card, trigger the AI generation process.
  - Pass the winning answer card text (and potentially the prompt card text) to the AI service.
- **Content Generation:**
  - The AI should generate a short, witty comment, a follow-up question, or a related (or absurd) prompt based on the winning answer.
  - Implement content filtering to prevent inappropriate outputs.
- **UI Display:**
  - Display the generated AI commentary prominently on the screen after the winner is announced, before the next round starts.
  - Design a distinct UI element for the AI commentary (e.g., a speech bubble from a mascot/logo).
- **Configuration:** (Optional) Allow hosts to toggle the AI commentary feature on/off during game creation.

## Related Documents

- `memory-bank/projectbrief.md` (AI feature objective)
- `memory-bank/productContext.md` (AI commentary for fun)
- `memory-bank/decisionLog.md` (Custom ruleset decision)

## Future Enhancements

- Allowing users to rate AI comments.
- Different AI "personalities" or comment styles.
- Using AI to generate entire prompt cards dynamically.
- Integrating AI into other game events.
