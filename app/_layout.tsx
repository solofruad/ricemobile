import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import LoadingScreen from '@/components/loading-screen';
import { useAppInitialization } from '@/hooks/use-app-initialization';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const { loadPhase, ready } = useAppInitialization();

  if (!ready) {
    return (
      <>
        <LoadingScreen message={loadPhase} />
        <StatusBar style="auto" />
      </>
    );
  }

  return (
    <ThemeProvider value={DarkTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
