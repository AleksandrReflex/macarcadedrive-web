import Phaser from "phaser";
import { audioSystem } from "../audio/AudioSystem";
import { ThemeConfig } from "../config/AssetConfig";
import { SceneKeys } from "../config/SceneKeys";
import { InputController } from "../systems/InputController";
import { PlayerCar } from "../systems/PlayerCar";
import { Pseudo3DRoadSystem } from "../systems/Pseudo3DRoadSystem";
import { TrafficManager } from "../systems/TrafficManager";
import { HUD } from "../ui/HUD";
import { GameSession } from "../systems/GameSession";

export class RaceScene extends Phaser.Scene {
  private static readonly SCORE_MULTIPLIER = 5;
  private static readonly STAGE_SCORE_STEP = 2500;

  private roadSystem!: Pseudo3DRoadSystem;
  private playerCar!: PlayerCar;
  private trafficManager!: TrafficManager;
  private hudLayer!: HUD;
  private inputController!: InputController;
  private worldContainer!: Phaser.GameObjects.Container;
  private trafficLayer!: Phaser.GameObjects.Container;

  private playerWorldZ = 0;
  private score = 0;
  private scoreAccumulator = 0;
  private stage = 1;
  private combo = 1;
  private cleanRunTime = 0;
  private runElapsedTime = 0;
  private remainingTime = 70;
  private isGamePausedByHUD = false;
  private hasEndedRun = false;
  private pauseOverlay?: Phaser.GameObjects.Container;
  private gameOverOverlay?: Phaser.GameObjects.Container;
  private gameOverRetryFrame = new Phaser.Geom.Rectangle();
  private gameOverMenuFrame = new Phaser.Geom.Rectangle();
  private viewScale = 1;
  private collisionFlash?: Phaser.GameObjects.Rectangle;
  private wasTurboActive = false;
  private wasAccelerating = false;
  private wasBraking = false;
  private lastSteerDirection = 0;
  private steerSoundCooldown = 0;

  constructor() {
    super(SceneKeys.Race);
  }

  create(): void {
    audioSystem.setMusic("race");
    this.buildScene();
    this.inputController = new InputController(this);
    this.inputController.resetState();
    this.input.on("pointerdown", this.handlePointerDown, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      audioSystem.setTurboActive(false);
      this.inputController.destroy();
      this.input.off("pointerdown", this.handlePointerDown, this);
    });
  }

  update(_time: number, deltaMs: number): void {
    this.inputController.syncFromHardware();

    if (this.inputController.consumePausePressed()) {
      this.triggerPauseButton();
    }
    if (this.inputController.consumeStartPressed()) {
      this.triggerStartButton();
    }

    if (this.isGamePausedByHUD || this.hasEndedRun) {
      if (this.wasTurboActive) {
        audioSystem.setTurboActive(false);
        this.wasTurboActive = false;
      }
      return;
    }

    const delta = Phaser.Math.Clamp(deltaMs / 1000, 1 / 120, 1 / 20);
    this.steerSoundCooldown = Math.max(0, this.steerSoundCooldown - delta);
    this.runElapsedTime += delta;
    const roadDrift = this.roadSystem.currentCurve() * 0.25;
    const steering = this.inputController.steering - roadDrift;

    this.playerCar.update(
      delta,
      steering,
      this.inputController.accelerating,
      this.inputController.braking,
      this.inputController.boosting,
      this.scale.width * 0.42
    );

    if (this.inputController.accelerating && !this.wasAccelerating) {
      audioSystem.playThrottle();
    }
    if (this.inputController.braking && !this.wasBraking) {
      audioSystem.playBrake();
    }
    const steerDirection = this.inputController.steering < -0.45 ? -1 : this.inputController.steering > 0.45 ? 1 : 0;
    if (steerDirection !== 0 && steerDirection !== this.lastSteerDirection && this.steerSoundCooldown === 0) {
      audioSystem.playSteer();
      this.steerSoundCooldown = 0.08;
    }

    if (Math.abs(this.playerCar.laneOffset) > 0.78) {
      this.playerCar.applyOffRoadDrag(delta);
    }

    this.playerWorldZ += this.playerCar.forwardSpeed * delta * 2.8;
    const passiveScore = 4.5;
    const turboBonus = this.inputController.boosting ? 20 : 0;
    const scoreGain = delta * (passiveScore + turboBonus + this.playerCar.forwardSpeed * 0.065) * RaceScene.SCORE_MULTIPLIER;
    this.scoreAccumulator += scoreGain;
    this.score = Math.floor(this.scoreAccumulator);

    this.cleanRunTime += delta;
    this.remainingTime = Math.max(0, this.remainingTime - delta);
    this.combo = Math.min(5, 1 + Math.floor(this.cleanRunTime / 7));
    this.stage = 1 + Math.floor(this.score / (RaceScene.STAGE_SCORE_STEP * RaceScene.SCORE_MULTIPLIER));

    this.roadSystem.updateRoad(
      this.playerWorldZ,
      this.playerCar.laneOffset,
      this.playerCar.forwardSpeed / this.playerCar.maxSpeed,
      this.inputController.boosting && this.playerCar.boostCharge > 0.08,
      this.runElapsedTime
    );

    this.trafficManager.update({
      deltaTime: delta,
      playerWorldZ: this.playerWorldZ,
      playerPosition: new Phaser.Math.Vector2(this.playerCar.x, this.playerCar.y),
      playerSpeed: this.playerCar.forwardSpeed,
      difficulty: this.stage,
      roadSystem: this.roadSystem,
      onCollision: () => this.handleCollision()
    });

    this.hudLayer.updateHUD(
      Math.ceil(this.remainingTime),
      this.score,
      this.playerCar.forwardSpeed,
      this.playerCar.integrity,
      this.playerCar.forwardSpeed > this.playerCar.maxSpeed + 8
    );

    const turboNow = this.inputController.boosting && this.inputController.accelerating && this.playerCar.boostCharge > 0.08;
    if (turboNow !== this.wasTurboActive) {
      audioSystem.setTurboActive(turboNow);
      this.wasTurboActive = turboNow;
    }
    this.wasAccelerating = this.inputController.accelerating;
    this.wasBraking = this.inputController.braking;
    this.lastSteerDirection = steerDirection;

    if (this.remainingTime <= 0) {
      this.presentFinishScene();
    }
  }

  triggerStartButton(): void {
    if (this.hasEndedRun) {
      audioSystem.playStartCue();
      this.scene.start(SceneKeys.Race);
      return;
    }
    if (this.isGamePausedByHUD) {
      audioSystem.playResume();
      this.togglePause();
    }
  }

  triggerPauseButton(): void {
    if (this.hasEndedRun) {
      audioSystem.playPause();
      this.scene.start(SceneKeys.MainMenu);
      return;
    }
    if (this.isGamePausedByHUD) {
      audioSystem.playResume();
    } else {
      audioSystem.playPause();
    }
    this.togglePause();
  }

  private buildScene(): void {
    const { width, height } = this.scale;
    this.viewScale = Phaser.Math.Clamp(Math.min(width / 390, height / 700), 0.72, 1);
    this.cameras.main.setBackgroundColor(ThemeConfig.backgroundBlack);

    this.worldContainer = this.add.container(0, 0);
    this.worldContainer.setDepth(0);

    this.roadSystem = new Pseudo3DRoadSystem(this);
    this.roadSystem.configure(width, height, this.viewScale);
    this.worldContainer.add(this.roadSystem);

    this.trafficLayer = this.add.container(0, 0);
    this.worldContainer.add(this.trafficLayer);

    this.playerCar = new PlayerCar(this, width * 0.5, height * 0.74);
    this.playerCar.setVisualScale(0.84 * this.viewScale);
    this.worldContainer.add(this.playerCar);

    this.trafficManager = new TrafficManager(this, this.trafficLayer);
    const mobileFactor = Phaser.Math.Clamp((1 - this.viewScale) / 0.28, 0, 1);
    const laneSpread = Phaser.Math.Linear(0.94, 1.16, mobileFactor);
    this.trafficManager.setLaneSpread(laneSpread);
    const trafficScale = this.viewScale * Phaser.Math.Linear(0.82, 1, this.viewScale);
    this.trafficManager.setVehicleScale(trafficScale);
    this.trafficManager.reset();

    this.hudLayer = new HUD(this);
    this.hudLayer.configure(width, height);
    this.hudLayer.setDepth(500);
    this.hudLayer.setAlpha(0);
    this.hudLayer.y = 22;
    this.tweens.add({
      targets: this.hudLayer,
      y: 0,
      alpha: 1,
      duration: 260,
      ease: "Cubic.easeOut"
    });

    const splash = this.add.text(width * 0.5, height * 0.5, `STAGE ${this.stage}`, {
      fontFamily: "DotGothic16, monospace",
      fontSize: `${Math.round(46 * Phaser.Math.Linear(0.74, 1, this.viewScale))}px`,
      color: "#ffffff"
    });
    splash.setOrigin(0.5);
    splash.setDepth(80);
    this.tweens.add({
      targets: splash,
      alpha: 0,
      y: splash.y - 30,
      duration: 1100,
      onComplete: () => splash.destroy()
    });
    this.launchStartBurst();

    this.playerCar.resetForNewRun(width * 0.5);
    this.score = 0;
    this.scoreAccumulator = 0;
    this.stage = 1;
    this.combo = 1;
    this.cleanRunTime = 0;
    this.runElapsedTime = 0;
    this.remainingTime = 70;
    this.playerWorldZ = 0;
    this.wasTurboActive = false;
    this.wasAccelerating = false;
    this.wasBraking = false;
    this.lastSteerDirection = 0;
    this.steerSoundCooldown = 0;
    this.isGamePausedByHUD = false;
    this.hasEndedRun = false;
    this.hudLayer.setVisible(true);
    this.pauseOverlay?.destroy();
    this.pauseOverlay = undefined;
    this.gameOverOverlay?.destroy();
    this.gameOverOverlay = undefined;
  }

  private togglePause(): void {
    this.isGamePausedByHUD = !this.isGamePausedByHUD;
    if (this.isGamePausedByHUD) {
      this.showPauseOverlay();
    } else {
      this.pauseOverlay?.destroy();
      this.pauseOverlay = undefined;
    }
  }

  private showPauseOverlay(): void {
    this.pauseOverlay?.destroy();
    const { width, height } = this.scale;

    const container = this.add.container(width * 0.5, height * 0.5);
    container.setDepth(900);

    const dim = this.add.rectangle(0, 0, width, height, ThemeConfig.backgroundBlack, 0.32);
    dim.setAlpha(0);
    container.add(dim);

    const panelWidth = width * 0.64;
    const panelHeight = height * 0.22;
    const panel = this.add.graphics();
    panel.fillStyle(ThemeConfig.backgroundBlack, 0.88);
    panel.fillRoundedRect(-panelWidth * 0.5, -panelHeight * 0.5, panelWidth, panelHeight, 18);
    panel.lineStyle(3, ThemeConfig.chrome, 1);
    panel.strokeRoundedRect(-panelWidth * 0.5, -panelHeight * 0.5, panelWidth, panelHeight, 18);
    container.add(panel);

    const title = this.add.text(0, -panelHeight * 0.12, "SERVICE PAUSE", {
      fontFamily: "DotGothic16, monospace",
      fontSize: "18px",
      color: "#de6f76"
    });
    title.setOrigin(0.5);
    container.add(title);

    const hint = this.add.text(0, panelHeight * 0.12, "Tap PAUSE to resume", {
      fontFamily: "DotGothic16, monospace",
      fontSize: "10px",
      color: "#ebebee"
    });
    hint.setOrigin(0.5);
    container.add(hint);

    this.tweens.add({
      targets: dim,
      alpha: 0.32,
      duration: 150,
      ease: "Sine.easeOut"
    });
    container.setScale(0.92);
    container.setAlpha(0);
    this.tweens.add({
      targets: container,
      scale: 1,
      alpha: 1,
      duration: 180,
      ease: "Back.easeOut"
    });

    this.pauseOverlay = container;
  }

  private handleCollision(): void {
    if (this.hasEndedRun) {
      return;
    }

    this.cleanRunTime = 0;
    this.combo = 1;
    this.hudLayer.flashDamage();
    audioSystem.playCollision();
    audioSystem.playDamageTick();
    this.triggerCollisionChromaticFlash();

    this.tweens.add({
      targets: this.worldContainer,
      x: -14,
      duration: 30,
      yoyo: true,
      repeat: 1,
      onComplete: () => {
        this.worldContainer.x = 0;
      }
    });

    const isOut = this.playerCar.collide();
    if (isOut) {
      this.presentGameOver();
    }
  }

  private presentGameOver(): void {
    if (this.hasEndedRun) {
      return;
    }
    this.hasEndedRun = true;
    audioSystem.setTurboActive(false);
    audioSystem.setMusic("none");
    audioSystem.playGameOverStinger();
    this.isGamePausedByHUD = false;
    this.pauseOverlay?.destroy();
    this.pauseOverlay = undefined;
    this.hudLayer.setVisible(false);
    this.time.delayedCall(120, () => this.showGameOverOverlay());
  }

  private presentFinishScene(): void {
    if (this.hasEndedRun) {
      return;
    }
    this.hasEndedRun = true;
    audioSystem.setTurboActive(false);
    audioSystem.setMusic("finish");
    this.scene.start(SceneKeys.Finish, {
      finalScore: this.score,
      driver: GameSession.currentDriver
    });
  }

  private showGameOverOverlay(): void {
    this.gameOverOverlay?.destroy();
    const { width, height } = this.scale;

    const container = this.add.container(width * 0.5, height * 0.5);
    container.setDepth(920);
    const dim = this.add.rectangle(0, 0, width, height, ThemeConfig.backgroundBlack, 0);
    container.add(dim);

    const panelWidth = width * 0.74;
    const panelHeight = height * 0.36;
    const panel = this.add.graphics();
    panel.fillStyle(ThemeConfig.backgroundBlack, 0.86);
    panel.fillRoundedRect(-panelWidth * 0.5, -panelHeight * 0.5, panelWidth, panelHeight, 20);
    panel.lineStyle(3, ThemeConfig.chrome, 1);
    panel.strokeRoundedRect(-panelWidth * 0.5, -panelHeight * 0.5, panelWidth, panelHeight, 20);
    panel.fillStyle(ThemeConfig.fuchsia, 0.15);
    panel.fillRect(-panelWidth * 0.5 + 4, -panelHeight * 0.5 + 4, panelWidth - 8, panelHeight * 0.2);
    container.add(panel);

    const makeText = (y: number, text: string, size: number, color: string, alpha = 1) =>
      this.add
        .text(0, y, text, {
          fontFamily: "DotGothic16, monospace",
          fontSize: `${size}px`,
          color
        })
        .setOrigin(0.5)
        .setAlpha(alpha);

    container.add(makeText(-panelHeight * 0.28, "GAME OVER", 22, "#de6f76"));
    container.add(makeText(-panelHeight * 0.06, `SCORE ${this.score.toString().padStart(6, "0")}`, 14, "#f8f8fc"));
    container.add(makeText(panelHeight * 0.14, "START RETRY", 12, "#e0e0e5", 0.96));
    container.add(makeText(panelHeight * 0.28, "PAUSE MENU", 11, "#ebebee", 0.84));

    this.gameOverRetryFrame.setTo(
      width * 0.5 - panelWidth * 0.3,
      height * 0.5 + panelHeight * 0.14 - 12,
      panelWidth * 0.6,
      24
    );
    this.gameOverMenuFrame.setTo(
      width * 0.5 - panelWidth * 0.3,
      height * 0.5 + panelHeight * 0.28 - 11,
      panelWidth * 0.6,
      22
    );

    container.setScale(0.9);
    container.setAlpha(0);
    this.tweens.add({
      targets: dim,
      alpha: 0.46,
      duration: 220,
      ease: "Sine.easeOut"
    });
    this.tweens.add({
      targets: container,
      scale: 1,
      alpha: 1,
      duration: 240,
      ease: "Back.easeOut"
    });

    this.gameOverOverlay = container;
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer): void {
    if (!this.hasEndedRun || !this.gameOverOverlay) {
      return;
    }

    if (this.gameOverRetryFrame.contains(pointer.x, pointer.y)) {
      this.scene.start(SceneKeys.Race);
      return;
    }
    if (this.gameOverMenuFrame.contains(pointer.x, pointer.y)) {
      this.scene.start(SceneKeys.MainMenu);
    }
  }

  private launchStartBurst(): void {
    const { width, height } = this.scale;
    for (let i = 0; i < 8; i += 1) {
      const line = this.add.rectangle(width * 0.5 + Phaser.Math.Between(-28, 28), height * 0.76, 2, 18, 0xffffff, 0.6);
      line.setDepth(118);
      this.worldContainer.add(line);
      this.tweens.add({
        targets: line,
        y: line.y - Phaser.Math.Between(80, 140),
        alpha: 0,
        scaleY: 2.2,
        duration: 220 + i * 14,
        ease: "Cubic.easeOut",
        onComplete: () => line.destroy()
      });
    }
  }

  private triggerCollisionChromaticFlash(): void {
    const { width, height } = this.scale;
    this.collisionFlash?.destroy();
    this.collisionFlash = this.add.rectangle(width * 0.5, height * 0.5, width, height, ThemeConfig.fuchsia, 0.16);
    this.collisionFlash.setBlendMode(Phaser.BlendModes.ADD);
    this.collisionFlash.setDepth(910);
    this.tweens.add({
      targets: this.collisionFlash,
      alpha: 0,
      duration: 140,
      ease: "Quad.easeOut",
      onComplete: () => {
        this.collisionFlash?.destroy();
        this.collisionFlash = undefined;
      }
    });
  }
}
