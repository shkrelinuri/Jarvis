import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createReplyStream, isConnectionError } from './providers/anthropic.js';
import { systemPrompt } from './systemPrompt.js';

const app = express();
const port = Number(process.env.PORT) || 3000;
const frontendDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../frontend',
);

app.use(express.json({ limit: '1mb' }));
app.use(express.static(frontendDirectory));

app.post('/api/chat', async (req, res) => {
  const { messages } = req.body ?? {};

  if (!Array.isArray(messages) || messages.length === 0 || messages.length > 100) {
    return res.status(400).json({
      error: 'Send between 1 and 100 conversation messages.',
    });
  }

  const isValidConversation = messages.every(
    (message) =>
      message &&
      ['user', 'assistant'].includes(message.role) &&
      typeof message.content === 'string' &&
      message.content.trim().length > 0 &&
      message.content.length <= 20_000,
  );

  if (!isValidConversation || messages.at(-1)?.role !== 'user') {
    return res.status(400).json({
      error: 'Messages must have a user or assistant role and end with a user message.',
    });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(503).json({
      error: 'Missing ANTHROPIC_API_KEY. Add your key to the project .env file.',
    });
  }

  try {
    const stream = await createReplyStream(messages, systemPrompt);

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        res.write(`data: ${JSON.stringify({ type: 'delta', text: event.delta.text })}\n\n`);
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error) {
    const status = error.status;
    let message = 'The model request failed. Please try again.';

    if (status === 401) {
      message = 'The Anthropic API key was rejected. Check your .env file.';
    } else if (status === 429) {
      message = 'The API is rate-limiting requests. Please wait a moment and try again.';
    } else if (status >= 500 || isConnectionError(error)) {
      message = 'Could not reach the model service. Check your connection and try again.';
    }

    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({ type: 'error', error: message })}\n\n`);
      res.end();
    } else {
      res.status(status === 429 ? 429 : status === 401 ? 401 : 502).json({ error: message });
    }
  }
});

app.listen(port, () => {
  console.log(`Jarvis is running at http://localhost:${port}`);
});
