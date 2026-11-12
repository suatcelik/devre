// Sunucu fonksiyonları için paylaşılan oyun modülünü paketler (DEVRE_TASKS 5.4).
// src/online/verify.ts → supabase/functions/_shared/verify.js (Deno'nun çalıştırdığı tek dosya, ES modülü)
// Çalıştır: npm run build:functions   (oyun kuralları her değiştiğinde, dağıtımdan önce)

import { build } from 'esbuild';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

await build({
  entryPoints: [path.join(root, 'src/online/verify.ts')],
  outfile: path.join(root, 'supabase/functions/_shared/verify.js'),
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  target: 'es2022',
  banner: { js: '// OTOMATİK ÜRETİLDİ: scripts/build-functions.mjs. Elle düzenlemeyin; src/game ve src/online/verify.ts kaynaktır.' },
  logLevel: 'info',
});
