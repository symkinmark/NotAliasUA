import ReactDOM from "react-dom/client";
import "./index.css";
import { Page } from "./page";
import { roomStore } from "./store/room-store";

// Rejoins the room this phone was in, or the one from a shared ?room= link.
void roomStore.start();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <Page />
);
