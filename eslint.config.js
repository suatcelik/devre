// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    // Deno'da çalışan sunucu fonksiyonları ve üretilen paket ayrı ortamda denetlenir.
    ignores: ['dist/*', 'supabase/functions/**'],
  },
]);
