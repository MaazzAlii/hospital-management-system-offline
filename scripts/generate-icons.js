const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function createIco(sizes, inputPath, outputPath) {
  const pngBuffers = [];
  
  for (const size of sizes) {
    const buf = await sharp(inputPath)
      .ensureAlpha()
      .resize(size, size, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .png({ colourMap: false })
      .toBuffer();
    pngBuffers.push({ size, buf });
  }

  // Calculate ICO header & directory
  const count = pngBuffers.length;
  const headerSize = 6;
  const dirEntrySize = 16;
  let currentOffset = headerSize + count * dirEntrySize;

  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0);     // Reserved
  header.writeUInt16LE(1, 2);     // Type 1 = ICO
  header.writeUInt16LE(count, 4); // Number of images

  const entries = [];
  for (const item of pngBuffers) {
    const entry = Buffer.alloc(dirEntrySize);
    entry.writeUInt8(item.size >= 256 ? 0 : item.size, 0); // Width (0 for 256)
    entry.writeUInt8(item.size >= 256 ? 0 : item.size, 1); // Height (0 for 256)
    entry.writeUInt8(0, 2);                                // Color count
    entry.writeUInt8(0, 3);                                // Reserved
    entry.writeUInt16LE(1, 4);                             // Color planes
    entry.writeUInt16LE(32, 6);                            // Bits per pixel
    entry.writeUInt32LE(item.buf.length, 8);               // Image size in bytes
    entry.writeUInt32LE(currentOffset, 12);                // Image offset
    entries.push(entry);
    currentOffset += item.buf.length;
  }

  const allBuffers = [header, ...entries, ...pngBuffers.map(p => p.buf)];
  const finalIcoBuffer = Buffer.concat(allBuffers);
  
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, finalIcoBuffer);
  console.log(`[generate-icons] Successfully created ${outputPath} (${(finalIcoBuffer.length / 1024).toFixed(1)} KB)`);
}

async function main() {
  const logoPath = path.resolve(__dirname, '../public/logo.jpeg');
  if (!fs.existsSync(logoPath)) {
    console.error(`[generate-icons] Error: Logo not found at ${logoPath}`);
    process.exit(1);
  }

  console.log(`[generate-icons] Processing logo from: ${logoPath}`);

  // 1. Generate build/icon.ico for Windows installer & executable
  const buildIcoPath = path.resolve(__dirname, '../build/icon.ico');
  await createIco([16, 32, 48, 64, 128, 256], logoPath, buildIcoPath);

  // 2. Generate high-res 512x512 build/icon.png
  const buildPngPath = path.resolve(__dirname, '../build/icon.png');
  await sharp(logoPath).resize(512, 512, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } }).png().toFile(buildPngPath);
  console.log(`[generate-icons] Created ${buildPngPath}`);

  // 3. Generate public/icon.png & public/logo.png
  const publicPngPath = path.resolve(__dirname, '../public/icon.png');
  await sharp(logoPath).resize(512, 512, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } }).png().toFile(publicPngPath);
  const publicLogoPng = path.resolve(__dirname, '../public/logo.png');
  await sharp(logoPath).png().toFile(publicLogoPng);
  console.log(`[generate-icons] Created ${publicPngPath} and ${publicLogoPng}`);

  // 4. Update src/app/favicon.ico & src/app/icon.png
  const appIcoPath = path.resolve(__dirname, '../src/app/favicon.ico');
  await createIco([16, 32, 48], logoPath, appIcoPath);
  const appIconPng = path.resolve(__dirname, '../src/app/icon.png');
  await sharp(logoPath).resize(512, 512).png().toFile(appIconPng);
  console.log(`[generate-icons] Updated ${appIcoPath} and ${appIconPng}`);

  console.log(`[generate-icons] All app icons generated successfully!`);
}

main().catch(err => {
  console.error('[generate-icons] Fatal error:', err);
  process.exit(1);
});
