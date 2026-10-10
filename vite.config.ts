import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import observerPlugin from "mobx-react-observer/vite-plugin";
import { execSync } from "child_process";
import { handleRoom, memoryStorage } from "./api/room";

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

/**
 * `vite dev` has no serverless runtime, so serve the room API from memory while
 * developing — open the app in two tabs (or two phones on the LAN) to test a room.
 */
function devRoomApi(): Plugin {
  const storage = memoryStorage();
  return {
    name: "dev-room-api",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use("/api/room", async (req, res) => {
        const chunks: Buffer[] = [];
        for await (const chunk of req) chunks.push(chunk as Buffer);
        const hasBody = req.method !== "GET" && req.method !== "HEAD";
        const request = new Request(`http://localhost${req.originalUrl}`, {
          method: req.method,
          headers: { "Content-Type": "application/json" },
          body: hasBody ? Buffer.concat(chunks) : undefined,
        });
        const response = await handleRoom(request, storage);
        res.statusCode = response.status;
        response.headers.forEach((value, key) => res.setHeader(key, value));
        res.end(await response.text());
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  define: {
    __COMMIT_HASH__: JSON.stringify(resolveCommitHash()),
  },
  plugins: [observerPlugin(), tailwindcss(), react(), devRoomApi()],
  // Vercel serves from the domain root.
  base: "/",
  server: {
    port: 35396,
  },
});
