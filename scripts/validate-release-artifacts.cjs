const { execFileSync } = require('node:child_process');

const trackedFiles = execFileSync('git', ['ls-files'], { encoding: 'utf8' })
  .split(/\r?\n/)
  .filter(Boolean);

const apkFiles = trackedFiles.filter((file) => /\.apk$/i.test(file));
if (apkFiles.length > 0) {
  console.error(`APK files must be published as GitHub Release assets, not committed: ${apkFiles.join(', ')}`);
  process.exit(1);
}

const googleKeyPattern = /AIza[0-9A-Za-z_-]{35}/g;
const suspiciousFiles = [];

for (const file of trackedFiles) {
  if (/^(node_modules|dist|\.expo|\.git)\//.test(file)) continue;
  try {
    const content = require('node:fs').readFileSync(file, 'utf8');
    if (googleKeyPattern.test(content)) suspiciousFiles.push(file);
    googleKeyPattern.lastIndex = 0;
  } catch {
    // Ignore binary or unreadable files; release secrets are checked by CI tooling.
  }
}

if (suspiciousFiles.length > 0) {
  console.error(`Google Maps API key detected in tracked files: ${suspiciousFiles.join(', ')}`);
  process.exit(1);
}

console.log('Release artifact policy passed: no tracked APK or Google Maps API key.');
