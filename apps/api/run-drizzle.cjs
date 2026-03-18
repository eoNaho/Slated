const { spawn } = require('child_process');
const p = spawn('bun', ['x', 'drizzle-kit', 'generate'], { cwd: process.cwd() });

p.stdout.on('data', d => {
  const output = d.toString();
  console.log(output);
  if (output.includes('?')) {
    setTimeout(() => {
        p.stdin.write('\n');
    }, 500);
  }
});

p.stderr.on('data', d => {
  console.error(d.toString());
});

p.on('close', code => {
  console.log(`Exited with code ${code}`);
  process.exit(code);
});
