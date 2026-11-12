export const openWindowsAppTool = {
  type: 'function',
  function: {
    name: 'open_windows_app',
    description: 'Open one approved Windows desktop application. Do not use for shell commands.',
    parameters: {
      type: 'object',
      properties: {
        app: {
          type: 'string',
          enum: ['Task Manager', 'Notepad', 'Calculator', 'File Explorer', 'Command Prompt'],
          description: 'The exact name of the approved application to open.',
        },
      },
      required: ['app'],
    },
  },
};

export class OllamaError extends Error {
  constructor(message, status = 503) {
    super(message);
    this.name = 'OllamaError';
    this.status = status;
  }
}

export async function createOllamaChat(messages, { systemPrompt, tools, stream = false } = {}) {
  const baseUrl = (process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434').replace(/\/+$/, '');
  const model = process.env.OLLAMA_MODEL || 'qwen3:4b';
  let response;

  try {
    response = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [{ role: 'system', content: systemPrompt }, ...messages],
        ...(tools ? { tools } : {}),
        stream,
        think: false,
      }),
    });
  } catch {
    throw new OllamaError(
      'Cannot connect to Ollama. Install and start Ollama, then run: ollama pull qwen3:4b',
    );
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const detail = typeof body.error === 'string' ? body.error : '';
    const isMissingModel = response.status === 404 || /model.*not found/i.test(detail);
    throw new OllamaError(
      isMissingModel
        ? `The local model "${model}" is not installed. Run: ollama pull ${model}`
        : `Ollama request failed${detail ? `: ${detail}` : ` (${response.status})`}`,
      isMissingModel ? 503 : 502,
    );
  }

  return stream ? response.body : response.json();
}

export async function streamOllamaText(body, onText) {
  const decoder = new TextDecoder();
  let pending = '';

  for await (const chunk of body) {
    pending += decoder.decode(chunk, { stream: true });
    const lines = pending.split('\n');
    pending = lines.pop() ?? '';

    for (const line of lines) {
      if (!line.trim()) continue;
      const event = JSON.parse(line);
      if (event.error) throw new OllamaError(event.error, 502);
      if (event.message?.content) onText(event.message.content);
    }
  }

  pending += decoder.decode();
  if (pending.trim()) {
    const event = JSON.parse(pending);
    if (event.error) throw new OllamaError(event.error, 502);
    if (event.message?.content) onText(event.message.content);
  }
}
