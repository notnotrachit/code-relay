// Debug script to find the actual response content in Perplexity
// Run this AFTER Perplexity shows a response

function debugResponseContent() {
    console.log('=== Response Content Debug ===');
    
    // Look for elements that contain actual readable text (not code)
    const allElements = document.querySelectorAll('*');
    const readableElements = [];
    
    allElements.forEach((el, i) => {
        const text = el.textContent || el.innerText;
        if (text && text.trim().length > 30 && !el.querySelector('*')) {
            const trimmedText = text.trim();
            
            // Filter out code-like content
            if (!trimmedText.includes('self.__next_f.push') &&
                !trimmedText.includes('metadata') &&
                !trimmedText.includes('$undefined') &&
                !trimmedText.includes('digest') &&
                !trimmedText.startsWith('{') &&
                !trimmedText.includes('__next') &&
                !trimmedText.includes('function') &&
                !trimmedText.includes('var ') &&
                !trimmedText.includes('const ') &&
                trimmedText.length < 2000) {
                
                readableElements.push({
                    index: i,
                    tagName: el.tagName,
                    className: el.className,
                    id: el.id,
                    textLength: trimmedText.length,
                    textPreview: trimmedText.substring(0, 150),
                    element: el,
                    selector: getElementSelector(el)
                });
            }
        }
    });
    
    // Sort by text length
    readableElements.sort((a, b) => b.textLength - a.textLength);
    
    console.log('Readable text elements (filtered, sorted by length):');
    readableElements.slice(0, 10).forEach((item, i) => {
        console.log(`${i + 1}. ${item.selector} (${item.textLength} chars):`);
        console.log(`   "${item.textPreview}..."`);
        console.log(`   Element:`, item.element);
    });
    
    // Look specifically for response-like content
    console.log('\n=== Likely Response Content ===');
    const responseKeywords = ['answer', 'result', 'according', 'based on', 'explanation', 'solution', 'equals', 'is'];
    const likelyResponses = readableElements.filter(item => {
        const lowerText = item.textPreview.toLowerCase();
        return responseKeywords.some(keyword => lowerText.includes(keyword)) && item.textLength > 50;
    });
    
    console.log('Most likely response elements:');
    likelyResponses.slice(0, 5).forEach((item, i) => {
        console.log(`${i + 1}. ${item.selector}:`);
        console.log(`   "${item.textPreview}..."`);
    });
    
    // Check for elements that appeared recently
    console.log('\n=== Recent Elements Check ===');
    const main = document.querySelector('main');
    if (main) {
        const mainElements = main.querySelectorAll('*');
        const recentElements = [];
        
        // Check last 20 elements in main
        for (let i = Math.max(0, mainElements.length - 20); i < mainElements.length; i++) {
            const el = mainElements[i];
            const text = el.textContent || el.innerText;
            if (text && text.trim().length > 30 && !el.querySelector('*')) {
                const trimmedText = text.trim();
                if (!trimmedText.includes('self.__next_f.push') &&
                    !trimmedText.includes('metadata') &&
                    trimmedText.length < 1000) {
                    recentElements.push({
                        text: trimmedText,
                        element: el,
                        selector: getElementSelector(el)
                    });
                }
            }
        }
        
        console.log('Recent elements in main:');
        recentElements.forEach((item, i) => {
            console.log(`${i + 1}. ${item.selector}: "${item.text.substring(0, 100)}..."`);
        });
    }
}

function getElementSelector(element) {
    if (element.id) return `#${element.id}`;
    if (element.className) {
        const classes = element.className.split(' ').filter(c => c.length > 0);
        if (classes.length > 0) return `${element.tagName.toLowerCase()}.${classes[0]}`;
    }
    if (element.getAttribute('data-testid')) return `[data-testid="${element.getAttribute('data-testid')}"]`;
    return element.tagName.toLowerCase();
}

// Run the debug
debugResponseContent();

// Make available globally
window.debugResponseContent = debugResponseContent;