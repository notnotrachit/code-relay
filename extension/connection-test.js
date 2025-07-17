// Connection test utility for debugging WebSocket issues
// Run this in the extension's background script console

function testWebSocketConnection() {
    console.log('Testing WebSocket connection...');
    
    const ws = new WebSocket('ws://localhost:3001');
    
    ws.onopen = function(event) {
        console.log('✓ WebSocket connection opened successfully');
        console.log('Connection details:', {
            readyState: ws.readyState,
            url: ws.url,
            protocol: ws.protocol
        });
        
        // Send test message
        ws.send(JSON.stringify({ type: 'test', message: 'Hello from test' }));
    };
    
    ws.onmessage = function(event) {
        console.log('✓ Received message:', event.data);
        try {
            const data = JSON.parse(event.data);
            console.log('Parsed message:', data);
        } catch (e) {
            console.log('Raw message (not JSON):', event.data);
        }
    };
    
    ws.onerror = function(error) {
        console.error('✗ WebSocket error:', {
            type: error.type,
            target: error.target,
            readyState: error.target ? error.target.readyState : 'unknown',
            url: error.target ? error.target.url : 'unknown'
        });
    };
    
    ws.onclose = function(event) {
        console.log('WebSocket closed:', {
            code: event.code,
            reason: event.reason,
            wasClean: event.wasClean
        });
        
        // Common close codes
        const closeCodes = {
            1000: 'Normal Closure',
            1001: 'Going Away',
            1002: 'Protocol Error',
            1003: 'Unsupported Data',
            1006: 'Abnormal Closure',
            1011: 'Internal Error',
            1015: 'TLS Handshake'
        };
        
        console.log('Close code meaning:', closeCodes[event.code] || 'Unknown');
    };
    
    // Test connection timeout
    setTimeout(() => {
        if (ws.readyState === WebSocket.CONNECTING) {
            console.log('Connection still pending after 5 seconds, closing...');
            ws.close();
        }
    }, 5000);
    
    return ws;
}

// Check if server is running
function checkServerHealth() {
    fetch('http://localhost:3000/health')
        .then(response => response.json())
        .then(data => {
            console.log('✓ Server health check:', data);
        })
        .catch(error => {
            console.error('✗ Server health check failed:', error.message);
            console.log('Make sure the server is running: cd server && npm start');
        });
}

// Run tests
console.log('Running connection diagnostics...');
checkServerHealth();
setTimeout(() => testWebSocketConnection(), 1000);