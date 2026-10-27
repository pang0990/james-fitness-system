const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");
const config = getDefaultConfig(__dirname);

// PoC consumes real shared Training Core/Outbox TypeScript; no forked model.
const sharedRoot = path.resolve(__dirname, "../app-source");
config.watchFolders = [...(config.watchFolders || []), sharedRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, "node_modules"),
  path.resolve(sharedRoot, "node_modules"),
];
module.exports = config;
