// Live response debugging for Perplexity
// Run this AFTER Perplexity shows a response to see where it appears

function debugLiveResponse() {
    console.log('=== Live Response Debug ===');
    
    // Find all elements that contain substantial text
    const allElements = document.querySelectorAll('*');
    const responseElements = [];
    
    allElements.forEach((el, i) => {
        const text = el.textContent || el.innerText;
        if (text && text.trim().length > 50 && !el.querySelector('*')) {
            // This is a leaf node with substantial text
            responseElements.push({
                index: i,
                tagName: el.tagName,
                className: el.className,
                id: el.id,
                'data-testid': el.getAttribute('data-testid'),
                textLength: text.length,
                textPreview: text.trim().substring(0, 150),
                element: el,
                selector: getSelector(el)
            });
        }
    });
    
    // Sort by text length (longer responses first)
    responseElements.sort((a, b) => b.textLength - a.textLength);
    
    console.log('All substantial text elements (sorted by length):');
    responseElements.forEach((item, i) => {
        if (i < 10) { // Show top 10
            console.log(`${i + 1}. ${item.tagName} (${item.textLength} chars): "${item.textPreview}..."`);
            console.log(`   Selector: ${item.selector}`);
            console.log(`   Element:`, item.element);
        }
    });
    
    // Look specifically for response-like content
    console.log('\n=== Response-like Content ===');
    const responseKeywords = ['answer', 'result', 'according', 'based on', 'explanation', 'solution'];
    const likelyResponses = responseElements.filter(item => {
        const lowerText = item.textPreview.toLowerCase();
        return responseKeywords.some(keyword => lowerText.includes(keyword)) || item.textLength > 100;
    });
    
    console.log('Likely response elements:');
    likelyResponses.forEach((item, i) => {
        console.log(`${i + 1}. ${item.selector}: "${item.textPreview}..."`);
    });
    
    // Check main area specifically
    const main = document.querySelector('main');
    if (main) {
        console.log('\n=== Main Area Analysis ===');
        const mainText = main.textContent || main.innerText;
        console.log('Total main text length:', mainText.length);
        
        // Find the longest text elements in main
        const mainElements = main.querySelectorAll('*');
        const mainTexts = [];
        mainElements.forEach(el => {
            const text = el.textContent || el.innerText;
            if (text && text.trim().length > 30 && !el.querySelector('*')) {
                mainTexts.push({
                    text: text.trim(),
                    length: text.length,
                    element: el,
                    selector: getSelector(el)
                });
            }
        });
        
        mainTexts.sort((a, b) => b.length - a.length);
        console.log('Longest text in main (top 5):');
        mainTexts.slice(0, 5).forEach((item, i) => {
            console.log(`${i + 1}. (${item.length} chars) ${item.selector}: "${item.text.substring(0, 100)}..."`);
        });
    }
}

function getSelector(element) {
    if (element.id) return `#${element.id}`;
    if (element.className) return `${element.tagName.toLowerCase()}.${element.className.split(' ')[0]}`;
    if (element.getAttribute('data-testid')) return `[data-testid="${element.getAttribute('data-testid')}"]`;
    return element.tagName.toLowerCase();
}

// Run the debug
debugLiveResponse();

// Make available globally
window.debugLiveResponse = debugLiveResponse;