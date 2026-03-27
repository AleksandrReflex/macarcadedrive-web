import Phaser from "phaser";
import { TrafficCarPool } from "../config/AssetConfig";
import { Pseudo3DRoadSystem } from "./Pseudo3DRoadSystem";

interface TrafficCarState {
  sprite: Phaser.GameObjects.Image;
  worldZ: number;
  lane: number;
  speed: number;
}

interface UpdateOptions {
  deltaTime: number;
  playerWorldZ: number;
  playerPosition: Phaser.Math.Vector2;
  playerSpeed: number;
  difficulty: number;
  roadSystem: Pseudo3DRoadSystem;
  onCollision: () => void;
}

export class TrafficManager {
  private readonly scene: Phaser.Scene;
  private readonly parentNode: Phaser.GameObjects.Container;

  private traffic: TrafficCarState[] = [];
  private readonly spawnDistance: [number, number] = [2100, 4200];
  private laneChoices = [-0.94, 0, 0.94];
  private readonly maxTrafficCount = 4;
  private spawnTimer = 0;
  private collisionCooldown = 0;
  private vehicleScale = 1;

  constructor(scene: Phaser.Scene, parentNode: Phaser.GameObjects.Container) {
    this.scene = scene;
    this.parentNode = parentNode;
  }

  reset(): void {
    this.traffic.forEach((item) => item.sprite.destroy());
    this.traffic = [];
    this.spawnTimer = 0;
    this.collisionCooldown = 0;
  }

  setVehicleScale(scale: number): void {
    this.vehicleScale = Phaser.Math.Clamp(scale, 0.68, 1);
  }

  setLaneSpread(spread: number): void {
    const safeSpread = Phaser.Math.Clamp(spread, 0.9, 1.22);
    this.laneChoices = [-safeSpread, 0, safeSpread];
  }

  update(options: UpdateOptions): void {
    const { deltaTime, playerWorldZ, playerPosition, playerSpeed, difficulty, roadSystem, onCollision } = options;

    this.spawnTimer -= deltaTime;
    this.collisionCooldown = Math.max(0, this.collisionCooldown - deltaTime);

    if (this.spawnTimer <= 0 && this.traffic.length < this.maxTrafficCount) {
      this.spawnTraffic(playerWorldZ, playerSpeed, difficulty);
      this.spawnTimer = Math.max(0.7, 1.95 - difficulty * 0.16);
    }

    const playerHitRect = new Phaser.Geom.Rectangle(playerPosition.x - 32, playerPosition.y - 13, 64, 48);
    const survivors: TrafficCarState[] = [];

    for (const car of this.traffic) {
      car.worldZ += car.speed * deltaTime;
      const relativeZ = car.worldZ - playerWorldZ;

      if (relativeZ < -160) {
        car.sprite.destroy();
        continue;
      }

      const projection = roadSystem.projectionForWorldZ(car.worldZ, car.lane);
      if (!projection) {
        if (relativeZ > 0) {
          car.sprite.setVisible(false);
          survivors.push(car);
          continue;
        }
        car.sprite.destroy();
        continue;
      }

      car.sprite.setVisible(true);
      car.sprite.setPosition(projection.x, projection.y);
      const scale = projection.scale * 0.9;
      car.sprite.setScale(scale);

      const trafficHitWidth = car.sprite.displayWidth * 0.44;
      const trafficHitHeight = car.sprite.displayHeight * 0.34;
      const trafficHitRect = new Phaser.Geom.Rectangle(
        car.sprite.x - trafficHitWidth * 0.5,
        car.sprite.y - trafficHitHeight * 0.48,
        trafficHitWidth,
        trafficHitHeight
      );

      if (
        this.collisionCooldown === 0 &&
        car.sprite.y <= playerPosition.y + 24 &&
        Phaser.Geom.Intersects.RectangleToRectangle(playerHitRect, trafficHitRect)
      ) {
        this.collisionCooldown = 0.7;
        this.triggerCollisionEffect(car.sprite.x, car.sprite.y);
        car.sprite.destroy();
        onCollision();
        continue;
      }

      survivors.push(car);
    }

    this.traffic = survivors;
  }

  private spawnTraffic(playerWorldZ: number, playerSpeed: number, difficulty: number): void {
    const lane = Phaser.Utils.Array.GetRandom(this.laneChoices);
    const textureName = Phaser.Utils.Array.GetRandom(Array.from(TrafficCarPool));

    const sprite = this.scene.add.image(0, 0, textureName);
    sprite.setDisplaySize(118 * this.vehicleScale, 184 * this.vehicleScale);
    this.parentNode.addAt(sprite, 0);

    this.traffic.push({
      sprite,
      worldZ: playerWorldZ + Phaser.Math.FloatBetween(this.spawnDistance[0], this.spawnDistance[1]),
      lane,
      speed: Math.max(95, playerSpeed * Phaser.Math.FloatBetween(0.28, 0.5 + difficulty * 0.05))
    });
  }

  private triggerCollisionEffect(x: number, y: number): void {
    const flash = this.scene.add.circle(x, y, 6, 0xf5f5fa, 0.95);
    flash.setBlendMode(Phaser.BlendModes.ADD);
    flash.setDepth(160);
    this.parentNode.add(flash);

    this.scene.tweens.add({
      targets: flash,
      radius: 56,
      alpha: 0,
      duration: 180,
      onComplete: () => flash.destroy()
    });

    for (const offset of [-26, 26]) {
      const smoke = this.scene.add.circle(x + offset, y - 14, 10, 0xd8d8dc, 0.7);
      smoke.setDepth(159);
      this.parentNode.add(smoke);
      this.scene.tweens.add({
        targets: smoke,
        x: smoke.x + offset * 0.4,
        y: smoke.y - 42,
        scale: 1.4,
        alpha: 0,
        duration: 600,
        onComplete: () => smoke.destroy()
      });
    }
  }
}
