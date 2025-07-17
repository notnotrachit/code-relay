// Content script for AI Proxy Extension
// Handles communication with AI web services

class AIServiceHandler {
    constructor() {
        this.isReady = false;
        this.currentService = this.detectService();
        this.setupMessageListener();
        this.waitForPageReady();
    }
    
    detectService() {
        const hostname = window.location.hostname;
        if (hostname.includes('gemini.google.com')) {
            return 'gemini';
        } else if (hostname.includes('perplexity.ai')) {
            return 'perplexity';
        }
        return 'unknown';
    }
    
    setupMessageListener() {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            if (message.type === 'AI_REQUEST') {
                this.handleAIRequest(message.requestId, message.payload)
                    .then(response => {
                        sendResponse(response);
                    })
                    .catch(error => {
                        sendResponse({ error: error.message });
                    });
                return true; // Keep message channel open for async response
            }
        });
    }
    
    async waitForPageReady() {
        // Wait for the page to be fully loaded and interactive
        if (document.readyState === 'complete') {
            await this.initializeService();
        } else {
            window.addEventListener('load', () => {
                setTimeout(() => this.initializeService(), 2000);
            });
        }
    }
    
    async initializeService() {
        try {
            if (this.currentService === 'gemini') {
                await this.initializeGemini();
            } else if (this.currentService === 'perplexity') {
                await this.initializePerplexity();
            }
            this.isReady = true;
            console.log(`${this.currentService} service initialized`);
        } catch (error) {
            console.error('Failed to initialize service:', error);
        }
    }
    
    async initializeGemini() {
        // Wait for Gemini interface to load
        await this.waitForElement('textarea[placeholder*="Enter a prompt"], textarea[aria-label*="Message"], div[contenteditable="true"]');
    }
    
    async initializePerplexity() {
        // Wait for Perplexity interface to load - updated selectors for the actual input
        await this.waitForElement('div#ask-input, [role="textbox"], div[contenteditable="true"]');
        console.log('Perplexity interface detected and ready');
    }
    
    async waitForElement(selector, timeout = 10000) {
        return new Promise((resolve, reject) => {
            const element = document.querySelector(selector);
            if (element) {
                resolve(element);
                return;
            }
            
            const observer = new MutationObserver((mutations, obs) => {
                const element = document.querySelector(selector);
                if (element) {
                    obs.disconnect();
                    resolve(element);
                }
            });
            
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
            
            setTimeout(() => {
                observer.disconnect();
                reject(new Error(`Element ${selector} not found within ${timeout}ms`));
            }, timeout);
        });
    }
    
    async handleAIRequest(requestId, payload) {
        if (!this.isReady) {
            throw new Error('Service not ready');
        }
        
        const { messages } = payload;
        const lastMessage = messages[messages.length - 1];
        
        if (!lastMessage || lastMessage.role !== 'user') {
            throw new Error('Invalid message format');
        }
        
        const prompt = lastMessage.content;
        
        if (this.currentService === 'gemini') {
            return await this.sendGeminiRequest(prompt);
        } else if (this.currentService === 'perplexity') {
            return await this.sendPerplexityRequest(prompt);
        }
        
        throw new Error(`Unsupported service: ${this.currentService}`);
    }
    
    async sendGeminiRequest(prompt) {
        try {
            // Find input element
            const inputSelectors = [
                'textarea[placeholder*="Enter a prompt"]',
                'textarea[aria-label*="Message"]',
                'div[contenteditable="true"]',
                'textarea[data-testid="input-field"]'
            ];
            
            let inputElement = null;
            for (const selector of inputSelectors) {
                inputElement = document.querySelector(selector);
                if (inputElement) break;
            }
            
            if (!inputElement) {
                throw new Error('Could not find Gemini input element');
            }
            
            // Clear and set the prompt
            inputElement.focus();
            inputElement.value = '';
            
            // Type the prompt
            await this.typeText(inputElement, prompt);
            
            // Find and click send button
            const sendButton = await this.findSendButton();
            if (!sendButton) {
                throw new Error('Could not find send button');
            }
            
            // Wait for response
            const response = await this.waitForGeminiResponse();
            
            return {
                content: response,
                usage: {
                    prompt_tokens: prompt.length,
                    completion_tokens: response.length,
                    total_tokens: prompt.length + response.length
                }
            };
            
        } catch (error) {
            throw new Error(`Gemini request failed: ${error.message}`);
        }
    }
    
    async sendPerplexityRequest(prompt) {
        try {
            console.log('Starting Perplexity request with prompt:', prompt);
            
            // Enhanced input element detection for Perplexity - based on actual DOM structure
            const inputSelectors = [
                'div#ask-input',  // The actual Perplexity input element
                '[role="textbox"]',  // Role-based selector
                'div[contenteditable="true"]',  // Fallback for contenteditable
                'main div[contenteditable="true"]',  // More specific contenteditable
                'main [role="textbox"]',  // Role in main area
                // Legacy selectors as fallbacks
                'textarea[data-testid="search-input"]',
                'textarea[placeholder*="Ask"]',
                'textarea[placeholder*="Follow up"]',
                'main input[type="text"]',
                'main textarea'
            ];
            
            let inputElement = null;
            console.log('Looking for input element...');
            
            for (const selector of inputSelectors) {
                console.log(`Trying selector: ${selector}`);
                const elements = document.querySelectorAll(selector);
                console.log(`Found ${elements.length} elements for selector: ${selector}`);
                
                for (const element of elements) {
                    // Check if element is visible and interactable
                    const rect = element.getBoundingClientRect();
                    const isVisible = rect.width > 0 && rect.height > 0;
                    const isInteractable = !element.disabled && !element.readOnly;
                    
                    console.log(`Element check - visible: ${isVisible}, interactable: ${isInteractable}`, element);
                    
                    if (isVisible && isInteractable) {
                        inputElement = element;
                        console.log('Found input element with selector:', selector, element);
                        break;
                    }
                }
                if (inputElement) break;
            }
            
            if (!inputElement) {
                // Log available elements for debugging
                console.log('Available textareas:', document.querySelectorAll('textarea'));
                console.log('Available inputs:', document.querySelectorAll('input'));
                console.log('Available contenteditable:', document.querySelectorAll('[contenteditable="true"]'));
                console.log('Available role=textbox:', document.querySelectorAll('[role="textbox"]'));
                console.log('Available #ask-input:', document.querySelectorAll('#ask-input'));
                
                // Try to find any input-like element as fallback
                const fallbackElement = document.querySelector('#ask-input') || 
                                      document.querySelector('[role="textbox"]') ||
                                      document.querySelector('[contenteditable="true"]');
                
                if (fallbackElement) {
                    console.log('Using fallback element:', fallbackElement);
                    inputElement = fallbackElement;
                } else {
                    throw new Error('Could not find Perplexity input element');
                }
            }
            
            // Clear existing content and focus
            inputElement.focus();
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Clear the input - handle div#ask-input specifically
            if (inputElement.id === 'ask-input' || inputElement.getAttribute('role') === 'textbox') {
                // For Perplexity's div-based input - more aggressive clearing
                inputElement.innerHTML = '';
                inputElement.textContent = '';
                inputElement.innerText = '';
                
                // Try to clear any existing content
                const selection = window.getSelection();
                selection.selectAllChildren(inputElement);
                selection.deleteFromDocument();
                
                inputElement.dispatchEvent(new Event('input', { bubbles: true }));
                inputElement.dispatchEvent(new Event('change', { bubbles: true }));
                console.log('Cleared Perplexity input element');
            } else if (inputElement.tagName === 'TEXTAREA' || inputElement.tagName === 'INPUT') {
                inputElement.value = '';
                inputElement.dispatchEvent(new Event('input', { bubbles: true }));
            } else if (inputElement.contentEditable === 'true') {
                inputElement.textContent = '';
                inputElement.dispatchEvent(new Event('input', { bubbles: true }));
            }
            
            await new Promise(resolve => setTimeout(resolve, 300));
            
            // Type the prompt
            await this.typeText(inputElement, prompt);
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Verify the text was actually set
            const currentText = inputElement.textContent || inputElement.innerText || inputElement.value;
            console.log('Text in input after typing:', currentText);
            if (!currentText.includes(prompt.substring(0, 10))) {
                console.log('Text not properly set, trying alternative method');
                // Try direct manipulation
                inputElement.focus();
                document.execCommand('selectAll');
                document.execCommand('insertText', false, prompt);
            }
            
            // Enhanced send button detection
            const sendButton = await this.findPerplexitySendButton();
            if (!sendButton) {
                // Try Enter key as fallback for Perplexity
                console.log('Send button not found, trying Enter key');
                inputElement.dispatchEvent(new KeyboardEvent('keydown', {
                    key: 'Enter',
                    code: 'Enter',
                    keyCode: 13,
                    bubbles: true,
                    which: 13
                }));
                
                // Also try keypress event
                inputElement.dispatchEvent(new KeyboardEvent('keypress', {
                    key: 'Enter',
                    code: 'Enter',
                    keyCode: 13,
                    bubbles: true,
                    which: 13
                }));
            }
            
            // Wait for response with enhanced detection
            const response = await this.waitForPerplexityResponse();
            
            return {
                content: response,
                usage: {
                    prompt_tokens: prompt.length,
                    completion_tokens: response.length,
                    total_tokens: prompt.length + response.length
                }
            };
            
        } catch (error) {
            console.error('Perplexity request error:', error);
            throw new Error(`Perplexity request failed: ${error.message}`);
        }
    }
    
    async typeText(element, text) {
        // Simulate human typing - enhanced for Perplexity's div input
        element.focus();
        await new Promise(resolve => setTimeout(resolve, 200));
        
        if (element.id === 'ask-input' || element.getAttribute('role') === 'textbox') {
            // Special handling for Perplexity's div-based input
            element.focus();
            
            // Clear first
            element.innerHTML = '';
            element.textContent = '';
            
            // Try multiple approaches to set the text
            element.textContent = text;
            element.innerHTML = text;
            
            // Simulate typing character by character for better detection
            for (let i = 0; i < text.length; i++) {
                element.dispatchEvent(new KeyboardEvent('keydown', { 
                    key: text[i], 
                    bubbles: true 
                }));
                element.dispatchEvent(new KeyboardEvent('keypress', { 
                    key: text[i], 
                    bubbles: true 
                }));
                element.dispatchEvent(new KeyboardEvent('keyup', { 
                    key: text[i], 
                    bubbles: true 
                }));
            }
            
            // Trigger multiple events to ensure Perplexity detects the input
            element.dispatchEvent(new Event('input', { bubbles: true }));
            element.dispatchEvent(new Event('change', { bubbles: true }));
            element.dispatchEvent(new InputEvent('input', { bubbles: true, data: text }));
            
            console.log('Text set in Perplexity input:', element.textContent);
        } else if (element.tagName === 'TEXTAREA' || element.tagName === 'INPUT') {
            element.value = text;
            element.dispatchEvent(new Event('input', { bubbles: true }));
        } else if (element.contentEditable === 'true') {
            element.textContent = text;
            element.dispatchEvent(new Event('input', { bubbles: true }));
        }
        
        // Trigger change events
        element.dispatchEvent(new Event('change', { bubbles: true }));
        
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    async findSendButton() {
        const buttonSelectors = [
            'button[aria-label*="Send"]',
            'button[data-testid*="send"]',
            'button:has(svg)',
            'button[type="submit"]',
            '[role="button"][aria-label*="Send"]'
        ];
        
        for (const selector of buttonSelectors) {
            const button = document.querySelector(selector);
            if (button && !button.disabled) {
                button.click();
                return button;
            }
        }
        
        // Try Enter key as fallback
        const inputElement = document.activeElement;
        if (inputElement) {
            inputElement.dispatchEvent(new KeyboardEvent('keydown', {
                key: 'Enter',
                code: 'Enter',
                keyCode: 13,
                bubbles: true
            }));
            return inputElement;
        }
        
        return null;
    }
    
    async findPerplexitySendButton() {
        const buttonSelectors = [
            'button[data-testid="submit-button"]',
            'button[aria-label*="Submit"]',
            'button[aria-label*="Send"]',
            'button[type="submit"]',
            'button:has(svg[data-icon="arrow-right"])',
            'button:has(svg[data-icon="send"])',
            '[role="button"]:has(svg)',
            // Based on debug output - look for buttons near search area
            'main button[type="submit"]',
            'main button:not([disabled])',
            '[data-testid*="search"] button',
            'button:not([disabled])'
        ];
        
        for (const selector of buttonSelectors) {
            const buttons = document.querySelectorAll(selector);
            for (const button of buttons) {
                // Check if button is visible and clickable
                const rect = button.getBoundingClientRect();
                if (rect.width > 0 && rect.height > 0 && !button.disabled) {
                    console.log('Found send button with selector:', selector);
                    button.click();
                    return button;
                }
            }
        }
        
        console.log('No send button found, available buttons:', document.querySelectorAll('button'));
        return null;
    }
    
    async waitForGeminiResponse() {
        // Wait for response to appear
        const responseSelectors = [
            '[data-response-id]',
            '.response-container',
            '.model-response',
            '[role="presentation"] p',
            '.markdown'
        ];
        
        return await this.waitForResponse(responseSelectors);
    }
    
    async waitForPerplexityResponse() {
        // Wait a moment for the request to be sent
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Enhanced response detection for Perplexity - based on actual debug results
        const responseSelectors = [
            // Primary selectors based on debug output
            'main div[class*="content"]',  // This contains the actual response
            'main p',                      // Response also appears in p tags
            'div[class*="content"]',       // Broader content selector
            // Secondary selectors
            '[data-testid="copilot-answer"]',
            '[data-testid="answer"]',
            '.prose',
            '.answer-content',
            '.response-text',
            '[role="main"] div[class*="answer"]',
            '[class*="answer-container"]',
            '[class*="response"]',
            'div[class*="prose"]'
        ];
        
        console.log('Waiting for NEW Perplexity response...');
        return await this.waitForNewResponse(responseSelectors, 25000);
    }
    
    async waitForNewResponse(selectors, timeout = 25000) {
        // Capture current content to detect new responses
        const initialContent = new Set();
        const initialElementCount = document.querySelectorAll('*').length;
        
        selectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => {
                const text = el.textContent || el.innerText;
                if (text && text.trim().length > 10) {
                    initialContent.add(text.trim());
                }
            });
        });
        
        console.log(`Initial content captured (${initialContent.size} items), looking for new responses...`);
        
        return new Promise((resolve, reject) => {
            let checkCount = 0;
            const maxChecks = timeout / 1000;
            
            const checkForNewResponse = () => {
                checkCount++;
                console.log(`New response check ${checkCount}/${maxChecks}`);
                
                // Check if new elements were added to the page
                const currentElementCount = document.querySelectorAll('*').length;
                if (currentElementCount > initialElementCount) {
                    console.log(`New elements detected: ${currentElementCount - initialElementCount}`);
                }
                
                // Debug: Show what content we're finding
                if (checkCount % 5 === 0) { // Every 5 checks
                    console.log('=== DEBUG: Current content scan ===');
                    const allTexts = [];
                    document.querySelectorAll('*').forEach(el => {
                        const text = el.textContent || el.innerText;
                        if (text && text.trim().length > 30 && !el.querySelector('*')) {
                            allTexts.push({
                                text: text.trim().substring(0, 100),
                                length: text.length,
                                element: el.tagName + (el.className ? '.' + el.className.split(' ')[0] : '')
                            });
                        }
                    });
                    allTexts.sort((a, b) => b.length - a.length);
                    console.log('Top 5 text elements found:');
                    allTexts.slice(0, 5).forEach((item, i) => {
                        console.log(`${i + 1}. ${item.element} (${item.length} chars): "${item.text}..."`);
                    });
                }
                
                // First check our priority selectors for Perplexity responses
                const prioritySelectors = ['main div[class*="content"]', 'main p'];
                for (const selector of prioritySelectors) {
                    const elements = document.querySelectorAll(selector);
                    for (let i = elements.length - 1; i >= 0; i--) {
                        const element = elements[i];
                        const text = element.textContent || element.innerText;
                        
                        if (text && text.trim().length > 50) {
                            const trimmedText = text.trim();
                            
                            // Filter out JavaScript code and other non-response content
                            if (!initialContent.has(trimmedText) && 
                                !trimmedText.includes('What is the current weather') &&
                                !trimmedText.includes('This should trigger') &&
                                !trimmedText.includes('self.__next_f.push') &&
                                !trimmedText.includes('metadata') &&
                                !trimmedText.includes('$undefined') &&
                                !trimmedText.includes('digest') &&
                                !trimmedText.startsWith('{') &&
                                !trimmedText.includes('__next') &&
                                trimmedText.length < 2000) { // Reasonable response length
                                console.log(`Found NEW response via priority selector "${selector}" (${trimmedText.length} chars): ${trimmedText.substring(0, 100)}...`);
                                resolve(trimmedText);
                                return;
                            }
                        }
                    }
                }
                
                // Look for any substantial new text anywhere on the page
                const allElements = document.querySelectorAll('*');
                for (let i = allElements.length - 1; i >= Math.max(0, allElements.length - 50); i--) {
                    const element = allElements[i];
                    const text = element.textContent || element.innerText;
                    
                    if (text && text.trim().length > 50 && !element.querySelector('*')) {
                        const trimmedText = text.trim();
                        
                        // Check if this is new content and looks like a response
                        if (!initialContent.has(trimmedText) && 
                            !trimmedText.includes('What is the current weather') &&
                            !trimmedText.includes('This should trigger') &&
                            !trimmedText.includes('self.__next_f.push') &&
                            !trimmedText.includes('metadata') &&
                            !trimmedText.includes('$undefined') &&
                            !trimmedText.includes('digest') &&
                            !trimmedText.startsWith('{') &&
                            !trimmedText.includes('__next') &&
                            trimmedText.length < 2000) {
                            console.log(`Found NEW content (${trimmedText.length} chars): ${trimmedText.substring(0, 100)}...`);
                            console.log('Element:', element);
                            resolve(trimmedText);
                            return;
                        }
                    }
                }
                
                // Also check our specific selectors
                for (const selector of selectors) {
                    const elements = document.querySelectorAll(selector);
                    for (let i = elements.length - 1; i >= 0; i--) {
                        const element = elements[i];
                        const text = element.textContent || element.innerText;
                        
                        if (text && text.trim().length > 20) {
                            const trimmedText = text.trim();
                            
                            if (!initialContent.has(trimmedText) && 
                                trimmedText.length > 50 &&
                                !trimmedText.includes('What is the current weather') &&
                                !trimmedText.includes('This should trigger') &&
                                !trimmedText.includes('self.__next_f.push') &&
                                !trimmedText.includes('metadata') &&
                                !trimmedText.includes('$undefined') &&
                                !trimmedText.includes('digest') &&
                                !trimmedText.startsWith('{') &&
                                !trimmedText.includes('__next') &&
                                trimmedText.length < 2000) {
                                console.log(`Found NEW response via selector "${selector}" (${trimmedText.length} chars): ${trimmedText.substring(0, 100)}...`);
                                resolve(trimmedText);
                                return;
                            }
                        }
                    }
                }
                
                if (checkCount >= maxChecks) {
                    console.log('Timeout waiting for new response, trying to get any recent content...');
                    
                    // Fallback: get the longest text element that might be a response
                    const allTexts = [];
                    document.querySelectorAll('*').forEach(el => {
                        const text = el.textContent || el.innerText;
                        if (text && text.trim().length > 50 && !el.querySelector('*')) {
                            allTexts.push({
                                text: text.trim(),
                                length: text.length,
                                element: el
                            });
                        }
                    });
                    
                    allTexts.sort((a, b) => b.length - a.length);
                    if (allTexts.length > 0) {
                        console.log('Returning longest text as fallback:', allTexts[0].text.substring(0, 100));
                        resolve(allTexts[0].text);
                        return;
                    }
                    
                    reject(new Error('No new response detected'));
                    return;
                }
                
                setTimeout(checkForNewResponse, 1000);
            };
            
            checkForNewResponse();
        });
    }
}

// Initialize the handler
new AIServiceHandler();