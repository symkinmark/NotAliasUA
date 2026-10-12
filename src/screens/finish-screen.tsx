import { useState } from "react";
import { Flag, Handshake, ListChecks, Trophy, Undo2, X } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "../ui/button";
import { Modal } from "../ui/modal";
import { TeamTiles } from "../ui/team-tiles";
import { gameStore } from "../store/game-store";
import { teamsStore, teamLabel } from "../store/teams-store";
import { t } from "../store/i18n-store";
import type { Word } from "../lib/word-pool";
import { cn } from "../lib/cn";

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

type Status = "correct" | "skip" | "removed";

const statusTone: Record<Status, string> = {
  correct: "text-success",
  skip: "text-error",
  removed: "text-text/35",
};

/** One line of the review list: strike a word out, flag it as bad, or put it back. */
function ReviewRow(props: { word: Word; status: Status; flagged?: boolean }) {
  const { word, status, flagged } = props;
  const isRemoved = status === "removed";
  return (
    <motion.div layout className="flex items-center gap-2 h-11 pl-3 pr-1 rounded-lg bg-text/5">
      <span className={cn("w-4 text-sm", statusTone[status])}>
        {status === "correct" ? "✓" : status === "skip" ? "✗" : "–"}
      </span>
      <span
        className={cn(
          "flex-1 min-w-0 truncate font-semibold capitalize",
          statusTone[status],
          isRemoved && "line-through"
        )}
      >
        {word.text}
      </span>
      {isRemoved ? (
        <span className="flex items-center gap-1 text-[11px] text-text/40">
          {flagged && <Flag size={11} className="text-error" />}
          {flagged ? t("flagged") : t("notCounted")}
        </span>
      ) : (
        status === "correct" &&
        gameStore.isLevelsActive && (
          <span className="text-[11px] font-bold tabular-nums text-success/60">
            +{gameStore.pointsFor(word)}
          </span>
        )
      )}
      {!isRemoved && (
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => gameStore.flagWord(word)}
          aria-label={t("flagWord")}
          title={t("flagWord")}
          className="p-2 rounded-lg text-text/45 hover:text-error hover:bg-error/5 transition-colors"
        >
          <Flag size={16} />
        </motion.button>
      )}
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => (isRemoved ? gameStore.restoreWord(word) : gameStore.removeWord(word))}
        aria-label={isRemoved ? t("restoreWord") : t("removeWord")}
        className="p-2 rounded-lg text-text/45 hover:text-text hover:bg-text/5 transition-colors"
      >
        {isRemoved ? <Undo2 size={17} /> : <X size={17} />}
      </motion.button>
    </motion.div>
  );
}

export function FinishScreen() {
  const [isReviewing, setIsReviewing] = useState(false);
  const result = teamsStore.gameResult;
  const { teams } = teamsStore;
  const { guessed, skipped, removed } = gameStore;
  const hasWords = guessed.length + skipped.length + removed.length > 0;
  const champions = result ? (result.kind === "win" ? [result.index] : result.indexes) : undefined;
  const hasLeader = teams.some((team) => team.score >= teamsStore.targetScore);

  return (
    <Modal>
      <div className="flex flex-col items-center z-[11] w-full">
        {result ? (
          <>
            <motion.div
              className="text-success"
              initial={{ scale: 0.5, rotate: -12 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 240, damping: 14 }}
            >
              {result.kind === "win" ? <Trophy size={44} /> : <Handshake size={44} />}
            </motion.div>
            <span className="mt-3 text-lg text-text/60">
              {result.kind === "win" ? t("winner") : t("draw")}
            </span>
            <span className="mt-1 text-3xl font-bold text-center break-words max-w-full">
              {champions!.map((index) => teamLabel(teams[index], index)).join(" · ")}
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
            {teamsStore.targetScore > 0 && hasLeader && (
              <span className="mt-2 text-sm font-semibold text-error text-center">
                {t("catchUpNext")}
              </span>
            )}
          </>
        )}

        <div className="w-full mt-6">
          <TeamTiles highlight={champions} />
        </div>

        {isReviewing ? (
          <div className="w-full mt-6">
            <p className="mb-2 text-xs text-text/45 text-center">{t("reviewHint")}</p>
            <div className="space-y-1.5">
              {guessed.map((word) => (
                <ReviewRow key={`g-${word.text}`} word={word} status="correct" />
              ))}
              {skipped.map((word) => (
                <ReviewRow key={`s-${word.text}`} word={word} status="skip" />
              ))}
              {removed.map(({ word, flagged }) => (
                <ReviewRow key={`r-${word.text}`} word={word} status="removed" flagged={flagged} />
              ))}
            </div>
          </div>
        ) : (
          <div className="w-full mt-6 space-y-3">
            {guessed.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {guessed.map((word) => (
                  <ResultChip key={`g-${word.text}`} word={word} correct />
                ))}
              </div>
            )}
            {skipped.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {skipped.map((word) => (
                  <ResultChip key={`s-${word.text}`} word={word} correct={false} />
                ))}
              </div>
            )}
            {removed.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {removed.map(({ word, flagged }) => (
                  <span
                    key={`r-${word.text}`}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-text/5 font-semibold capitalize text-text/35"
                  >
                    {flagged && <Flag size={12} className="text-error/70" />}
                    <span className="line-through">{word.text}</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {hasWords && !isReviewing && (
          <p className="mt-3 text-xs text-text/45 text-center">{t("tapToFix")}</p>
        )}

        {hasWords && (
          <motion.button
            onClick={() => setIsReviewing(!isReviewing)}
            whileTap={{ scale: 0.97 }}
            className="mt-3 w-full h-11 rounded-lg bg-text/5 hover:bg-text/10 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
          >
            <ListChecks size={16} />
            {isReviewing ? t("done") : t("reviewWords")}
          </motion.button>
        )}

        <div className="flex flex-col items-center gap-3 w-full mt-6">
          {result ? (
            <Button variant="success" onClick={() => gameStore.newGame()}>
              <span className="font-semibold text-lg">{t("newGame")}</span>
            </Button>
          ) : (
            <Button variant="success" onClick={() => gameStore.nextTeam()}>
              <span className="font-semibold text-lg">{t("nextTeam")}</span>
            </Button>
          )}
          {!result && (
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
