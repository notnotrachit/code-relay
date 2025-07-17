// Specific test for Perplexity integration
// Run with: node test_perplexity.js

const http = require('http');

async function testPerplexityIntegration() {
    console.log('Testing Perplexity Integration...\n');
    
    // Test with a simple question
    console.log('1. Testing simple question...');
    try {
        const response = await makeRequest('/v1/chat/completions', 'POST', {
            model: 'perplexity-online',
            messages: [
                {
                    role: 'user',
                    content: 'What is 2+2?'
                }
            ]
        });
        console.log('✓ Simple question response:', response.choices[0].message.content.substring(0, 200));
    } catch (error) {
        console.log('✗ Simple question failed:', error.message);
    }
    
    // Test with a search-based question
    console.log('\n2. Testing search-based question...');
    try {
        const response = await makeRequest('/v1/chat/completions', 'POST', {
            model: 'perplexity-online',
            messages: [
                {
                    role: 'user',
                    content: 'What is the current weather in New York?'
                }
            ]
        });
        console.log('✓ Search question response:', response.choices[0].message.content.substring(0, 200));
    } catch (error) {
        console.log('✗ Search question failed:', error.message);
    }
    
    // Test with a longer prompt
    console.log('\n3. Testing longer prompt...');
    try {
        const response = await makeRequest('/v1/chat/completions', 'POST', {
            model: 'perplexity-online',
            messages: [
                {
                    role: 'user',
                    content: 'Can you explain the difference between machine learning and artificial intelligence? Please provide a detailed explanation with examples.'
                }
            ]
        });
        console.log('✓ Long prompt response:', response.choices[0].message.content.substring(0, 200));
    } catch (error) {
        console.log('✗ Long prompt failed:', error.message);
    }
    
    console.log('\nPerplexity test completed!');
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
            reject(new Error('Request timeout'));
        });
        
        if (data) {
            req.write(JSON.stringify(data));
        }
        
        req.end();
    });
}

// Run tests
testPerplexityIntegration().catch(console.error);