'use client';

import { useState } from 'react';
import { PlayerSubmission, BlackCard } from '@/types/cards';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';

interface JudgingAreaProps {
  submissions: PlayerSubmission[];
  blackCard: BlackCard;
  onSelectWinner: (winnerId: string) => Promise<any>;
}

export default function JudgingArea({
  submissions,
  blackCard,
  onSelectWinner
}: JudgingAreaProps) {
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);
  const [judging, setJudging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Shuffle submissions to avoid bias
  const shuffledSubmissions = [...submissions].sort(() => Math.random() - 0.5);

  const handleSelectWinner = async () => {
    if (!selectedSubmissionId) {
      setError('Please select a winning submission');
      return;
    }

    setJudging(true);
    setError(null);

    try {
      const response = await onSelectWinner(selectedSubmissionId);
      if (!response.success) {
        setError(response.error || 'Failed to select winner');
      }
    } catch (err) {
      setError('An error occurred while selecting the winner');
    } finally {
      setJudging(false);
    }
  };

  if (submissions.length === 0) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Waiting for players to submit their cards...
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-amber-50 p-4 rounded-lg">
        <h3 className="text-lg font-medium flex items-center gap-2 text-amber-800">
          <Trophy className="h-5 w-5" />
          You are the Card Czar! Pick the funniest answer.
        </h3>
      </div>
      
      <div className="grid grid-cols-1 gap-6">
        {shuffledSubmissions.map((submission, index) => (
          <Card 
            key={submission.playerId}
            className={cn(
              "border-2 transition-all",
              selectedSubmissionId === submission.playerId 
                ? "border-primary ring-2 ring-primary ring-opacity-50" 
                : "border-gray-200 hover:border-gray-300"
            )}
            onClick={() => setSelectedSubmissionId(submission.playerId)}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-medium">Submission #{index + 1}</h4>
                {selectedSubmissionId === submission.playerId && (
                  <Trophy className="h-5 w-5 text-amber-500" />
                )}
              </div>
              
              <div className="space-y-2">
                {submission.cards.map((card, cardIndex) => (
                  <div key={cardIndex} className="bg-white p-3 rounded-md shadow-sm">
                    <p className="font-medium">{card.text}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <div className="flex justify-end">
        <Button 
          onClick={handleSelectWinner} 
          disabled={judging || !selectedSubmissionId}
          className="bg-amber-600 hover:bg-amber-700"
        >
          {judging ? 'Selecting...' : 'Select Winner'}
        </Button>
      </div>
    </div>
  );
}
