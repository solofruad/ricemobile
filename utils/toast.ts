import { Alert, Platform, ToastAndroid } from "react-native";

// ToastAndroid no existe en iOS (es un no-op); alli se usa un Alert simple.
export function showToast(message: string) {
  if (Platform.OS === "android") {
    ToastAndroid.show(message, ToastAndroid.SHORT);
  } else {
    Alert.alert(message);
  }
}
