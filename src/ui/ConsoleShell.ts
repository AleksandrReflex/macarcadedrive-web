import { audioSystem } from "../audio/AudioSystem";
import { AssetCatalog } from "../config/AssetConfig";
import { inputBridge } from "../systems/InputBridge";

export class ConsoleShell {
  readonly screenHost: HTMLDivElement;

  private readonly root: HTMLDivElement;
  private readonly shellViewport: HTMLDivElement;
  private readonly shellBody: HTMLDivElement;
  private readonly startButton: HTMLButtonElement;
  private readonly pauseButton: HTMLButtonElement;
  private readonly turboButton: HTMLButtonElement;
  private readonly brakeButton: HTMLButtonElement;
  private readonly leftButton: HTMLButtonElement;
  private readonly rightButton: HTMLButtonElement;
  private readonly downButton: HTMLButtonElement;
  private readonly cleanupListeners: Array<() => void> = [];

  private leftPressed = false;
  private rightPressed = false;
  private downPressed = false;
  private brakePressed = false;

  constructor(parent: HTMLElement) {
    this.root = document.createElement("div");
    this.root.className = "shell-root";
    this.root.innerHTML = this.template();
    parent.appendChild(this.root);

    this.shellViewport = this.query<HTMLDivElement>(".shell-viewport");
    this.shellBody = this.query<HTMLDivElement>(".shell-body");
    this.screenHost = this.query<HTMLDivElement>(".shell-screen");
    this.startButton = this.query<HTMLButtonElement>("[data-action='start']");
    this.pauseButton = this.query<HTMLButtonElement>("[data-action='pause']");
    this.turboButton = this.query<HTMLButtonElement>("[data-action='turbo']");
    this.brakeButton = this.query<HTMLButtonElement>("[data-action='brake']");
    this.leftButton = this.query<HTMLButtonElement>("[data-action='left']");
    this.rightButton = this.query<HTMLButtonElement>("[data-action='right']");
    this.downButton = this.query<HTMLButtonElement>("[data-action='down']");

    this.wireButtons();
    this.wireShellTilt();
    this.root.addEventListener("pointerdown", this.handleFirstInteraction, { once: true });
  }

  destroy(): void {
    inputBridge.reset();
    this.root.removeEventListener("pointerdown", this.handleFirstInteraction);
    this.cleanupListeners.forEach((dispose) => dispose());
    this.root.remove();
  }

  private wireButtons(): void {
    this.bindTapButton(this.startButton, () => inputBridge.triggerStart());
    this.bindTapButton(this.pauseButton, () => inputBridge.triggerPause());

    this.bindHoldButton(this.turboButton, (pressed) => {
      inputBridge.accelerating = pressed;
      inputBridge.boosting = pressed;
    });

    this.bindHoldButton(this.brakeButton, (pressed) => {
      this.brakePressed = pressed;
      this.syncBrakeState();
    });

    this.bindHoldButton(this.leftButton, (pressed) => {
      this.leftPressed = pressed;
      this.syncSteeringState();
    });

    this.bindHoldButton(this.rightButton, (pressed) => {
      this.rightPressed = pressed;
      this.syncSteeringState();
    });

    this.bindHoldButton(this.downButton, (pressed) => {
      this.downPressed = pressed;
      this.syncBrakeState();
    });
  }

  private bindTapButton(button: HTMLButtonElement, action: () => void): void {
    button.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      audioSystem.unlock();
      button.classList.add("hold-active");
    });
    button.addEventListener(
      "touchstart",
      () => {
        audioSystem.unlock();
      },
      { passive: true }
    );
    button.addEventListener(
      "touchend",
      () => {
        audioSystem.unlock();
      },
      { passive: true }
    );
    button.addEventListener("pointerup", (event) => {
      event.preventDefault();
      audioSystem.unlock();
      button.classList.remove("hold-active");
      action();
    });
    button.addEventListener("pointercancel", () => {
      button.classList.remove("hold-active");
    });
    button.addEventListener("pointerleave", () => {
      button.classList.remove("hold-active");
    });
  }

  private bindHoldButton(button: HTMLButtonElement, onChange: (pressed: boolean) => void): void {
    const activePointers = new Set<number>();

    const sync = () => {
      const pressed = activePointers.size > 0;
      button.classList.toggle("hold-active", pressed);
      onChange(pressed);
    };

    button.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      audioSystem.unlock();
      activePointers.add(event.pointerId);
      sync();
    });
    button.addEventListener(
      "touchstart",
      () => {
        audioSystem.unlock();
      },
      { passive: true }
    );
    button.addEventListener(
      "touchend",
      () => {
        audioSystem.unlock();
      },
      { passive: true }
    );

    const clearPointer = (event: PointerEvent) => {
      if (!activePointers.delete(event.pointerId)) {
        return;
      }
      audioSystem.unlock();
      sync();
    };

    window.addEventListener("pointerup", clearPointer);
    window.addEventListener("pointercancel", clearPointer);
  }

  private syncSteeringState(): void {
    if (this.leftPressed && !this.rightPressed) {
      inputBridge.steering = -1;
      return;
    }
    if (this.rightPressed && !this.leftPressed) {
      inputBridge.steering = 1;
      return;
    }
    inputBridge.steering = 0;
  }

  private syncBrakeState(): void {
    inputBridge.braking = this.brakePressed || this.downPressed;
  }

  private handleFirstInteraction = (): void => {
    audioSystem.unlock();
  };

  private wireShellTilt(): void {
    const canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduceMotion) {
      this.applyTilt(0, 0, 0.18, 0.18, 0.2);
      return;
    }

    if (!canHover) {
      this.wireDeviceTilt();
      return;
    }

    const maxTiltX = 3.6;
    const maxTiltY = 4.8;
    const smoothing = 0.16;

    let targetTiltX = 0;
    let targetTiltY = 0;
    let targetLeftAlpha = 0.18;
    let targetRightAlpha = 0.18;
    let targetBottomAlpha = 0.2;

    let currentTiltX = 0;
    let currentTiltY = 0;
    let currentLeftAlpha = 0.18;
    let currentRightAlpha = 0.18;
    let currentBottomAlpha = 0.2;

    let animationFrame = 0;
    let settleTimer = 0;

    const animate = () => {
      currentTiltX += (targetTiltX - currentTiltX) * smoothing;
      currentTiltY += (targetTiltY - currentTiltY) * smoothing;
      currentLeftAlpha += (targetLeftAlpha - currentLeftAlpha) * smoothing;
      currentRightAlpha += (targetRightAlpha - currentRightAlpha) * smoothing;
      currentBottomAlpha += (targetBottomAlpha - currentBottomAlpha) * smoothing;

      this.applyTilt(currentTiltX, currentTiltY, currentLeftAlpha, currentRightAlpha, currentBottomAlpha);

      const tiltSettled = Math.abs(targetTiltX - currentTiltX) < 0.01 && Math.abs(targetTiltY - currentTiltY) < 0.01;
      const sideSettled =
        Math.abs(targetLeftAlpha - currentLeftAlpha) < 0.002 &&
        Math.abs(targetRightAlpha - currentRightAlpha) < 0.002 &&
        Math.abs(targetBottomAlpha - currentBottomAlpha) < 0.002;

      if (tiltSettled && sideSettled) {
        animationFrame = 0;
        return;
      }

      animationFrame = window.requestAnimationFrame(animate);
    };

    const requestFrame = () => {
      if (animationFrame !== 0) {
        return;
      }
      animationFrame = window.requestAnimationFrame(animate);
    };

    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") {
        return;
      }

      const rect = this.shellViewport.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) {
        return;
      }

      const normX = clamp((event.clientX - rect.left) / rect.width * 2 - 1, -1, 1);
      const normY = clamp((event.clientY - rect.top) / rect.height * 2 - 1, -1, 1);
      targetTiltX = -normY * maxTiltX;
      targetTiltY = normX * maxTiltY;
      targetLeftAlpha = 0.16 + Math.max(0, -normX) * 0.42;
      targetRightAlpha = 0.16 + Math.max(0, normX) * 0.42;
      targetBottomAlpha = 0.2 + Math.max(0, normY) * 0.16;
      requestFrame();
    };

    const onPointerLeave = () => {
      targetTiltX = -currentTiltX * 0.18;
      targetTiltY = -currentTiltY * 0.18;
      targetLeftAlpha = 0.18;
      targetRightAlpha = 0.18;
      targetBottomAlpha = 0.2;
      if (settleTimer !== 0) {
        window.clearTimeout(settleTimer);
      }
      settleTimer = window.setTimeout(() => {
        targetTiltX = 0;
        targetTiltY = 0;
        requestFrame();
        settleTimer = 0;
      }, 86);
      requestFrame();
    };

    this.root.addEventListener("pointermove", onPointerMove);
    this.root.addEventListener("pointerleave", onPointerLeave);
    window.addEventListener("blur", onPointerLeave);

    this.cleanupListeners.push(() => this.root.removeEventListener("pointermove", onPointerMove));
    this.cleanupListeners.push(() => this.root.removeEventListener("pointerleave", onPointerLeave));
    this.cleanupListeners.push(() => window.removeEventListener("blur", onPointerLeave));
    this.cleanupListeners.push(() => {
      if (settleTimer !== 0) {
        window.clearTimeout(settleTimer);
      }
      if (animationFrame !== 0) {
        window.cancelAnimationFrame(animationFrame);
      }
    });

    this.applyTilt(0, 0, 0.18, 0.18, 0.2);
  }

  private wireDeviceTilt(): void {
    const orientationCtor = window.DeviceOrientationEvent as DeviceOrientationEventCtor | undefined;
    if (!orientationCtor) {
      this.applyTilt(0, 0, 0.18, 0.18, 0.2);
      return;
    }

    const maxTiltX = 4.2;
    const maxTiltY = 5.4;
    const smoothing = 0.14;

    let targetTiltX = 0;
    let targetTiltY = 0;
    let targetLeftAlpha = 0.18;
    let targetRightAlpha = 0.18;
    let targetBottomAlpha = 0.2;

    let currentTiltX = 0;
    let currentTiltY = 0;
    let currentLeftAlpha = 0.18;
    let currentRightAlpha = 0.18;
    let currentBottomAlpha = 0.2;

    let animationFrame = 0;
    let settleTimer = 0;

    const animate = () => {
      currentTiltX += (targetTiltX - currentTiltX) * smoothing;
      currentTiltY += (targetTiltY - currentTiltY) * smoothing;
      currentLeftAlpha += (targetLeftAlpha - currentLeftAlpha) * smoothing;
      currentRightAlpha += (targetRightAlpha - currentRightAlpha) * smoothing;
      currentBottomAlpha += (targetBottomAlpha - currentBottomAlpha) * smoothing;

      this.applyTilt(currentTiltX, currentTiltY, currentLeftAlpha, currentRightAlpha, currentBottomAlpha);

      const tiltSettled = Math.abs(targetTiltX - currentTiltX) < 0.01 && Math.abs(targetTiltY - currentTiltY) < 0.01;
      const sideSettled =
        Math.abs(targetLeftAlpha - currentLeftAlpha) < 0.002 &&
        Math.abs(targetRightAlpha - currentRightAlpha) < 0.002 &&
        Math.abs(targetBottomAlpha - currentBottomAlpha) < 0.002;

      if (tiltSettled && sideSettled) {
        animationFrame = 0;
        return;
      }

      animationFrame = window.requestAnimationFrame(animate);
    };

    const requestFrame = () => {
      if (animationFrame !== 0) {
        return;
      }
      animationFrame = window.requestAnimationFrame(animate);
    };

    const onDeviceOrientation = (event: DeviceOrientationEvent) => {
      if (event.beta == null || event.gamma == null) {
        return;
      }

      const normX = clamp(event.gamma / 30, -1, 1);
      const normY = clamp((event.beta - 45) / 35, -1, 1);
      targetTiltX = -normY * maxTiltX;
      targetTiltY = normX * maxTiltY;
      targetLeftAlpha = 0.16 + Math.max(0, -normX) * 0.42;
      targetRightAlpha = 0.16 + Math.max(0, normX) * 0.42;
      targetBottomAlpha = 0.2 + Math.max(0, normY) * 0.16;
      requestFrame();
    };

    const resetTilt = () => {
      targetTiltX = -currentTiltX * 0.16;
      targetTiltY = -currentTiltY * 0.16;
      targetLeftAlpha = 0.18;
      targetRightAlpha = 0.18;
      targetBottomAlpha = 0.2;
      if (settleTimer !== 0) {
        window.clearTimeout(settleTimer);
      }
      settleTimer = window.setTimeout(() => {
        targetTiltX = 0;
        targetTiltY = 0;
        requestFrame();
        settleTimer = 0;
      }, 92);
      requestFrame();
    };

    const startOrientationFeed = () => {
      window.addEventListener("deviceorientation", onDeviceOrientation);
      this.cleanupListeners.push(() => window.removeEventListener("deviceorientation", onDeviceOrientation));
    };

    if (typeof orientationCtor.requestPermission === "function") {
      const requestPermission = () => {
        void orientationCtor
          .requestPermission!()
          .then((state) => {
            if (state === "granted") {
              startOrientationFeed();
            }
          })
          .catch(() => undefined);
      };

      this.root.addEventListener("pointerdown", requestPermission, { once: true });
      this.cleanupListeners.push(() => this.root.removeEventListener("pointerdown", requestPermission));
    } else {
      startOrientationFeed();
    }

    window.addEventListener("blur", resetTilt);
    this.cleanupListeners.push(() => window.removeEventListener("blur", resetTilt));
    this.cleanupListeners.push(() => {
      if (settleTimer !== 0) {
        window.clearTimeout(settleTimer);
      }
      if (animationFrame !== 0) {
        window.cancelAnimationFrame(animationFrame);
      }
    });

    this.applyTilt(0, 0, 0.18, 0.18, 0.2);
  }

  private applyTilt(tiltX: number, tiltY: number, leftAlpha: number, rightAlpha: number, bottomAlpha: number): void {
    this.shellBody.style.setProperty("--shell-tilt-x", `${tiltX.toFixed(2)}deg`);
    this.shellBody.style.setProperty("--shell-tilt-y", `${tiltY.toFixed(2)}deg`);
    this.shellBody.style.setProperty("--shell-left-alpha", `${leftAlpha.toFixed(3)}`);
    this.shellBody.style.setProperty("--shell-right-alpha", `${rightAlpha.toFixed(3)}`);
    this.shellBody.style.setProperty("--shell-bottom-alpha", `${bottomAlpha.toFixed(3)}`);
  }

  private template(): string {
    const baseUrl = (import.meta.env.BASE_URL ?? "/").replace(/\/?$/, "/");
    const dpadImage = `${baseUrl}assets/${AssetCatalog.shellDPad}.png`;
    const bezelImage = `${baseUrl}assets/${AssetCatalog.shellScreenBezel}.png`;
    const logoImage = `${baseUrl}assets/${AssetCatalog.shellLogoMac}.png`;

    return `
      <div class="shell-viewport">
        <div class="shell-body">
          <div class="shell-bezel">
            <img class="shell-bezel-art" src="${bezelImage}" alt="">
            <div class="shell-screen"></div>
            <img class="shell-logo" src="${logoImage}" alt="">
          </div>
          <div class="controls-row">
            <div class="dpad">
              <img src="${dpadImage}" alt="">
              <button class="dpad-left" data-action="left" aria-label="Left"></button>
              <button class="dpad-right" data-action="right" aria-label="Right"></button>
              <button class="dpad-down" data-action="down" aria-label="Brake"></button>
            </div>
            <div class="action-stack">
              <button class="round-button round-a" data-action="turbo" aria-label="Turbo"></button>
              <button class="round-button round-b" data-action="brake" aria-label="Brake"></button>
              <div class="button-caption caption-a">TURBO</div>
              <div class="button-caption caption-b">BRAKE</div>
            </div>
          </div>
          <div class="pill-row">
            <button class="pill-button" data-action="start" aria-label="Start">START</button>
            <button class="pill-button" data-action="pause" aria-label="Pause">PAUSE</button>
          </div>
        </div>
      </div>
    `;
  }

  private query<T extends HTMLElement>(selector: string): T {
    const element = this.root.querySelector(selector);
    if (!element) {
      throw new Error(`Missing shell element: ${selector}`);
    }
    return element as T;
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

type DeviceOrientationPermissionState = "granted" | "denied";
type DeviceOrientationEventCtor = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<DeviceOrientationPermissionState>;
};
