import Phaser from "phaser";
import { audioSystem } from "../audio/AudioSystem";
import { AssetCatalog, preloadKnownAssets } from "../config/AssetConfig";
import { SceneKeys } from "../config/SceneKeys";

export class LoadingScene extends Phaser.Scene {
  private startedAt = 0;

  constructor() {
    super(SceneKeys.Loading);
  }

  preload(): void {
    this.startedAt = performance.now();
    const { width, height } = this.scale;

    const bg = this.add.graphics();
    bg.fillGradientStyle(0x171927, 0x23283f, 0x0e101a, 0x0a0b11, 1);
    bg.fillRect(0, 0, width, height);

    const logoGlow = this.add.rectangle(width * 0.5, height * 0.48, width * 0.66, 46, 0xf8f8fc, 0.08);
    const logo = this.add.text(width * 0.5, height * 0.48, "MAC ARCADE DRIVE", {
      fontFamily: "DotGothic16, monospace",
      fontSize: "26px",
      color: "#f8f8fc"
    });
    logo.setOrigin(0.5);
    logo.setScale(0.96);

    this.tweens.add({
      targets: [logo, logoGlow],
      alpha: 0.55,
      duration: 520,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut"
    });
    this.tweens.add({
      targets: logo,
      scale: 1.02,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut"
    });

    const progressText = this.add.text(width * 0.5, height * 0.56, "LOADING 0%", {
      fontFamily: "DotGothic16, monospace",
      fontSize: "12px",
      color: "#dedee3"
    });
    progressText.setOrigin(0.5);
    this.tweens.add({
      targets: progressText,
      y: progressText.y + 2,
      duration: 460,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut"
    });

    const progressBar = this.add.graphics();
    const barWidth = Math.min(width * 0.68, 300);
    const barHeight = 8;
    const barX = width * 0.5 - barWidth * 0.5;
    const barY = height * 0.62;

    this.load.on("progress", (value: number) => {
      progressText.setText(`LOADING ${Math.floor(value * 100)}%`);
      progressBar.clear();
      progressBar.fillStyle(0xffffff, 0.2);
      progressBar.fillRect(barX, barY, barWidth, barHeight);
      progressBar.fillStyle(0xd96d73, 0.95);
      progressBar.fillRect(barX, barY, barWidth * value, barHeight);
      progressBar.fillStyle(0xffffff, 0.52);
      progressBar.fillRect(barX + Math.max(0, barWidth * value - 12), barY, 12, barHeight);
    });

    preloadKnownAssets(this.load);
  }

  create(): void {
    audioSystem.setMusic("none");
    const elapsed = performance.now() - this.startedAt;
    const minDelay = 1350;
    const delay = Math.max(0, minDelay - elapsed);

    const overlay = this.add.rectangle(this.scale.width * 0.5, this.scale.height * 0.5, this.scale.width, this.scale.height, 0x000000, 0);
    overlay.setDepth(100);

    this.tweens.add({
      targets: overlay,
      alpha: 0.28,
      duration: 450,
      yoyo: true
    });

    this.time.delayedCall(delay, () => {
      if (this.textures.exists(AssetCatalog.shellLogoMac)) {
        // Warm-up draw to avoid a first-frame decode spike on menu.
        this.add.image(-100, -100, AssetCatalog.shellLogoMac).destroy();
      }
      this.scene.start(SceneKeys.MainMenu);
    });
  }
}
