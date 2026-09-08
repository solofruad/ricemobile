//
// Bridge ObjC <-> Swift para los modulos nativos custom de RiceNative.
// Las implementaciones reales viven en Sources/*.swift; este archivo solo las
// registra ante el bridge de React Native (patron documentado en RCTBridgeModule.h:
// "@interface RCT_EXTERN_MODULE(MyModule, NSObject) RCT_EXTERN_METHOD(...) @end").
//
// Reglas importantes:
//  - Los metodos que devuelven Promise DEBEN terminar en resolver + rejecter
//    (en ese orden); si falta el rejecter, RN no detecta la promesa y el JS
//    quedaria colgado.
//  - Los tipos declarados aqui deben coincidir con el type-encoding real del
//    metodo Swift: Int <-> NSInteger, Float <-> float.
//  - TtsVoicesModule.init es un nombre reservado en ObjC/Swift (familia init),
//    por eso el metodo Swift se llama initTts y se remapea al nombre JS "init"
//    con _RCT_EXTERN_REMAP_METHOD (mismo nombre JS que en Android).
//
#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(ObjectDetectionModule, NSObject)

RCT_EXTERN_METHOD(initializeDetector:(NSInteger)maxResults
                  scoreThreshold:(float)scoreThreshold
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(detectObjects:(NSString *)imageUri
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end

@interface RCT_EXTERN_MODULE(TtsVoicesModule, NSObject)

// JS: TtsVoicesModule.init(tag) -> Swift: initTts(tag, resolver, rejecter)
_RCT_EXTERN_REMAP_METHOD(init,
                         initTts:(NSString *)expectedLanguageTag
                         resolver:(RCTPromiseResolveBlock)resolve
                         rejecter:(RCTPromiseRejectBlock)reject,
                         NO)

RCT_EXTERN_METHOD(speak:(NSString *)text
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(stop)

RCT_EXTERN_METHOD(openVoicesInstaller)

@end

@interface RCT_EXTERN_MODULE(CameraFocusInfoModule, NSObject)

RCT_EXTERN_METHOD(getMinFocusDistance:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end
