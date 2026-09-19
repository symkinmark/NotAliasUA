import { Trophy } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "../ui/button";
import { Modal } from "../ui/modal";
import { TeamTiles } from "../ui/team-tiles";
import { gameStore } from "../store/game-store";
import { teamsStore, teamLabel } from "../store/teams-store";
import { t } from "../store/i18n-store";

export function FinishScreen() {
  const winner = teamsStore.gameWinner;

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
            <span className="text-5xl font-bold mt-1">
              {t("roundScore")} {gameStore.lastRoundScore}
            </span>
          </>
        )}

        <div className="w-full mt-6">
          <TeamTiles highlight={winner ? teamsStore.winnerIndex : undefined} />
        </div>

        <div className="w-full mt-6 mb-8 space-y-3">
          {gameStore.guessed.length > 0 && (
            <div className="flex flex-wrap gap-3">
              {gameStore.guessed.map((word) => (
                <div
                  key={`guess-${word}`}
                  className="flex items-center gap-1.5 bg-success/10 px-3 py-1.5 rounded-lg"
                >
                  <span className="text-success text-sm">✓</span>
                  <span className="text-success font-semibold capitalize">
                    {word}
                  </span>
                </div>
              ))}
            </div>
          )}

          {gameStore.skipped.length > 0 && (
            <div className="flex flex-wrap gap-3">
              {gameStore.skipped.map((word) => (
                <div
                  key={`skip-${word}`}
                  className="flex items-center gap-1.5 bg-error/10 px-3 py-1.5 rounded-lg"
                >
                  <span className="text-error text-sm">✗</span>
                  <span className="text-error font-semibold capitalize">
                    {word}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

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

          <button
            onClick={() => gameStore.newGame()}
            className="text-text/60 text-sm hover:text-text/80 transition-colors mt-1"
          >
            {t("quit")}
          </button>
        </div>
      </div>
    </Modal>
  );
}
