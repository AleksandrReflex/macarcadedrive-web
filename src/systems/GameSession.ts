import { DriverProfiles, type DriverProfile } from "../config/AssetConfig";

class SessionState {
  currentDriver: DriverProfile = DriverProfiles.roan;
}

export const GameSession = new SessionState();
