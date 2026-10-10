import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Eye } from "lucide-react";
import { Card } from "./card";
import { Button } from "./button";
import { gameStore } from "../store/game-store";
import { roomStore } from "../store/room-store";
import { t } from "../store/i18n-store";

/**
 * What the other phones in a room see. The word starts covered so the guessing
 * team can't peek; the opposing team can tap to check the explainer isn't cheating.
 */
function SpectatorDeck() {
  const [isRevealed, setIsRevealed] = useState(false);
  const { currentCard } = gameStore;

  return (
    <div className="flex flex-col items-center w-full">
      <div
        role="button"
        tabIndex={0}
        onClick={() => setIsRevealed(!isRevealed)}
        className="relative w-full h-[320px] cursor-pointer select-none"
      >
        <AnimatePresence initial={false}>
          {isRevealed && currentCard ? (
            <Card
              key={`front-${currentCard.text}`}
              word={currentCard}
              isFront={true}
              showValue={gameStore.isLevelsActive}
            />
          ) : (
            <motion.div
              key="cover"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.15 } }}
              className="absolute left-1/2 -translate-x-1/2 top-0 h-[290px] w-[290px] rounded-[15px] bg-card text-text/45 flex flex-col items-center justify-center gap-3 px-8 text-center"
            >
              <Eye size={36} />
              <span className="text-sm font-medium">{t("tapToPeek")}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex flex-col items-center mt-12 w-[290px] min-h-14 text-center">
        <span className="text-sm text-text/50">
          {isRevealed ? t("tapToHide") : t("otherPhoneExplains")}
        </span>
        <button
          onClick={() => gameStore.takeOver()}
          className="mt-1.5 text-sm font-semibold text-success hover:underline"
        >
          {t("takeOver")}
        </button>
      </div>
    </div>
  );
}

export function CardDeck() {
  return roomStore.canAnswer ? <ExplainerDeck /> : <SpectatorDeck />;
}

function ExplainerDeck() {
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
