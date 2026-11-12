const conversation = document.querySelector('#conversation');
const welcome = document.querySelector('#welcome');
const form = document.querySelector('#chat-form');
const input = document.querySelector('#message-input');
const sendButton = document.querySelector('#send-button');

// Keep the full conversation in memory so each request includes prior turns.
const messages = [];
let isSending = false;

function addMessage(role, content, extraClass = '') {
  const message = document.createElement('div');
  message.className = `message ${role}${extraClass ? ` ${extraClass}` : ''}`;
  message.textContent = content;
  conversation.append(message);
  conversation.scrollTop = conversation.scrollHeight;
  return message;
}

function setLoading(loading) {
  isSending = loading;
  sendButton.disabled = loading;
  sendButton.querySelector('span:first-child').textContent = loading ? 'Thinking' : 'Send';
  input.disabled = loading;
}

async function sendMessage(text) {
  if (isSending || !text.trim()) return;

  welcome.hidden = true;
  messages.push({ role: 'user', content: text });
  addMessage('user', text);
  input.value = '';
  input.style.height = 'auto';
  setLoading(true);

  const assistantBubble = addMessage('assistant', '');
  let assistantText = '';
  let pending = '';

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.error || `Request failed (${response.status}).`);
    }
    if (!response.body) throw new Error('Streaming is not supported by this browser.');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      pending += decoder.decode(value, { stream: !done });

      const events = pending.split('\n\n');
      pending = events.pop() ?? '';

      for (const rawEvent of events) {
        const data = rawEvent
          .split('\n')
          .find((line) => line.startsWith('data: '))
          ?.slice(6);
        if (!data) continue;

        if (data === '[DONE]') {
          continue;
        }

        const event = JSON.parse(data);
        if (event.type === 'error') throw new Error(event.error);
        if (event.type === 'delta') {
          assistantText += event.text;
          assistantBubble.textContent = assistantText;
          conversation.scrollTop = conversation.scrollHeight;
        }
      }

      if (done) break;
    }

    if (!assistantText) assistantBubble.remove();
    if (assistantText) messages.push({ role: 'assistant', content: assistantText });
  } catch (error) {
    assistantBubble.remove();
    // Remove the failed turn so a retry doesn't include an unanswered user message.
    messages.pop();
    addMessage('assistant', error.message || 'Something went wrong. Please try again.', 'error');
  } finally {
    setLoading(false);
    input.focus();
  }
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const text = input.value.trim();
  if (text) sendMessage(text);
});

input.addEventListener('input', () => {
  input.style.height = 'auto';
  input.style.height = `${Math.min(input.scrollHeight, 160)}px`;
});

input.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    form.requestSubmit();
  }
});

document.querySelectorAll('.suggestion').forEach((button) => {
  button.addEventListener('click', () => sendMessage(button.dataset.prompt));
});
