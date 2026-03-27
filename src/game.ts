import Phaser from "phaser";
import { CharacterSelectionScene } from "./scenes/CharacterSelectionScene";
import { FinishScene } from "./scenes/FinishScene";
import { GameOverScene } from "./scenes/GameOverScene";
import { LoadingScene } from "./scenes/LoadingScene";
import { MainMenuScene } from "./scenes/MainMenuScene";
import { RaceScene } from "./scenes/RaceScene";

export function createGame(parent: HTMLElement): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: "#101115",
    width: 390,
    height: 700,
    scene: [LoadingScene, MainMenuScene, CharacterSelectionScene, RaceScene, FinishScene, GameOverScene],
    scale: {
      mode: Phaser.Scale.RESIZE,
      width: 390,
      height: 700
    },
    physics: {
      default: "arcade"
    },
    input: {
      activePointers: 4
    },
    banner: false
  });
}
