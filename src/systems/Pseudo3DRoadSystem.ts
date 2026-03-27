import Phaser from "phaser";
import { AssetCatalog, ThemeConfig } from "../config/AssetConfig";

interface Projection {
  x: number;
  y: number;
  scale: number;
  roadWidth: number;
}

interface Segment {
  curve: number;
}

export class Pseudo3DRoadSystem extends Phaser.GameObjects.Container {
  private readonly visibleSegments = 30;
  private readonly segmentLength = 90;
  private readonly horizonYRatio = -0.01;
  private readonly laneCount = 3;
  private readonly shoulderInnerFactor = 0.99;
  private readonly shoulderOuterFactor = 1.21;
  private readonly grassInnerFactor = 1.16;

  private readonly skyNode: Phaser.GameObjects.Image;
  private readonly groundNode: Phaser.GameObjects.TileSprite;
  private readonly leftGrassBands: Phaser.GameObjects.TileSprite[] = [];
  private readonly rightGrassBands: Phaser.GameObjects.TileSprite[] = [];
  private readonly cityNode: Phaser.GameObjects.Image;
  private readonly vignetteNode: Phaser.GameObjects.Rectangle;
  private readonly roadGraphics: Phaser.GameObjects.Graphics;

  private segmentPalette: Segment[] = [];
  private sceneWidth = 0;
  private sceneHeight = 0;
  private centerX = 0;
  private centerY = 0;
  private currentWorldZ = 0;
  private currentPlayerOffset = 0;
  private bottomY = 0;
  private horizonY = 0;
  private totalTrackLength = 0;
  private viewScale = 1;
  private mobileInfluence = 0;

  constructor(scene: Phaser.Scene) {
    super(scene, 0, 0);
    scene.add.existing(this);

    this.skyNode = scene.add.image(0, 0, AssetCatalog.backgroundSky);
    this.skyNode.setDepth(-30);

    this.groundNode = scene.add.tileSprite(0, 0, 32, 32, AssetCatalog.groundGrassArcadePink);
    this.groundNode.setDepth(-28);
    this.groundNode.setAlpha(0);

    for (let i = 0; i < this.visibleSegments; i += 1) {
      const leftBand = scene.add.tileSprite(0, 0, 16, 16, AssetCatalog.groundGrassArcadePink);
      leftBand.setDepth(-27);
      leftBand.setAlpha(0.96);
      this.leftGrassBands.push(leftBand);

      const rightBand = scene.add.tileSprite(0, 0, 16, 16, AssetCatalog.groundGrassArcadePink);
      rightBand.setDepth(-27);
      rightBand.setAlpha(0.96);
      this.rightGrassBands.push(rightBand);
    }

    this.cityNode = scene.add.image(0, 0, AssetCatalog.backgroundCity);
    this.cityNode.setDepth(-24);

    this.roadGraphics = scene.add.graphics();
    this.roadGraphics.setDepth(-8);

    this.vignetteNode = scene.add.rectangle(0, 0, 2, 2, 0x000000, 0.08);
    this.vignetteNode.setDepth(20);

    this.add([
      this.skyNode,
      this.groundNode,
      ...this.leftGrassBands,
      ...this.rightGrassBands,
      this.cityNode,
      this.roadGraphics,
      this.vignetteNode
    ]);

    this.buildSegments();
  }

  configure(width: number, height: number, viewScale = 1): void {
    this.sceneWidth = width;
    this.sceneHeight = height;
    this.centerX = width * 0.5;
    this.centerY = height * 0.5;
    this.viewScale = Phaser.Math.Clamp(viewScale, 0.72, 1);
    this.mobileInfluence = Phaser.Math.Clamp((1 - this.viewScale) / 0.28, 0, 1);

    this.bottomY = -height * 0.5;
    this.horizonY = height * this.horizonYRatio;
    this.totalTrackLength = Math.max(1, this.segmentPalette.length * this.segmentLength);

    this.skyNode.setPosition(this.centerX, this.centerY - height * 0.02);
    this.skyNode.setDisplaySize(width * 1.2, height * 0.96);

    this.groundNode.setPosition(this.centerX, this.centerY + height * 0.26);
    this.groundNode.setSize(width * 1.25, height * 0.5);
    this.groundNode.setAlpha(0);

    this.cityNode.setPosition(this.centerX, this.centerY - this.horizonY);
    const cityWidthFactor = Phaser.Math.Linear(0.88, 0.58, this.mobileInfluence);
    const cityHeightFactor = Phaser.Math.Linear(0.14, 0.09, this.mobileInfluence);
    this.cityNode.setDisplaySize(
      width * cityWidthFactor,
      height * cityHeightFactor
    );
    this.cityNode.setOrigin(0.5, 1);
    this.cityNode.setAlpha(0.88);

    this.vignetteNode.setPosition(this.centerX, this.centerY);
    this.vignetteNode.setSize(width * 1.5, height * 1.5);
  }

  updateRoad(playerWorldZ: number, playerOffset: number, _speedRatio: number, _boostActive: boolean, elapsedTime: number): void {
    this.currentWorldZ = playerWorldZ;
    this.currentPlayerOffset = playerOffset;

    this.updateGroundScroll();
    this.updateCityScale(elapsedTime);
    this.renderRoad();
  }

  currentCurve(): number {
    return this.segmentAt(this.currentWorldZ).curve;
  }

  projectionForWorldZ(worldZ: number, laneOffset: number): Projection | null {
    const relativeZ = worldZ - this.currentWorldZ;
    if (relativeZ <= 0 || relativeZ >= this.visibleSegments * this.segmentLength) {
      return null;
    }
    const curveOffset = this.accumulatedCurve(this.currentWorldZ, worldZ);
    return this.projection(relativeZ, laneOffset, curveOffset);
  }

  private updateGroundScroll(): void {
    // Ground scroll is driven per-band in updateGrassBand for perspective.
  }

  private updateCityScale(elapsedTime: number): void {
    const progress = Phaser.Math.Clamp(elapsedTime / 72, 0, 1);
    const minScale = Phaser.Math.Linear(1, 0.72, this.mobileInfluence);
    const maxScale = Phaser.Math.Linear(1.16, 0.9, this.mobileInfluence);
    const scale = Phaser.Math.Linear(minScale, maxScale, progress);
    this.cityNode.setScale(scale);
  }

  private renderRoad(): void {
    this.roadGraphics.clear();

    const visibleDepth = this.visibleSegments * this.segmentLength;
    const curveSamples = this.buildCurveSamples(this.currentWorldZ, visibleDepth);
    let far = this.projection(visibleDepth, 0, curveSamples[curveSamples.length - 1]);

    for (let index = this.visibleSegments - 1; index >= 0; index -= 1) {
      const nearZ = index * this.segmentLength;
      const near = this.projection(nearZ, 0, curveSamples[index]);
      const phase = (Math.floor((this.currentWorldZ + nearZ) / (this.segmentLength * 0.75)) + index) % 2 === 0;
      this.updateGrassBand(index, far, near);
      this.drawShoulder(-1, far, near, phase);
      this.drawShoulder(1, far, near, phase);
      this.drawQuad(far, near, 0.99, ThemeConfig.asphalt, 1);

      const dashVisible = phase;
      if (dashVisible) {
        for (let laneIndex = 1; laneIndex < this.laneCount; laneIndex += 1) {
          this.drawLaneMarker(laneIndex, far, near);
        }
      }

      far = near;
    }
  }

  private drawQuad(top: Projection, bottom: Projection, widthMultiplier: number, color: number, alpha: number): void {
    const topWidth = top.roadWidth * widthMultiplier;
    const bottomWidth = bottom.roadWidth * widthMultiplier;
    this.roadGraphics.fillStyle(color, alpha);
    this.roadGraphics.fillPoints(
      [
        new Phaser.Geom.Point(top.x - topWidth, top.y),
        new Phaser.Geom.Point(top.x + topWidth, top.y),
        new Phaser.Geom.Point(bottom.x + bottomWidth, bottom.y),
        new Phaser.Geom.Point(bottom.x - bottomWidth, bottom.y)
      ],
      true
    );
  }

  private drawShoulder(side: -1 | 1, top: Projection, bottom: Projection, isBright: boolean): void {
    const innerTop = top.roadWidth * this.shoulderInnerFactor;
    const innerBottom = bottom.roadWidth * this.shoulderInnerFactor;
    const outerTop = top.roadWidth * this.shoulderOuterFactor;
    const outerBottom = bottom.roadWidth * this.shoulderOuterFactor;
    const color = isBright ? 0xc96672 : 0x8e3d46;

    this.roadGraphics.fillStyle(color, 1);
    this.roadGraphics.fillPoints(
      [
        new Phaser.Geom.Point(top.x + innerTop * side, top.y),
        new Phaser.Geom.Point(top.x + outerTop * side, top.y),
        new Phaser.Geom.Point(bottom.x + outerBottom * side, bottom.y),
        new Phaser.Geom.Point(bottom.x + innerBottom * side, bottom.y)
      ],
      true
    );
  }

  private updateGrassBand(index: number, top: Projection, bottom: Projection): void {
    const leftBand = this.leftGrassBands[index];
    const rightBand = this.rightGrassBands[index];
    const innerTop = top.roadWidth * this.grassInnerFactor;
    const innerBottom = bottom.roadWidth * this.grassInnerFactor;
    const yTop = Math.min(top.y, bottom.y);
    const yBottom = Math.max(top.y, bottom.y);
    const bandHeight = Math.max(1, yBottom - yTop + 3);
    const centerY = (yTop + yBottom) * 0.5;

    const leftEdgeTop = Phaser.Math.Clamp(top.x - innerTop, 0, this.sceneWidth);
    const leftEdgeBottom = Phaser.Math.Clamp(bottom.x - innerBottom, 0, this.sceneWidth);
    const rightEdgeTop = Phaser.Math.Clamp(top.x + innerTop, 0, this.sceneWidth);
    const rightEdgeBottom = Phaser.Math.Clamp(bottom.x + innerBottom, 0, this.sceneWidth);

    const leftWidth = Math.max(0, Math.max(leftEdgeTop, leftEdgeBottom));
    const rightWidth = Math.max(0, Math.max(this.sceneWidth - rightEdgeTop, this.sceneWidth - rightEdgeBottom));
    const leftWidthPx = Math.ceil(leftWidth) + 2;
    const rightWidthPx = Math.ceil(rightWidth) + 2;
    const depthScale = Phaser.Math.Clamp(bottom.scale, 0.24, 1.45);
    const scrollY = -(this.currentWorldZ * (0.06 + depthScale * 0.20) + index * 14.0);
    const tileScaleY = Phaser.Math.Clamp(0.35 + depthScale * 0.65, 0.35, 1.35);

    if (leftWidthPx < 2 || centerY < -4 || centerY > this.sceneHeight + 4) {
      leftBand.setVisible(false);
    } else {
      leftBand.setVisible(true);
      leftBand.setPosition(leftWidthPx * 0.5 - 1, centerY);
      leftBand.setSize(leftWidthPx, bandHeight);
      leftBand.setTileScale(1, tileScaleY);
      leftBand.tilePositionY = scrollY;
      leftBand.tilePositionX = this.currentWorldZ * 0.02 + index * 0.7;
    }

    if (rightWidthPx < 2 || centerY < -4 || centerY > this.sceneHeight + 4) {
      rightBand.setVisible(false);
    } else {
      rightBand.setVisible(true);
      rightBand.setPosition(this.sceneWidth - rightWidthPx * 0.5 + 1, centerY);
      rightBand.setSize(rightWidthPx, bandHeight);
      rightBand.setTileScale(1, tileScaleY);
      rightBand.tilePositionY = scrollY;
      rightBand.tilePositionX = this.currentWorldZ * 0.02 + index * 0.7;
    }
  }

  private drawLaneMarker(laneIndex: number, top: Projection, bottom: Projection): void {
    const fraction = laneIndex / this.laneCount - 0.5;
    const topX = top.x + top.roadWidth * fraction * 1.72;
    const bottomX = bottom.x + bottom.roadWidth * fraction * 1.72;
    const topHalfWidth = Math.max(0.6, top.scale * 0.26);
    const bottomHalfWidth = Math.max(1.4, bottom.scale * 0.54);

    this.roadGraphics.fillStyle(ThemeConfig.laneWhite, bottom.scale * 0.95);
    this.roadGraphics.fillPoints(
      [
        new Phaser.Geom.Point(topX - topHalfWidth, top.y),
        new Phaser.Geom.Point(topX + topHalfWidth, top.y),
        new Phaser.Geom.Point(bottomX + bottomHalfWidth, bottom.y),
        new Phaser.Geom.Point(bottomX - bottomHalfWidth, bottom.y)
      ],
      true
    );
  }

  private buildSegments(): void {
    const append = (curve: number, count: number) => {
      for (let i = 0; i < count; i += 1) {
        this.segmentPalette.push({ curve });
      }
    };
    append(0, 160);
  }

  private segmentAt(worldZ: number): Segment {
    const normalized = this.positiveMod(worldZ, this.totalTrackLength);
    const index = Math.floor(normalized / this.segmentLength) % Math.max(this.segmentPalette.length, 1);
    return this.segmentPalette[index];
  }

  private projection(relativeZ: number, laneOffset: number, curveOffset: number): Projection {
    const distance = this.visibleSegments * this.segmentLength;
    const t = Phaser.Math.Clamp(relativeZ / distance, 0, 1);
    const perspective = 1 - t;
    const centeredY = this.horizonY + (this.bottomY - this.horizonY) * perspective;
    const roadWidth = this.sceneWidth * (0.02 + 0.72 * perspective);
    const curveX = curveOffset * this.sceneWidth * 0.36;
    const centeredX = curveX - this.currentPlayerOffset * roadWidth * 0.82 + laneOffset * roadWidth * 0.68;

    return {
      x: this.centerX + centeredX,
      y: this.centerY - centeredY,
      scale: 0.25 + perspective * 1.15,
      roadWidth
    };
  }

  private buildCurveSamples(start: number, visibleDepth: number): number[] {
    const samples = new Array<number>(this.visibleSegments + 1).fill(0);
    let sampleZ = start;
    let cumulativeCurve = 0;

    for (let index = 0; index <= this.visibleSegments; index += 1) {
      samples[index] = cumulativeCurve;
      if (sampleZ < start + visibleDepth) {
        cumulativeCurve += this.segmentAt(sampleZ).curve * 0.32;
        sampleZ += this.segmentLength;
      }
    }
    return samples;
  }

  private accumulatedCurve(start: number, end: number): number {
    if (end <= start) {
      return 0;
    }
    let sampleZ = start;
    let value = 0;
    while (sampleZ < end) {
      value += this.segmentAt(sampleZ).curve * 0.32;
      sampleZ += this.segmentLength;
    }
    return value;
  }

  private positiveMod(lhs: number, rhs: number): number {
    if (rhs === 0) {
      return 0;
    }
    const value = lhs % rhs;
    return value >= 0 ? value : value + rhs;
  }
}
