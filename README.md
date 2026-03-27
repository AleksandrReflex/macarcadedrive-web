# MAC Arcade Drive Web Port

Web-port of the SpriteKit iOS game to **Phaser 3 + TypeScript** with mobile-first vertical layout and handheld shell framing.

## Stack

- `Phaser 3`
- `TypeScript`
- `Vite`

## Run locally

1. Copy assets from the iOS project into this web project:

```bash
npm run sync:assets
```

2. Install dependencies:

```bash
npm install
```

3. Start dev server:

```bash
npm run dev
```

4. Build production bundle:

```bash
npm run build
```

## Deploy to GitHub Pages

This project includes GitHub Actions deploy workflow:

- `.github/workflows/deploy-pages.yml`
- Vite `base` is set to `./` in `vite.config.ts` for Pages compatibility.

### First-time setup

1. Create an empty GitHub repository (for example `macarcadedrive-web`) under your account.
2. Push this project to the `main` branch.
3. In GitHub repository settings, open `Pages` and set source to `GitHub Actions`.

After each push to `main`, the site will auto-deploy.

## Controls

- Touch/mouse shell controls:
  - `D-pad L/R` -> steering
  - `D-pad DOWN` or `B` -> brake
  - `A` -> accelerate + turbo
  - `START` -> start/confirm/retry
  - `PAUSE` -> back/menu/pause
- Keyboard:
  - `Left/Right` or `A/D` -> steering
  - `Up` or `W` -> accelerate
  - `Down` or `S` or `Space` -> brake
  - `Shift` -> turbo
  - `Enter` -> start/confirm/retry
  - `Esc` or `P` -> pause/back/menu

## Project structure

```text
src/
  config/
  scenes/
  systems/
  ui/
  assets/
public/
  assets/
scripts/
  copy_assets.sh
```

## Scene flow

`Loading -> MainMenu -> CharacterSelection -> Race -> Finish`

On crash with zero integrity:

`Race -> GameOver`

## Port mapping (1:1 conceptually)

- `AssetConfig.swift` -> `src/config/AssetConfig.ts`
- `MainMenuScene.swift` -> `src/scenes/MainMenuScene.ts`
- `CharacterSelectionScene.swift` -> `src/scenes/CharacterSelectionScene.ts`
- `GameScene.swift` -> `src/scenes/RaceScene.ts`
- `PlayerCar.swift` -> `src/systems/PlayerCar.ts`
- `Pseudo3DRoadSystem.swift` -> `src/systems/Pseudo3DRoadSystem.ts`
- `TrafficManager.swift` -> `src/systems/TrafficManager.ts`
- `HUDLayer.swift` -> `src/ui/HUD.ts`
- `FinishScene.swift` -> `src/scenes/FinishScene.ts`
- `GameOverScene.swift` -> `src/scenes/GameOverScene.ts`
- `ConsoleShellView.swift` -> `src/ui/ConsoleShell.ts` + `src/styles.css`
- `InputController.swift` + `ArcadeInputBridge.swift` -> `src/systems/InputController.ts` + `src/systems/InputBridge.ts`

## What was adapted for Web

- SpriteKit rendering replaced with Phaser objects/graphics (no direct API conversion).
- iOS UIKit shell replaced by DOM/CSS shell around Phaser canvas.
- Missing source assets (`bg_studio`, `bg_lights`, `fx_*`) replaced with procedural visual equivalents.
- Audio hooks from Swift kept conceptually but not activated (no source audio files in provided asset set).
- Race game-over behavior is implemented as a dedicated `GameOver` scene (instead of in-scene overlay), matching requested web flow.

## Notes

- Designed for vertical/mobile presentation first.
- Uses original asset naming semantics as much as possible with web-safe filenames in `public/assets`.
