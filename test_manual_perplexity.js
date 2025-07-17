// Manual test to check if Perplexity is actually responding
// This will help us debug if the issue is with response detection or submission

const http = require('http');

async function testManualPerplexity() {
    console.log('=== Manual Perplexity Test ===');
    console.log('This test will help debug the Perplexity integration step by step.\n');
    
    console.log('INSTRUCTIONS:');
    console.log('1. Make sure you are on https://www.perplexity.ai/');
    console.log('2. Make sure the extension is loaded and connected');
    console.log('3. Watch the Perplexity page during this test');
    console.log('4. The extension should type a message and submit it\n');
    
    console.log('Starting test in 3 seconds...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    try {
        console.log('Sending request to extension...');
        
        const response = await makeRequest('/v1/chat/completions', 'POST', {
            model: 'perplexity-online',
            messages: [
                {
                    role: 'user',
                    content: 'What is 2+2? Please give a simple answer.'
                }
            ]
        });
        
        console.log('\n✓ SUCCESS! Response received:');
        console.log('Content:', response.choices[0].message.content);
        console.log('Usage:', response.usage);
        
    } catch (error) {
        console.log('\n✗ FAILED:', error.message);
        
        // Additional debugging
        try {
            const healthResponse = await makeRequest('/health', 'GET');
            console.log('\nServer health:', healthResponse);
            
            if (!healthResponse.extensionConnected) {
                console.log('\n❌ ISSUE: Extension not connected to server');
                console.log('Solutions:');
                console.log('- Reload the extension');
                console.log('- Check extension popup for connection status');
                console.log('- Make sure you are on perplexity.ai');
            } else {
                console.log('\n❌ ISSUE: Extension connected but request failed');
                console.log('Check browser console on Perplexity page for error details');
            }
        } catch (healthError) {
            console.log('\n❌ ISSUE: Server not running');
            console.log('Start server with: cd server && npm start');
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
        
        req.setTimeout(45000, () => {
            req.destroy();
            reject(new Error('Request timeout - check if Perplexity is responding'));
        });
        
        if (data) {
            req.write(JSON.stringify(data));
        }
        
        req.end();
    });
}

// Run the manual test
testManualPerplexity().catch(console.error);