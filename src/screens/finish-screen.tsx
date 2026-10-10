import { Trophy } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "../ui/button";
import { Modal } from "../ui/modal";
import { TeamTiles } from "../ui/team-tiles";
import { gameStore } from "../store/game-store";
import { teamsStore, teamLabel } from "../store/teams-store";
import { t } from "../store/i18n-store";
import type { Word } from "../lib/word-pool";

function ResultChip(props: { word: Word; correct: boolean }) {
  const { word, correct } = props;
  const value = gameStore.pointsFor(word);
  return (
    <motion.button
      layout
      whileTap={{ scale: 0.93 }}
      onClick={() =>
        correct ? gameStore.markSkipped(word) : gameStore.markCorrect(word)
      }
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
        correct
          ? "bg-success/10 hover:bg-success/20"
          : "bg-error/10 hover:bg-error/20"
      }`}
    >
      <span className={`text-sm ${correct ? "text-success" : "text-error"}`}>
        {correct ? "✓" : "✗"}
      </span>
      <span
        className={`font-semibold capitalize ${
          correct ? "text-success" : "text-error"
        }`}
      >
        {word.text}
      </span>
      {gameStore.isLevelsActive && (
        <span
          className={`text-[11px] font-bold tabular-nums opacity-60 ${
            correct ? "text-success" : "text-error"
          }`}
        >
          +{value}
        </span>
      )}
    </motion.button>
  );
}

export function FinishScreen() {
  const winner = teamsStore.gameWinner;
  const hasWords = gameStore.guessed.length + gameStore.skipped.length > 0;

  return (
    <Modal>
      <div className="flex flex-col items-center z-[11] w-full">
        {winner ? (
          <>
            <motion.div
              className="text-success"
              initial={{ scale: 0.5, rotate: -12 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 240, damping: 14 }}
            >
              <Trophy size={44} />
            </motion.div>
            <span className="mt-3 text-lg text-text/60">{t("winner")}</span>
            <span className="mt-1 text-3xl font-bold text-center break-words max-w-full">
              {teamLabel(winner, teamsStore.winnerIndex)}
            </span>
          </>
        ) : (
          <>
            <span className="text-sm text-text/50 text-center break-words max-w-full">
              {teamsStore.currentLabel}
            </span>
            <span className="text-5xl font-bold mt-1 tabular-nums">
              {t("roundScore")} {gameStore.lastRoundScore}
            </span>
          </>
        )}

        <div className="w-full mt-6">
          <TeamTiles highlight={winner ? teamsStore.winnerIndex : undefined} />
        </div>

        <div className="w-full mt-6 space-y-3">
          {gameStore.guessed.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {gameStore.guessed.map((word) => (
                <ResultChip key={`g-${word.text}`} word={word} correct />
              ))}
            </div>
          )}
          {gameStore.skipped.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {gameStore.skipped.map((word) => (
                <ResultChip key={`s-${word.text}`} word={word} correct={false} />
              ))}
            </div>
          )}
        </div>

        {hasWords && (
          <p className="mt-3 mb-6 text-xs text-text/45 text-center">
            {t("tapToFix")}
          </p>
        )}
        {!hasWords && <div className="mb-6" />}

        <div className="flex flex-col items-center gap-3 w-full">
          {winner ? (
            <Button variant="success" onClick={() => gameStore.newGame()}>
              <span className="font-semibold text-lg">{t("newGame")}</span>
            </Button>
          ) : (
            <Button variant="success" onClick={() => gameStore.nextTeam()}>
              <span className="font-semibold text-lg">{t("nextTeam")}</span>
            </Button>
          )}
          {!winner && (
            <button
              onClick={() => gameStore.exitToStart()}
              className="text-text/60 text-sm hover:text-text/80 transition-colors mt-1"
            >
              {t("menu")}
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
