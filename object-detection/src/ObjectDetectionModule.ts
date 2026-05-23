import { NativeModule, requireNativeModule } from 'expo';

declare class ObjectDetectionModule extends NativeModule<{}> {}

export default requireNativeModule<ObjectDetectionModule>('ObjectDetection');
