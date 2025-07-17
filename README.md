# AI Proxy System

A prototype system that exposes OpenAI-compatible endpoints and routes requests through browser extensions to web-based AI services (Gemini, Perplexity).

## Architecture

1. **Native Server** - Exposes OpenAI-compatible API endpoints
2. **Browser Extension** - Intercepts requests and communicates with web AI services
3. **Communication Bridge** - WebSocket/HTTP communication between server and extension

## Components

- `/server/` - Native server implementation
- `/extension/` - Browser extension files
- `/shared/` - Shared utilities and types

## Setup

1. Start the native server: `cd server && npm start`
2. Load the browser extension in Chrome/Firefox
3. Make requests to `http://localhost:3000/v1/chat/completions`