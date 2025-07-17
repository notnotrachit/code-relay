const express = require('express');
const cors = require('cors');
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 3000;
const WS_PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Store pending requests
const pendingRequests = new Map();

// WebSocket server for extension communication
const wss = new WebSocket.Server({ port: WS_PORT });
let extensionSocket = null;

wss.on('connection', (ws) => {
    console.log('Extension connected');
    extensionSocket = ws;
    
    // Send welcome message
    ws.send(JSON.stringify({ type: 'welcome', message: 'Connected to AI Proxy Server' }));
    
    ws.on('message', (data) => {
        try {
            const message = JSON.parse(data);
            
            // Handle heartbeat
            if (message.type === 'ping') {
                ws.send(JSON.stringify({ type: 'pong' }));
                return;
            }
            
            handleExtensionMessage(message);
        } catch (error) {
            console.error('Error parsing extension message:', error);
        }
    });
    
    ws.on('close', (code, reason) => {
        console.log(`Extension disconnected: code=${code}, reason=${reason}`);
        extensionSocket = null;
    });
    
    ws.on('error', (error) => {
        console.error('WebSocket server error:', {
            message: error.message,
            code: error.code,
            timestamp: new Date().toISOString()
        });
    });
    
    // Keep connection alive
    const heartbeat = setInterval(() => {
        if (ws.readyState === ws.OPEN) {
            ws.ping();
        } else {
            clearInterval(heartbeat);
        }
    }, 30000);
    
    ws.on('close', () => {
        clearInterval(heartbeat);
    });
});

function handleExtensionMessage(message) {
    const { requestId, type, data, error } = message;
    
    if (type === 'response' && pendingRequests.has(requestId)) {
        const { resolve, reject } = pendingRequests.get(requestId);
        pendingRequests.delete(requestId);
        
        if (error) {
            reject(new Error(error));
        } else {
            resolve(data);
        }
    }
}

function sendToExtension(requestId, payload) {
    console.log(`Sending request ${requestId} to extension`);
    console.log('Payload:', JSON.stringify(payload, null, 2));
    return new Promise((resolve, reject) => {
        if (!extensionSocket || extensionSocket.readyState !== WebSocket.OPEN) {
            reject(new Error('Extension not connected'));
            return;
        }
        
        pendingRequests.set(requestId, { resolve, reject });
        
        extensionSocket.send(JSON.stringify({
            requestId,
            type: 'request',
            payload
        }));
        
        // Timeout after 30 seconds
        setTimeout(() => {
            if (pendingRequests.has(requestId)) {
                pendingRequests.delete(requestId);
                reject(new Error('Request timeout'));
            }
        }, 30000);
    });
}

// OpenAI-compatible chat completions endpoint
app.post('/v1/chat/completions', async (req, res) => {
    try {
        const requestId = uuidv4();
        const { messages, model = 'gpt-3.5-turbo', stream = false, ...otherParams } = req.body;
        
        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({
                error: {
                    message: 'Invalid request: messages array is required',
                    type: 'invalid_request_error'
                }
            });
        }
        
        // Determine target service based on model name
        let service = 'gemini'; // default
        if (model.includes('perplexity') || model.includes('pplx')) {
            service = 'perplexity';
        }
        
        const payload = {
            service,
            messages,
            model,
            stream,
            ...otherParams
        };
        
        console.log(`Forwarding request ${requestId} to ${service}`);
        
        const response = await sendToExtension(requestId, payload);
        
        // Format response in OpenAI format
        const openAIResponse = {
            id: `chatcmpl-${requestId}`,
            object: 'chat.completion',
            created: Math.floor(Date.now() / 1000),
            model: model,
            choices: [{
                index: 0,
                message: {
                    role: 'assistant',
                    content: response.content || response.text || 'No response received'
                },
                finish_reason: 'stop'
            }],
            usage: {
                prompt_tokens: response.usage?.prompt_tokens || 0,
                completion_tokens: response.usage?.completion_tokens || 0,
                total_tokens: response.usage?.total_tokens || 0
            }
        };
        
        res.json(openAIResponse);
        
    } catch (error) {
        console.error('Error processing request:', error);
        res.status(500).json({
            error: {
                message: error.message || 'Internal server error',
                type: 'internal_error'
            }
        });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        extensionConnected: extensionSocket && extensionSocket.readyState === WebSocket.OPEN,
        timestamp: new Date().toISOString()
    });
});

// Models endpoint (OpenAI compatibility)
app.get('/v1/models', (req, res) => {
    res.json({
        object: 'list',
        data: [
            {
                id: 'gemini-pro',
                object: 'model',
                created: Math.floor(Date.now() / 1000),
                owned_by: 'google'
            },
            {
                id: 'perplexity-online',
                object: 'model',
                created: Math.floor(Date.now() / 1000),
                owned_by: 'perplexity'
            }
        ]
    });
});

app.listen(PORT, () => {
    console.log(`AI Proxy Server running on http://localhost:${PORT}`);
    console.log(`WebSocket server running on ws://localhost:${WS_PORT}`);
    console.log('Waiting for browser extension to connect...');
});