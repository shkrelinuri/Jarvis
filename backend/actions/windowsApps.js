import { spawn } from 'node:child_process';
import path from 'node:path';

const windowsDirectory = process.env.WINDIR || 'C:\\Windows';
const allowedApps = {
  'task manager': {
    name: 'Task Manager',
    executable: path.join(windowsDirectory, 'System32', 'Taskmgr.exe'),
  },
  taskmgr: {
    name: 'Task Manager',
    executable: path.join(windowsDirectory, 'System32', 'Taskmgr.exe'),
  },
  notepad: {
    name: 'Notepad',
    executable: path.join(windowsDirectory, 'System32', 'notepad.exe'),
  },
  calculator: {
    name: 'Calculator',
    executable: path.join(windowsDirectory, 'System32', 'calc.exe'),
  },
  calc: {
    name: 'Calculator',
    executable: path.join(windowsDirectory, 'System32', 'calc.exe'),
  },
  'file explorer': {
    name: 'File Explorer',
    executable: path.join(windowsDirectory, 'explorer.exe'),
  },
  explorer: {
    name: 'File Explorer',
    executable: path.join(windowsDirectory, 'explorer.exe'),
  },
  'command prompt': {
    name: 'Command Prompt',
    executable: path.join(windowsDirectory, 'System32', 'cmd.exe'),
  },
  cmd: {
    name: 'Command Prompt',
    executable: path.join(windowsDirectory, 'System32', 'cmd.exe'),
  },
  'cmd.exe': {
    name: 'Command Prompt',
    executable: path.join(windowsDirectory, 'System32', 'cmd.exe'),
  },
};

export function resolveAppCommand(text) {
  if (typeof text !== 'string' || text.length > 300) return null;

  const command = text.trim().toLowerCase().replace(/[.!?]+$/, '').replace(/\s+/g, ' ');
  const match = command.match(
    /^(?:hey jarvis,? )?(?:please )?(?:(?:can|could|would) you )?(?:please )?(?:(?:i want to|i need you to) )?(?:open(?: up)?|launch|start) (?:the )?(.+?)(?: please)?$/,
  );
  if (!match) return null;

  const app = allowedApps[match[1]];
  return app ? { ...app } : null;
}

export function resolveAllowedApp(name) {
  if (typeof name !== 'string') return null;
  const app = allowedApps[name.trim().toLowerCase()];
  return app ? { ...app } : null;
}

export function launchWindowsApp(app) {
  if (process.platform !== 'win32') {
    return Promise.reject(new Error('Opening desktop apps is currently supported on Windows only.'));
  }

  return new Promise((resolve, reject) => {
    const child = spawn(app.executable, [], {
      detached: true,
      stdio: 'ignore',
      windowsHide: false,
    });

    child.once('error', reject);
    child.once('spawn', () => {
      child.unref();
      resolve();
    });
  });
}
