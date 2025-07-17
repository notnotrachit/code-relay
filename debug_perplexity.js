// Debug script for Perplexity integration
// Run this in the browser console on perplexity.ai to debug element detection

function debugPerplexityElements() {
    console.log('=== Perplexity Debug Information ===');
    
    // Check current URL
    console.log('Current URL:', window.location.href);
    
    // Find all possible input elements
    console.log('\n--- Input Elements ---');
    const textareas = document.querySelectorAll('textarea');
    console.log('Textareas found:', textareas.length);
    textareas.forEach((el, i) => {
        const rect = el.getBoundingClientRect();
        console.log(`Textarea ${i}:`, {
            placeholder: el.placeholder,
            'data-testid': el.getAttribute('data-testid'),
            visible: rect.width > 0 && rect.height > 0,
            disabled: el.disabled,
            readOnly: el.readOnly,
            element: el
        });
    });
    
    const inputs = document.querySelectorAll('input[type="text"]');
    console.log('Text inputs found:', inputs.length);
    inputs.forEach((el, i) => {
        const rect = el.getBoundingClientRect();
        console.log(`Input ${i}:`, {
            placeholder: el.placeholder,
            'data-testid': el.getAttribute('data-testid'),
            visible: rect.width > 0 && rect.height > 0,
            disabled: el.disabled,
            readOnly: el.readOnly,
            element: el
        });
    });
    
    const contentEditables = document.querySelectorAll('[contenteditable="true"]');
    console.log('Contenteditable elements found:', contentEditables.length);
    contentEditables.forEach((el, i) => {
        const rect = el.getBoundingClientRect();
        console.log(`Contenteditable ${i}:`, {
            tagName: el.tagName,
            'data-testid': el.getAttribute('data-testid'),
            visible: rect.width > 0 && rect.height > 0,
            element: el
        });
    });
    
    // Find all possible buttons
    console.log('\n--- Button Elements ---');
    const buttons = document.querySelectorAll('button');
    console.log('Buttons found:', buttons.length);
    buttons.forEach((el, i) => {
        const rect = el.getBoundingClientRect();
        console.log(`Button ${i}:`, {
            'aria-label': el.getAttribute('aria-label'),
            'data-testid': el.getAttribute('data-testid'),
            type: el.type,
            disabled: el.disabled,
            visible: rect.width > 0 && rect.height > 0,
            textContent: el.textContent.trim().substring(0, 50),
            element: el
        });
    });
    
    // Find potential response containers
    console.log('\n--- Response Containers ---');
    const responseSelectors = [
        '[data-testid="copilot-answer"]',
        '[data-testid="answer"]',
        '.prose',
        '.answer-content',
        '.response-text',
        '[role="main"]',
        'main'
    ];
    
    responseSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
            console.log(`Found ${elements.length} elements for selector: ${selector}`);
            elements.forEach((el, i) => {
                const rect = el.getBoundingClientRect();
                console.log(`  Element ${i}:`, {
                    visible: rect.width > 0 && rect.height > 0,
                    textContent: el.textContent.trim().substring(0, 100),
                    element: el
                });
            });
        }
    });
    
    // Check for any elements with 'search' in data attributes
    console.log('\n--- Search-related Elements ---');
    const searchElements = document.querySelectorAll('[data-testid*="search"], [class*="search"], [id*="search"]');
    console.log('Search-related elements:', searchElements.length);
    searchElements.forEach((el, i) => {
        console.log(`Search element ${i}:`, {
            tagName: el.tagName,
            'data-testid': el.getAttribute('data-testid'),
            className: el.className,
            id: el.id,
            element: el
        });
    });
    
    console.log('\n=== End Debug Information ===');
}

// Auto-run debug when script loads
debugPerplexityElements();

// Make function available globally
window.debugPerplexityElements = debugPerplexityElements;