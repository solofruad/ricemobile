#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(ObjectDetectionModule, NSObject)

RCT_EXTERN_METHOD(initializeDetector:(NSNumber *)maxResults
                  scoreThreshold:(NSNumber *)scoreThreshold
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(detectObjects:(NSString *)imageUri
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

@end
