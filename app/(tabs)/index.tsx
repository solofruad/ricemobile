import CamScan from '../cameraScan/CamScan';

import {
  ObjectDetectionConfig,
  useObjectDetectionModels,
  useObjectDetectionProvider,
} from "@infinitered/react-native-mlkit-object-detection";
import { Text } from 'react-native';

// Define your custom models if needed (see "Using a Custom Model" for more details)
const MODELS: ObjectDetectionConfig = {
  furnitureDetector: {
    model: require("../../assets/models/2.tflite"),
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

export default function HomeScreen() {
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

  if(models && ObjectDetectionProvider) return <ObjectDetectionProvider>
    <CamScan/>
  </ObjectDetectionProvider>;

  return <Text>Cargando</Text>
}