// Fixed popup script for AI Proxy Extension

document.addEventListener('DOMContentLoaded', function() {
    const statusElement = document.getElementById('status');
    const statusIndicator = document.getElementById('statusIndicator');
    const statusText = document.getElementById('statusText');
    const reconnectBtn = document.getElementById('reconnectBtn');
    const testBtn = document.getElementById('testBtn');
    const testInput = document.getElementById('testInput');
    const testResult = document.getElementById('testResult');
    const checkPageBtn = document.getElementById('checkPageBtn');
    const pageStatus = document.getElementById('pageStatus');
    const injectScriptBtn = document.getElementById('injectScriptBtn');
    const scriptStatus = document.getElementById('scriptStatus');
    
    // Update status display
    function updateStatus(connected) {
        if (connected) {
            statusElement.className = 'status connected';
            statusIndicator.className = 'status-indicator connected';
            statusText.textContent = 'Connected';
            reconnectBtn.textContent = 'Connected to Server';
            reconnectBtn.disabled = true;
        } else {
            statusElement.className = 'status disconnected';
            statusIndicator.className = 'status-indicator disconnected';
            statusText.textContent = 'Disconnected';
            reconnectBtn.textContent = 'Reconnect to Server';
            reconnectBtn.disabled = false;
        }
    }
    
    // Check connection status
    function checkStatus() {
        chrome.runtime.sendMessage({ type: 'GET_STATUS' }, (response) => {
            if (chrome.runtime.lastError) {
                console.log('Error getting status:', chrome.runtime.lastError);
                updateStatus(false);
                return;
            }
            updateStatus(response && response.connected);
        });
    }
    
    // Reconnect button handler
    reconnectBtn.addEventListener('click', function() {
        chrome.runtime.sendMessage({ type: 'RECONNECT' });
        setTimeout(checkStatus, 1000);
    });
    
    // Check page access button handler
    checkPageBtn.addEventListener('click', async function() {
        checkPageBtn.disabled = true;
        checkPageBtn.textContent = 'Checking...';
        
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            let statusInfo = 'Current URL: ' + tab.url + '\n';
            statusInfo += 'Title: ' + tab.title + '\n\n';
            
            // Check if URL matches our patterns
            const supportedPatterns = [
                'https://gemini.google.com/',
                'https://www.perplexity.ai/',
                'https://perplexity.ai/'
            ];
            
            const isSupported = supportedPatterns.some(pattern => tab.url.includes(pattern.replace('/', '')));
            
            if (isSupported) {
                statusInfo += 'URL is supported\n';
                
                try {
                    const results = await chrome.scripting.executeScript({
                        target: { tabId: tab.id },
                        func: () => {
                            return {
                                hasAIServiceHandler: typeof AIServiceHandler !== 'undefined',
                                hasAskInput: !!document.querySelector('#ask-input'),
                                hasTextbox: !!document.querySelector('[role="textbox"]'),
                                hasContentEditable: !!document.querySelector('[contenteditable="true"]'),
                                markdownElements: document.querySelectorAll('[id^="markdown-content-"]').length,
                                url: window.location.href
                            };
                        }
                    });
                    
                    const result = results[0].result;
                    statusInfo += 'Can execute scripts: YES\n';
                    statusInfo += 'Content script loaded: ' + (result.hasAIServiceHandler ? 'YES' : 'NO') + '\n';
                    statusInfo += 'Ask input found: ' + (result.hasAskInput ? 'YES' : 'NO') + '\n';
                    statusInfo += 'Textbox found: ' + (result.hasTextbox ? 'YES' : 'NO') + '\n';
                    statusInfo += 'Contenteditable found: ' + (result.hasContentEditable ? 'YES' : 'NO') + '\n';
                    statusInfo += 'Markdown elements: ' + result.markdownElements + '\n';
                    
                    showResult(pageStatus, statusInfo, result.hasAIServiceHandler ? 'success' : 'error');
                    
                } catch (scriptError) {
                    statusInfo += 'Cannot execute scripts: ' + scriptError.message + '\n';
                    statusInfo += 'This usually means:\n';
                    statusInfo += '- Extension lacks permissions\n';
                    statusInfo += '- Page is not fully loaded\n';
                    statusInfo += '- Content Security Policy blocking\n';
                    showResult(pageStatus, statusInfo, 'error');
                }
                
            } else {
                statusInfo += 'URL not supported\n';
                statusInfo += 'Supported patterns:\n';
                supportedPatterns.forEach(pattern => {
                    statusInfo += '- ' + pattern + '\n';
                });
                showResult(pageStatus, statusInfo, 'error');
            }
            
        } catch (error) {
            showResult(pageStatus, 'Error checking page: ' + error.message, 'error');
        } finally {
            checkPageBtn.disabled = false;
            checkPageBtn.textContent = 'Check Current Page';
        }
    });
    
    // Inject content script button handler
    injectScriptBtn.addEventListener('click', async function() {
        injectScriptBtn.disabled = true;
        injectScriptBtn.textContent = 'Injecting...';
        
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            // Simple injection approach
            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ['content.js']
            });
            
            // Wait a moment then check if it worked
            setTimeout(async () => {
                try {
                    const results = await chrome.scripting.executeScript({
                        target: { tabId: tab.id },
                        func: () => typeof AIServiceHandler !== 'undefined'
                    });
                    
                    const isLoaded = results[0].result;
                    showResult(scriptStatus, 
                        isLoaded ? 'Content script injected successfully!' : 'Content script injection failed',
                        isLoaded ? 'success' : 'error'
                    );
                } catch (error) {
                    showResult(scriptStatus, 'Error checking injection: ' + error.message, 'error');
                }
            }, 1000);
            
        } catch (error) {
            showResult(scriptStatus, 'Injection failed: ' + error.message, 'error');
        } finally {
            injectScriptBtn.disabled = false;
            injectScriptBtn.textContent = 'Inject Content Script';
        }
    });
    
    // Test button handler
    testBtn.addEventListener('click', async function() {
        const message = testInput.value.trim();
        if (!message) {
            showTestResult('Please enter a test message', 'error');
            return;
        }
        
        testBtn.disabled = true;
        testBtn.textContent = 'Sending...';
        showTestResult('Sending request...', 'info');
        
        try {
            const response = await fetch('http://localhost:3000/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: 'perplexity-online',
                    messages: [
                        {
                            role: 'user',
                            content: message
                        }
                    ]
                })
            });
            
            if (!response.ok) {
                throw new Error('HTTP ' + response.status + ': ' + response.statusText);
            }
            
            const data = await response.json();
            
            if (data.error) {
                showTestResult('Error: ' + data.error.message, 'error');
            } else {
                const content = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content || 'No response content';
                showTestResult('Response: ' + content, 'success');
            }
            
        } catch (error) {
            showTestResult('Request failed: ' + error.message, 'error');
        } finally {
            testBtn.disabled = false;
            testBtn.textContent = 'Send Test Request';
        }
    });
    
    function showResult(element, message, type) {
        element.style.display = 'block';
        element.textContent = message;
        element.style.backgroundColor = type === 'error' ? '#ffeaea' : 
                                       type === 'success' ? '#e8f5e8' : '#f0f8ff';
        element.style.color = type === 'error' ? '#d32f2f' : 
                             type === 'success' ? '#2e7d32' : '#1976d2';
        element.style.whiteSpace = 'pre-line';
    }
    
    function showTestResult(message, type) {
        testResult.style.display = 'block';
        testResult.textContent = message;
        testResult.style.backgroundColor = type === 'error' ? '#ffeaea' : 
                                         type === 'success' ? '#e8f5e8' : '#f0f8ff';
        testResult.style.color = type === 'error' ? '#d32f2f' : 
                               type === 'success' ? '#2e7d32' : '#1976d2';
    }
    
    // Initial status check
    checkStatus();
    
    // Periodic status check
    setInterval(checkStatus, 5000);
});