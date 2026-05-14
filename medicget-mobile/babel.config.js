module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
    // IMPORTANTE: el plugin de reanimated DEBE ir al final del array
    // de plugins. En SDK 52 con reanimated 3.16+, `babel-preset-expo`
    // intenta usar `react-native-worklets/plugin`, así que también lo
    // declaramos de forma defensiva por si el preset lo omite.
    plugins: ['react-native-reanimated/plugin'],
  };
};
