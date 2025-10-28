// const { getDefaultConfig, mergeConfig } = require('expo/metro-config');

// const defaultConfig = getDefaultConfig(__dirname);

// console.log(defaultConfig);

// module.exports = mergeConfig(defaultConfig, {
//   resolver: {
//     assetExts: [...defaultConfig.resolver.assetExts, "tflite", "png", "jpg"],
//     sourceExts: [...defaultConfig.resolver.sourceExts, "tflite", "png", "jpg"],
//   },
// });

const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.assetExts.push('tflite');

module.exports = config;