import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

// import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  ObjectDetectionConfig,
  RNMLKitCustomObjectDetectorOptions,
  useObjectDetectionModels,
  useObjectDetectionProvider,
  useObjectDetection,
  RNMLKitObjectDetectionObject,
} from "@infinitered/react-native-mlkit-object-detection";


// Define your custom models if needed (see "Using a Custom Model" for more details)
const MODELS: ObjectDetectionConfig = {
  furnitureDetector: {
    model: require("../assets/models/2.tflite"),
    options:{
      shouldEnableClassification:true,
      shouldEnableMultipleObjects:true,
      detectorMode:"singleImage",
      maxPerObjectLabelCount:5,
      classificationConfidenceThreshold:0.2
    }
  },
};

// Export this type so we can use it with our hooks later
export type MyModelsConfig = typeof MODELS;

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  // const colorScheme = useColorScheme();

  const models = useObjectDetectionModels<MyModelsConfig>({
    assets: MODELS,
    loadDefaultModel: true, // whether to load the default model
    defaultModelOptions: {
      shouldEnableMultipleObjects: true,
      shouldEnableClassification: true,
      detectorMode: "singleImage",
    },
  });
  const { ObjectDetectionProvider } = useObjectDetectionProvider(models);

  return (
    <ObjectDetectionProvider>
      <ThemeProvider value={DarkTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </ObjectDetectionProvider>
  );
}
