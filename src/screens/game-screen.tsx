import { AnimatePresence, motion } from "framer-motion";
import { Undo2 } from "lucide-react";
import { Counter } from "../ui/counter";
import { Countdown } from "../ui/countdown";
import { CardDeck } from "../ui/card-deck";
import { gameStore } from "../store/game-store";
import { t } from "../store/i18n-store";
import { roomStore } from "../store/room-store";
import { cn } from "../lib/cn";

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

      <div className="flex items-center justify-center gap-8 mt-8 w-[290px]">
        <Counter variant="error" value={gameStore.skipped.length} />

        {/* Takes back a mis-tap and puts the word back on top of the deck. Explainer only. */}
        <motion.button
          onClick={() => gameStore.undo()}
          disabled={!gameStore.canUndo}
          whileTap={{ scale: 0.9 }}
          aria-label={t("undo")}
          className={cn(
            "flex flex-col items-center gap-0.5 text-text/45 enabled:hover:text-text transition-colors disabled:opacity-25 py-1 px-2",
            !roomStore.canAnswer && "invisible"
          )}
        >
          <Undo2 size={20} />
          <span className="text-[10px] font-medium leading-none">{t("undo")}</span>
        </motion.button>

        <Counter variant="success" value={gameStore.guessed.length} />
      </div>
    </div>
  );
}
