import { AnimatePresence, motion } from "framer-motion";
import { Counter } from "../ui/counter";
import { Countdown } from "../ui/countdown";
import { CardDeck } from "../ui/card-deck";
import { gameStore } from "../store/game-store";
import { t } from "../store/i18n-store";

export function GameScreen() {
  return (
    <div className="flex flex-col items-center justify-center h-dvh">
      <div className="flex flex-col items-center mb-8">
        <Countdown />
        <AnimatePresence>
          {gameStore.isWaitingLastWord && (
            <motion.span
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-1 text-sm font-semibold text-error text-center px-4"
            >
              {t("lastWord")}
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      <div className="flex justify-center">
        <CardDeck />
      </div>

      <div className="flex justify-center gap-12 mt-8">
        <Counter variant="error" value={gameStore.skipped.length} />
        <Counter variant="success" value={gameStore.guessed.length} />
      </div>
    </div>
  );
}
