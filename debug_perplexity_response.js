// Debug script to find Perplexity response elements
// Run this AFTER sending a message to Perplexity to see where the response appears

function debugPerplexityResponse() {
    console.log('=== Perplexity Response Debug ===');
    
    // Check main content area
    const main = document.querySelector('main');
    if (main) {
        console.log('Main element:', main);
        
        // Find all text-containing elements in main
        const textElements = main.querySelectorAll('*');
        const responseElements = [];
        
        textElements.forEach((el, i) => {
            const text = el.textContent || el.innerText;
            if (text && text.trim().length > 50 && !el.querySelector('*')) { // Leaf nodes with substantial text
                responseElements.push({
                    index: i,
                    tagName: el.tagName,
                    className: el.className,
                    id: el.id,
                    'data-testid': el.getAttribute('data-testid'),
                    textLength: text.length,
                    textPreview: text.trim().substring(0, 100),
                    element: el
                });
            }
        });
        
        console.log('Potential response elements:', responseElements);
        
        // Check for specific patterns
        const patterns = [
            'div[class*="answer"]',
            'div[class*="response"]',
            'div[class*="result"]',
            'div[class*="content"]',
            'div[class*="text"]',
            'p',
            'span',
            '[role="article"]',
            '[role="region"]'
        ];
        
        patterns.forEach(pattern => {
            const elements = main.querySelectorAll(pattern);
            if (elements.length > 0) {
                console.log(`Pattern "${pattern}" found ${elements.length} elements:`);
                elements.forEach((el, i) => {
                    const text = el.textContent || el.innerText;
                    if (text && text.trim().length > 20) {
                        console.log(`  ${i}: ${text.trim().substring(0, 80)}...`);
                    }
                });
            }
        });
    }
    
    // Check for any new elements that appeared recently
    console.log('\nLooking for recently added elements...');
    const allElements = document.querySelectorAll('*');
    const recentElements = [];
    
    allElements.forEach(el => {
        const text = el.textContent || el.innerText;
        if (text && text.trim().length > 30 && !el.querySelector('*')) {
            // Check if this might be a response by looking for common response patterns
            const lowerText = text.toLowerCase();
            if (lowerText.includes('answer') || lowerText.includes('result') || 
                lowerText.includes('according') || lowerText.includes('based on') ||
                text.length > 100) {
                recentElements.push({
                    tagName: el.tagName,
                    className: el.className,
                    textPreview: text.trim().substring(0, 100),
                    element: el
                });
            }
        }
    });
    
    console.log('Potential response elements by content:', recentElements);
}

// Run the debug
debugPerplexityResponse();

// Make available globally
window.debugPerplexityResponse = debugPerplexityResponse;