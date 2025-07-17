// Popup script for AI Proxy Extension

document.addEventListener('DOMContentLoaded', function() {
    const statusElement = document.getElementById('status');
    const statusIndicator = document.getElementById('statusIndicator');
    const statusText = document.getElementById('statusText');
    const reconnectBtn = document.getElementById('reconnectBtn');
    const testBtn = document.getElementById('testBtn');
    const testInput = document.getElementById('testInput');
    const testResult = document.getElementById('testResult');
    
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
                    model: 'gemini-pro',
                    messages: [
                        {
                            role: 'user',
                            content: message
                        }
                    ]
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (data.error) {
                showTestResult(`Error: ${data.error.message}`, 'error');
            } else {
                const content = data.choices?.[0]?.message?.content || 'No response content';
                showTestResult(`Response: ${content}`, 'success');
            }
            
        } catch (error) {
            showTestResult(`Request failed: ${error.message}`, 'error');
        } finally {
            testBtn.disabled = false;
            testBtn.textContent = 'Send Test Request';
        }
    });
    
    function showTestResult(message, type) {
        testResult.style.display = 'block';
        testResult.textContent = message;
        
        // Style based on type
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