import Phaser from "phaser";
import { DriverProfiles, ThemeConfig, type DriverProfile } from "../config/AssetConfig";
import { GameSession } from "./GameSession";

export class PlayerCar extends Phaser.GameObjects.Container {
  private readonly bodySprite: Phaser.GameObjects.Image;
  private readonly shadowSprite: Phaser.GameObjects.Ellipse;
  private readonly boostGlow: Phaser.GameObjects.Ellipse;

  private profile: DriverProfile = GameSession.currentDriver;
  private collisionFlashTime = 0;
  private rearAnimationTimer = 0;
  private baseX = 0;
  private playableWidth = 1;
  private wasBoosting = false;
  private boostPulseTween?: Phaser.Tweens.Tween;

  laneOffset = 0;
  forwardSpeed = 0;
  boostCharge = 1;
  integrity = 3;

  readonly maxSpeed = 320;
  readonly minSpeedAfterCollision = 55;

  private readonly acceleration = 220;
  private readonly brakeRate = 260;
  private readonly coastingDrag = 90;
  private readonly steeringRate = 2.9;
  private readonly boostDrain = 0.34;
  private readonly boostRecover = 0.12;
  private readonly boostSpeed = 440;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);
    scene.add.existing(this);

    this.baseX = x;

    this.shadowSprite = scene.add.ellipse(0, 64, 136, 50, 0x000000, 0.25);
    this.shadowSprite.setAlpha(0);
    this.shadowSprite.setDepth(-2);

    this.boostGlow = scene.add.ellipse(0, 76, 148, 82, ThemeConfig.electricBlue, 0.35);
    this.boostGlow.setAlpha(0);
    this.boostGlow.setBlendMode(Phaser.BlendModes.ADD);
    this.boostGlow.setDepth(-1);

    this.bodySprite = scene.add.image(0, 0, this.profile.rearFrames[0]);
    this.bodySprite.setDisplaySize(126, 204);
    this.bodySprite.setDepth(1);

    this.add([this.shadowSprite, this.boostGlow, this.bodySprite]);
    this.setScale(0.84);
  }

  setVisualScale(scale: number): void {
    this.setScale(Phaser.Math.Clamp(scale, 0.56, 0.92));
  }

  update(
    deltaTime: number,
    steering: number,
    accelerating: boolean,
    braking: boolean,
    boosting: boolean,
    playableWidth: number
  ): void {
    this.rearAnimationTimer += deltaTime;
    this.playableWidth = playableWidth;
    this.laneOffset = Phaser.Math.Clamp(this.laneOffset + steering * this.steeringRate * deltaTime, -1.15, 1.15);

    const isBoosting = boosting && this.boostCharge > 0.08 && accelerating;
    let targetSpeed: number;

    if (isBoosting) {
      targetSpeed = this.boostSpeed;
      this.boostCharge = Math.max(0, this.boostCharge - this.boostDrain * deltaTime);
    } else {
      this.boostCharge = Math.min(1, this.boostCharge + this.boostRecover * deltaTime);
      if (accelerating) {
        targetSpeed = this.maxSpeed;
      } else if (braking) {
        targetSpeed = 70;
      } else {
        targetSpeed = 135;
      }
    }

    if (this.forwardSpeed < targetSpeed) {
      this.forwardSpeed = Math.min(targetSpeed, this.forwardSpeed + this.acceleration * deltaTime);
    } else {
      const deceleration = braking ? this.brakeRate : this.coastingDrag;
      this.forwardSpeed = Math.max(targetSpeed, this.forwardSpeed - deceleration * deltaTime);
    }

    this.x = this.baseX + this.laneOffset * playableWidth * 0.5;
    this.rotation = 0;

    if (this.collisionFlashTime > 0) {
      this.collisionFlashTime -= deltaTime;
      this.bodySprite.setTint(ThemeConfig.crimson);
    } else {
      this.bodySprite.clearTint();
    }

    const directionTexture = this.textureForCurrentDirection(steering);
    this.setTextureIfAvailable(directionTexture);
    if (isBoosting) {
      const glowAlpha = 0.18 + Phaser.Math.Clamp(this.forwardSpeed / this.boostSpeed, 0, 1) * 0.28;
      this.boostGlow.setAlpha(glowAlpha);
      this.boostGlow.setScale(1 + Math.sin(this.rearAnimationTimer * 22) * 0.03);
    } else {
      this.boostGlow.setScale(1);
      this.boostGlow.setAlpha(Math.max(0, this.boostGlow.alpha - deltaTime * 1.8));
    }

    if (isBoosting && !this.wasBoosting) {
      this.triggerBoostPulse();
    }
    this.wasBoosting = isBoosting;
  }

  collide(): boolean {
    this.collisionFlashTime = 0.3;
    this.forwardSpeed = Math.max(this.minSpeedAfterCollision, this.forwardSpeed * 0.46);
    this.integrity -= 1;
    this.setTextureIfAvailable(this.profile.crashTexture);
    this.scene.tweens.add({
      targets: this,
      x: this.x - 10,
      duration: 40,
      yoyo: true,
      repeat: 1,
      onComplete: () => {
        this.x = this.baseX + this.laneOffset * this.playableWidth * 0.5;
      }
    });
    return this.integrity <= 0;
  }

  applyOffRoadDrag(deltaTime: number): void {
    this.forwardSpeed = Math.max(92, this.forwardSpeed - 240 * deltaTime);
    this.boostCharge = Math.max(0, this.boostCharge - 0.1 * deltaTime);
  }

  resetForNewRun(baseX: number): void {
    this.profile = GameSession.currentDriver;
    this.baseX = baseX;
    this.laneOffset = 0;
    this.forwardSpeed = 0;
    this.boostCharge = 1;
    this.integrity = 3;
    this.collisionFlashTime = 0;
    this.rearAnimationTimer = 0;
    this.wasBoosting = false;
    this.rotation = 0;
    this.x = baseX;
    this.setTextureIfAvailable(this.profile.rearFrames[0]);
    this.bodySprite.setFlipX(false);
    this.bodySprite.clearTint();
  }

  private triggerBoostPulse(): void {
    this.boostPulseTween?.stop();
    this.boostGlow.setScale(0.82);
    this.boostGlow.setAlpha(0.52);
    this.boostPulseTween = this.scene.tweens.add({
      targets: this.boostGlow,
      scale: 1.24,
      alpha: 0,
      duration: 220,
      ease: "Cubic.easeOut",
      onComplete: () => {
        this.boostGlow.setScale(1);
      }
    });
  }

  private textureForCurrentDirection(steering: number): string {
    if (this.collisionFlashTime > 0.12) {
      return this.profile.crashTexture;
    }

    if (steering < -0.16) {
      return this.profile.leftTexture;
    }

    if (steering > 0.16) {
      return this.profile.rightTexture;
    }

    return Math.floor(this.rearAnimationTimer / 1.2) % 2 === 0 ? this.profile.rearFrames[0] : this.profile.rearFrames[1];
  }

  private setTextureIfAvailable(key: string): void {
    if (this.scene.textures.exists(key)) {
      this.bodySprite.setTexture(key);
      return;
    }

    if (this.scene.textures.exists(DriverProfiles.roan.rearFrames[0])) {
      this.bodySprite.setTexture(DriverProfiles.roan.rearFrames[0]);
    }
  }
}
