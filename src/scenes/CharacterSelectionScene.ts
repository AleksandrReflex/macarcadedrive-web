import Phaser from "phaser";
import { audioSystem } from "../audio/AudioSystem";
import { AssetCatalog, DriverOrder, ThemeConfig, type DriverProfile } from "../config/AssetConfig";
import { SceneKeys } from "../config/SceneKeys";
import { GameSession } from "../systems/GameSession";
import { InputController } from "../systems/InputController";
import { addStudioBackdrop } from "../ui/BackdropFactory";

export class CharacterSelectionScene extends Phaser.Scene {
  private inputController!: InputController;

  private titleLabel!: Phaser.GameObjects.Text;
  private nameLabel!: Phaser.GameObjects.Text;
  private summaryLineOne!: Phaser.GameObjects.Text;
  private summaryLineTwo!: Phaser.GameObjects.Text;
  private styleLabel!: Phaser.GameObjects.Text;
  private controlsHint!: Phaser.GameObjects.Text;
  private carSprite!: Phaser.GameObjects.Image;
  private startButton!: Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle;
  private startLabel!: Phaser.GameObjects.Text;
  private leftArrow!: Phaser.GameObjects.Text;
  private rightArrow!: Phaser.GameObjects.Text;
  private pageDots: Phaser.GameObjects.Arc[] = [];
  private panelNode?: Phaser.GameObjects.Graphics;
  private activeDotTween?: Phaser.Tweens.Tween;
  private uiScale = 1;
  private carCenterX = 0;

  private currentIndex = 0;
  private lastHorizontalInput = 0;
  private lastTurboPressed = false;

  constructor() {
    super(SceneKeys.CharacterSelection);
  }

  create(): void {
    audioSystem.setMusic("menu");
    this.inputController = new InputController(this);
    this.inputController.resetState();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.inputController.destroy();
    });
    this.buildScene();
    this.refreshProfile(false);

    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (this.containsStartButton(pointer.x, pointer.y)) {
        this.confirmSelection();
        return;
      }

      const { width } = this.scale;
      if (pointer.x < width * 0.32) {
        this.moveSelection(-1);
      } else if (pointer.x > width * 0.68) {
        this.moveSelection(1);
      }
    });
  }

  update(time: number): void {
    this.inputController.syncFromHardware();
    const horizontal = this.inputController.steering;
    const boosting = this.inputController.boosting;

    this.updateAnimatedCarFrame(time);

    if (horizontal <= -0.9 && this.lastHorizontalInput > -0.9) {
      this.moveSelection(-1);
    } else if (horizontal >= 0.9 && this.lastHorizontalInput < 0.9) {
      this.moveSelection(1);
    }

    if (boosting && !this.lastTurboPressed) {
      this.confirmSelection();
    }

    if (this.inputController.consumeStartPressed()) {
      this.confirmSelection();
    }
    if (this.inputController.consumePausePressed()) {
      this.goBackToMenu();
    }

    this.lastHorizontalInput = horizontal;
    this.lastTurboPressed = boosting;
  }

  private buildScene(): void {
    const { width, height } = this.scale;
    this.uiScale = Phaser.Math.Clamp(Math.min(width / 390, height / 700), 0.72, 1);
    addStudioBackdrop(this, width, height, -10, height * 0.09);

    const panel = this.add.graphics();
    const panelWidth = width * 0.84 * Phaser.Math.Linear(0.9, 1, this.uiScale);
    const panelHeight = height * 0.62 * Phaser.Math.Linear(0.9, 1, this.uiScale);
    const panelX = width * 0.5 - panelWidth * 0.5;
    const panelY = height * 0.42 - panelHeight * 0.5;
    const panelRadius = Math.round(22 * Phaser.Math.Linear(0.75, 1, this.uiScale));
    panel.fillGradientStyle(0x1b1b1f, 0x282a30, 0x141519, 0x191a1f, 0.92);
    panel.fillRoundedRect(panelX, panelY, panelWidth, panelHeight, panelRadius);
    panel.lineStyle(2, 0xffffff, 0.18);
    panel.strokeRoundedRect(panelX, panelY, panelWidth, panelHeight, panelRadius);
    panel.fillStyle(ThemeConfig.crimson, 0.11);
    panel.fillRect(panelX, panelY, panelWidth, panelHeight * 0.17);
    panel.setDepth(1);
    this.panelNode = panel;
    this.tweens.add({
      targets: panel,
      scaleX: 1.015,
      scaleY: 1.01,
      duration: 1800,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut"
    });

    const spotlight = this.add.graphics();
    spotlight.fillGradientStyle(0xffffff, 0xffffff, 0xffffff, 0xffffff, 0.18);
    spotlight.fillEllipse(
      width * 0.5,
      height * 0.515,
      width * 0.31 * Phaser.Math.Linear(0.78, 1, this.uiScale),
      height * 0.105 * Phaser.Math.Linear(0.78, 1, this.uiScale)
    );
    spotlight.setDepth(2);
    spotlight.setAlpha(0.15);

    this.titleLabel = this.makeText(width * 0.5, height * 0.165, "SELECT DRIVER", Math.round(19 * this.uiScale), ThemeConfig.crimson, 0.5);
    this.carCenterX = width * 0.5;
    this.carSprite = this.add.image(this.carCenterX, height * 0.43, DriverOrder[0].rearFrames[0]).setDepth(6);
    this.styleLabel = this.makeText(width * 0.5, height * 0.322, "", Math.round(11 * this.uiScale), ThemeConfig.fuchsia, 0.5);
    this.nameLabel = this.makeText(width * 0.5, height * 0.625, "", Math.round(21 * this.uiScale), ThemeConfig.whiteGlow, 0.5);

    this.summaryLineOne = this.makeText(width * 0.5, height * 0.668, "", Math.round(11 * this.uiScale), ThemeConfig.chrome, 0.5, 0.94);
    this.summaryLineTwo = this.makeText(width * 0.5, height * 0.706, "", Math.round(11 * this.uiScale), ThemeConfig.chrome, 0.5, 0.94);

    this.leftArrow = this.makeText(width * 0.17, height * 0.43, "<", Math.round(28 * this.uiScale), ThemeConfig.fuchsia, 0.5);
    this.rightArrow = this.makeText(width * 0.83, height * 0.43, ">", Math.round(28 * this.uiScale), ThemeConfig.fuchsia, 0.5);

    this.buildPageDots();

    this.startButton = this.textures.exists(AssetCatalog.uiStartButton)
      ? this.add.image(width * 0.5, height * 0.932, AssetCatalog.uiStartButton).setDepth(10)
      : this.add
          .rectangle(
            width * 0.5,
            height * 0.932,
            Math.min(width * 0.4, 140) * Phaser.Math.Linear(0.8, 1, this.uiScale),
            40 * this.uiScale,
            0x111117,
            0.88
          )
          .setDepth(10);
    if (this.startButton instanceof Phaser.GameObjects.Image) {
      const startWidth = Math.min(width * 0.4, 140) * Phaser.Math.Linear(0.8, 1, this.uiScale);
      const scale = startWidth / Math.max(1, this.startButton.width);
      this.startButton.setScale(scale);
    }

    this.startLabel = this.makeText(width * 0.5, height * 0.932, "START", Math.round(16 * this.uiScale), ThemeConfig.whiteGlow, 0.5);
    this.startLabel.setDepth(11);

    this.controlsHint = this.makeText(
      width * 0.5,
      height * 0.982,
      "D-PAD L/R • TURBO CONFIRM",
      Math.max(7, Math.round(8 * this.uiScale)),
      ThemeConfig.backgroundBlack,
      0.5,
      0.56
    );
    this.controlsHint.setDepth(10);
  }

  private moveSelection(delta: number): void {
    audioSystem.playSelectMove();
    this.currentIndex = (this.currentIndex + delta + DriverOrder.length) % DriverOrder.length;
    this.refreshProfile(true, delta);
    this.animateArrowFeedback(delta);
  }

  private refreshProfile(animated: boolean, direction = 0): void {
    const profile = DriverOrder[this.currentIndex];
    GameSession.currentDriver = profile;

    if (this.textures.exists(profile.rearFrames[0])) {
      this.carSprite.setTexture(profile.rearFrames[0]);
      const carHeight = this.scale.height * 0.33 * Phaser.Math.Linear(0.76, 1, this.uiScale);
      const texture = this.textures.get(profile.rearFrames[0]).getSourceImage() as HTMLImageElement;
      const aspect = texture.width / Math.max(1, texture.height);
      this.carSprite.setDisplaySize(carHeight * aspect, carHeight);
    }

    this.nameLabel.setText(profile.displayName);
    this.styleLabel.setText(this.styleLine(profile));
    const [lineOne, lineTwo] = this.summaryLines(profile);
    this.summaryLineOne.setText(lineOne);
    this.summaryLineTwo.setText(lineTwo);
    this.updatePageDots();

    if (animated) {
      this.carSprite.x = this.carCenterX + direction * 26;
      this.carSprite.alpha = 0.72;
      this.tweens.add({
        targets: this.carSprite,
        x: this.carCenterX,
        alpha: 1,
        duration: 170,
        ease: "Back.easeOut"
      });
    }
  }

  private buildPageDots(): void {
    this.pageDots.forEach((dot) => dot.destroy());
    this.pageDots = [];
    const { width, height } = this.scale;
    const dotSpacing = width * 0.05;
    const startX = width * 0.5 - (dotSpacing * (DriverOrder.length - 1)) / 2;
    const y = height * 0.782;
    const dotRadius = 4.5 * Phaser.Math.Linear(0.8, 1, this.uiScale);
    for (let index = 0; index < DriverOrder.length; index += 1) {
      const dot = this.add.circle(startX + index * dotSpacing, y, dotRadius, ThemeConfig.chrome, 0.38);
      dot.setDepth(10);
      this.pageDots.push(dot);
    }
  }

  private updatePageDots(): void {
    this.activeDotTween?.stop();
    this.activeDotTween = undefined;
    this.pageDots.forEach((dot, index) => {
      const active = index === this.currentIndex;
      dot.setFillStyle(active ? ThemeConfig.fuchsia : ThemeConfig.chrome, active ? 1 : 0.38);
      dot.setScale(1);
      if (active) {
        this.activeDotTween = this.tweens.add({
          targets: dot,
          scale: 1.24,
          duration: 360,
          yoyo: true,
          repeat: -1,
          ease: "Sine.easeInOut"
        });
      }
    });
  }

  private animateArrowFeedback(direction: number): void {
    const target = direction < 0 ? this.leftArrow : this.rightArrow;
    this.tweens.add({
      targets: target,
      scaleX: 1.24,
      scaleY: 1.24,
      duration: 90,
      yoyo: true,
      ease: "Back.easeOut"
    });
  }

  private updateAnimatedCarFrame(time: number): void {
    const profile = DriverOrder[this.currentIndex];
    const frameKey = Math.floor(time / 280) % 2 === 0 ? profile.rearFrames[0] : profile.rearFrames[1];
    if (this.carSprite.texture.key !== frameKey && this.textures.exists(frameKey)) {
      this.carSprite.setTexture(frameKey);
    }
  }

  private styleLine(profile: DriverProfile): string {
    return profile.key === "doja" ? "MIDNIGHT SPEC" : "GLAM CABRIO";
  }

  private summaryLines(profile: DriverProfile): [string, string] {
    if (profile.key === "doja") {
      return ["PRECISION COUPE", "SHARP LANE CHANGES"];
    }
    return ["OPEN-TOP GLAM", "BRIGHT SHOW-CAR ENERGY"];
  }

  private containsStartButton(x: number, y: number): boolean {
    const bounds = this.startButton.getBounds();
    const startBounds = this.startLabel.getBounds();
    return bounds.contains(x, y) || startBounds.contains(x, y);
  }

  private makeText(x: number, y: number, value: string, size: number, color: number, originX: number, alpha = 1): Phaser.GameObjects.Text {
    return this.add
      .text(x, y, value, {
        fontFamily: "DotGothic16, monospace",
        fontSize: `${size}px`,
        color: Phaser.Display.Color.IntegerToColor(color).rgba
      })
      .setOrigin(originX, 0.5)
      .setAlpha(alpha)
      .setDepth(10);
  }

  private confirmSelection(): void {
    audioSystem.playConfirm();
    audioSystem.playStartCue();
    GameSession.currentDriver = DriverOrder[this.currentIndex];
    this.scene.start(SceneKeys.Race);
  }

  private goBackToMenu(): void {
    audioSystem.playPause();
    this.scene.start(SceneKeys.MainMenu);
  }
}
