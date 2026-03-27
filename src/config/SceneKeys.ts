export const SceneKeys = {
  Loading: "loading",
  MainMenu: "main-menu",
  CharacterSelection: "character-selection",
  Race: "race",
  Finish: "finish",
  GameOver: "game-over"
} as const;

export type SceneKey = (typeof SceneKeys)[keyof typeof SceneKeys];
