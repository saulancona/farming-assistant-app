/**
 * Script to generate PWA icons from SVG sources
 * Run: npm run generate-icons
 *
 * Requires: npm install --save-dev sharp
 */

const fs = require('fs');
const path = require('path');

async function generateIcons() {
  let sharp;
  try {
    sharp = require('sharp');
  } catch {
    console.error('Error: sharp is not installed.');
    console.error('Run: npm install --save-dev sharp');
    console.error('\nAlternatively, you can use an online tool to convert:');
    console.error('1. Open public/icon-192.svg in browser');
    console.error('2. Use https://cloudconvert.com/svg-to-png');
    console.error('3. Save as public/icon-192.png and public/icon-512.png');
    process.exit(1);
  }

  const publicDir = path.join(__dirname, '..', 'public');

  const icons = [
    { svg: 'icon-192.svg', png: 'icon-192.png', size: 192 },
    { svg: 'icon-512.svg', png: 'icon-512.png', size: 512 },
  ];

  for (const icon of icons) {
    const svgPath = path.join(publicDir, icon.svg);
    const pngPath = path.join(publicDir, icon.png);

    if (!fs.existsSync(svgPath)) {
      console.error(`SVG not found: ${svgPath}`);
      continue;
    }

    try {
      await sharp(svgPath)
        .resize(icon.size, icon.size)
        .png()
        .toFile(pngPath);

      console.log(`Generated: ${icon.png} (${icon.size}x${icon.size})`);
    } catch (err) {
      console.error(`Error generating ${icon.png}:`, err.message);
    }
  }

  // Also generate apple-touch-icon.png from the SVG
  const appleSvg = path.join(publicDir, 'apple-touch-icon.svg');
  const applePng = path.join(publicDir, 'apple-touch-icon.png');

  if (fs.existsSync(appleSvg)) {
    try {
      await sharp(appleSvg)
        .resize(180, 180)
        .png()
        .toFile(applePng);

      console.log('Generated: apple-touch-icon.png (180x180)');
    } catch (err) {
      console.error('Error generating apple-touch-icon.png:', err.message);
    }
  }

  console.log('\nIcon generation complete!');
}

generateIcons();
