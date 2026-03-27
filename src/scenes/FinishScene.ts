import Phaser from "phaser";
import { audioSystem } from "../audio/AudioSystem";
import { AssetCatalog, ThemeConfig, type DriverProfile } from "../config/AssetConfig";
import { SceneKeys } from "../config/SceneKeys";
import { InputController } from "../systems/InputController";
import { addStudioBackdrop } from "../ui/BackdropFactory";

interface FinishSceneData {
  finalScore: number;
  driver: DriverProfile;
}

export class FinishScene extends Phaser.Scene {
  private inputController!: InputController;
  private finalScore = 0;
  private driver!: DriverProfile;

  constructor() {
    super(SceneKeys.Finish);
  }

  init(data: FinishSceneData): void {
    this.finalScore = data.finalScore ?? 0;
    this.driver = data.driver;
  }

  create(): void {
    audioSystem.setMusic("finish");
    audioSystem.playFinishStinger();
    const { width, height } = this.scale;
    this.inputController = new InputController(this);
    this.inputController.resetState();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.inputController.destroy();
    });
    addStudioBackdrop(this, width, height, -20);

    const glow = this.add.rectangle(width * 0.5, height * 0.52, width * 0.92, height * 0.38, ThemeConfig.fuchsia, 0.1);
    glow.setDepth(-10);
    this.tweens.add({
      targets: glow,
      alpha: 0.18,
      duration: 1100,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut"
    });

    if (this.textures.exists(AssetCatalog.shellLogoMac)) {
      const logo = this.add.image(width * 0.5, height * 0.15, AssetCatalog.shellLogoMac);
      const targetWidth = Math.min(width * 0.7, 220);
      logo.setScale(targetWidth / Math.max(1, logo.width));
      logo.setDepth(10);
      this.tweens.add({
        targets: logo,
        y: logo.y + 3,
        duration: 1700,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut"
      });
    }

    if (this.driver && this.textures.exists(this.driver.menuFrames[0])) {
      const hero = this.add.image(width * 0.5, height * 0.43, this.driver.menuFrames[0]);
      const heroHeight = height * 0.54;
      const source = this.textures.get(this.driver.menuFrames[0]).getSourceImage() as HTMLImageElement;
      const aspect = source.width / Math.max(1, source.height);
      hero.setDisplaySize(heroHeight * aspect, heroHeight);
      hero.setDepth(5);
      this.tweens.add({
        targets: hero,
        y: hero.y + 4,
        duration: 1500,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut"
      });

      if (this.textures.exists(this.driver.menuFrames[1])) {
        this.time.addEvent({
          delay: 360,
          loop: true,
          callback: () => {
            hero.setTexture(hero.texture.key === this.driver.menuFrames[0] ? this.driver.menuFrames[1] : this.driver.menuFrames[0]);
          }
        });
      }
    }

    const panelWidth = width * 0.76;
    const panelHeight = height * 0.24;
    const panelX = width * 0.5;
    const panelY = height * 0.76;

    const panel = this.add.graphics();
    panel.fillStyle(ThemeConfig.backgroundBlack, 0.72);
    panel.fillRoundedRect(panelX - panelWidth * 0.5, panelY - panelHeight * 0.5, panelWidth, panelHeight, 18);
    panel.lineStyle(3, ThemeConfig.chrome, 0.95);
    panel.strokeRoundedRect(panelX - panelWidth * 0.5, panelY - panelHeight * 0.5, panelWidth, panelHeight, 18);
    panel.setDepth(20);
    panel.setScale(0.94);
    panel.setAlpha(0);
    this.tweens.add({
      targets: panel,
      scaleX: 1,
      scaleY: 1,
      alpha: 1,
      duration: 220,
      ease: "Back.easeOut"
    });

    this.makeText(panelX, panelY - panelHeight * 0.2, "RUN COMPLETE", 18, ThemeConfig.fuchsia, 0.5, 21);
    this.makeText(panelX, panelY, "FINAL SCORE", 10, ThemeConfig.chrome, 0.5, 21, 0.8);
    this.makeText(panelX, panelY + panelHeight * 0.12, `${this.finalScore.toString().padStart(6, "0")}`, 22, ThemeConfig.whiteGlow, 0.5, 21);
    this.makeText(panelX, panelY + panelHeight * 0.29, "START RETRY  PAUSE MENU", 8, ThemeConfig.chrome, 0.5, 21);
    this.launchFinishSparkles(width, height);

    this.input.once("pointerdown", () => this.retryRun());
  }

  update(): void {
    this.inputController.syncFromHardware();
    if (this.inputController.consumeStartPressed()) {
      this.retryRun();
    }
    if (this.inputController.consumePausePressed()) {
      this.goToMenu();
    }
  }

  private retryRun(): void {
    audioSystem.playStartCue();
    audioSystem.setMusic("race");
    this.scene.start(SceneKeys.Race);
  }

  private goToMenu(): void {
    audioSystem.playPause();
    audioSystem.setMusic("menu");
    this.scene.start(SceneKeys.MainMenu);
  }

  private makeText(
    x: number,
    y: number,
    text: string,
    size: number,
    color: number,
    originX: number,
    depth = 20,
    alpha = 1
  ): Phaser.GameObjects.Text {
    return this.add
      .text(x, y, text, {
        fontFamily: "DotGothic16, monospace",
        fontSize: `${size}px`,
        color: Phaser.Display.Color.IntegerToColor(color).rgba
      })
      .setOrigin(originX, 0.5)
      .setDepth(depth)
      .setAlpha(alpha);
  }

  private launchFinishSparkles(width: number, height: number): void {
    this.time.addEvent({
      delay: 90,
      repeat: 28,
      callback: () => {
        const x = Phaser.Math.Between(Math.floor(width * 0.18), Math.floor(width * 0.82));
        const y = Phaser.Math.Between(Math.floor(height * 0.18), Math.floor(height * 0.62));
        const spark = this.add.rectangle(x, y, 3, 3, Phaser.Utils.Array.GetRandom([0xea6b76, 0xf8f8fc, 0xde6f76]), 0.92);
        spark.setDepth(30);
        spark.setBlendMode(Phaser.BlendModes.ADD);
        this.tweens.add({
          targets: spark,
          y: spark.y + Phaser.Math.Between(-24, 18),
          x: spark.x + Phaser.Math.Between(-18, 18),
          angle: Phaser.Math.Between(-60, 60),
          alpha: 0,
          duration: Phaser.Math.Between(240, 420),
          ease: "Cubic.easeOut",
          onComplete: () => spark.destroy()
        });
      }
    });
  }
}
