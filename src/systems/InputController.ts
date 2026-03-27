import { audioSystem } from "../audio/AudioSystem";
import Phaser from "phaser";
import { inputBridge } from "./InputBridge";

export class InputController {
  steering = 0;
  accelerating = false;
  braking = false;
  boosting = false;

  private readonly scene: Phaser.Scene;
  private readonly cursors: Phaser.Types.Input.Keyboard.CursorKeys | null;
  private readonly keyA: Phaser.Input.Keyboard.Key | null;
  private readonly keyD: Phaser.Input.Keyboard.Key | null;
  private readonly keyW: Phaser.Input.Keyboard.Key | null;
  private readonly keyS: Phaser.Input.Keyboard.Key | null;
  private readonly keyShift: Phaser.Input.Keyboard.Key | null;
  private readonly keySpace: Phaser.Input.Keyboard.Key | null;
  private readonly keyEnter: Phaser.Input.Keyboard.Key | null;
  private readonly keyEsc: Phaser.Input.Keyboard.Key | null;
  private readonly keyP: Phaser.Input.Keyboard.Key | null;

  private startPressed = false;
  private pausePressed = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const keyboard = scene.input.keyboard;
    this.cursors = keyboard?.createCursorKeys() ?? null;
    this.keyA = keyboard?.addKey("A") ?? null;
    this.keyD = keyboard?.addKey("D") ?? null;
    this.keyW = keyboard?.addKey("W") ?? null;
    this.keyS = keyboard?.addKey("S") ?? null;
    this.keyShift = keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT) ?? null;
    this.keySpace = keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE) ?? null;
    this.keyEnter = keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER) ?? null;
    this.keyEsc = keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ESC) ?? null;
    this.keyP = keyboard?.addKey("P") ?? null;

    keyboard?.on("keydown", this.onKeyDown, this);
  }

  destroy(): void {
    this.scene.input.keyboard?.off("keydown", this.onKeyDown, this);
  }

  resetState(): void {
    inputBridge.reset();
    this.startPressed = false;
    this.pausePressed = false;
    this.syncFromHardware();
  }

  syncFromHardware(): void {
    let keyboardSteering = 0;
    if (this.cursors?.left.isDown || this.keyA?.isDown) {
      keyboardSteering -= 1;
    }
    if (this.cursors?.right.isDown || this.keyD?.isDown) {
      keyboardSteering += 1;
    }

    const bridgeSteering = inputBridge.steering;
    this.steering = bridgeSteering !== 0 ? bridgeSteering : Phaser.Math.Clamp(keyboardSteering, -1, 1);
    this.accelerating = Boolean(this.cursors?.up.isDown || this.keyW?.isDown || inputBridge.accelerating);
    this.braking = Boolean(this.cursors?.down.isDown || this.keyS?.isDown || this.keySpace?.isDown || inputBridge.braking);
    this.boosting = Boolean(this.keyShift?.isDown || inputBridge.boosting);
  }

  consumeStartPressed(): boolean {
    const pressed = this.startPressed || inputBridge.consumeStart();
    this.startPressed = false;
    return pressed;
  }

  consumePausePressed(): boolean {
    const pressed = this.pausePressed || inputBridge.consumePause();
    this.pausePressed = false;
    return pressed;
  }

  private onKeyDown(event: KeyboardEvent): void {
    audioSystem.unlock();
    if (event.code === "Enter") {
      this.startPressed = true;
    }
    if (event.code === "Escape" || event.code === "KeyP") {
      this.pausePressed = true;
    }
  }
}
