'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useGame } from '@/hooks/useGame';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';

// Define the form schema with Zod
const joinGameSchema = z.object({
  inviteCode: z.string().length(6, { message: 'Invite code must be 6 characters' }).toUpperCase(),
});

// Type for the form values
type JoinGameFormValues = z.infer<typeof joinGameSchema>;

export function JoinGameForm() {
  const { joinGameByInviteCode, loading, error } = useGame();
  const router = useRouter();

  // Initialize the form with react-hook-form and zod validation
  const form = useForm<JoinGameFormValues>({
    resolver: zodResolver(joinGameSchema),
    defaultValues: {
      inviteCode: '',
    },
  });

  // Handle form submission
  const onSubmit = async (values: JoinGameFormValues) => {
    const response = await joinGameByInviteCode(values.inviteCode);
    
    if (response.success && response.gameId) {
      router.push(`/game/${response.gameId}`);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Join Game</CardTitle>
        <CardDescription>
          Enter an invite code to join an existing game
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
              name="inviteCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Invite Code</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter 6-character code"
                      {...field}
                      onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                      maxLength={6}
                      className="text-center tracking-wider text-lg uppercase"
                    />
                  </FormControl>
                  <FormDescription>
                    Ask your friend for the 6-character invite code
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Joining Game...
                </>
              ) : (
                'Join Game'
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
