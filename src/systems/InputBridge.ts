class ArcadeInputBridge {
  steering = 0;
  accelerating = false;
  braking = false;
  boosting = false;

  private startPressed = false;
  private pausePressed = false;

  reset(): void {
    this.steering = 0;
    this.accelerating = false;
    this.braking = false;
    this.boosting = false;
    this.startPressed = false;
    this.pausePressed = false;
  }

  triggerStart(): void {
    this.startPressed = true;
  }

  triggerPause(): void {
    this.pausePressed = true;
  }

  consumeStart(): boolean {
    if (!this.startPressed) {
      return false;
    }
    this.startPressed = false;
    return true;
  }

  consumePause(): boolean {
    if (!this.pausePressed) {
      return false;
    }
    this.pausePressed = false;
    return true;
  }
}

export const inputBridge = new ArcadeInputBridge();
