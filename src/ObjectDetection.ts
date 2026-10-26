import { NativeModules } from "react-native";

const ObjectDetectionModule = NativeModules.ObjectDetectionModule;

export type ObjectDetectionResult = {
  frame:{
    origin:{x:number, y:number},
    size:{x:number, y:number}
  },
  labels: Array<{
    text: string,
    confidence: number
  }>
}

// Preset de detección: con qué stack nativo se hace la inferencia.
// - "mediapipe-legacy": MediaPipe + NMS embebido + model.tflite (comportamiento actual, para testear que siga funcionando).
// - "litert": LiteRT directo + NMS manual + rice2.tflite (YOLO [1,8,8400]).
// El nativo también acepta alias ("mediapipe"/"legacy", "litert-rice2"/"rice2"); null/omitido => default nativo (LITERT).
export type ObjectDetectionPreset = "mediapipe-legacy" | "litert";

export class ObjectDetection {
  static initializeDetector(
    maxResults: number,
    scoreThreshold: number,
    preset?: ObjectDetectionPreset | null,
    modelPath?: string | null,
  ):Promise<void>{
    return ObjectDetectionModule.initializeDetector(
      maxResults,
      scoreThreshold,
      preset ?? null,
      modelPath ?? null,
    );
  }

  static closeDetector():Promise<void>{
    return ObjectDetectionModule.closeDetector();
  }
  
  static detectObjects(imageUri:string):Promise<Array<ObjectDetectionResult>>{
    return ObjectDetectionModule.detectObjects(imageUri);
  }
}
