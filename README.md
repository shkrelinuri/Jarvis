# Jarvis AI Assistant

A local desktop assistant built with Node.js, Express, and a simple browser chat UI. Jarvis runs Qwen 3 through Ollama and can open a short list of Windows apps when asked. You can chat by typing or use your browser's voice input. Anthropic is also available as an optional provider.

## Requirements

- Node.js 20 or newer
- Ollama for local model chat (no API key)
- Windows for desktop app launching

## Setup

Run these commands in the project root (`C:\Users\Admin\Desktop\Jarvis`):

```powershell
npm install
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
```

Install Ollama for Windows from [ollama.com/download/windows](https://ollama.com/download/windows), then download the starter model from the project root:

```powershell
ollama pull qwen3:4b
```

The model download is about 2.5 GB. This computer has 16 GB of RAM and integrated Intel graphics, so this 4B model is a reasonable CPU-running starting point; replies may be slower than on a dedicated GPU. Ollama stores model weights in its own model directory, not in this Git project.

No API key is needed for local chat. If you want to use Claude instead, paste your key after `ANTHROPIC_API_KEY=` in `.env`, then set `MODEL_PROVIDER=anthropic`. Never commit or share `.env`; it is excluded by `.gitignore`.

## Run

From the project root:

```powershell
npm start
```

Open [http://localhost:3000](http://localhost:3000). Type “Open Task Manager” or click the microphone and say it. The microphone uses your browser's speech recognition; allow microphone access when prompted. Depending on the browser, speech recognition may use the browser vendor's service to transcribe audio. Current versions of Edge or Chrome are recommended.

Leave the terminal and browser page open while you use Jarvis. It stays ready for another command as long as the Node server is running. Stop it with `Ctrl+C` in the terminal. For automatic backend restarts while editing, use `npm run dev`.

## Customize

- Change the assistant's behavior in [backend/systemPrompt.js](./backend/systemPrompt.js).
- The local model settings are `OLLAMA_MODEL` and `OLLAMA_BASE_URL` in `.env`. The starter model is `qwen3:4b`.
- Switch to Anthropic by setting `MODEL_PROVIDER=anthropic` and adding your key to `.env`.
- Ollama tool calls are limited to the exact app allowlist in [backend/actions/windowsApps.js](./backend/actions/windowsApps.js). The model cannot execute arbitrary shell commands or modify files.
- Review the explicit Windows app allowlist and supported phrasing in [backend/actions/windowsApps.js](./backend/actions/windowsApps.js). Command Prompt is allowed to open, but Jarvis does not execute shell commands; arbitrary command execution is not enabled.
- The browser keeps conversation history in memory for the current page session. Reloading the page starts a new conversation.
- The backend binds to `127.0.0.1` so its app-launch endpoint is not exposed to other devices on your network.
- Set a different listening port with `PORT=4000` in `.env`, for example.

## About the model

Jarvis now runs an actual open-weight language model locally. The downloaded Qwen model is pretrained by its authors; it is not trained from scratch or fine-tuned on your personal data. Jarvis adds your system prompt and a constrained app-opening tool. Training a foundation model from scratch would require a very large dataset and substantial GPU resources.

## Project layout

```text
backend/
  package.json       Express and Anthropic API dependencies
  server.js          API endpoint and static frontend server
  actions/
    windowsApps.js   Safe allowlist for Windows app launching
    windowsApps.test.js  Tests for allowed command matching
  providers/
    ollama.js        Local model API and constrained app tool
    anthropic.js     Optional hosted Claude adapter
  systemPrompt.js    Editable assistant instructions
frontend/
  index.html         Chat page structure
  styles.css         Responsive chat styling
  app.js             Chat history, app commands, and voice UI
.env                 Local API key (ignored by git)
.env.example         Safe environment-variable template
package.json         Workspace scripts
```

## Test checklist

1. Run `npm install` and `npm test` from the project root.
2. Start with `npm start` and visit `http://localhost:3000`.
3. Type “Open Task Manager” and confirm Task Manager launches; try Notepad, Calculator, and File Explorer too.
4. Ask for an unsupported app such as “Open Paint” and confirm it is not launched.
5. In Edge or Chrome, allow microphone access, click the microphone, and say “Open Task Manager.”
6. Ask a general question and confirm the local model replies without an API key.
7. Ask Jarvis to open Command Prompt in a natural phrasing such as “Could you open my command prompt?” and confirm it launches only the approved app.
8. Check `git status --short` and confirm `.env` is not listed.

## Next steps

1. Add more explicitly approved apps and useful actions such as opening specific folders.
2. Fine-tune a small model on your own examples after the local assistant works reliably.
3. Add more individually approved tools such as opening a folder or searching selected documents.
