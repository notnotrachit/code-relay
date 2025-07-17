# AI Proxy System Setup Guide

## Quick Start

### 1. Setup Native Server

```bash
cd server
npm install
npm start
```

The server will start on:
- HTTP API: `http://localhost:3000`
- WebSocket: `ws://localhost:3001`

### 2. Install Browser Extension

#### Chrome/Edge:
1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `extension/` folder

#### Firefox:
1. Open `about:debugging`
2. Click "This Firefox"
3. Click "Load Temporary Add-on"
4. Select `extension/manifest.json`

### 3. Test the System

```bash
node test_client.js
```

## Usage

### OpenAI-Compatible API

```bash
curl -X POST http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gemini-pro",
    "messages": [
      {"role": "user", "content": "Hello!"}
    ]
  }'
```

### Supported Models

- `gemini-pro` - Routes to Google Gemini
- `perplexity-online` - Routes to Perplexity AI

### API Endpoints

- `GET /health` - Health check
- `GET /v1/models` - List available models
- `POST /v1/chat/completions` - Chat completions (OpenAI compatible)

## How It Works

1. **Client** sends OpenAI-compatible request to native server
2. **Native Server** forwards request to browser extension via WebSocket
3. **Browser Extension** opens appropriate AI service tab
4. **Content Script** interacts with AI web interface
5. **Response** flows back through the same chain

## Troubleshooting

### Extension Not Connecting
- Check if server is running on port 3001: `curl http://localhost:3000/health`
- Reload the extension in browser
- Check browser console for errors
- Run connection test: Copy `extension/connection-test.js` into extension console
- Verify no firewall blocking localhost connections

### AI Service Not Responding
- Ensure you're logged into Gemini/Perplexity
- Check if the web interface has changed
- Look at content script console logs

### Request Timeouts
- Increase timeout in server.js (default: 30s)
- Check network connectivity
- Verify AI service is accessible

## Development

### Adding New AI Services

1. Add service detection in `content.js`
2. Implement service-specific handlers
3. Update manifest.json permissions
4. Add model mapping in server

### Debugging

- Server logs: Check terminal running `npm start`
- Extension logs: Browser developer tools → Extensions
- Content script logs: Web page developer tools → Console