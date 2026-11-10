import { Platform, ToastAndroid } from "react-native";

// ToastAndroid no existe en iOS (es un no-op); alli el mensaje se publica
// para que <ToastHost /> (montado en app/_layout.tsx) lo muestre en un Snackbar.
type ToastListener = (message: string) => void;

const listeners = new Set<ToastListener>();

export function subscribeToast(listener: ToastListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function showToast(message: string) {
  if (Platform.OS === "android") {
    ToastAndroid.show(message, ToastAndroid.SHORT);
    return;
  }
  listeners.forEach((listener) => listener(message));
}
