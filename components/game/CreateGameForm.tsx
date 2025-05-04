"use client";

import { useState } from "react";
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
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";

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

// Available card decks
const cardDecks = [
  { id: "default", name: "Standard Indian Deck" },
  { id: "bollywood", name: "Bollywood Edition" },
  { id: "cricket", name: "Cricket Fever" },
  { id: "food", name: "Indian Cuisine" },
];

export function CreateGameForm() {
  const { createGame, loading, error } = useGame();
  const router = useRouter();
  const [createdGameId, setCreatedGameId] = useState<string | null>(null);

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
      cardDeckId: values.cardDeckId
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
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a card deck" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {cardDecks.map((deck) => (
                        <SelectItem key={deck.id} value={deck.id}>
                          {deck.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Choose a themed deck of cards
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="familyMode"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel>Family Mode</FormLabel>
                    <FormDescription>
                      Filter out inappropriate content
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
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
