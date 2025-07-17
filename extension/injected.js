// Injected script for deeper web page interaction
// This script runs in the page context for better access to page variables

(function() {
    'use strict';
    
    // Create communication bridge with content script
    const bridge = {
        sendMessage: function(type, data) {
            window.postMessage({
                source: 'ai-proxy-injected',
                type: type,
                data: data
            }, '*');
        },
        
        onMessage: function(callback) {
            window.addEventListener('message', function(event) {
                if (event.data.source === 'ai-proxy-content') {
                    callback(event.data);
                }
            });
        }
    };
    
    // Service-specific handlers
    const serviceHandlers = {
        gemini: {
            init: function() {
                console.log('Gemini injected script initialized');
                this.observeResponses();
            },
            
            observeResponses: function() {
                // Monitor for new responses
                const observer = new MutationObserver((mutations) => {
                    mutations.forEach((mutation) => {
                        if (mutation.addedNodes.length > 0) {
                            this.checkForNewResponse(mutation.addedNodes);
                        }
                    });
                });
                
                observer.observe(document.body, {
                    childList: true,
                    subtree: true
                });
            },
            
            checkForNewResponse: function(nodes) {
                // Look for response elements in added nodes
                nodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        const responseElements = node.querySelectorAll('[data-response-id], .model-response');
                        if (responseElements.length > 0) {
                            bridge.sendMessage('response-detected', {
                                content: responseElements[responseElements.length - 1].textContent
                            });
                        }
                    }
                });
            },
            
            sendPrompt: function(prompt) {
                // Try to find and use the input element
                const inputSelectors = [
                    'textarea[placeholder*="Enter a prompt"]',
                    'textarea[aria-label*="Message"]',
                    'div[contenteditable="true"]'
                ];
                
                for (const selector of inputSelectors) {
                    const input = document.querySelector(selector);
                    if (input) {
                        input.focus();
                        input.value = prompt;
                        input.dispatchEvent(new Event('input', { bubbles: true }));
                        
                        // Try to submit
                        const submitBtn = document.querySelector('button[aria-label*="Send"]');
                        if (submitBtn) {
                            submitBtn.click();
                            return true;
                        }
                        break;
                    }
                }
                return false;
            }
        },
        
        perplexity: {
            init: function() {
                console.log('Perplexity injected script initialized');
                this.observeResponses();
            },
            
            observeResponses: function() {
                const observer = new MutationObserver((mutations) => {
                    mutations.forEach((mutation) => {
                        if (mutation.addedNodes.length > 0) {
                            this.checkForNewResponse(mutation.addedNodes);
                        }
                    });
                });
                
                observer.observe(document.body, {
                    childList: true,
                    subtree: true
                });
            },
            
            checkForNewResponse: function(nodes) {
                nodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        const responseElements = node.querySelectorAll('.prose, [data-testid="answer"]');
                        if (responseElements.length > 0) {
                            bridge.sendMessage('response-detected', {
                                content: responseElements[responseElements.length - 1].textContent
                            });
                        }
                    }
                });
            },
            
            sendPrompt: function(prompt) {
                const inputSelectors = [
                    'textarea[placeholder*="Ask"]',
                    'textarea[placeholder*="Follow up"]',
                    'div[contenteditable="true"]'
                ];
                
                for (const selector of inputSelectors) {
                    const input = document.querySelector(selector);
                    if (input) {
                        input.focus();
                        input.value = prompt;
                        input.dispatchEvent(new Event('input', { bubbles: true }));
                        
                        // Try to submit
                        const submitBtn = document.querySelector('button[type="submit"]');
                        if (submitBtn) {
                            submitBtn.click();
                            return true;
                        }
                        break;
                    }
                }
                return false;
            }
        }
    };
    
    // Detect current service and initialize
    function detectAndInitService() {
        const hostname = window.location.hostname;
        
        if (hostname.includes('gemini.google.com')) {
            serviceHandlers.gemini.init();
            return 'gemini';
        } else if (hostname.includes('perplexity.ai')) {
            serviceHandlers.perplexity.init();
            return 'perplexity';
        }
        
        return null;
    }
    
    // Handle messages from content script
    bridge.onMessage(function(message) {
        const { type, data } = message;
        const service = detectAndInitService();
        
        if (type === 'send-prompt' && service && serviceHandlers[service]) {
            const success = serviceHandlers[service].sendPrompt(data.prompt);
            bridge.sendMessage('prompt-sent', { success });
        }
    });
    
    // Initialize
    const currentService = detectAndInitService();
    if (currentService) {
        bridge.sendMessage('service-ready', { service: currentService });
    }
    
})();