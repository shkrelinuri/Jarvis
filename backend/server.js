import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  launchWindowsApp,
  resolveAllowedApp,
  resolveAppCommand,
} from './actions/windowsApps.js';
import { createReplyStream, isConnectionError } from './providers/anthropic.js';
import {
  createOllamaChat,
  OllamaError,
  openWindowsAppTool,
  streamOllamaText,
} from './providers/ollama.js';
import { systemPrompt } from './systemPrompt.js';

const app = express();
const port = Number(process.env.PORT) || 3000;
const host = '127.0.0.1';
const frontendDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../frontend',
);

app.use(express.json({ limit: '1mb' }));
app.use(express.static(frontendDirectory));

app.post('/api/action', async (req, res) => {
  const { command } = req.body ?? {};
  if (typeof command !== 'string' || command.length > 300) {
    return res.status(400).json({ error: 'Send a command of up to 300 characters.' });
  }

  const appCommand = resolveAppCommand(command);
  if (!appCommand) return res.json({ handled: false });

  try {
    await launchWindowsApp(appCommand);
    return res.json({ handled: true, message: `Opened ${appCommand.name}.` });
  } catch (error) {
    console.error(`Could not open ${appCommand.name}:`, error);
    return res.status(500).json({
      error: error.message || `Could not open ${appCommand.name}.`,
    });
  }
});

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

  const provider = process.env.MODEL_PROVIDER || 'ollama';
  if (!['ollama', 'anthropic'].includes(provider)) {
    return res.status(500).json({ error: 'MODEL_PROVIDER must be "ollama" or "anthropic".' });
  }
  if (provider === 'anthropic' && !process.env.ANTHROPIC_API_KEY) {
    return res.status(503).json({
      error: 'Missing ANTHROPIC_API_KEY. Add your key to the project .env file.',
    });
  }

  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  try {
    if (provider === 'ollama') {
      const completion = await createOllamaChat(messages, {
        systemPrompt,
        tools: [openWindowsAppTool],
      });
      const assistantMessage = completion.message;
      const toolCall = assistantMessage?.tool_calls?.[0];

      if (toolCall) {
        const toolName = toolCall.function?.name;
        const toolArguments = toolCall.function?.arguments;
        let toolResult = 'That app is not on the approved list.';

        if (toolName === 'open_windows_app') {
          const app = resolveAllowedApp(toolArguments?.app);
          if (app) {
            try {
              await launchWindowsApp(app);
              toolResult = `Opened ${app.name}.`;
            } catch (error) {
              console.error(`Could not open ${app.name}:`, error);
              toolResult = `Could not open ${app.name}: ${error.message}`;
            }
          }
        }

        const toolMessages = [
          ...messages,
          { ...assistantMessage, tool_calls: [toolCall] },
          { role: 'tool', tool_name: toolName, content: toolResult },
        ];
        const finalStream = await createOllamaChat(toolMessages, { systemPrompt, stream: true });
        await streamOllamaText(finalStream, (text) => {
          res.write(`data: ${JSON.stringify({ type: 'delta', text })}\n\n`);
        });
      } else if (assistantMessage?.content) {
        res.write(`data: ${JSON.stringify({ type: 'delta', text: assistantMessage.content })}\n\n`);
      }
    } else {
      const stream = await createReplyStream(messages, systemPrompt);
      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          res.write(`data: ${JSON.stringify({ type: 'delta', text: event.delta.text })}\n\n`);
        }
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error) {
    const status = error.status;
    let message = error instanceof OllamaError
      ? error.message
      : 'The model request failed. Please try again.';

    if (!(error instanceof OllamaError)) {
      if (status === 401) {
        message = 'The Anthropic API key was rejected. Check your .env file.';
      } else if (status === 429) {
        message = 'The API is rate-limiting requests. Please wait a moment and try again.';
      } else if (status >= 500 || isConnectionError(error)) {
        message = 'Could not reach the model service. Check your connection and try again.';
      }
    }

    console.error('Chat request failed:', error);
    res.write(`data: ${JSON.stringify({ type: 'error', error: message })}\n\n`);
    res.end();
  }
});

app.listen(port, host, () => {
  console.log(`Jarvis is running at http://${host}:${port}`);
});
