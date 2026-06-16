// Shim babel plugin: no-op, worklets transform is handled by react-native-reanimated/plugin
module.exports = function () {
  return { visitor: {} };
};
