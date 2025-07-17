// Simple test for Perplexity integration
// Run with: node test_perplexity_simple.js

const http = require('http');

async function testPerplexitySimple() {
    console.log('Testing Perplexity with simple question...\n');
    
    try {
        const response = await makeRequest('/v1/chat/completions', 'POST', {
            model: 'perplexity-online',
            messages: [
                {
                    role: 'user',
                    content: 'Hello, can you tell me what 5+5 equals?'
                }
            ]
        });
        
        console.log('✓ Success! Response received:');
        console.log('Model:', response.model);
        console.log('Content:', response.choices[0].message.content);
        console.log('Usage:', response.usage);
        
    } catch (error) {
        console.log('✗ Test failed:', error.message);
        
        // Check if server is running
        try {
            const healthResponse = await makeRequest('/health', 'GET');
            console.log('Server is running. Extension connected:', healthResponse.extensionConnected);
            
            if (!healthResponse.extensionConnected) {
                console.log('❌ Extension is not connected to server');
                console.log('Make sure:');
                console.log('1. Extension is loaded in browser');
                console.log('2. You are on perplexity.ai page');
                console.log('3. Check extension popup for connection status');
            }
        } catch (healthError) {
            console.log('❌ Server is not running. Start with: cd server && npm start');
        }
    }
}

function makeRequest(path, method = 'GET', data = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };
        
        const req = http.request(options, (res) => {
            let body = '';
            
            res.on('data', (chunk) => {
                body += chunk;
            });
            
            res.on('end', () => {
                try {
                    const response = JSON.parse(body);
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve(response);
                    } else {
                        reject(new Error(`HTTP ${res.statusCode}: ${response.error?.message || body}`));
                    }
                } catch (error) {
                    reject(new Error(`Failed to parse response: ${body}`));
                }
            });
        });
        
        req.on('error', (error) => {
            reject(error);
        });
        
        req.setTimeout(60000, () => {
            req.destroy();
            reject(new Error('Request timeout - make sure you are on perplexity.ai and logged in'));
        });
        
        if (data) {
            req.write(JSON.stringify(data));
        }
        
        req.end();
    });
}

// Run test
testPerplexitySimple().catch(console.error);