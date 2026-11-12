import Anthropic from '@anthropic-ai/sdk';

export async function createReplyStream(messages, systemPrompt) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  return client.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 2048,
    system: systemPrompt,
    messages,
    stream: true,
  });
}

export function isConnectionError(error) {
  return error instanceof Anthropic.APIConnectionError;
}
