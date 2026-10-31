const { execSync } = require('child_process');

try {
  execSync('git add -A', {
    cwd: 'D:/gagaclo-fpp',
    stdio: 'inherit',
  });
  execSync('git commit -m "style: tata letak enterprise bersih dan palet warna netral profesional"', {
    cwd: 'D:/gagaclo-fpp',
    stdio: 'inherit',
  });
  execSync('git push origin main', {
    cwd: 'D:/gagaclo-fpp',
    stdio: 'inherit',
  });
  console.log('Push complete!');
} catch (err) {
  console.error(err);
  process.exit(1);
}
