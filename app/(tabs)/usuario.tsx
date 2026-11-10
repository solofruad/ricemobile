import { SafeAreaProvider } from "react-native-safe-area-context";
import UsuarioModule from "../usuario/UsuarioModule";

export default function Usuario() {
  // Parche local: provee los insets del sistema solo a esta ruta (igual que chatbot),
  // para que el SafeAreaView de UsuarioModule respete la barra de estado en edge-to-edge.
  // Los iconos del sistema los pinta el StatusBar global (auto, claros sobre la franja negra).
  return (
    <SafeAreaProvider>
      <UsuarioModule />
    </SafeAreaProvider>
  );
}
