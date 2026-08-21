import fs from 'fs';
import path from 'path';

/**
 * Safely loads the clinic logo from local disk and encodes it as a base64 data URI.
 * This completely avoids unreliable self-referencing HTTP requests within Node/Next.js.
 */
export function getLogoBase64(): string | undefined {
  try {
    const cwd = process.cwd();
    const candidatePaths = [
      path.join(/*turbopackIgnore: true*/ cwd, 'public', 'logo.jpeg'),
      path.join(/*turbopackIgnore: true*/ cwd, 'public', 'logo.jpg'),
      path.join(/*turbopackIgnore: true*/ cwd, 'public', 'logo.png'),
      path.join(/*turbopackIgnore: true*/ cwd, '.next', 'standalone', 'public', 'logo.jpeg'),
    ];

    if (process.env.HMS_LOG_DIR) {
      candidatePaths.push(path.join(process.env.HMS_LOG_DIR, 'public', 'logo.jpeg'));
    }

    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        const fileData = fs.readFileSync(p);
        const ext = path.extname(p).toLowerCase().replace('.', '');
        const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';
        return `data:${mimeType};base64,${fileData.toString('base64')}`;
      }
    }
  } catch (err) {
    console.warn('[PDF Util] Warning reading logo file from disk:', err);
  }
  return undefined;
}

/**
 * Logs PDF generation errors with full stack trace to console and server-error.log.
 */
export function logPdfError(context: string, error: any): void {
  const timestamp = new Date().toISOString();
  const errorMessage = error instanceof Error ? `${error.name}: ${error.message}\n${error.stack || ''}` : String(error);
  const formattedLog = `\n[${timestamp}] [PDF Generation Error - ${context}]\n${errorMessage}\n`;

  console.error(formattedLog);

  const logLocations = [
    process.env.HMS_LOG_DIR ? path.join(process.env.HMS_LOG_DIR, 'server-error.log') : null,
    process.env.APPDATA ? path.join(process.env.APPDATA, 'hms', 'server-error.log') : null,
    path.join(process.cwd(), 'server-error.log'),
  ].filter(Boolean) as string[];

  for (const logPath of logLocations) {
    try {
      const dir = path.dirname(logPath);
      if (fs.existsSync(dir)) {
        fs.appendFileSync(logPath, formattedLog, 'utf8');
      }
    } catch (e) {
      // Ignore file append errors
    }
  }
}
