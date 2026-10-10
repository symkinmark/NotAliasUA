import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Card } from "./card";
import { Button } from "./button";
import { gameStore } from "../store/game-store";
import { t } from "../store/i18n-store";

export function CardDeck() {
  const [exitX, setExitX] = useState(0);
  const [isExiting, setIsExiting] = useState(false);

  const answer = (direction: -1 | 1) => {
    const { currentCard } = gameStore;
    if (!currentCard || isExiting) return;
    setIsExiting(true);
    setExitX(250 * direction);
    setTimeout(() => {
      setIsExiting(false);
      setExitX(0);
      if (direction < 0) gameStore.addToSkipped(currentCard);
      else gameStore.addToCorrect(currentCard);
    }, 100);
  };

  const { currentCard, nextCard } = gameStore;
  const showValue = gameStore.isLevelsActive;

  return (
    <div className="flex flex-col items-center w-full">
      <div className="relative w-full h-[320px]">
        <AnimatePresence initial={false}>
          {nextCard && (
            <Card
              key={`next-${nextCard.text}`}
              word={nextCard}
              isFront={false}
              showValue={showValue}
            />
          )}
          {currentCard && (
            <Card
              key={`front-${currentCard.text}`}
              word={currentCard}
              isFront={true}
              exitX={exitX}
              showValue={showValue}
            />
          )}
        </AnimatePresence>
      </div>

      <div className="flex gap-3 mt-12 w-[290px]">
        <Button onClick={() => answer(-1)} variant="error" className="flex-1">
          {t("skip")}
        </Button>
        <Button onClick={() => answer(1)} variant="success" className="flex-1">
          {t("correct")}
        </Button>
      </div>
    </div>
  );
}
