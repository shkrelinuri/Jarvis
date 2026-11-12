# Jarvis AI Assistant

A lightweight streaming chat assistant built with Node.js, Express, plain HTML/CSS/JavaScript, and the Anthropic Claude API. The provider call is contained in the backend, so it is straightforward to swap in another model API later.

## Requirements

- Node.js 20 or newer
- An Anthropic API key

## Setup

Run these commands in the project root (`C:\Users\Admin\Desktop\Jarvis`):

```powershell
npm install
Copy-Item .env.example .env
```

Open the new `.env` file and paste your key after `ANTHROPIC_API_KEY=`:

```text
ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

Never commit or share `.env`; it is excluded by `.gitignore`. The `.env.example` file is safe to keep in version control and contains no key.

## Run

From the project root:

```powershell
npm start
```

Open [http://localhost:3000](http://localhost:3000). For automatic restarts while editing the backend, use `npm run dev`.

## Customize

- Change the assistant's behavior in [backend/systemPrompt.js](./backend/systemPrompt.js).
- Change the Claude model or provider integration in [backend/server.js](./backend/server.js).
- The browser keeps conversation history in memory for the current page session. Reloading the page starts a new conversation.
- Set a different listening port with `PORT=4000` in `.env`, for example.

## Project layout

```text
backend/
  package.json       Express and Anthropic API dependencies
  server.js          API endpoint and static frontend server
  systemPrompt.js    Editable assistant instructions
frontend/
  index.html         Chat page structure
  styles.css         Responsive chat styling
  app.js             Chat history and streaming UI behavior
.env                 Local API key (ignored by git)
.env.example         Safe environment-variable template
package.json         Workspace scripts
```

## Test checklist

1. Run `npm install`, add your key to `.env`, and start with `npm start`.
2. Visit `http://localhost:3000`; confirm the welcome screen and suggestion buttons appear.
3. Send a message and confirm the assistant reply streams into the chat.
4. Ask a follow-up that refers to the first message; confirm the assistant uses the conversation history.
5. Try Enter to send, Shift+Enter for a newline, and a suggestion button.
6. Temporarily clear `ANTHROPIC_API_KEY` in `.env`, restart, and confirm the page reports a helpful missing-key error. Restore the key afterward.
7. Check `git status --short` and confirm `.env` is not listed.

## Next steps

1. Add tool/function calling for actions such as web search or calendar lookups.
2. Save conversations to a database so chats persist across reloads.
3. Add retrieval over your own documents to give the assistant custom knowledge.
