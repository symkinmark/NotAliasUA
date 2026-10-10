import { Users, Tags, Shuffle, Smartphone } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "../ui/button";
import { Modal } from "../ui/modal";
import { TeamTiles } from "../ui/team-tiles";
import { gameStore, type GameMode } from "../store/game-store";
import { routerStore } from "../store/router-store";
import { teamsStore, TARGET_OPTIONS } from "../store/teams-store";
import { i18nStore, t } from "../store/i18n-store";
import { roomStore } from "../store/room-store";
import { RoomDot } from "../ui/room-status";
import { isTagged } from "../lib/word-pool";
import { topicIds } from "../lib/topics";

type SegmentedProps = {
  options: number[];
  value: number;
  onChange: (value: number) => void;
  format?: (value: number) => string;
};

function Segmented({ options, value, onChange, format }: SegmentedProps) {
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
              color: value === option ? "var(--color-white)" : "var(--color-text)",
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

function ModeTile(props: { mode: GameMode; title: string; hint: string }) {
  const active = gameStore.mode === props.mode;
  return (
    <motion.button
      onClick={() => gameStore.changeMode(props.mode)}
      whileTap={{ scale: 0.97 }}
      animate={{
        backgroundColor: active ? "var(--color-success)" : "rgba(34, 34, 34, 0.05)",
        color: active ? "var(--color-white)" : "var(--color-text)",
      }}
      transition={{ duration: 0.15 }}
      className="flex-1 rounded-[14px] px-3 py-2.5 text-left min-w-0"
    >
      <span className="block text-sm font-bold leading-tight">{props.title}</span>
      <span className="block text-[11px] opacity-70 leading-tight mt-0.5">
        {props.hint}
      </span>
    </motion.button>
  );
}

export function StartScreen() {
  const tagged = isTagged(i18nStore.language);

  return (
    <Modal>
      <div className="flex flex-col items-center">
        <span className="text-4xl font-semibold pt-2">{t("appTitle")}</span>

        <div className="w-full mt-6">
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

        {tagged && (
          <>
            <p className="text text-text/70 mt-6 mb-0 pb-2">{t("mode")}</p>
            <div className="flex gap-2 w-full">
              <ModeTile mode="classic" title={t("modeClassic")} hint={t("modeClassicHint")} />
              <ModeTile mode="levels" title={t("modeLevels")} hint={t("modeLevelsHint")} />
            </div>
          </>
        )}

        <p className="text text-text/70 mt-6 mb-0 pb-2">{t("secondsPerRound")}</p>
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

        <div className="flex gap-2 w-full mt-6">
          {tagged && (
            <motion.button
              onClick={() => routerStore.openTopics()}
              whileTap={{ scale: 0.96 }}
              className="flex-1 h-12 rounded-lg bg-text/5 hover:bg-text/10 transition-colors flex items-center justify-center gap-2 text-sm font-medium min-w-0"
            >
              <Tags size={16} className="shrink-0" />
              <span className="truncate">
                {t("topics")} {gameStore.activeTopicCount}/{topicIds.length}
              </span>
            </motion.button>
          )}
          <motion.button
            onClick={() => gameStore.shuffleDeck()}
            whileTap={{ scale: 0.96, rotate: -12 }}
            className="flex-1 h-12 rounded-lg bg-text/5 hover:bg-text/10 transition-colors flex items-center justify-center gap-2 text-sm font-medium min-w-0"
          >
            <Shuffle size={16} className="shrink-0" />
            <span className="truncate">{t("shuffle")}</span>
          </motion.button>
        </div>

        <motion.button
          onClick={() => routerStore.openRoom()}
          whileTap={{ scale: 0.97 }}
          className="mt-2 w-full h-12 rounded-lg bg-text/5 hover:bg-text/10 transition-colors flex items-center justify-center gap-2 text-sm font-medium min-w-0"
        >
          <Smartphone size={16} className="shrink-0" />
          {roomStore.active ? (
            <>
              <span className="tabular-nums">
                {t("room")} {roomStore.code}
              </span>
              <RoomDot />
            </>
          ) : (
            <span className="truncate">{t("multiPhone")}</span>
          )}
        </motion.button>

        <div className="mt-6 w-full">
          <Button variant="success" onClick={() => gameStore.goToPass()}>
            <motion.div
              initial={{ opacity: 0.3 }}
              animate={{ opacity: 1 }}
              className="font-semibold text-xl"
              transition={{ repeat: Infinity, repeatType: "reverse", duration: 0.3 }}
            >
              {t("start")}
            </motion.div>
          </Button>
        </div>
      </div>
    </Modal>
  );
}
