import { motion } from "framer-motion";
import { Smartphone } from "lucide-react";
import { Button } from "../ui/button";
import { Modal } from "../ui/modal";
import { TeamTiles } from "../ui/team-tiles";
import { gameStore } from "../store/game-store";
import { teamsStore } from "../store/teams-store";
import { t } from "../store/i18n-store";
import { roomStore } from "../store/room-store";

export function PassScreen() {
  return (
    <Modal>
      <div className="flex flex-col items-center text-center w-full">
        <motion.div
          className="text-success"
          animate={{ x: [-8, 8, -8] }}
          transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
        >
          <Smartphone size={40} />
        </motion.div>

        <span className="mt-4 text-lg text-text/60">
          {roomStore.active ? t("explainerTapsReady") : t("passThePhone")}
        </span>
        <span className="mt-1 text-sm text-text/40">{t("yourTurn")}</span>
        <span className="mt-2 text-3xl font-bold break-words max-w-full">
          {teamsStore.currentLabel}
        </span>

        <div className="mt-6 w-full">
          <TeamTiles />
        </div>

        <div className="mt-6 w-full">
          <Button variant="success" onClick={() => gameStore.beginPlay()}>
            <span className="font-semibold text-xl">{t("ready")}</span>
          </Button>
        </div>

        <button
          onClick={() => gameStore.backToStart()}
          className="text-text/50 text-sm hover:text-text/80 transition-colors mt-3"
        >
          {t("quit")}
        </button>
      </div>
    </Modal>
  );
}
