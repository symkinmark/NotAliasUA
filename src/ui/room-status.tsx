import { motion } from "framer-motion";
import { RotateCw } from "lucide-react";
import { cn } from "../lib/cn";
import { roomStore } from "../store/room-store";
import { routerStore } from "../store/router-store";
import { t } from "../store/i18n-store";
import type { TranslationKey } from "../i18n/translations";

type Status = typeof roomStore.status;

const dotColor: Record<Status, string> = {
  idle: "bg-text/30",
  connecting: "bg-amber-500",
  live: "bg-success",
  offline: "bg-error",
  outdated: "bg-error",
};

const label: Record<Status, TranslationKey> = {
  idle: "roomConnecting",
  connecting: "roomConnecting",
  live: "roomLive",
  offline: "roomOffline",
  outdated: "roomOutdated",
};

/** Green when synced, amber while connecting, red when offline. */
export function RoomDot() {
  const { status } = roomStore;
  return (
    <motion.span
      className={cn("inline-block w-2 h-2 rounded-full shrink-0", dotColor[status])}
      animate={status === "connecting" ? { opacity: [1, 0.3, 1] } : { opacity: 1 }}
      transition={status === "connecting" ? { repeat: Infinity, duration: 1 } : undefined}
    />
  );
}

/** "● In sync" — or, when this phone's app is too old for the room, a reload button. */
export function RoomStatus() {
  if (roomStore.status === "outdated") {
    return (
      <button
        onClick={() => location.reload()}
        className="flex items-center gap-1.5 text-xs font-semibold text-error"
      >
        <RotateCw size={13} />
        {t("roomOutdated")}
      </button>
    );
  }
  return (
    <span className="flex items-center gap-1.5 text-xs text-text/55">
      <RoomDot />
      {t(label[roomStore.status])}
    </span>
  );
}

/** Corner pill while in a room, so nobody wonders if they're connected mid-game. */
export function RoomBadge() {
  const { screen } = routerStore;
  // Menus show the room on their own button; on tall menus the pill would sit on the card.
  if (!roomStore.active || !(screen === "pass" || screen === "game" || screen === "finish")) {
    return null;
  }
  if (roomStore.status === "outdated") {
    return (
      <div className="fixed left-4 z-50 top-[calc(env(safe-area-inset-top)+1rem)] rounded-full bg-card/80 px-3 py-1.5 shadow-sm">
        <RoomStatus />
      </div>
    );
  }
  return (
    <div className="fixed left-4 z-50 top-[calc(env(safe-area-inset-top)+1.25rem)] flex items-center gap-1.5 rounded-full bg-card/70 px-2.5 py-1 text-xs font-semibold tabular-nums text-text/60">
      <RoomDot />
      {roomStore.code}
    </div>
  );
}
