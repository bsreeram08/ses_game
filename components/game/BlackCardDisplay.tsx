'use client';

import { BlackCard } from '@/types/cards';
import { Card, CardContent } from '@/components/ui/card';

interface BlackCardDisplayProps {
  blackCard: BlackCard;
}

export default function BlackCardDisplay({ blackCard }: BlackCardDisplayProps) {
  return (
    <Card className="bg-black text-white border-0">
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-xl font-bold">Cards Against Humanity</h3>
          <div className="text-sm bg-white text-black px-2 py-1 rounded-full">
            Pick {blackCard.pick}
          </div>
        </div>
        <p className="text-2xl font-medium">{blackCard.text}</p>
        <div className="mt-4 text-xs text-gray-400">
          {blackCard.pack}
        </div>
      </CardContent>
    </Card>
  );
}
