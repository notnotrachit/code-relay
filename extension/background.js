// Background script for AI Proxy Extension

let websocket = null;
let isConnected = false;
let reconnectAttempts = 0;
let maxReconnectAttempts = 10;
let reconnectDelay = 1000; // Start with 1 second
let heartbeatInterval = null;
let connectionTimeout = null;
const pendingRequests = new Map();

// Enhanced WebSocket connection with stability improvements
function connectToServer() {
    // Clear any existing connection
    if (websocket) {
        websocket.onclose = null; // Prevent recursive reconnection
        websocket.close();
    }
    
    // Clear existing intervals
    if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
    }
    
    if (connectionTimeout) {
        clearTimeout(connectionTimeout);
        connectionTimeout = null;
    }
    
    try {
        console.log(`Attempting to connect to server (attempt ${reconnectAttempts + 1}/${maxReconnectAttempts})`);
        websocket = new WebSocket('ws://localhost:3001');
        
        // Connection timeout
        connectionTimeout = setTimeout(() => {
            if (websocket.readyState === WebSocket.CONNECTING) {
                console.log('Connection timeout, closing socket');
                websocket.close();
            }
        }, 10000); // 10 second timeout
        
        websocket.onopen = () => {
            console.log('Connected to AI Proxy Server');
            isConnected = true;
            reconnectAttempts = 0;
            reconnectDelay = 1000; // Reset delay
            updateBadge('✓', '#00ff00');
            
            // Clear connection timeout
            if (connectionTimeout) {
                clearTimeout(connectionTimeout);
                connectionTimeout = null;
            }
            
            // Start heartbeat
            startHeartbeat();
        };
        
        websocket.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                
                // Handle heartbeat response
                if (message.type === 'pong') {
                    console.log('Received heartbeat response');
                    return;
                }
                
                handleServerMessage(message);
            } catch (error) {
                console.error('Error parsing server message:', error);
            }
        };
        
        websocket.onclose = (event) => {
            console.log(`WebSocket closed: code=${event.code}, reason=${event.reason}`);
            isConnected = false;
            updateBadge('✗', '#ff0000');
            
            // Clear heartbeat
            if (heartbeatInterval) {
                clearInterval(heartbeatInterval);
                heartbeatInterval = null;
            }
            
            // Clear connection timeout
            if (connectionTimeout) {
                clearTimeout(connectionTimeout);
                connectionTimeout = null;
            }
            
            // Attempt to reconnect with exponential backoff
            if (reconnectAttempts < maxReconnectAttempts) {
                reconnectAttempts++;
                const delay = Math.min(reconnectDelay * Math.pow(2, reconnectAttempts - 1), 30000); // Max 30 seconds
                console.log(`Reconnecting in ${delay}ms...`);
                setTimeout(connectToServer, delay);
            } else {
                console.log('Max reconnection attempts reached');
                updateBadge('!', '#ff8800');
            }
        };
        
        websocket.onerror = (error) => {
            console.error('WebSocket error occurred:', {
                type: error.type,
                target: error.target ? error.target.readyState : 'unknown',
                timestamp: new Date().toISOString()
            });
            isConnected = false;
            updateBadge('✗', '#ff0000');
        };
        
    } catch (error) {
        console.error('Failed to create WebSocket:', {
            message: error.message,
            name: error.name,
            stack: error.stack
        });
        isConnected = false;
        updateBadge('✗', '#ff0000');
        
        if (reconnectAttempts < maxReconnectAttempts) {
            reconnectAttempts++;
            const delay = Math.min(reconnectDelay * Math.pow(2, reconnectAttempts - 1), 30000);
            console.log(`Retrying connection in ${delay}ms (attempt ${reconnectAttempts}/${maxReconnectAttempts})`);
            setTimeout(connectToServer, delay);
        } else {
            console.log('Max reconnection attempts reached, giving up');
            updateBadge('!', '#ff8800');
        }
    }
}

// Heartbeat mechanism to keep connection alive
function startHeartbeat() {
    heartbeatInterval = setInterval(() => {
        if (websocket && websocket.readyState === WebSocket.OPEN) {
            websocket.send(JSON.stringify({ type: 'ping' }));
        }
    }, 30000); // Send ping every 30 seconds
}

// Reset reconnection attempts (called from popup)
function resetReconnection() {
    reconnectAttempts = 0;
    reconnectDelay = 1000;
}

function updateBadge(text, color) {
    chrome.action.setBadgeText({ text });
    chrome.action.setBadgeBackgroundColor({ color });
}

function handleServerMessage(message) {
    const { requestId, type, payload } = message;
    
    if (type === 'request') {
        handleAIRequest(requestId, payload);
    }
}

async function handleAIRequest(requestId, payload) {
    try {
        const { service, messages, model, ...params } = payload;
        
        // Find or create tab for the AI service
        const tab = await getOrCreateServiceTab(service);
        
        // Send request to content script
        const response = await chrome.tabs.sendMessage(tab.id, {
            type: 'AI_REQUEST',
            requestId,
            payload: {
                messages,
                model,
                ...params
            }
        });
        
        // Send response back to server
        sendToServer({
            requestId,
            type: 'response',
            data: response
        });
        
    } catch (error) {
        console.error('Error handling AI request:', error);
        sendToServer({
            requestId,
            type: 'response',
            error: error.message
        });
    }
}

async function getOrCreateServiceTab(service) {
    const urls = {
        gemini: 'https://gemini.google.com/',
        perplexity: 'https://www.perplexity.ai/'
    };
    
    const targetUrl = urls[service];
    if (!targetUrl) {
        throw new Error(`Unknown service: ${service}`);
    }
    
    // Check if tab already exists
    const tabs = await chrome.tabs.query({ url: targetUrl + '*' });
    
    if (tabs.length > 0) {
        // Activate existing tab
        await chrome.tabs.update(tabs[0].id, { active: true });
        return tabs[0];
    } else {
        // Create new tab
        return await chrome.tabs.create({ url: targetUrl, active: false });
    }
}

function sendToServer(message) {
    if (websocket && websocket.readyState === WebSocket.OPEN) {
        websocket.send(JSON.stringify(message));
    } else {
        console.error('WebSocket not connected');
    }
}

// Initialize connection when extension starts
chrome.runtime.onStartup.addListener(connectToServer);
chrome.runtime.onInstalled.addListener(connectToServer);

// Connect immediately
connectToServer();

// Handle messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'AI_RESPONSE') {
        // Forward response to server
        sendToServer({
            requestId: message.requestId,
            type: 'response',
            data: message.data
        });
    } else if (message.type === 'GET_STATUS') {
        sendResponse({ connected: isConnected });
    } else if (message.type === 'RECONNECT') {
        resetReconnection();
        if (websocket) {
            websocket.close();
        }
        connectToServer();
    }
    return true;
});