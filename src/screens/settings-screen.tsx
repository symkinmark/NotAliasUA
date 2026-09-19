import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, RotateCcw } from "lucide-react";
import { Modal } from "../ui/modal";
import { routerStore } from "../store/router-store";
import { gameStore } from "../store/game-store";
import { teamsStore } from "../store/teams-store";
import { i18nStore, t } from "../store/i18n-store";
import { languages, languageNames } from "../i18n/translations";

export function SettingsScreen() {
  const [isConfirming, setIsConfirming] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  // Two taps, so a stray finger can't wipe the team names mid-game.
  function handleResetAll() {
    if (!isConfirming) {
      setIsConfirming(true);
      timeoutRef.current = setTimeout(() => setIsConfirming(false), 4000);
      return;
    }
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsConfirming(false);
    gameStore.resetEverything();
  }

  return (
    <Modal
      footer={
        <p className="mt-2 text-xs text-yellow-800/50">
          {t("appVersion")}: {__COMMIT_HASH__}
        </p>
      }
    >
      <div className="flex flex-col items-center">
        <div className="w-full flex items-center mb-6">
          <motion.button
            onClick={() => routerStore.closeSettings()}
            className="p-2 -ml-2 rounded-lg text-text/60 hover:text-text hover:bg-text/5 transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <ArrowLeft size={24} />
          </motion.button>
          <span className="flex-1 text-center text-2xl font-semibold pr-8">
            {t("settings")}
          </span>
        </div>

        <div className="w-full space-y-6">
          <div>
            <p className="text-base text-text/70 mb-3">{t("language")}</p>
            <div className="grid grid-cols-3 gap-2">
              {languages.map((lang) => (
                <motion.button
                  key={lang}
                  onClick={() => gameStore.changeLanguage(lang)}
                  className="h-12 rounded-lg font-medium text-sm sm:text-base"
                  animate={{
                    backgroundColor:
                      i18nStore.language === lang
                        ? "var(--color-success)"
                        : "rgba(34, 34, 34, 0.05)",
                    color:
                      i18nStore.language === lang
                        ? "var(--color-white)"
                        : "var(--color-text)",
                  }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                >
                  {languageNames[lang]}
                </motion.button>
              ))}
            </div>
          </div>

          <div>
            <button
              onClick={() => teamsStore.togglePenaltyForSkip()}
              className="w-full flex items-center justify-between gap-3 text-left"
            >
              <span className="text-base text-text/70">{t("skipPenalty")}</span>
              <motion.span
                className="relative shrink-0 w-12 h-7 rounded-full"
                animate={{
                  backgroundColor: teamsStore.penaltyForSkip
                    ? "var(--color-success)"
                    : "rgba(34, 34, 34, 0.12)",
                }}
                transition={{ duration: 0.15 }}
              >
                <motion.span
                  className="absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow"
                  animate={{ x: teamsStore.penaltyForSkip ? 20 : 0 }}
                  transition={{ type: "spring", stiffness: 500, damping: 32 }}
                />
              </motion.span>
            </button>
          </div>

          <div className="pt-5 border-t border-text/10">
            <motion.button
              onClick={handleResetAll}
              whileTap={{ scale: 0.97 }}
              animate={{
                backgroundColor: isConfirming
                  ? "var(--color-error)"
                  : "rgba(229, 61, 0, 0.08)",
                color: isConfirming ? "var(--color-white)" : "var(--color-error)",
              }}
              transition={{ duration: 0.15 }}
              className="w-full h-12 rounded-lg font-semibold text-base flex items-center justify-center gap-2"
            >
              <RotateCcw size={17} />
              {isConfirming ? t("resetAllConfirm") : t("resetAll")}
            </motion.button>
            <p className="mt-2 text-xs text-text/45 text-center">
              {t("resetAllHint")}
            </p>
          </div>
        </div>
      </div>
    </Modal>
  );
}
