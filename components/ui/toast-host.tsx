import { useEffect, useState } from "react";
import { Snackbar } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { subscribeToast } from "@/utils/toast";

// Duracion equivalente a ToastAndroid.SHORT (~2 s).
const TOAST_DURATION_MS = 2000;

// Muestra los mensajes de showToast() en iOS. Debe montarse dentro de PaperProvider.
export default function ToastHost() {
  const insets = useSafeAreaInsets();
  const [message, setMessage] = useState("");
  const [visible, setVisible] = useState(false);

  useEffect(
    () =>
      subscribeToast((next) => {
        setMessage(next);
        setVisible(true);
      }),
    [],
  );

  return (
    <Snackbar
      visible={visible}
      onDismiss={() => setVisible(false)}
      duration={TOAST_DURATION_MS}
      wrapperStyle={{ bottom: insets.bottom }}
    >
      {message}
    </Snackbar>
  );
}
