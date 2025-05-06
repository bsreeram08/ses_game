"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useGame } from "@/hooks/useGame";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectLabel,
  SelectSeparator,
  SelectGroup,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
import { GameService } from "@/lib/services/gameService";
import { db } from "@/lib/firebase/firebase";
import { CardDeck } from "@/types/cards";

// Define the form schema with Zod
const createGameSchema = z.object({
  playerLimit: z.number().min(3).max(10),
  roundsPerPlayer: z.number().min(1).max(10),
  familyMode: z.boolean(),
  cardDeckId: z.string().min(1, { message: "Please select a card deck" }),
});

// Type for the form values
type CreateGameFormValues = z.infer<typeof createGameSchema>;

// Default form values
const defaultValues: CreateGameFormValues = {
  playerLimit: 6,
  roundsPerPlayer: 3,
  familyMode: false,
  cardDeckId: "default", // Default card deck
};

// Type for simplified card deck display
type CardDeckDisplay = {
  id: string;
  name: string;
  nsfw: boolean;
  description: string;
  blackCardsCount: number;
  whiteCardsCount: number;
};

export function CreateGameForm() {
  const { createGame, loading, error } = useGame();
  const router = useRouter();
  const [createdGameId, setCreatedGameId] = useState<string | null>(null);
  const [cardDecks, setCardDecks] = useState<CardDeckDisplay[]>([]);
  const [loadingDecks, setLoadingDecks] = useState<boolean>(true);
  const [deckError, setDeckError] = useState<string | null>(null);

  // Fetch card decks from Firestore via GameService
  useEffect(() => {
    const fetchCardDecks = async () => {
      try {
        setLoadingDecks(true);
        setDeckError(null);

        // Use GameService to fetch card decks
        const gameService = new GameService();
        const fetchedCardDecks = await gameService.getCardDecks();
        
        // Map the CardDeck objects to CardDeckDisplay objects
        const fetchedDecks: CardDeckDisplay[] = fetchedCardDecks.map(deck => ({
          id: deck.id,
          name: deck.name,
          nsfw: deck.isNsfw,
          description: deck.description,
          blackCardsCount: deck.blackCardsCount,
          whiteCardsCount: deck.whiteCardsCount,
        }));

        setCardDecks(fetchedDecks);
      } catch (err) {
        console.error("Error fetching card decks:", err);
        setDeckError("Failed to load card decks. Please try again.");
        // Fallback to default decks if there's an error
        setCardDecks([
          {
            id: "india-base",
            name: "Standard Indian Deck",
            nsfw: false,
            description: "The base deck with Indian cultural references.",
            blackCardsCount: 0,
            whiteCardsCount: 0,
          },
        ]);
      } finally {
        setLoadingDecks(false);
      }
    };

    fetchCardDecks();
  }, []);

  // Initialize the form with react-hook-form and zod validation
  const form = useForm<CreateGameFormValues>({
    resolver: zodResolver(createGameSchema),
    defaultValues,
  });

  // Handle form submission
  const onSubmit = async (values: CreateGameFormValues) => {
    // Ensure all required fields are present and not optional
    const gameSettings = {
      playerLimit: values.playerLimit,
      roundsPerPlayer: values.roundsPerPlayer,
      familyMode: values.familyMode,
      cardDeckId: values.cardDeckId,
    };

    const response = await createGame(gameSettings);

    if (response.success && response.gameId) {
      setCreatedGameId(response.gameId);
      router.push(`/game/${response.gameId}`);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Create New Game</CardTitle>
        <CardDescription>
          Set up a new game room and invite your friends
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <FormField
              control={form.control}
              name="playerLimit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Player Limit: {field.value}</FormLabel>
                  <FormControl>
                    <Slider
                      min={3}
                      max={10}
                      step={1}
                      defaultValue={[field.value]}
                      onValueChange={(value) => field.onChange(value[0])}
                    />
                  </FormControl>
                  <FormDescription>
                    Maximum number of players (3-10)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="roundsPerPlayer"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rounds Per Player: {field.value}</FormLabel>
                  <FormControl>
                    <Slider
                      min={1}
                      max={10}
                      step={1}
                      defaultValue={[field.value]}
                      onValueChange={(value) => field.onChange(value[0])}
                    />
                  </FormControl>
                  <FormDescription>
                    Number of rounds each player will be the dealer
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="cardDeckId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Card Deck</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value);
                      // If NSFW deck is selected, automatically disable family mode
                      const selectedDeck = cardDecks.find(
                        (deck) => deck.id === value
                      );
                      if (selectedDeck?.nsfw) {
                        form.setValue("familyMode", false);
                      }
                    }}
                    defaultValue={field.value}
                    disabled={loadingDecks}
                  >
                    <FormControl>
                      <SelectTrigger>
                        {loadingDecks ? (
                          <div className="flex items-center">
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            <span>Loading decks...</span>
                          </div>
                        ) : (
                          <SelectValue placeholder="Select a card deck" />
                        )}
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="max-h-[300px]">
                      {loadingDecks ? (
                        <SelectGroup>
                          <SelectLabel className="px-2 py-1.5 text-sm text-muted-foreground">
                            Loading decks...
                          </SelectLabel>
                        </SelectGroup>
                      ) : deckError ? (
                        <SelectGroup>
                          <SelectLabel className="px-2 py-1.5 text-sm text-destructive">
                            {deckError}
                          </SelectLabel>
                        </SelectGroup>
                      ) : (
                        <>
                          <SelectGroup>
                            <SelectLabel className="px-2 py-1.5 text-sm font-semibold">
                              Regular Decks (
                              {cardDecks.filter((deck) => !deck.nsfw).length})
                            </SelectLabel>
                            {cardDecks
                              .filter((deck) => !deck.nsfw)
                              .map((deck) => (
                                <SelectItem key={deck.id} value={deck.id}>
                                  {deck.name} ({deck.blackCardsCount}B/
                                  {deck.whiteCardsCount}W)
                                </SelectItem>
                              ))}
                          </SelectGroup>

                          {cardDecks.some((deck) => !deck.nsfw) &&
                            cardDecks.some((deck) => deck.nsfw) && (
                              <SelectSeparator />
                            )}

                          {cardDecks.some((deck) => deck.nsfw) && (
                            <SelectGroup>
                              <SelectLabel className="px-2 py-1.5 text-sm font-semibold">
                                NSFW Decks (
                                {cardDecks.filter((deck) => deck.nsfw).length})
                              </SelectLabel>
                              {cardDecks
                                .filter((deck) => deck.nsfw)
                                .map((deck) => (
                                  <SelectItem key={deck.id} value={deck.id}>
                                    {deck.name} ({deck.blackCardsCount}B/
                                    {deck.whiteCardsCount}W)
                                  </SelectItem>
                                ))}
                            </SelectGroup>
                          )}
                        </>
                      )}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Choose a themed deck of cards
                    {cardDecks.find((deck) => deck.id === field.value)
                      ?.nsfw && (
                      <p className="text-red-500 mt-1 text-xs">
                        Warning: This deck contains adult content and is not
                        suitable for family play.
                      </p>
                    )}
                    {!loadingDecks &&
                      cardDecks.find((deck) => deck.id === field.value) && (
                        <p className="text-xs mt-1">
                          {
                            cardDecks.find((deck) => deck.id === field.value)
                              ?.description
                          }
                        </p>
                      )}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="familyMode"
              render={({ field }) => {
                // Check if an NSFW deck is selected
                const selectedDeckId = form.getValues("cardDeckId");
                const isNsfwDeckSelected = cardDecks.find(
                  (deck) => deck.id === selectedDeckId
                )?.nsfw;

                return (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>Family Mode</FormLabel>
                      <FormDescription>
                        Filter out inappropriate content
                        {isNsfwDeckSelected && (
                          <p className="text-red-500 mt-1 text-xs">
                            Family mode is disabled when using NSFW decks
                          </p>
                        )}
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={isNsfwDeckSelected}
                      />
                    </FormControl>
                  </FormItem>
                );
              }}
            />

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Game...
                </>
              ) : (
                "Create Game"
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
