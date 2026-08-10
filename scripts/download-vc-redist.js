const fs = require('fs');
const path = require('path');
const https = require('https');

const VC_REDIST_URL = 'https://aka.ms/vs/17/release/vc_redist.x64.exe';
const buildDir = path.join(__dirname, '..', 'build');
const outputFile = path.join(buildDir, 'vc_redist.x64.exe');

if (!fs.existsSync(buildDir)) {
  fs.mkdirSync(buildDir, { recursive: true });
}

if (fs.existsSync(outputFile)) {
  const stats = fs.statSync(outputFile);
  if (stats.size > 1000000) {
    console.log(`[download-vc-redist] ${outputFile} already exists (${(stats.size / 1024 / 1024).toFixed(2)} MB). Skipping download.`);
    process.exit(0);
  }
}

console.log(`[download-vc-redist] Downloading VC++ Redistributable from ${VC_REDIST_URL}...`);

function downloadFile(url, dest, maxRedirects = 5) {
  if (maxRedirects === 0) {
    console.error('[download-vc-redist] Error: Too many redirects.');
    process.exit(1);
  }

  https.get(url, (res) => {
    if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
      console.log(`[download-vc-redist] Redirecting to ${res.headers.location}...`);
      downloadFile(res.headers.location, dest, maxRedirects - 1);
      return;
    }

    if (res.statusCode !== 200) {
      console.error(`[download-vc-redist] Failed to download file. Status code: ${res.statusCode}`);
      process.exit(1);
    }

    const file = fs.createWriteStream(dest);
    res.pipe(file);

    file.on('finish', () => {
      file.close(() => {
        const stats = fs.statSync(dest);
        console.log(`[download-vc-redist] Download completed successfully (${(stats.size / 1024 / 1024).toFixed(2)} MB saved to ${dest}).`);
      });
    });
  }).on('error', (err) => {
    fs.unlink(dest, () => {});
    console.error(`[download-vc-redist] Download error: ${err.message}`);
    process.exit(1);
  });
}

downloadFile(VC_REDIST_URL, outputFile);
