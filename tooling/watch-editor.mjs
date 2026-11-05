import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import {prepareProject} from './prepare-project.mjs';

export function buildEditor(root, { signal }) {
  prepareProject(root);
  const entry=fs.existsSync(path.join(root,'scripts/build-editor.mjs'))?'scripts/build-editor.mjs':'kit/tooling/build-editor.mjs';
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [entry], {
      cwd: root,
      stdio: 'inherit',
      signal,
    });
    child.once('error', reject);
    child.once('close', (code, exitSignal) => {
      if (code === 0) resolve();
      else reject(new Error(`Editor build exited with ${exitSignal ?? code}.`));
    });
  });
}

/** Watch sources only; serialize complete JS/CSS/assets builds and recover after errors. */
export function watchEditor({
  root,
  build = (options) => buildEditor(root, options),
  debounceMs = 150,
  pollMs = 500,
  log = console.log,
  reportError = console.error,
}) {
  let closed = false;
  let pending = false;
  let running;
  let timer;
  const controller = new AbortController();
  const sourceDirectories = ['src', 'app', 'public', 'tools', 'scripts', 'config'];
  const configFiles = ['tsconfig.json', 'package.json', 'kit.config.json', 'package-lock.json', '../theme.json', '../render.config.json', 'config/breakpoints.json', 'node_modules/soinproduction-gutenberg/package.json'];

  // Generated kit/ is an output: watching it would rebuild forever after preparation.
  // Poll source metadata: this also works when Next or other projects exhaust OS watchers.
  const snapshot = () => {
    const files = new Map();
    const record = (file) => {
      try {
        const stat = fs.statSync(file, { bigint: true });
        files.set(file, `${stat.mtimeNs}:${stat.ctimeNs}:${stat.size}:${stat.ino}`);
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
      }
    };
    const walk = (directory) => {
      let entries;
      try {
        entries = fs.readdirSync(directory, { withFileTypes: true });
      } catch (error) {
        if (error.code === 'ENOENT') return;
        throw error;
      }
      for (const entry of entries) {
        if (entry.name.startsWith('.') || /(?:~|\.tmp|\.sw[op])$/.test(entry.name)) continue;
        const file = path.join(directory, entry.name);
        if (entry.isDirectory()) walk(file);
        else if (entry.isFile()) record(file);
      }
    };
    for (const directory of sourceDirectories) walk(path.join(root, directory));
    for (const file of configFiles) record(path.resolve(root, file));
    return files;
  };
  let previous = snapshot();

  const rebuild = () => {
    if (closed || running) return running;
    pending = false;
    running = Promise.resolve()
      .then(() => build({ signal: controller.signal }))
      .then(() => {
        if (!closed) log('[editor] Ready. Refresh WordPress to load the changes.');
      })
      .catch((error) => {
        if (!closed) reportError('[editor] Build failed; watching for a fix.', error.message);
      })
      .finally(() => {
        running = undefined;
        if (pending && !closed) schedule();
      });
    return running;
  };
  const schedule = () => {
    if (closed) return;
    pending = true;
    clearTimeout(timer);
    timer = setTimeout(rebuild, debounceMs);
  };
  const interval = setInterval(() => {
    try {
      const current = snapshot();
      if (
        current.size !== previous.size ||
        [...current].some(([file, stamp]) => previous.get(file) !== stamp)
      )
        schedule();
      previous = current;
    } catch (error) {
      reportError('[editor] Watch error:', error.message);
    }
  }, pollMs);

  log('[editor] Building and watching components, styles and assets…');
  const ready = rebuild();
  return {
    ready,
    async close() {
      closed = true;
      clearTimeout(timer);
      clearInterval(interval);
      controller.abort();
      await running;
    },
  };
}
