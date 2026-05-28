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

export class ObjectDetection {
  static initializeDetector(maxResults: number, scoreThreshold: number):Promise<void>{
    return ObjectDetectionModule.initializeDetector(maxResults, scoreThreshold);
  }
  
  static detectObjects(imageUri:string):Promise<Array<ObjectDetectionResult>>{
    return ObjectDetectionModule.detectObjects(imageUri);
  }
}