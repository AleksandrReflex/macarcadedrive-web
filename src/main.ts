import "./styles.css";
import { audioSystem } from "./audio/AudioSystem";
import { createGame } from "./game";
import { ConsoleShell } from "./ui/ConsoleShell";

const app = document.getElementById("app");

if (!app) {
  throw new Error("Missing #app root node.");
}

const shell = new ConsoleShell(app);
const game = createGame(shell.screenHost);

const unlockAudio = () => {
  audioSystem.unlock();
};

window.addEventListener("pointerdown", unlockAudio, { passive: true, capture: true });
window.addEventListener("pointerup", unlockAudio, { passive: true, capture: true });
window.addEventListener("touchstart", unlockAudio, { passive: true, capture: true });
window.addEventListener("touchend", unlockAudio, { passive: true, capture: true });
window.addEventListener("mousedown", unlockAudio, { passive: true, capture: true });
window.addEventListener("mouseup", unlockAudio, { passive: true, capture: true });
window.addEventListener("click", unlockAudio, { passive: true, capture: true });
window.addEventListener("keydown", unlockAudio, { passive: true, capture: true });

window.addEventListener("beforeunload", () => {
  audioSystem.stopAll();
  shell.destroy();
  game.destroy(true);
});
