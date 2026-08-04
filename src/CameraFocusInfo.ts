import { NativeModules } from "react-native";

const CameraFocusInfoModule = NativeModules.CameraFocusInfoModule;

export class CameraFocusInfo {
  static getMinFocusDistance(): Promise<number | null> {
    return CameraFocusInfoModule.getMinFocusDistance();
  }
}
