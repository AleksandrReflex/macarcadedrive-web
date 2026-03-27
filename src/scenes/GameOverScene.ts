import Phaser from "phaser";
import { audioSystem } from "../audio/AudioSystem";
import { ThemeConfig } from "../config/AssetConfig";
import { SceneKeys } from "../config/SceneKeys";
import { InputController } from "../systems/InputController";
import { addStudioBackdrop } from "../ui/BackdropFactory";

interface GameOverData {
  finalScore: number;
}

export class GameOverScene extends Phaser.Scene {
  private inputController!: InputController;
  private finalScore = 0;
  private retryFrame = new Phaser.Geom.Rectangle();
  private menuFrame = new Phaser.Geom.Rectangle();

  constructor() {
    super(SceneKeys.GameOver);
  }

  init(data: GameOverData): void {
    this.finalScore = data.finalScore ?? 0;
  }

  create(): void {
    audioSystem.setMusic("none");
    audioSystem.playGameOverStinger();
    const { width, height } = this.scale;
    this.inputController = new InputController(this);
    this.inputController.resetState();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.inputController.destroy();
    });
    addStudioBackdrop(this, width, height, -10);

    const panelWidth = width * 0.76;
    const panelHeight = height * 0.42;
    const panelX = width * 0.5;
    const panelY = height * 0.5;

    const panel = this.add.graphics();
    panel.fillStyle(ThemeConfig.backgroundBlack, 0.86);
    panel.fillRoundedRect(panelX - panelWidth * 0.5, panelY - panelHeight * 0.5, panelWidth, panelHeight, 18);
    panel.lineStyle(3, ThemeConfig.chrome, 1);
    panel.strokeRoundedRect(panelX - panelWidth * 0.5, panelY - panelHeight * 0.5, panelWidth, panelHeight, 18);
    panel.setDepth(20);

    this.makeText(panelX, panelY - panelHeight * 0.28, "GAME OVER", 22, ThemeConfig.fuchsia);
    this.makeText(panelX, panelY - panelHeight * 0.08, `SCORE ${this.finalScore.toString().padStart(6, "0")}`, 14, ThemeConfig.whiteGlow);
    this.makeText(panelX, panelY + panelHeight * 0.1, "RETRY", 14, ThemeConfig.electricBlue);
    this.makeText(panelX, panelY + panelHeight * 0.26, "MENU", 12, ThemeConfig.chrome);

    this.retryFrame.setTo(panelX - panelWidth * 0.24, panelY + panelHeight * 0.1 - 12, panelWidth * 0.48, 24);
    this.menuFrame.setTo(panelX - panelWidth * 0.24, panelY + panelHeight * 0.26 - 10, panelWidth * 0.48, 20);

    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (this.retryFrame.contains(pointer.x, pointer.y)) {
        this.retryGame();
      } else if (this.menuFrame.contains(pointer.x, pointer.y)) {
        this.goToMenu();
      }
    });
  }

  update(): void {
    this.inputController.syncFromHardware();
    if (this.inputController.consumeStartPressed()) {
      this.retryGame();
    }
    if (this.inputController.consumePausePressed()) {
      this.goToMenu();
    }
  }

  private retryGame(): void {
    audioSystem.playStartCue();
    audioSystem.setMusic("race");
    this.scene.start(SceneKeys.Race);
  }

  private goToMenu(): void {
    audioSystem.playPause();
    audioSystem.setMusic("menu");
    this.scene.start(SceneKeys.MainMenu);
  }

  private makeText(x: number, y: number, text: string, size: number, color: number): Phaser.GameObjects.Text {
    return this.add
      .text(x, y, text, {
        fontFamily: "DotGothic16, monospace",
        fontSize: `${size}px`,
        color: Phaser.Display.Color.IntegerToColor(color).rgba
      })
      .setOrigin(0.5)
      .setDepth(21);
  }
}
