import Phaser from "phaser";
import { AssetCatalog, ThemeConfig } from "../config/AssetConfig";

export interface StudioBackdropNodes {
  sky?: Phaser.GameObjects.Image;
  city?: Phaser.GameObjects.Image;
  spotlight: Phaser.GameObjects.Graphics;
}

export function addStudioBackdrop(
  scene: Phaser.Scene,
  width: number,
  height: number,
  depth = -20,
  verticalOffset = 0
): StudioBackdropNodes {
  const bg = scene.add.graphics();
  bg.fillGradientStyle(0x22243a, 0x2f3350, 0x0f1220, 0x0b0e17, 1);
  bg.fillRect(0, 0, width, height);
  bg.setDepth(depth);

  let sky: Phaser.GameObjects.Image | undefined;
  if (scene.textures.exists(AssetCatalog.backgroundSky)) {
    sky = scene.add.image(width * 0.5, height * 0.34 + verticalOffset, AssetCatalog.backgroundSky);
    sky.setDisplaySize(width * 1.1, height * 0.86);
    sky.setDepth(depth + 1);
    scene.tweens.add({
      targets: sky,
      y: sky.y + 6,
      duration: 5600,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut"
    });
  }

  let city: Phaser.GameObjects.Image | undefined;
  if (scene.textures.exists(AssetCatalog.backgroundCity)) {
    city = scene.add.image(width * 0.5, height * 0.45 + verticalOffset, AssetCatalog.backgroundCity);
    city.setDisplaySize(width * 1.12, height * 0.24);
    city.setAlpha(0.82);
    city.setDepth(depth + 2);
    scene.tweens.add({
      targets: city,
      x: city.x + 8,
      duration: 9200,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut"
    });
  }

  const spotlight = scene.add.graphics();
  spotlight.fillStyle(ThemeConfig.fuchsia, 0.08);
  spotlight.fillEllipse(width * 0.5, height * 0.5 + verticalOffset, width * 0.9, height * 0.46);
  spotlight.setDepth(depth + 3);
  scene.tweens.add({
    targets: spotlight,
    alpha: 0.16,
    duration: 2400,
    yoyo: true,
    repeat: -1,
    ease: "Sine.easeInOut"
  });

  return { sky, city, spotlight };
}

export function addScanlineOverlay(scene: Phaser.Scene, width: number, height: number, depth = 80): Phaser.GameObjects.Graphics {
  const lines = scene.add.graphics();
  lines.lineStyle(1, ThemeConfig.backgroundBlack, 0.08);
  const spacing = Math.max(3, Math.floor(height / 90));
  for (let y = 0; y <= height; y += spacing) {
    lines.lineBetween(0, y, width, y);
  }
  lines.setDepth(depth);

  const sweep = scene.add.rectangle(width * 0.5, -6, width * 0.98, 10, ThemeConfig.whiteGlow, 0.09);
  sweep.setDepth(depth + 1);
  sweep.setBlendMode(Phaser.BlendModes.ADD);
  scene.tweens.add({
    targets: sweep,
    y: height + 8,
    alpha: 0,
    duration: 740,
    ease: "Cubic.easeOut",
    onComplete: () => sweep.destroy()
  });

  return lines;
}
