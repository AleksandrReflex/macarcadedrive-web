import Phaser from "phaser";
import { ThemeConfig } from "../config/AssetConfig";

export class HUD extends Phaser.GameObjects.Container {
  private readonly timeCaption: Phaser.GameObjects.Text;
  private readonly timeValue: Phaser.GameObjects.Text;
  private readonly scoreCaption: Phaser.GameObjects.Text;
  private readonly scoreValue: Phaser.GameObjects.Text;

  private readonly speedCaption: Phaser.GameObjects.Text;
  private readonly speedValue: Phaser.GameObjects.Text;
  private readonly speedUnit: Phaser.GameObjects.Text;
  private readonly tachCaption: Phaser.GameObjects.Text;
  private readonly damageCaption: Phaser.GameObjects.Text;
  private readonly damageValue: Phaser.GameObjects.Text;

  private readonly topPanel: Phaser.GameObjects.Graphics;
  private readonly topSweep: Phaser.GameObjects.Rectangle;
  private readonly bottomPanel: Phaser.GameObjects.Graphics;
  private topSweepTween?: Phaser.Tweens.Tween;
  private tachLights: Phaser.GameObjects.Rectangle[] = [];
  private glamLights: Phaser.GameObjects.Arc[] = [];
  private panelFrame = new Phaser.Geom.Rectangle();
  private tachAnchor = new Phaser.Math.Vector2();
  private previousIntegrity = 3;
  private previousTurbo = false;

  constructor(scene: Phaser.Scene) {
    super(scene, 0, 0);
    scene.add.existing(this);

    this.topPanel = scene.add.graphics();
    this.topPanel.setDepth(41);
    this.add(this.topPanel);

    this.topSweep = scene.add.rectangle(0, 0, 60, 10, ThemeConfig.whiteGlow, 0.12);
    this.topSweep.setBlendMode(Phaser.BlendModes.ADD);
    this.topSweep.setDepth(41);
    this.topSweep.setAlpha(0);
    this.add(this.topSweep);

    this.bottomPanel = scene.add.graphics();
    this.bottomPanel.setDepth(40);
    this.add(this.bottomPanel);

    this.timeCaption = this.makeCaption("TIME");
    this.timeValue = this.makeValue("00");
    this.scoreCaption = this.makeCaption("SCORE");
    this.scoreValue = this.makeValue("000000");
    this.timeValue.setOrigin(0.5, 0.5);
    this.scoreValue.setOrigin(0.5, 0.5);
    this.scoreCaption.setOrigin(1, 0.5);
    this.timeCaption.setColor("#ffffff").setAlpha(0.92);
    this.scoreCaption.setColor("#ffffff").setAlpha(0.92);

    this.speedCaption = this.makeCaption("SPEED");
    this.speedValue = this.makeText("0", 28, ThemeConfig.whiteGlow);
    this.speedValue.setOrigin(0, 0.5);
    this.speedValue.setDepth(42);
    this.add(this.speedValue);

    this.speedUnit = this.makeText("KM/H", 10, ThemeConfig.whiteGlow, 0.82);
    this.speedUnit.setOrigin(0, 0.5);
    this.speedUnit.setDepth(42);
    this.add(this.speedUnit);

    this.tachCaption = this.makeCaption("TACH");
    this.damageCaption = this.makeCaption("GLAM");
    this.damageValue = this.makeText("", 16, ThemeConfig.chrome, 0.78);
    this.damageValue.setOrigin(0, 0.5);
    this.damageValue.setDepth(42);
    this.add(this.damageValue);

    this.speedCaption.setColor("#ffa0af").setAlpha(0.96);
    this.damageCaption.setColor("#ffa0af").setAlpha(0.96);
    this.tachCaption.setColor("#ffa0af").setAlpha(0.96);
  }

  configure(width: number, height: number): void {
    const uiScale = Phaser.Math.Clamp(Math.min(width / 390, height / 700), 0.78, 1);
    const mobileFactor = Phaser.Math.Clamp((1 - uiScale) / 0.22, 0, 1);
    const textScale = Phaser.Math.Linear(1, 0.84, mobileFactor);
    const centerX = width * 0.5;
    const centerY = height * 0.5;
    const toScreenX = (spriteKitX: number) => centerX + spriteKitX;
    const toScreenY = (spriteKitY: number) => centerY - spriteKitY;

    const topY = height * Phaser.Math.Linear(0.43, 0.452, mobileFactor);
    const topYScreen = toScreenY(topY);
    const capsuleWidth = width * Phaser.Math.Linear(0.30, 0.245, mobileFactor);
    const capsuleHeight = Phaser.Math.Linear(32, 25, mobileFactor);
    const leftPillCenterX = centerX - width * 0.33;
    const rightPillCenterX = centerX + width * 0.33;
    this.drawTopPanel(leftPillCenterX, rightPillCenterX, topYScreen, capsuleWidth, capsuleHeight);
    this.configureTopSweep(leftPillCenterX, rightPillCenterX, topYScreen, capsuleHeight);

    this.timeValue.setPosition(leftPillCenterX, topYScreen);
    this.timeCaption.setPosition(leftPillCenterX + capsuleWidth * 0.56, topYScreen);
    this.scoreCaption.setPosition(rightPillCenterX - capsuleWidth * 0.56, topYScreen);
    this.scoreValue.setPosition(rightPillCenterX, topYScreen);

    const panelWidth = width * 0.9;
    const panelHeight = Math.max(66, height * 0.122);
    const panelYInSpriteKit = -height * Phaser.Math.Linear(0.405, 0.445, mobileFactor);
    const panelX = toScreenX(0);
    const panelY = toScreenY(panelYInSpriteKit);
    this.panelFrame.setTo(panelX - panelWidth * 0.5, panelY - panelHeight * 0.5, panelWidth, panelHeight);
    this.drawPanel(panelWidth, panelHeight, panelX, panelY);

    const panelMinXInSpriteKit = -panelWidth * 0.5;
    this.speedCaption.setPosition(toScreenX(panelMinXInSpriteKit + panelWidth * 0.08), toScreenY(panelYInSpriteKit + panelHeight * 0.24));
    this.speedValue.setPosition(toScreenX(panelMinXInSpriteKit + panelWidth * 0.07), toScreenY(panelYInSpriteKit - panelHeight * 0.03));
    this.speedUnit.setPosition(toScreenX(panelMinXInSpriteKit + panelWidth * 0.23), toScreenY(panelYInSpriteKit - panelHeight * 0.02));

    this.damageCaption.setPosition(toScreenX(panelMinXInSpriteKit + panelWidth * 0.45), toScreenY(panelYInSpriteKit + panelHeight * 0.24));
    this.damageValue.setPosition(toScreenX(panelMinXInSpriteKit + panelWidth * 0.45), toScreenY(panelYInSpriteKit - panelHeight * 0.03));
    this.tachCaption.setPosition(toScreenX(panelMinXInSpriteKit + panelWidth * 0.74), toScreenY(panelYInSpriteKit + panelHeight * 0.24));

    this.layoutGlamLights(panelWidth, panelHeight, panelY);
    this.layoutTachLights(panelWidth, panelHeight, panelY);

    this.setScale(1);
    this.setPosition(0, 0);

    this.timeCaption.setScale(textScale);
    this.timeValue.setScale(textScale);
    this.scoreCaption.setScale(textScale);
    this.scoreValue.setScale(textScale);
    this.speedCaption.setScale(textScale);
    this.speedValue.setScale(textScale);
    this.speedUnit.setScale(textScale);
    this.damageCaption.setScale(textScale);
    this.damageValue.setScale(textScale);
    this.tachCaption.setScale(textScale);
    this.previousIntegrity = 3;
    this.previousTurbo = false;
  }

  updateHUD(timeRemaining: number, score: number, speed: number, integrity: number, turboActive: boolean): void {
    this.timeValue.setText(`${Math.max(0, timeRemaining).toString().padStart(2, "0")}`);
    this.scoreValue.setText(`${score.toString().padStart(6, "0")}`);
    this.speedValue.setText(`${Math.round(speed)}`);
    this.damageValue.setText("");

    const safeIntegrity = Math.max(0, integrity);
    if (safeIntegrity < this.previousIntegrity) {
      for (let i = safeIntegrity; i < this.previousIntegrity; i += 1) {
        const lostLight = this.glamLights[i];
        if (lostLight) {
          this.animateGlamLoss(lostLight);
        }
      }
    }
    this.glamLights.forEach((light, index) => {
      const lit = index < safeIntegrity;
      light.setFillStyle(lit ? ThemeConfig.crimson : 0x3a3a3d, 1);
      light.setStrokeStyle(1, lit ? ThemeConfig.crimson : 0x454549, 1);
      light.setAlpha(lit ? 1 : 0.65);
    });

    const progress = Phaser.Math.Clamp(speed / 320, 0, 1);
    const litCount = turboActive ? this.tachLights.length : Math.min(this.tachLights.length, Math.floor(progress * this.tachLights.length));

    this.tachLights.forEach((light, index) => {
      const lit = index < litCount;
      const color = lit ? this.tachColor(index) : 0x424246;
      light.setFillStyle(color, lit ? 1 : 0.75);
      light.setStrokeStyle(1, color, lit ? 1 : 0.75);
    });

    if (this.previousTurbo && !turboActive) {
      this.emitTachCooldownRipple();
    }
    this.previousIntegrity = safeIntegrity;
    this.previousTurbo = turboActive;
  }

  flashDamage(): void {
    this.scene.tweens.add({
      targets: this.bottomPanel,
      alpha: 0.45,
      duration: 80,
      yoyo: true,
      ease: "Sine.easeOut"
    });
  }

  private makeCaption(text: string): Phaser.GameObjects.Text {
    const node = this.makeText(text, 10, ThemeConfig.fuchsia);
    node.setOrigin(0, 0.5);
    node.setDepth(42);
    this.add(node);
    return node;
  }

  private makeValue(text: string): Phaser.GameObjects.Text {
    const node = this.makeText(text, 20, ThemeConfig.whiteGlow);
    node.setOrigin(0, 0.5);
    node.setDepth(42);
    this.add(node);
    return node;
  }

  private makeText(text: string, size: number, color: number, alpha = 1): Phaser.GameObjects.Text {
    return this.scene.add
      .text(0, 0, text, {
        fontFamily: "DotGothic16, monospace",
        fontSize: `${size}px`,
        color: Phaser.Display.Color.IntegerToColor(color).rgba
      })
      .setAlpha(alpha);
  }

  private drawPanel(width: number, height: number, x: number, y: number): void {
    this.bottomPanel.clear();
    const minX = x - width * 0.5;
    const minY = y - height * 0.5;

    this.bottomPanel.fillStyle(0x070b15, 0.95);
    this.bottomPanel.fillRoundedRect(minX, minY, width, height, 16);
    this.bottomPanel.fillStyle(0x101524, 0.96);
    this.bottomPanel.fillRoundedRect(minX + 4, minY + 4, width - 8, height - 8, 13);

    this.bottomPanel.fillStyle(ThemeConfig.crimson, 0.20);
    this.bottomPanel.fillRect(minX + 6, minY + 6, width - 12, 3);
    this.bottomPanel.fillStyle(0xffffff, 0.06);
    this.bottomPanel.fillRect(minX + 6, minY + 10, width - 12, 1);
    this.bottomPanel.fillStyle(0x000000, 0.15);
    this.bottomPanel.fillRect(minX + 8, y, width - 16, height * 0.46);

    this.bottomPanel.lineStyle(2, 0xffffff, 0.15);
    this.bottomPanel.strokeRoundedRect(minX, minY, width, height, 16);
    this.bottomPanel.lineStyle(1, 0x3f4a64, 0.38);
    this.bottomPanel.strokeRoundedRect(minX + 4, minY + 4, width - 8, height - 8, 13);
    this.bottomPanel.setAlpha(0.98);
  }

  private drawTopPanel(leftX: number, rightX: number, y: number, capsuleWidth: number, capsuleHeight: number): void {
    this.topPanel.clear();
    const radius = Math.round(capsuleHeight * 0.46);

    this.topPanel.fillStyle(0x080c16, 0.62);
    this.topPanel.fillRoundedRect(leftX - capsuleWidth * 0.5, y - capsuleHeight * 0.5, capsuleWidth, capsuleHeight, radius);
    this.topPanel.fillRoundedRect(rightX - capsuleWidth * 0.5, y - capsuleHeight * 0.5, capsuleWidth, capsuleHeight, radius);
    this.topPanel.lineStyle(1, 0xffffff, 0.13);
    this.topPanel.strokeRoundedRect(leftX - capsuleWidth * 0.5, y - capsuleHeight * 0.5, capsuleWidth, capsuleHeight, radius);
    this.topPanel.strokeRoundedRect(rightX - capsuleWidth * 0.5, y - capsuleHeight * 0.5, capsuleWidth, capsuleHeight, radius);
    this.topPanel.fillStyle(ThemeConfig.crimson, 0.32);
    this.topPanel.fillRect(leftX - capsuleWidth * 0.5 + 8, y - capsuleHeight * 0.5 + 6, capsuleWidth - 16, 2);
    this.topPanel.fillRect(rightX - capsuleWidth * 0.5 + 8, y - capsuleHeight * 0.5 + 6, capsuleWidth - 16, 2);
  }

  private configureTopSweep(leftX: number, rightX: number, y: number, capsuleHeight: number): void {
    this.topSweepTween?.stop();
    const fromX = leftX - 8;
    const toX = rightX + 8;
    this.topSweep.setPosition(fromX, y);
    this.topSweep.setSize(Math.abs(rightX - leftX) * 0.2, capsuleHeight * 0.72);
    this.topSweep.setAlpha(0);
    this.topSweepTween = this.scene.tweens.add({
      targets: this.topSweep,
      x: toX,
      alpha: 0.2,
      duration: 1600,
      ease: "Sine.easeInOut",
      repeat: -1,
      repeatDelay: 380,
      yoyo: false,
      onYoyo: () => {
        this.topSweep.setAlpha(0);
      },
      onRepeat: () => {
        this.topSweep.x = fromX;
        this.topSweep.alpha = 0;
      }
    });
  }

  private layoutTachLights(panelWidth: number, panelHeight: number, panelY: number): void {
    this.tachLights.forEach((light) => light.destroy());
    this.tachLights = [];

    const lightWidth = panelWidth * 0.038;
    const lightHeight = panelHeight * 0.18;
    const gap = panelWidth * 0.01;
    const totalWidth = lightWidth * 6 + gap * 5;
    const startX = this.panelFrame.right - totalWidth - panelWidth * 0.055;
    const centerY = panelY + panelHeight * 0.07;
    this.tachAnchor.set(startX + totalWidth * 0.5, centerY);

    for (let i = 0; i < 6; i += 1) {
      const light = this.scene.add.rectangle(startX + lightWidth * 0.5 + i * (lightWidth + gap), centerY, lightWidth, lightHeight, 0x2a3348, 1);
      light.setStrokeStyle(1, 0x4b4b4f, 1);
      light.setDepth(42);
      this.add(light);
      this.tachLights.push(light);
    }
  }

  private layoutGlamLights(panelWidth: number, panelHeight: number, panelY: number): void {
    this.glamLights.forEach((light) => light.destroy());
    this.glamLights = [];

    const lightWidth = panelWidth * 0.028;
    const lightHeight = panelHeight * 0.14;
    const radius = Math.min(lightWidth, lightHeight) * 0.58;
    const gap = panelWidth * 0.016;
    const startX = this.panelFrame.x + panelWidth * 0.43;
    const centerY = panelY + panelHeight * 0.07;

    for (let i = 0; i < 3; i += 1) {
      const light = this.scene.add.circle(startX + lightWidth * 0.5 + i * (lightWidth + gap), centerY, radius, ThemeConfig.crimson, 1);
      light.setStrokeStyle(1, ThemeConfig.crimson, 1);
      light.setDepth(42);
      this.add(light);
      this.glamLights.push(light);
    }
  }

  private animateGlamLoss(light: Phaser.GameObjects.Arc): void {
    this.scene.tweens.add({
      targets: light,
      scale: 1.46,
      alpha: 0.14,
      duration: 140,
      yoyo: true,
      ease: "Back.easeOut"
    });
  }

  private emitTachCooldownRipple(): void {
    const ripple = this.scene.add.circle(this.tachAnchor.x, this.tachAnchor.y, 8, 0xffffff, 0);
    ripple.setStrokeStyle(2, ThemeConfig.electricBlue, 0.85);
    ripple.setDepth(43);
    this.add(ripple);
    this.scene.tweens.add({
      targets: ripple,
      radius: 34,
      alpha: 0,
      duration: 260,
      ease: "Cubic.easeOut",
      onComplete: () => ripple.destroy()
    });
  }

  private tachColor(index: number): number {
    if (index <= 2) {
      return ThemeConfig.crimson;
    }
    if (index <= 4) {
      return 0xedc96b;
    }
    return ThemeConfig.whiteGlow;
  }
}
