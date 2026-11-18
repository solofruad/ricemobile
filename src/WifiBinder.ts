import { NativeModules, Platform } from "react-native";

const WifiBinderModule = NativeModules.WifiBinderModule as
	| { bindToWifi: () => Promise<boolean>; unbind: () => Promise<boolean> }
	| undefined;

/**
 * Fuerza el tráfico de la app por el Wi-Fi (solo Android).
 * El hotspot del asistente no tiene internet y Android podría enrutar por datos móviles.
 * En iOS no hace falta: el tráfico a la subred local del Wi-Fi sale por esa interfaz.
 */
export const WifiBinder = {
	async bindToWifi(): Promise<boolean> {
		if (Platform.OS !== "android" || !WifiBinderModule) return false;
		try {
			return await WifiBinderModule.bindToWifi();
		} catch (error) {
			console.warn("No se pudo enlazar la app al Wi-Fi:", error);
			return false;
		}
	},

	async unbind(): Promise<boolean> {
		if (Platform.OS !== "android" || !WifiBinderModule) return false;
		try {
			return await WifiBinderModule.unbind();
		} catch (error) {
			console.warn("No se pudo liberar el enlace al Wi-Fi:", error);
			return false;
		}
	},
};
