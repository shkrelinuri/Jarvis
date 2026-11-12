import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveAppCommand } from './windowsApps.js';

test('resolves common natural-language open commands to approved apps', () => {
  assert.equal(resolveAppCommand('Open Task Manager')?.name, 'Task Manager');
  assert.equal(resolveAppCommand('Could you open up the task manager please?')?.name, 'Task Manager');
  assert.equal(resolveAppCommand('Hey Jarvis, launch Notepad.')?.name, 'Notepad');
  assert.equal(resolveAppCommand('Please start Calculator')?.name, 'Calculator');
  assert.equal(resolveAppCommand('Open File Explorer')?.name, 'File Explorer');
  assert.equal(resolveAppCommand('Open Command Prompt')?.name, 'Command Prompt');
  assert.equal(resolveAppCommand('Launch cmd.exe')?.name, 'Command Prompt');
});

test('does not resolve questions or apps outside the allowlist', () => {
  assert.equal(resolveAppCommand('How do I open Task Manager?'), null);
  assert.equal(resolveAppCommand('How do I use Command Prompt?'), null);
  assert.equal(resolveAppCommand('Open https://example.com'), null);
  assert.equal(resolveAppCommand(''), null);
  assert.equal(resolveAppCommand('x'.repeat(301)), null);
  assert.equal(resolveAppCommand(null), null);
});
