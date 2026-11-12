import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { Readable } from 'node:stream';
import {
  createOllamaChat,
  openWindowsAppTool,
  streamOllamaText,
} from './ollama.js';
import { resolveAllowedApp } from '../actions/windowsApps.js';

test('offers the local model only explicitly approved app names', () => {
  const allowedApps = openWindowsAppTool.function.parameters.properties.app.enum;

  assert.deepEqual(allowedApps, [
    'Task Manager',
    'Notepad',
    'Calculator',
    'File Explorer',
    'Command Prompt',
  ]);
  assert.equal(resolveAllowedApp('Command Prompt')?.name, 'Command Prompt');
  assert.equal(resolveAllowedApp('PowerShell'), null);
});

test('sends chat requests to the configured local Ollama model', async (t) => {
  let requestBody;
  const server = createServer(async (request, response) => {
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    requestBody = JSON.parse(Buffer.concat(chunks).toString());
    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ message: { role: 'assistant', content: 'Hello locally.' } }));
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => server.close());

  const oldBaseUrl = process.env.OLLAMA_BASE_URL;
  const oldModel = process.env.OLLAMA_MODEL;
  process.env.OLLAMA_BASE_URL = `http://127.0.0.1:${server.address().port}`;
  process.env.OLLAMA_MODEL = 'test-model';

  try {
    const result = await createOllamaChat(
      [{ role: 'user', content: 'Hello' }],
      { systemPrompt: 'Be helpful.' },
    );

    assert.equal(result.message.content, 'Hello locally.');
    assert.equal(requestBody.model, 'test-model');
    assert.deepEqual(requestBody.messages, [
      { role: 'system', content: 'Be helpful.' },
      { role: 'user', content: 'Hello' },
    ]);
    assert.equal(requestBody.stream, false);
  } finally {
    if (oldBaseUrl === undefined) delete process.env.OLLAMA_BASE_URL;
    else process.env.OLLAMA_BASE_URL = oldBaseUrl;
    if (oldModel === undefined) delete process.env.OLLAMA_MODEL;
    else process.env.OLLAMA_MODEL = oldModel;
  }
});

test('reads text deltas from an Ollama NDJSON stream', async () => {
  const body = Readable.from([
    Buffer.from('{"message":{"content":"Local "},"done":false}\n'),
    Buffer.from('{"message":{"content":"reply."},"done":true}\n'),
  ]);
  const parts = [];

  await streamOllamaText(body, (text) => parts.push(text));
  assert.deepEqual(parts, ['Local ', 'reply.']);
});
