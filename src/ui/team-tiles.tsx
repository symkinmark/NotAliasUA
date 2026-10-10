import { motion } from "framer-motion";
import { cn } from "../lib/cn";
import { teamsStore, teamLabel } from "../store/teams-store";

type Props = {
  /** Indexes to highlight. Defaults to the team whose turn it is. */
  highlight?: number[];
};

const columnsFor: Record<number, string> = {
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-2",
  5: "grid-cols-3",
  6: "grid-cols-3",
};

export function TeamTiles(props: Props) {
  const { teams } = teamsStore;
  const active = props.highlight ?? [teamsStore.currentIndex];

  return (
    <div className={cn("grid gap-2 w-full", columnsFor[teams.length] ?? "grid-cols-3")}>
      {teams.map((team, index) => (
        <motion.div
          key={team.id}
          layout
          animate={{
            backgroundColor:
              active.includes(index) ? "var(--color-success)" : "rgba(34, 34, 34, 0.05)",
            color: active.includes(index) ? "var(--color-white)" : "var(--color-text)",
          }}
          transition={{ duration: 0.2 }}
          className="flex flex-col items-center rounded-[15px] px-2 py-2.5 min-w-0"
        >
          <span className="text-xs font-medium opacity-80 truncate max-w-full">
            {teamLabel(team, index)}
          </span>
          <span className="text-2xl font-bold leading-tight tabular-nums">
            {team.score}
          </span>
        </motion.div>
      ))}
    </div>
  );
}
