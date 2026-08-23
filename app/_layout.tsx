import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { PaperProvider } from 'react-native-paper';
import LoadingScreen from '@/components/loading-screen';
import { useAppInitialization } from '@/hooks/use-app-initialization';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const { loadPhase, error, ready } = useAppInitialization();

  if (!ready) {
    return (
      <>
        <LoadingScreen message={loadPhase} error={error} />
        <StatusBar style="auto" />
      </>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PaperProvider>
        <ThemeProvider value={DarkTheme}>
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          </Stack>
          <StatusBar style="auto" />
        </ThemeProvider>
      </PaperProvider>
    </GestureHandlerRootView>
  );
}
