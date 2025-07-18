// Fixed waitForPerplexityResponse method - replace the existing one

async waitForPerplexityResponse() {
    console.log('Starting to wait for Perplexity response...');
    
    // Wait a moment for the request to be sent
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Target the specific markdown content div that contains responses
    return new Promise((resolve, reject) => {
        let attempts = 0;
        const maxAttempts = 25;
        
        const checkForResponse = () => {
            attempts++;
            console.log(`Checking for response in markdown-content ${attempts}/${maxAttempts}`);
            
            // First, look for the specific markdown content div
            const markdownElements = document.querySelectorAll('[id^="markdown-content-"]');
            console.log(`Found ${markdownElements.length} markdown-content elements`);
            
            for (const element of markdownElements) {
                // Look for the prose content within the markdown element
                const proseElement = element.querySelector('.prose');
                let text = '';
                
                if (proseElement) {
                    // Extract text from prose element, excluding CSS and styling
                    text = proseElement.textContent || proseElement.innerText;
                } else {
                    // Fallback to the markdown element itself
                    text = element.textContent || element.innerText;
                }
                
                if (text && text.trim().length > 10) {
                    const trimmedText = text.trim();
                    console.log(`Found content in ${element.id}: "${trimmedText.substring(0, 100)}..."`);
                    
                    // Filter out CSS, styling, and unwanted content
                    if (!trimmedText.includes('self.__next_f.push') &&
                        !trimmedText.includes('metadata') &&
                        !trimmedText.includes('__CF$cv$params') &&
                        !trimmedText.includes('challenge-platform') &&
                        !trimmedText.includes('function()') &&
                        !trimmedText.includes('.picker-dialog') &&
                        !trimmedText.includes('background-color') &&
                        !trimmedText.includes('border:') &&
                        !trimmedText.includes('position:absolute') &&
                        !trimmedText.includes('z-index') &&
                        !trimmedText.includes('box-shadow') &&
                        !trimmedText.includes('overflow:') &&
                        !trimmedText.includes('rgba(') &&
                        !trimmedText.includes('margin-right') &&
                        !trimmedText.includes('vertical-align') &&
                        !trimmedText.includes('katex-') &&
                        !trimmedText.startsWith('{') &&
                        !trimmedText.startsWith('.') &&
                        !trimmedText.startsWith('(function') &&
                        trimmedText.length < 2000 &&
                        trimmedText.length > 20) {
                        
                        console.log(`Valid response found in ${element.id}`);
                        resolve(trimmedText);
                        return;
                    } else {
                        console.log(`Filtered out content from ${element.id} (looks like CSS/code)`);
                    }
                }
            }
            
            // Fallback: look for any div with id containing "markdown-content"
            const fallbackElement = document.querySelector('div[id*="markdown-content"]');
            if (fallbackElement) {
                const text = fallbackElement.textContent || fallbackElement.innerText;
                if (text && text.trim().length > 10) {
                    console.log('Using fallback markdown element:', text.substring(0, 100));
                    resolve(text.trim());
                    return;
                }
            }
            
            if (attempts >= maxAttempts) {
                console.log('Max attempts reached, no valid response found');
                reject(new Error('No response found in markdown-content elements'));
                return;
            }
            
            setTimeout(checkForResponse, 1000);
        };
        
        checkForResponse();
    });
}