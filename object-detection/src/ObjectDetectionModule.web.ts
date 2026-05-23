import { registerWebModule, NativeModule } from 'expo';

// ObjectDetectionModule is not available on the web platform.
class ObjectDetectionModule extends NativeModule<{}> {}

export default registerWebModule(ObjectDetectionModule, 'ObjectDetectionModule');
