import Phaser from "phaser";
import { audioSystem } from "../audio/AudioSystem";
import { AssetCatalog, DriverProfiles, ThemeConfig } from "../config/AssetConfig";
import { SceneKeys } from "../config/SceneKeys";
import { InputController } from "../systems/InputController";
import { addScanlineOverlay, addStudioBackdrop } from "../ui/BackdropFactory";

export class MainMenuScene extends Phaser.Scene {
  private inputController!: InputController;
  private startLabel!: Phaser.GameObjects.Text;
  private uiScale = 1;

  constructor() {
    super(SceneKeys.MainMenu);
  }

  create(): void {
    audioSystem.setMusic("menu");
    const { width, height } = this.scale;
    this.uiScale = this.sceneUIScale(width, height);
    addStudioBackdrop(this, width, height, -20, height * 0.09);
    addScanlineOverlay(this, width, height, 14);

    this.inputController = new InputController(this);
    this.inputController.resetState();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.inputController.destroy();
    });

    if (this.textures.exists(AssetCatalog.shellLogoMac)) {
      const logo = this.add.image(width * 0.5, height * 0.165, AssetCatalog.shellLogoMac);
      const maxLogoWidth = Math.min(width * 0.78, 250);
      const scale = maxLogoWidth / Math.max(1, logo.width);
      logo.setScale(scale);
      logo.setDepth(10);
      this.tweens.add({
        targets: logo,
        y: logo.y + 3,
        duration: 1800,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut"
      });
    }

    this.configureHero(DriverProfiles.doja, width * 0.27, 1);
    this.configureHero(DriverProfiles.roan, width * 0.73, 1);

    this.add.rectangle(width * 0.5, height * 0.5, width, height, ThemeConfig.backgroundBlack, 0.05).setDepth(3);

    const startButtonWidth = Math.min(width * 0.4, 140) * Phaser.Math.Linear(0.8, 1, this.uiScale);
    const startButton = this.textures.exists(AssetCatalog.uiStartButton)
      ? this.add.image(width * 0.5, height * 0.932, AssetCatalog.uiStartButton)
      : this.add.rectangle(width * 0.5, height * 0.932, startButtonWidth, 40 * this.uiScale, 0x111117, 0.88);
    startButton.setDepth(12);

    if (startButton instanceof Phaser.GameObjects.Image) {
      const scale = startButtonWidth / Math.max(1, startButton.width);
      startButton.setScale(scale);
    }

    this.startLabel = this.add.text(width * 0.5, height * 0.932, "START", {
      fontFamily: "DotGothic16, monospace",
      fontSize: `${Math.round(16 * this.uiScale)}px`,
      color: "#ffffff"
    });
    this.startLabel.setOrigin(0.5);
    this.startLabel.setDepth(13);

    const pixelGlow = this.add.rectangle(width * 0.5, height * 0.14, width * 0.88, 2, ThemeConfig.whiteGlow, 0.12);
    pixelGlow.setDepth(5);

    this.tweens.add({
      targets: this.startLabel,
      alpha: 0.45,
      duration: 700,
      yoyo: true,
      repeat: -1
    });

    this.time.addEvent({
      delay: 2200,
      loop: true,
      callback: () => {
        this.startLabel.x += Phaser.Math.Between(-1, 1);
        this.startLabel.y += Phaser.Math.Between(-1, 1);
        this.startLabel.setAlpha(0.86);
        this.time.delayedCall(60, () => {
          this.startLabel.x = width * 0.5;
          this.startLabel.y = height * 0.932;
        });
      }
    });

    this.input.once("pointerdown", () => this.startGame());
  }

  update(): void {
    this.inputController.syncFromHardware();
    if (this.inputController.consumeStartPressed()) {
      this.startGame();
    }
  }

  private configureHero(profile: (typeof DriverProfiles)[keyof typeof DriverProfiles], x: number, alpha: number): void {
    const { height } = this.scale;
    const textureKey = profile.menuFrames[0];
    if (!this.textures.exists(textureKey)) {
      return;
    }

    const hero = this.add.image(x, height * 0.49, textureKey);
    const targetHeight = height * 0.62 * Phaser.Math.Linear(0.78, 1, this.uiScale);
    const scale = targetHeight / Math.max(1, hero.height);
    hero.setScale(scale);
    hero.setAlpha(alpha);
    hero.setDepth(1);
    this.tweens.add({
      targets: hero,
      y: hero.y + 5,
      duration: 2000 + Phaser.Math.Between(0, 300),
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut"
    });

    if (this.textures.exists(profile.menuFrames[1])) {
      this.time.addEvent({
        delay: 360,
        loop: true,
        callback: () => {
          hero.setTexture(hero.texture.key === profile.menuFrames[0] ? profile.menuFrames[1] : profile.menuFrames[0]);
        }
      });
    }
  }

  private startGame(): void {
    audioSystem.playStartCue();
    this.scene.start(SceneKeys.CharacterSelection);
  }

  private sceneUIScale(width: number, height: number): number {
    return Phaser.Math.Clamp(Math.min(width / 390, height / 700), 0.72, 1);
  }
}
