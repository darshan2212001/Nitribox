const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('path');
const fs = require('fs');

// Get default Expo config
const config = getDefaultConfig(__dirname);

// Add support for CSS files
config.resolver.sourceExts.push('css');

// Configure for monorepo - prioritize local node_modules first
config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, 'node_modules'),
  path.resolve(__dirname, '..', 'node_modules'),
];

// Ensure project root is correctly set
config.projectRoot = __dirname;

// Monorepo: watch repo root + parent node_modules
config.watchFolders = [
  path.resolve(__dirname, '..'),
  __dirname,
  path.resolve(__dirname, '..', 'node_modules'),
];

// Add transformer configuration for better error handling
config.transformer = {
  ...config.transformer,
  getTransformOptions: async () => ({
    transform: {
      experimentalImportSupport: false,
      inlineRequires: true,
    },
  }),
  // Enable source maps for better error reporting
  enableBabelRCLookup: false,
  enableBabelRuntime: false,
};

// Add resolver configuration for better module resolution
config.resolver = {
  ...config.resolver,
  unstable_enablePackageExports: true,
  // Ensure proper asset extensions
  assetExts: config.resolver.assetExts.filter(ext => ext !== 'css'),
};

// Verify global.css exists before applying NativeWind
const globalCssPath = path.resolve(__dirname, 'global.css');
let finalConfig = config;

try {
  if (fs.existsSync(globalCssPath)) {
    // Apply NativeWind configuration
    finalConfig = withNativeWind(config, { input: './global.css' });
  } else {
    console.warn('Warning: global.css not found. NativeWind may not work correctly.');
  }
} catch (error) {
  console.error('Error configuring NativeWind:', error);
  // Fallback to default config if NativeWind fails
  finalConfig = config;
}

module.exports = finalConfig;
