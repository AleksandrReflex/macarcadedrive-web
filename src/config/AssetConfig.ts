import Phaser from "phaser";

export const AssetCatalog = {
  dojaCarRear: "doja_car_rear",
  dojaCarRearB: "doja_car_rear_b",
  dojaCarLeft: "doja_car_left",
  dojaCarRight: "doja_car_right",
  dojaCarCrash: "doja_car_crash",
  dojaModelA: "doja_model_a",
  dojaModelB: "doja_model_b",

  roanCarRear: "roan_car_rear_copy",
  roanCarRearB: "roan_car_rear_b_copy",
  roanCarLeft: "roan_car_left_copy",
  roanCarRight: "roan_car_right_copy",
  roanCarCrash: "roan_car_crash_copy",
  roanModelA: "roan_model_a",
  roanModelB: "roan_model_b",

  trafficCar01: "traffic_car_01",
  trafficCar02: "traffic_car_02",
  trafficCar03: "traffic_car_03",
  trafficCar04: "traffic_car_04",
  trafficCar05: "traffic_car_05",
  trafficCar06: "traffic_car_06",
  trafficCar07: "traffic_car_07",
  trafficCar08: "traffic_car_08",
  trafficCar09: "traffic_car_09",

  driverPortrait: "driver_portrait",
  logoMain: "logo_main",
  backgroundSky: "bg_sky",
  backgroundSkyPink: "pink_sky_pixilated",
  groundGrassArcadePink: "road_grass",
  backgroundCity: "bg_city",
  backgroundLights: "bg_lights",
  roadAsphalt: "road_asphalt",
  roadLane: "road_lane",
  roadShoulder: "road_shoulder",
  backgroundStudio: "bg_studio",

  uiButtonAccel: "ui_button_accel",
  uiButtonBrake: "ui_button_brake",
  uiButtonBoost: "ui_button_boost",
  uiButtonMenu: "ui_button_menu",
  uiJoystickBase: "ui_joystick_base",
  uiJoystickKnob: "ui_joystick_knob",
  uiHUDFrame: "ui_hud_frame",
  uiLogoMac: "ui_logo_mac",
  uiStartButton: "ui_start_button",

  fxSmoke01: "fx_smoke_01",
  fxSpark01: "fx_spark_01",
  fxExplosion01: "fx_explosion_01",

  shellScreenBezel: "shell_screen_bezel",
  shellScreenBezelVector: "shell_screen_bezel_vector",
  shellLogoMac: "shell_logo_mac",
  shellDPad: "shell_dpad",
  shellButton: "shell_button",
  shellButtonPill: "shell_button_pill"
} as const;

export type DriverKey = "doja" | "roan";

export interface DriverProfile {
  key: DriverKey;
  displayName: string;
  summary: string;
  menuFrames: [string, string];
  rearFrames: [string, string];
  leftTexture: string;
  rightTexture: string;
  crashTexture: string;
}

export const DriverProfiles: Record<DriverKey, DriverProfile> = {
  doja: {
    key: "doja",
    displayName: "DOJA",
    summary: "Precision coupe with sharp lane changes and a harder silhouette.",
    menuFrames: [AssetCatalog.dojaModelA, AssetCatalog.dojaModelB],
    rearFrames: [AssetCatalog.dojaCarRear, AssetCatalog.dojaCarRearB],
    leftTexture: AssetCatalog.dojaCarLeft,
    rightTexture: AssetCatalog.dojaCarRight,
    crashTexture: AssetCatalog.dojaCarCrash
  },
  roan: {
    key: "roan",
    displayName: "ROAN",
    summary: "Open-top glam runner with a brighter profile and show-car energy.",
    menuFrames: [AssetCatalog.roanModelA, AssetCatalog.roanModelB],
    rearFrames: [AssetCatalog.roanCarRear, AssetCatalog.roanCarRearB],
    leftTexture: AssetCatalog.roanCarLeft,
    rightTexture: AssetCatalog.roanCarRight,
    crashTexture: AssetCatalog.roanCarCrash
  }
};

export const DriverOrder: DriverProfile[] = [DriverProfiles.doja, DriverProfiles.roan];

export const TrafficCarPool = [
  AssetCatalog.trafficCar01,
  AssetCatalog.trafficCar02,
  AssetCatalog.trafficCar03,
  AssetCatalog.trafficCar04,
  AssetCatalog.trafficCar05,
  AssetCatalog.trafficCar06,
  AssetCatalog.trafficCar07,
  AssetCatalog.trafficCar08,
  AssetCatalog.trafficCar09
] as const;

export const BrandText = {
  gameTitle: "MAC ARCADE DRIVE",
  startPrompt: "TAP TO START",
  retry: "RETRY RUN",
  menu: "BACK TO MENU",
  boost: "BOOST",
  accelerate: "GO",
  brake: "BRAKE"
} as const;

export const ThemeConfig = {
  backgroundBlack: 0x121214,
  charcoal: 0x2e2e33,
  chrome: 0xebebee,
  silver: 0xc3c3c7,
  whiteGlow: 0xf8f8fc,
  crimson: 0xea6b76,
  fuchsia: 0xde6f76,
  violet: 0xa1a1a8,
  electricBlue: 0xe0e0e5,
  neonBlue: 0xd6d6dc,
  asphalt: 0x37373a,
  laneWhite: 0xf2f2f5,
  shoulder: 0xc96972,
  grassDark: 0x1f2024,
  glass: 0xffffff
} as const;

const AssetFileMap: Record<string, string | null> = {
  [AssetCatalog.dojaCarRear]: "/assets/doja_car_rear.png",
  [AssetCatalog.dojaCarRearB]: "/assets/doja_car_rear_b.png",
  [AssetCatalog.dojaCarLeft]: "/assets/doja_car_left.png",
  [AssetCatalog.dojaCarRight]: "/assets/doja_car_right.png",
  [AssetCatalog.dojaCarCrash]: "/assets/doja_car_crash.png",
  [AssetCatalog.dojaModelA]: "/assets/doja_model_a.png",
  [AssetCatalog.dojaModelB]: "/assets/doja_model_b.png",

  [AssetCatalog.roanCarRear]: "/assets/roan_car_rear_copy.png",
  [AssetCatalog.roanCarRearB]: "/assets/roan_car_rear_b_copy.png",
  [AssetCatalog.roanCarLeft]: "/assets/roan_car_left_copy.png",
  [AssetCatalog.roanCarRight]: "/assets/roan_car_right_copy.png",
  [AssetCatalog.roanCarCrash]: "/assets/roan_car_crash_copy.png",
  [AssetCatalog.roanModelA]: "/assets/roan_model_a.png",
  [AssetCatalog.roanModelB]: "/assets/roan_model_b.png",

  [AssetCatalog.trafficCar01]: "/assets/traffic_car_01.png",
  [AssetCatalog.trafficCar02]: "/assets/traffic_car_02.png",
  [AssetCatalog.trafficCar03]: "/assets/traffic_car_03.png",
  [AssetCatalog.trafficCar04]: "/assets/traffic_car_04.png",
  [AssetCatalog.trafficCar05]: "/assets/traffic_car_05.png",
  [AssetCatalog.trafficCar06]: "/assets/traffic_car_06.png",
  [AssetCatalog.trafficCar07]: "/assets/traffic_car_07.png",
  [AssetCatalog.trafficCar08]: "/assets/traffic_car_08.png",
  [AssetCatalog.trafficCar09]: "/assets/traffic_car_09.png",

  [AssetCatalog.backgroundSky]: "/assets/bg_sky.png",
  [AssetCatalog.groundGrassArcadePink]: "/assets/road_grass.png",
  [AssetCatalog.backgroundCity]: "/assets/bg_city.png",
  [AssetCatalog.roadAsphalt]: "/assets/road_asphalt.png",
  [AssetCatalog.roadLane]: "/assets/road_lane.png",
  [AssetCatalog.roadShoulder]: "/assets/road_shoulder.png",

  [AssetCatalog.uiLogoMac]: "/assets/ui_logo_mac.png",
  [AssetCatalog.uiStartButton]: "/assets/ui_start_button.svg",

  [AssetCatalog.shellScreenBezel]: "/assets/shell_screen_bezel.png",
  [AssetCatalog.shellScreenBezelVector]: "/assets/shell_screen_bezel.svg",
  [AssetCatalog.shellLogoMac]: "/assets/shell_logo_mac.png",
  [AssetCatalog.shellDPad]: "/assets/shell_dpad.png",
  [AssetCatalog.shellButton]: "/assets/shell_button.png",
  [AssetCatalog.shellButtonPill]: "/assets/shell_button_pill.png",

  [AssetCatalog.backgroundStudio]: null,
  [AssetCatalog.backgroundLights]: null,
  [AssetCatalog.backgroundSkyPink]: null,
  [AssetCatalog.driverPortrait]: null,
  [AssetCatalog.logoMain]: null,
  [AssetCatalog.uiButtonAccel]: null,
  [AssetCatalog.uiButtonBrake]: null,
  [AssetCatalog.uiButtonBoost]: null,
  [AssetCatalog.uiButtonMenu]: null,
  [AssetCatalog.uiJoystickBase]: null,
  [AssetCatalog.uiJoystickKnob]: null,
  [AssetCatalog.uiHUDFrame]: null,
  [AssetCatalog.fxSmoke01]: null,
  [AssetCatalog.fxSpark01]: null,
  [AssetCatalog.fxExplosion01]: null
};

export function preloadKnownAssets(loader: Phaser.Loader.LoaderPlugin): void {
  Object.entries(AssetFileMap).forEach(([key, path]) => {
    if (!path) {
      return;
    }
    if (path.endsWith(".svg")) {
      loader.svg(key, path);
      return;
    }
    loader.image(key, path);
  });
}

export function hasRealAsset(key: string): boolean {
  return Boolean(AssetFileMap[key]);
}
