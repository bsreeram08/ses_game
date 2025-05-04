'use client';

import { useState } from 'react';
import { WhiteCard, BlackCard } from '@/types/cards';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, AlertCircle } from 'lucide-react';

interface SubmissionAreaProps {
  selectedCards: WhiteCard[];
  blackCard: BlackCard;
  onSubmit: () => Promise<any>;
  hasSubmitted: boolean;
}

export default function SubmissionArea({
  selectedCards,
  blackCard,
  onSubmit,
  hasSubmitted
}: SubmissionAreaProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (selectedCards.length !== blackCard.pick) {
      setError(`Please select ${blackCard.pick} card${blackCard.pick > 1 ? 's' : ''}`);
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await onSubmit();
      if (!response.success) {
        setError(response.error || 'Failed to submit cards');
      }
    } catch (err) {
      setError('An error occurred while submitting your cards');
    } finally {
      setSubmitting(false);
    }
  };

  if (hasSubmitted) {
    return (
      <Alert className="bg-green-50 border-green-200">
        <CheckCircle2 className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800">
          Your cards have been submitted! Waiting for other players...
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Your submission</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {selectedCards.map((card, index) => (
          <Card key={index} className="bg-white border-primary">
            <CardContent className="p-4">
              <p className="font-medium">{card.text}</p>
            </CardContent>
          </Card>
        ))}
        
        {Array.from({ length: Math.max(0, blackCard.pick - selectedCards.length) }).map((_, index) => (
          <Card key={`empty-${index}`} className="bg-gray-50 border-dashed border-gray-300">
            <CardContent className="p-4 h-32 flex items-center justify-center text-gray-400">
              <p>Select a card</p>
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
          onClick={handleSubmit} 
          disabled={submitting || selectedCards.length !== blackCard.pick}
        >
          {submitting ? 'Submitting...' : 'Submit Cards'}
        </Button>
      </div>
    </div>
  );
}
