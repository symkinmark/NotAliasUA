import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Copy, Flag, RotateCw, Undo2 } from "lucide-react";
import { Modal } from "../ui/modal";
import { routerStore } from "../store/router-store";
import { t } from "../store/i18n-store";
import { fetchFlags } from "../lib/room-api";
import { topicsOf, wordPool } from "../lib/word-pool";
import { topicEmoji } from "../lib/topics";

/**
 * God mode: every word players flagged as non-existent or pointless, most flagged
 * first, so the deck can be cleaned up. Read-only on the server side.
 */
export function GodScreen() {
  const [flags, setFlags] = useState<[string, number][] | null>(null);
  const [hasError, setHasError] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  function load() {
    setHasError(false);
    fetchFlags()
      .then((counts) => setFlags(Object.entries(counts).sort((a, b) => b[1] - a[1])))
      .catch(() => setHasError(true));
  }

  useEffect(load, []);

  async function handleCopy() {
    if (!flags) return;
    try {
      await navigator.clipboard.writeText(flags.map(([word, count]) => `${word} — ${count}`).join("\n"));
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    } catch {
      // No clipboard over plain http; the list is on screen anyway.
    }
  }

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
          <span className="flex-1 text-center text-2xl font-semibold pr-8">{t("godMode")}</span>
        </div>
        <p className="text-xs text-text/50 text-center mb-4">{t("godHint")}</p>

        <div className="w-full space-y-1.5">
          {hasError && <p className="text-sm text-error text-center">{t("godError")}</p>}
          {flags?.length === 0 && <p className="text-sm text-text/45 text-center">{t("godEmpty")}</p>}
          {flags?.map(([word, count]) => (
            <div key={word} className="flex items-center gap-2 h-10 px-3 rounded-lg bg-text/5">
              <span className="flex-1 min-w-0 truncate font-semibold capitalize">{word}</span>
              <span className="text-sm">{topicsOf(word).map((id) => topicEmoji[id]).join("")}</span>
              <span className="flex items-center gap-1 text-sm font-bold tabular-nums text-error">
                <Flag size={13} />
                {count}
              </span>
            </div>
          ))}
        </div>

        <div className="flex gap-2 w-full mt-4">
          <motion.button
            onClick={handleCopy}
            disabled={!flags?.length}
            whileTap={{ scale: 0.96 }}
            className="flex-1 h-11 rounded-lg bg-text/5 hover:bg-text/10 transition-colors flex items-center justify-center gap-2 text-sm font-medium disabled:opacity-40"
          >
            <Copy size={15} />
            {isCopied ? t("copied") : t("copyList")}
          </motion.button>
          <motion.button
            onClick={load}
            whileTap={{ scale: 0.96, rotate: -12 }}
            aria-label={t("reload")}
            className="h-11 px-4 rounded-lg bg-text/5 hover:bg-text/10 transition-colors flex items-center justify-center"
          >
            <RotateCw size={15} />
          </motion.button>
        </div>

        {wordPool.hidden.length > 0 && (
          <div className="w-full mt-6">
            <p className="text-sm text-text/60 mb-2">{t("hiddenHere")}</p>
            <div className="flex flex-wrap gap-2">
              {wordPool.hidden.map((word) => (
                <motion.button
                  key={word}
                  onClick={() => wordPool.unhide(word)}
                  whileTap={{ scale: 0.95 }}
                  aria-label={t("restoreWord")}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-text/5 hover:bg-text/10 text-sm font-semibold capitalize text-text/60"
                >
                  {word}
                  <Undo2 size={13} />
                </motion.button>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
