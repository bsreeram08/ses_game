'use client';

import { WhiteCard } from '@/types/cards';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface PlayerHandProps {
  cards: WhiteCard[];
  selectedCards: WhiteCard[];
  onSelectCard: (card: WhiteCard) => void;
  disabled?: boolean;
}

export default function PlayerHand({
  cards,
  selectedCards,
  onSelectCard,
  disabled = false
}: PlayerHandProps) {
  const isSelected = (card: WhiteCard) => {
    return selectedCards.some(c => c.id === card.id);
  };

  return (
    <ScrollArea className="h-64 rounded-md border">
      <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card) => (
          <div
            key={card.id}
            className={cn(
              "bg-white border-2 rounded-md p-4 h-40 flex flex-col cursor-pointer transition-all",
              isSelected(card) 
                ? "border-primary shadow-md -translate-y-1" 
                : "border-gray-200 hover:border-gray-300",
              disabled && "opacity-50 cursor-not-allowed"
            )}
            onClick={() => !disabled && onSelectCard(card)}
          >
            <div className="flex-1">
              <p className="font-medium">{card.text}</p>
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              {card.pack}
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
