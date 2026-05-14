/**
 * convert-logo.cjs — genera PNGs en 3 tamaños a partir de public/logo.svg.
 *
 * Uso (desde el root del repo, vía container Docker para no instalar nada
 * en Windows):
 *
 *   docker run --rm ^
 *     -v "%cd%\medicget-frontend:/work" ^
 *     -w /work ^
 *     node:20 ^
 *     sh -c "npm i --silent --no-save sharp@0.33.5 && node scripts/convert-logo.cjs"
 *
 * Salida (en `public/`):
 *   logo-128.png  (icon)
 *   logo-256.png  (favicon grande / web manifest)
 *   logo-512.png  (PayPhone, app stores, OG image)
 */

const sharp = require('sharp');
const path  = require('path');

const SRC  = path.join(__dirname, '..', 'public', 'logo.svg');
const OUT  = path.join(__dirname, '..', 'public');

const SIZES = [128, 256, 512];

async function main() {
  await Promise.all(
    SIZES.map((size) =>
      sharp(SRC)
        .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toFile(path.join(OUT, `logo-${size}.png`)),
    ),
  );
  console.log(`OK · generated logo-{${SIZES.join(',')}}.png in ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
