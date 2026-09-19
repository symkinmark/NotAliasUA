import { Users } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "../ui/button";
import { Modal } from "../ui/modal";
import { TeamTiles } from "../ui/team-tiles";
import { gameStore } from "../store/game-store";
import { routerStore } from "../store/router-store";
import { teamsStore, TARGET_OPTIONS } from "../store/teams-store";
import { t } from "../store/i18n-store";

type SegmentedProps = {
  options: number[];
  value: number;
  onChange: (value: number) => void;
  format?: (value: number) => string;
};

function Segmented(props: SegmentedProps) {
  const { options, value, onChange, format } = props;
  const index = options.indexOf(value);

  return (
    <div className="flex gap-3 w-full relative">
      {index >= 0 && (
        <div
          className="absolute top-0 h-full rounded-lg bg-success transition-[left] duration-300 ease-out"
          style={{
            width: `calc((100% - ${(options.length - 1) * 0.75}rem) / ${options.length})`,
            left: `calc(${index} * (100% + 0.75rem) / ${options.length})`,
          }}
        />
      )}
      {options.map((option) => (
        <button
          key={option}
          onClick={() => onChange(option)}
          className="flex-1 h-12 rounded-lg font-bold text-lg relative z-10"
        >
          <motion.span
            animate={{
              color:
                value === option ? "var(--color-white)" : "var(--color-text)",
            }}
            transition={{ duration: 0.2 }}
          >
            {format ? format(option) : option}
          </motion.span>
        </button>
      ))}
    </div>
  );
}

export function StartScreen() {
  return (
    <Modal>
      <div className="flex flex-col items-center">
        <span className="text-4xl font-semibold pt-2">{t("appTitle")}</span>

        <div className="w-full mt-7">
          <TeamTiles />
        </div>
        <motion.button
          onClick={() => routerStore.openTeams()}
          whileTap={{ scale: 0.96 }}
          className="mt-2.5 flex items-center gap-1.5 text-sm text-text/55 hover:text-text transition-colors"
        >
          <Users size={15} />
          {t("teams")}
        </motion.button>

        <p className="text text-text/70 mt-6 mb-0 pb-2">
          {t("secondsPerRound")}
        </p>
        <Segmented
          options={[10, 30, 60, 90]}
          value={gameStore.secondsPerRound}
          onChange={(seconds) => gameStore.changeSecondsPerRound(seconds)}
        />

        <p className="text text-text/70 mt-6 mb-0 pb-2">{t("playTo")}</p>
        <Segmented
          options={TARGET_OPTIONS}
          value={teamsStore.targetScore}
          onChange={(score) => teamsStore.changeTargetScore(score)}
          format={(score) => (score === 0 ? "∞" : String(score))}
        />

        <div className="mt-8 w-full" />
        <Button variant="success" onClick={() => gameStore.goToPass()}>
          <motion.div
            initial={{ opacity: 0.3 }}
            animate={{ opacity: 1 }}
            className="font-semibold text-xl"
            transition={{
              repeat: Infinity,
              repeatType: "reverse",
              duration: 0.3,
            }}
          >
            {t("start")}
          </motion.div>
        </Button>
      </div>
    </Modal>
  );
}
