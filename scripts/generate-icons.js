/**
 * Gera ícones PNG a partir dos SVGs para compatibilidade com iOS/Safari.
 * Execute: npm run generate-icons
 * Requer: npm install sharp (já incluído em devDependencies)
 */
const fs = require('fs');
const path = require('path');

async function generateIcons() {
  let sharp;
  try {
    sharp = require('sharp');
  } catch {
    console.error('❌ Pacote "sharp" não encontrado. Execute: npm install');
    process.exit(1);
  }

  const iconsDir = path.join(__dirname, '..', 'public', 'icons');

  const sizes = [
    { name: 'icon-192.png', size: 192, source: 'icon-192.svg' },
    { name: 'icon-512.png', size: 512, source: 'icon-512.svg' },
    { name: 'apple-touch-icon.png', size: 180, source: 'icon-192.svg' },
  ];

  for (const { name, size, source } of sizes) {
    const inputPath = path.join(iconsDir, source);
    const outputPath = path.join(iconsDir, name);

    if (!fs.existsSync(inputPath)) {
      console.warn(`⚠️  SVG não encontrado: ${inputPath}`);
      continue;
    }

    try {
      await sharp(inputPath)
        .resize(size, size)
        .png()
        .toFile(outputPath);
      console.log(`✅ Gerado: ${name} (${size}x${size})`);
    } catch (err) {
      console.error(`❌ Erro ao gerar ${name}:`, err.message);
    }
  }

  console.log('\n🎉 Ícones gerados com sucesso!');
}

generateIcons();
