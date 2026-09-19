import { motion } from "framer-motion";
import { ArrowLeft, Plus, X } from "lucide-react";
import { Modal } from "../ui/modal";
import { Button } from "../ui/button";
import { routerStore } from "../store/router-store";
import {
  teamsStore,
  teamLabel,
  MIN_TEAMS,
  MAX_TEAMS,
} from "../store/teams-store";
import { t } from "../store/i18n-store";

export function TeamsScreen() {
  const { teams } = teamsStore;

  return (
    <Modal>
      <div className="flex flex-col items-center w-full">
        <div className="w-full flex items-center mb-6">
          <motion.button
            onClick={() => routerStore.navigate("start-modal")}
            className="p-2 -ml-2 rounded-lg text-text/60 hover:text-text hover:bg-text/5 transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <ArrowLeft size={24} />
          </motion.button>
          <span className="flex-1 text-center text-2xl font-semibold pr-8">
            {t("teams")}
          </span>
        </div>

        <div className="w-full space-y-2">
          {teams.map((team, index) => (
            <div key={team.id} className="flex items-center gap-2">
              <input
                value={team.name}
                onChange={(event) =>
                  teamsStore.rename(team.id, event.target.value)
                }
                placeholder={teamLabel(team, index)}
                maxLength={16}
                className="flex-1 min-w-0 h-12 rounded-lg bg-text/5 px-3 text-base outline-none focus:bg-text/10 transition-colors placeholder:text-text/35"
              />
              <span className="w-8 text-center text-base font-bold text-text/40 tabular-nums">
                {team.score}
              </span>
              <motion.button
                onClick={() => teamsStore.removeTeam(team.id)}
                disabled={teams.length <= MIN_TEAMS}
                whileTap={{ scale: 0.9 }}
                className="p-2 rounded-lg text-text/40 hover:text-error hover:bg-error/5 transition-colors disabled:opacity-25 disabled:hover:text-text/40 disabled:hover:bg-transparent"
              >
                <X size={18} />
              </motion.button>
            </div>
          ))}
        </div>

        {teams.length < MAX_TEAMS && (
          <motion.button
            onClick={() => teamsStore.addTeam()}
            whileTap={{ scale: 0.97 }}
            className="mt-3 w-full h-12 rounded-lg border-2 border-dashed border-text/15 text-text/55 hover:text-text hover:border-text/30 transition-colors flex items-center justify-center gap-2 text-base"
          >
            <Plus size={18} />
            {t("addTeam")}
          </motion.button>
        )}

        <div className="mt-6 w-full">
          <Button
            variant="success"
            onClick={() => routerStore.navigate("start-modal")}
          >
            <span className="font-semibold text-lg">{t("done")}</span>
          </Button>
        </div>

        <button
          onClick={() => teamsStore.resetScores()}
          className="text-text/50 text-sm hover:text-error transition-colors mt-3"
        >
          {t("resetScores")}
        </button>
      </div>
    </Modal>
  );
}
