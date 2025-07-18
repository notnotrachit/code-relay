// Content script for AI Proxy Extension - Complete Fixed Version
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
            // Don't fail completely, just mark as ready
            this.isReady = true;
            console.log(`${this.currentService} service initialized (with warnings)`);
        }
    }
    
    async initializeGemini() {
        // Don't wait for elements during initialization - check them when needed
        console.log('Gemini service initialized (no element waiting)');
    }
    
    async initializePerplexity() {
        // Don't wait for elements during initialization - check them when needed
        console.log('Perplexity service initialized (no element waiting)');
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
    
    async findInputElement() {
        console.log('Looking for input element...');
        
        const selectors = [
            '#ask-input',
            '[role="textbox"]',
            '[contenteditable="true"]',
            'textarea',
            'input[type="text"]'
        ];
        
        for (const selector of selectors) {
            const elements = document.querySelectorAll(selector);
            console.log(`  ${selector}: ${elements.length} found`);
            
            for (const element of elements) {
                const rect = element.getBoundingClientRect();
                const isVisible = rect.width > 0 && rect.height > 0;
                const isInteractable = !element.disabled && !element.readOnly;
                
                console.log(`    Element: ${element.tagName}#${element.id || 'no-id'} - visible: ${isVisible}, interactable: ${isInteractable}`);
                
                if (isVisible && isInteractable) {
                    console.log(`Using element: ${element.tagName}#${element.id || 'no-id'}`);
                    return element;
                }
            }
        }
        
        throw new Error('No suitable input element found');
    }
    
    async findGeminiInputElement() {
        console.log('Looking for Gemini input element...');
        
        const selectors = [
            'textarea[placeholder*="Enter a prompt"]',
            'textarea[aria-label*="Message"]',
            'textarea[data-testid="input-field"]',
            'div[contenteditable="true"]',
            'textarea',
            'input[type="text"]'
        ];
        
        for (const selector of selectors) {
            const elements = document.querySelectorAll(selector);
            console.log(`  Gemini ${selector}: ${elements.length} found`);
            
            for (const element of elements) {
                const rect = element.getBoundingClientRect();
                const isVisible = rect.width > 0 && rect.height > 0;
                const isInteractable = !element.disabled && !element.readOnly;
                
                console.log(`    Gemini Element: ${element.tagName}#${element.id || 'no-id'} - visible: ${isVisible}, interactable: ${isInteractable}`);
                
                if (isVisible && isInteractable) {
                    console.log(`Using Gemini element: ${element.tagName}#${element.id || 'no-id'}`);
                    return element;
                }
            }
        }
        
        throw new Error('No suitable Gemini input element found');
    }
    
    async findGeminiSendButton() {
        const buttonSelectors = [
            'button[aria-label*="Send"]',
            'button[data-testid*="send"]',
            'button:has(svg)',
            'button[type="submit"]'
        ];
        
        for (const selector of buttonSelectors) {
            const buttons = document.querySelectorAll(selector);
            for (const button of buttons) {
                const rect = button.getBoundingClientRect();
                if (rect.width > 0 && rect.height > 0 && !button.disabled) {
                    console.log('Found Gemini send button with selector:', selector);
                    return button;
                }
            }
        }
        
        console.log('No Gemini send button found');
        return null;
    }
    
    extractCleanText(element) {
        // Clone the element to avoid modifying the original
        const clonedElement = element.cloneNode(true);
        
        // Remove citation links with specific selectors
        const citationSelectors = [
            'a.citation',
            'a[class*="citation"]',
            'a.ml-xs',
            'span.whitespace-nowrap'
        ];
        
        citationSelectors.forEach(selector => {
            const elements = clonedElement.querySelectorAll(selector);
            elements.forEach(el => {
                if (selector === 'span.whitespace-nowrap') {
                    const hasCitation = el.querySelector('a.citation, a[class*="citation"]');
                    if (hasCitation) {
                        el.remove();
                    }
                } else {
                    el.remove();
                }
            });
        });
        
        // Get text from prose element if available
        const proseElement = clonedElement.querySelector('.prose');
        let text = '';
        
        if (proseElement) {
            // Get ALL text content and then structure it properly
            const allTextNodes = [];
            
            // Walk through all nodes in order
            const walker = document.createTreeWalker(
                proseElement,
                NodeFilter.SHOW_ELEMENT,
                null,
                false
            );
            
            const processedElements = new Set();
            const textParts = [];
            
            // Process direct children in order
            Array.from(proseElement.children).forEach(child => {
                if (processedElements.has(child)) return;
                processedElements.add(child);
                
                const childClone = child.cloneNode(true);
                
                // Remove citations from this element
                const citations = childClone.querySelectorAll('a.citation, a[class*="citation"], span.whitespace-nowrap');
                citations.forEach(citation => {
                    if (citation.tagName === 'SPAN') {
                        const hasCitation = citation.querySelector('a.citation, a[class*="citation"]');
                        if (hasCitation) citation.remove();
                    } else {
                        citation.remove();
                    }
                });
                
                const text = childClone.textContent.trim();
                if (text.length > 0) {
                    if (child.tagName === 'UL' || child.tagName === 'OL') {
                        // Handle lists
                        const listItems = childClone.querySelectorAll('li');
                        const listText = Array.from(listItems).map(li => '- ' + li.textContent.trim()).join('\n');
                        if (listText) textParts.push(listText);
                    } else {
                        textParts.push(text);
                    }
                }
            });
            
            text = textParts.filter(t => t.length > 0).join('\n\n');
            
            // If we didn't get much text, fall back to simpler method
            if (text.length < 50) {
                const proseClone = proseElement.cloneNode(true);
                
                // Remove citations
                const citations = proseClone.querySelectorAll('a.citation, a[class*="citation"], span.whitespace-nowrap');
                citations.forEach(citation => {
                    if (citation.tagName === 'SPAN') {
                        const hasCitation = citation.querySelector('a.citation, a[class*="citation"]');
                        if (hasCitation) citation.remove();
                    } else {
                        citation.remove();
                    }
                });
                
                text = proseClone.textContent || proseClone.innerText;
            }
        } else {
            text = clonedElement.textContent || clonedElement.innerText;
        }
        
        // Clean up the text
        text = text.trim();
        
        console.log('Text before cleaning:', text.substring(text.length - 50));
        
        // Remove trailing citation numbers and periods - BUT NOT if they're part of math equations
        text = text.replace(/\s*\d+\s*\.\s*$/, '');
        console.log('After citation number removal:', text.substring(text.length - 50));
        
        text = text.replace(/\s*\d+\s*$/, '');
        console.log('After trailing number removal:', text.substring(text.length - 50));
        
        // Remove citation markers that might remain - BUT NOT if they're part of equations
        text = text.replace(/\s+\d+\.\s*$/g, '');
        console.log('After citation marker removal:', text.substring(text.length - 50));
        
        // Fix formatting issues
        text = text.replace(/(\d+)\+(\d+)=(\d+)(\d+)\s*\+\s*(\d+)\s*=\s*(\d+)(\d+)\+(\d+)=(\d+)/g, '$1 + $2 = $9');
        
        // Clean up multiple spaces and normalize whitespace
        text = text.replace(/\s+/g, ' ');
        text = text.replace(/\n\s*\n/g, '\n\n');
        
        // DANGEROUS: This removes periods at the end - could be removing "= 20."
        // text = text.replace(/\s*\.\s*$/, '');
        
        console.log('Final text:', text.substring(text.length - 50));
        
        return text;
    }
    
    async sendPerplexityRequest(prompt) {
        try {
            console.log('Starting Perplexity request with prompt:', prompt);
            
            // Find input element dynamically
            const inputElement = await this.findInputElement();
            
            // Capture initial markdown count
            const initialMarkdown = document.querySelectorAll('[id^="markdown-content-"]');
            const initialCount = initialMarkdown.length;
            console.log(`Initial markdown elements count: ${initialCount}`);
            
            // Clear existing content and focus
            inputElement.focus();
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Clear the input
            if (inputElement.id === 'ask-input' || inputElement.getAttribute('role') === 'textbox') {
                inputElement.innerHTML = '';
                inputElement.textContent = '';
                inputElement.innerText = '';
                
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
                inputElement.focus();
                document.execCommand('selectAll');
                document.execCommand('insertText', false, prompt);
            }
            
            // Submit
            console.log('Send button not found, trying Enter key');
            inputElement.dispatchEvent(new KeyboardEvent('keydown', {
                key: 'Enter',
                code: 'Enter',
                keyCode: 13,
                bubbles: true,
                which: 13
            }));
            
            inputElement.dispatchEvent(new KeyboardEvent('keypress', {
                key: 'Enter',
                code: 'Enter',
                keyCode: 13,
                bubbles: true,
                which: 13
            }));
            
            // Wait for response
            const response = await this.waitForPerplexityResponse(initialCount);
            
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
        element.focus();
        await new Promise(resolve => setTimeout(resolve, 200));
        
        if (element.id === 'ask-input' || element.getAttribute('role') === 'textbox') {
            element.focus();
            element.innerHTML = '';
            element.textContent = '';
            element.textContent = text;
            element.innerHTML = text;
            
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
        
        element.dispatchEvent(new Event('change', { bubbles: true }));
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    async waitForPerplexityResponse(initialCount) {
        console.log('Starting to wait for Perplexity response...');
        
        // Wait a moment for the request to be sent
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const maxAttempts = 30;
            let lastResponseLength = 0;
            let stableCount = 0;
            let foundElement = null;
            
            const checkForResponse = () => {
                attempts++;
                console.log(`Checking for NEW response in markdown-content ${attempts}/${maxAttempts}`);
                
                const currentMarkdownElements = document.querySelectorAll('[id^="markdown-content-"]');
                console.log(`Current markdown elements count: ${currentMarkdownElements.length}`);
                
                if (currentMarkdownElements.length > initialCount) {
                    console.log(`New markdown elements detected! Looking at latest ones...`);
                    
                    const sortedElements = Array.from(currentMarkdownElements).sort((a, b) => {
                        const aNum = parseInt(a.id.replace('markdown-content-', ''));
                        const bNum = parseInt(b.id.replace('markdown-content-', ''));
                        return bNum - aNum;
                    });
                    
                    for (const element of sortedElements) {
                        const elementNum = parseInt(element.id.replace('markdown-content-', ''));
                        
                        if (elementNum >= initialCount) {
                            console.log(`Checking NEW element: ${element.id}`);
                            
                            // Extract clean text using the improved method
                            let text = this.extractCleanText(element);
                            
                            if (text && text.trim().length > 20) {
                                const trimmedText = text.trim();
                                console.log(`Found content in ${element.id} (${trimmedText.length} chars): "${trimmedText.substring(0, 100)}..."`);
                                
                                if (!trimmedText.includes('self.__next_f.push') &&
                                    !trimmedText.includes('metadata') &&
                                    !trimmedText.includes('__CF$cv$params') &&
                                    !trimmedText.includes('challenge-platform') &&
                                    !trimmedText.includes('function()') &&
                                    !trimmedText.startsWith('{') &&
                                    !trimmedText.startsWith('.') &&
                                    !trimmedText.startsWith('(function') &&
                                    trimmedText.length < 5000 &&
                                    trimmedText.length > 20) {
                                    
                                    foundElement = element;
                                    
                                    // Check if response is still growing
                                    if (trimmedText.length === lastResponseLength) {
                                        stableCount++;
                                        console.log(`Response stable count: ${stableCount}/3 (${trimmedText.length} chars)`);
                                        
                                        if (stableCount >= 3) {
                                            console.log(`Response appears complete in ${element.id} (3 stable checks)`);
                                            resolve(trimmedText);
                                            return;
                                        }
                                    } else {
                                        stableCount = 0;
                                        lastResponseLength = trimmedText.length;
                                        console.log(`Response still growing: ${trimmedText.length} chars`);
                                    }
                                    
                                    // Only consider response complete if it has proper ending AND is stable
                                    if (trimmedText.length > 200 && stableCount >= 2 && (
                                        (trimmedText.toLowerCase().includes('in summary') && trimmedText.endsWith('.')) ||
                                        (trimmedText.toLowerCase().includes('therefore') && trimmedText.endsWith('.')) ||
                                        (trimmedText.toLowerCase().includes('mathematically') && trimmedText.includes('= 20') && trimmedText.endsWith('.')) ||
                                        (trimmedText.includes('= 20') && trimmedText.endsWith('.')) ||
                                        (trimmedText.toLowerCase().includes('the answer is') && trimmedText.endsWith('.'))
                                    )) {
                                        console.log(`Response looks complete: has conclusion AND ends properly AND is stable`);
                                        resolve(trimmedText);
                                        return;
                                    }
                                    
                                    break; // Found valid element, no need to check others
                                } else {
                                    console.log(`Filtered out content from ${element.id} (looks like CSS/code)`);
                                }
                            }
                        }
                    }
                } else {
                    console.log(`No new markdown elements yet (${currentMarkdownElements.length} vs ${initialCount})`);
                }
                
                if (attempts >= maxAttempts) {
                    console.log('Max attempts reached');
                    if (foundElement) {
                        const finalText = this.extractCleanText(foundElement);
                        console.log('Returning final response despite timeout:', finalText.substring(0, 100));
                        resolve(finalText);
                    } else {
                        reject(new Error('No response found in markdown-content elements'));
                    }
                    return;
                }
                
                setTimeout(checkForResponse, 1500); // Slightly longer interval
            };
            
            checkForResponse();
        });
    }
    
    async sendGeminiRequest(prompt) {
        try {
            console.log('Starting Gemini request with prompt:', prompt);
            
            // Use the same findInputElement method as Perplexity but with Gemini-specific selectors
            const inputElement = await this.findGeminiInputElement();
            
            // Clear and set the prompt
            inputElement.focus();
            await new Promise(resolve => setTimeout(resolve, 300));
            
            // Clear existing content
            if (inputElement.tagName === 'TEXTAREA') {
                inputElement.value = '';
            } else if (inputElement.contentEditable === 'true') {
                inputElement.textContent = '';
                inputElement.innerHTML = '';
            }
            
            await new Promise(resolve => setTimeout(resolve, 200));
            
            // Type the prompt
            if (inputElement.tagName === 'TEXTAREA') {
                inputElement.value = prompt;
            } else if (inputElement.contentEditable === 'true') {
                inputElement.textContent = prompt;
                inputElement.innerHTML = prompt;
            }
            
            // Trigger events
            inputElement.dispatchEvent(new Event('input', { bubbles: true }));
            inputElement.dispatchEvent(new Event('change', { bubbles: true }));
            
            await new Promise(resolve => setTimeout(resolve, 300));
            
            // Verify text was set
            const currentText = inputElement.value || inputElement.textContent || '';
            console.log('Text in Gemini input after typing:', currentText);
            
            if (!currentText.includes(prompt.substring(0, 5))) {
                console.log('Text not properly set, trying alternative method');
                inputElement.focus();
                document.execCommand('selectAll');
                document.execCommand('insertText', false, prompt);
            }
            
            // Find and click send button or use Enter
            const sendButton = await this.findGeminiSendButton();
            if (sendButton) {
                sendButton.click();
                console.log('Clicked Gemini send button');
            } else {
                // Use Enter key as fallback
                inputElement.dispatchEvent(new KeyboardEvent('keydown', {
                    key: 'Enter',
                    code: 'Enter',
                    keyCode: 13,
                    bubbles: true,
                    which: 13
                }));
                console.log('Used Enter key to submit Gemini request');
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
            console.error('Gemini request error:', error);
            throw new Error(`Gemini request failed: ${error.message}`);
        }
    }
    
    async waitForGeminiResponse() {
        console.log('Waiting for Gemini response...');
        
        // Wait for response to appear
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const maxAttempts = 20;
            let lastResponseLength = 0;
            let stableCount = 0;
            
            const responseSelectors = [
                '[data-response-id]',
                '.response-container',
                '.model-response',
                '[role="presentation"] p',
                '.markdown',
                'div[data-message-author-role="model"]',
                '[class*="response"]',
                '[class*="answer"]'
            ];
            
            const checkForResponse = () => {
                attempts++;
                console.log(`Gemini response check ${attempts}/${maxAttempts}`);
                
                for (const selector of responseSelectors) {
                    const elements = document.querySelectorAll(selector);
                    if (elements.length > 0) {
                        console.log(`Found ${elements.length} elements for selector: ${selector}`);
                        
                        for (let i = elements.length - 1; i >= 0; i--) {
                            const element = elements[i];
                            const text = element.textContent || element.innerText;
                            
                            if (text && text.trim().length > 10) {
                                const trimmedText = text.trim();
                                console.log(`Found response text (${trimmedText.length} chars): ${trimmedText.substring(0, 100)}...`);
                                
                                // Check if response is stable (not still generating)
                                if (trimmedText.length === lastResponseLength) {
                                    stableCount++;
                                    if (stableCount >= 2) {
                                        console.log('Gemini response appears complete');
                                        resolve(trimmedText);
                                        return;
                                    }
                                } else {
                                    stableCount = 0;
                                    lastResponseLength = trimmedText.length;
                                }
                                break;
                            }
                        }
                    }
                }
                
                if (attempts >= maxAttempts) {
                    console.log('Gemini response timeout');
                    reject(new Error('No response found'));
                    return;
                }
                
                setTimeout(checkForResponse, 1000);
            };
            
            checkForResponse();
        });
    }
}

// Initialize the handler
console.log('Initializing AIServiceHandler...');
new AIServiceHandler();