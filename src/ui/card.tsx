import { motion } from "framer-motion";
import { Textfit } from "react-textfit";
import type { Word } from "../lib/word-pool";

type Props = {
  word: Word;
  isFront: boolean;
  exitX?: number;
  /** Levels mode shows what the card is worth. */
  showValue?: boolean;
};

const valueStyles: Record<number, string> = {
  1: "bg-success/15 text-success",
  2: "bg-amber-500/20 text-amber-700",
  3: "bg-error/15 text-error",
};

export function Card({ word, isFront, exitX = 0, showValue = false }: Props) {
  return (
    <motion.div
      className="absolute left-1/2 -translate-x-1/2 top-0 h-[290px] w-[290px] rounded-[15px] text-text flex flex-col items-center justify-center p-[10px] bg-card"
      initial={!isFront ? { scale: 0, y: 105, opacity: 0 } : false}
      animate={{
        scale: isFront ? 1 : 0.75,
        y: isFront ? 0 : 60,
        opacity: isFront ? 1 : 0.5,
        x: 0,
      }}
      exit={{
        x: exitX,
        opacity: 0,
        scale: 0.5,
        rotate: exitX > 0 ? 15 : exitX < 0 ? -15 : 0,
        transition: { duration: 0.2 },
      }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      <Textfit
        mode="single"
        className="w-full flex-1 flex items-center justify-center"
        max={48}
      >
        <p className="text-center font-semibold capitalize whitespace-nowrap">
          {word.text}
        </p>
      </Textfit>

      {showValue && (
        <span
          className={`mb-1 shrink-0 rounded-full px-3 py-1 text-sm font-bold tabular-nums ${
            valueStyles[word.difficulty]
          }`}
        >
          +{word.difficulty}
        </span>
      )}
    </motion.div>
  );
}
