import { motion } from "framer-motion";
import { ArrowLeft, Check } from "lucide-react";
import { Modal } from "../ui/modal";
import { Button } from "../ui/button";
import { routerStore } from "../store/router-store";
import { gameStore } from "../store/game-store";
import { i18nStore, t } from "../store/i18n-store";
import { topicIds, topicEmoji, topicName } from "../lib/topics";
import { countsByTopic, countFor } from "../lib/word-pool";

const counts = countsByTopic();

export function TopicsScreen() {
  const { language } = i18nStore;
  const available = countFor(gameStore.selectedTopics);
  const isOn = gameStore.isTopicOn;

  return (
    <Modal>
      <div className="flex flex-col items-center w-full">
        <div className="w-full flex items-center mb-1">
          <motion.button
            onClick={() => routerStore.navigate("start-modal")}
            className="p-2 -ml-2 rounded-lg text-text/60 hover:text-text hover:bg-text/5 transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <ArrowLeft size={24} />
          </motion.button>
          <span className="flex-1 text-center text-2xl font-semibold pr-8">
            {t("topics")}
          </span>
        </div>
        <p className="text-sm text-text/50 mb-5 tabular-nums">
          {available} {t("wordsAvailable")}
        </p>

        <div className="grid grid-cols-2 gap-2 w-full">
          {topicIds.map((id) => {
            const on = isOn(id);
            return (
              <motion.button
                key={id}
                onClick={() => gameStore.toggleTopic(id)}
                onDoubleClick={() => gameStore.selectOnlyTopic(id)}
                whileTap={{ scale: 0.96 }}
                animate={{
                  backgroundColor: on ? "var(--color-success)" : "rgba(34, 34, 34, 0.05)",
                  color: on ? "var(--color-white)" : "var(--color-text)",
                }}
                transition={{ duration: 0.15 }}
                className="relative flex flex-col items-start gap-0.5 rounded-[14px] px-3 py-2.5 text-left min-w-0"
              >
                {on && (
                  <Check size={13} className="absolute top-2 right-2 opacity-70" />
                )}
                <span className="text-lg leading-none">{topicEmoji[id]}</span>
                <span className="text-[12px] font-semibold leading-tight pr-4">
                  {topicName(id, language)}
                </span>
                <span className="text-[10px] opacity-60 tabular-nums">
                  {counts[id]}
                </span>
              </motion.button>
            );
          })}
        </div>

        <button
          onClick={() => gameStore.selectAllTopics()}
          className="mt-3 text-sm text-text/55 hover:text-text transition-colors"
        >
          {t("selectAll")}
        </button>

        <div className="mt-5 w-full">
          <Button
            variant="success"
            onClick={() => routerStore.navigate("start-modal")}
          >
            <span className="font-semibold text-lg">{t("done")}</span>
          </Button>
        </div>
      </div>
    </Modal>
  );
}
