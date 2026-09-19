import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import observerPlugin from "mobx-react-observer/vite-plugin";
import { execSync } from "child_process";

function resolveCommitHash(): string {
  if (process.env.VERCEL_GIT_COMMIT_SHA) {
    return process.env.VERCEL_GIT_COMMIT_SHA.slice(0, 7);
  }
  try {
    return execSync("git rev-parse --short HEAD").toString().trim();
  } catch {
    return "dev";
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  define: {
    __COMMIT_HASH__: JSON.stringify(resolveCommitHash()),
  },
  plugins: [observerPlugin(), tailwindcss(), react()],
  // Vercel serves from the domain root.
  base: "/",
  server: {
    port: 35396,
  },
});
