#!/usr/bin/env node
/**
 * Frees the dev server port before starting nodemon.
 * Prevents "Port 5000 is already in use" when an old npm run dev is still running.
 */
const { execSync } = require('child_process');

const port = process.argv[2] || process.env.PORT || 5000;

const freePort = () => {
  if (process.platform === 'win32') {
    try {
      const out = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8' });
      const pids = [...new Set(
        out.split('\n')
          .map((line) => line.trim().split(/\s+/).pop())
          .filter((pid) => pid && /^\d+$/.test(pid))
      )];
      pids.forEach((pid) => {
        try {
          execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' });
        } catch (_) { /* already gone */ }
      });
      if (pids.length) console.log(`ℹ️  Freed port ${port} (stopped ${pids.length} process(es))`);
    } catch (_) {
      // nothing listening
    }
    return;
  }

  try {
    execSync(`fuser -k ${port}/tcp`, { stdio: 'ignore' });
    console.log(`ℹ️  Freed port ${port} (stopped previous server)`);
  } catch (_) {
    // exit 1 = no process on that port
  }
};

freePort();
