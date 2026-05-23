// Reexport the native module. On web, it will be resolved to ObjectDetectionModule.web.ts
// and on native platforms to ObjectDetectionModule.ts
export { default } from './ObjectDetectionModule';
export * from './ObjectDetection.types';
