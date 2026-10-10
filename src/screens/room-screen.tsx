import { useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Share2, Smartphone } from "lucide-react";
import { Modal } from "../ui/modal";
import { Button } from "../ui/button";
import { RoomStatus } from "../ui/room-status";
import { routerStore } from "../store/router-store";
import { roomStore } from "../store/room-store";
import { t } from "../store/i18n-store";
import type { TranslationKey } from "../i18n/translations";

const problemText: Record<NonNullable<typeof roomStore.problem>, TranslationKey> = {
  "not-found": "roomNotFound",
  network: "roomNetwork",
  "not-configured": "roomNotConfigured",
};

function Header(props: { title: string }) {
  return (
    <div className="w-full flex items-center mb-5">
      <motion.button
        onClick={() => routerStore.navigate("start-modal")}
        className="p-2 -ml-2 rounded-lg text-text/60 hover:text-text hover:bg-text/5 transition-colors"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <ArrowLeft size={24} />
      </motion.button>
      <span className="flex-1 text-center text-2xl font-semibold pr-8">{props.title}</span>
    </div>
  );
}

function JoinOrCreate() {
  const [code, setCode] = useState("");
  const isBusy = roomStore.status === "connecting";

  function handleJoin(event: FormEvent) {
    event.preventDefault();
    if (code.length === 4 && !isBusy) void roomStore.join(code);
  }

  return (
    <div className="flex flex-col items-center w-full">
      <Header title={t("multiPhone")} />

      <motion.div
        className="flex gap-1 text-success"
        animate={{ y: [0, -4, 0] }}
        transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
      >
        <Smartphone size={34} />
        <Smartphone size={34} className="-scale-x-100" />
      </motion.div>
      <p className="mt-3 text-sm text-text/60 text-center">{t("multiPhoneIntro")}</p>

      <div className="mt-6 w-full">
        <Button variant="success" disabled={isBusy} onClick={() => roomStore.create()}>
          <span className="font-semibold text-lg">{t("createRoom")}</span>
        </Button>
      </div>

      <div className="flex items-center gap-3 w-full my-5 text-xs text-text/40">
        <span className="h-px flex-1 bg-text/10" />
        {t("or")}
        <span className="h-px flex-1 bg-text/10" />
      </div>

      <form onSubmit={handleJoin} className="flex gap-2 w-full">
        <input
          value={code}
          onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 4))}
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="off"
          placeholder={t("roomCode")}
          aria-label={t("roomCode")}
          className="flex-1 min-w-0 h-12 rounded-lg bg-text/5 px-3 text-lg text-center font-bold tracking-[0.3em] tabular-nums outline-none focus:bg-text/10 transition-colors placeholder:text-text/35 placeholder:text-base placeholder:font-normal placeholder:tracking-normal"
        />
        <motion.button
          type="submit"
          disabled={code.length !== 4 || isBusy}
          whileTap={{ scale: 0.96 }}
          className="h-12 px-4 rounded-lg bg-text/5 hover:bg-text/10 transition-colors text-sm font-semibold disabled:opacity-40"
        >
          {t("joinRoom")}
        </motion.button>
      </form>

      <p className="mt-3 min-h-5 text-sm text-center text-error">
        {roomStore.problem && t(problemText[roomStore.problem])}
      </p>
    </div>
  );
}

function InRoom() {
  const [isCopied, setIsCopied] = useState(false);

  async function handleShare() {
    const url = roomStore.shareUrl;
    try {
      if (navigator.share) {
        await navigator.share({ title: t("appTitle"), url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    } catch {
      // Dismissed share sheet, or no clipboard over plain http — the code is on screen anyway.
    }
  }

  return (
    <div className="flex flex-col items-center w-full">
      <Header title={t("room")} />

      <div className="grid grid-cols-4 gap-2 w-full">
        {roomStore.code!.split("").map((digit, index) => (
          <motion.span
            key={index}
            initial={{ y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: index * 0.05 }}
            className="h-16 rounded-[15px] bg-success text-white flex items-center justify-center text-4xl font-bold tabular-nums"
          >
            {digit}
          </motion.span>
        ))}
      </div>

      <div className="mt-3">
        <RoomStatus />
      </div>
      <p className="mt-3 text-sm text-text/60 text-center">{t("roomShareHint")}</p>

      <motion.button
        onClick={handleShare}
        whileTap={{ scale: 0.96 }}
        className="mt-5 w-full h-12 rounded-lg bg-text/5 hover:bg-text/10 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
      >
        <Share2 size={16} />
        {isCopied ? t("linkCopied") : t("shareLink")}
      </motion.button>

      <div className="mt-3 w-full">
        <Button variant="success" onClick={() => routerStore.navigate("start-modal")}>
          <span className="font-semibold text-lg">{t("done")}</span>
        </Button>
      </div>

      <button
        onClick={() => roomStore.leave()}
        className="text-text/50 text-sm hover:text-error transition-colors mt-3"
      >
        {t("leaveRoom")}
      </button>
    </div>
  );
}

export function RoomScreen() {
  return <Modal>{roomStore.active ? <InRoom /> : <JoinOrCreate />}</Modal>;
}
