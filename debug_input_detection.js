// Debug input detection for Perplexity
// Run this in Perplexity console to see current input elements

function debugInputDetection() {
    console.log('=== Input Detection Debug ===');
    
    // Check the specific selectors our extension uses
    const inputSelectors = [
        'div#ask-input',
        '[role="textbox"]',
        'div[contenteditable="true"]',
        'main div[contenteditable="true"]',
        'main [role="textbox"]',
        'textarea[data-testid="search-input"]',
        'textarea[placeholder*="Ask"]',
        'textarea[placeholder*="Follow up"]',
        'main input[type="text"]',
        'main textarea'
    ];
    
    inputSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        console.log(`Selector "${selector}": ${elements.length} elements found`);
        
        elements.forEach((el, i) => {
            const rect = el.getBoundingClientRect();
            const isVisible = rect.width > 0 && rect.height > 0;
            const isInteractable = !el.disabled && !el.readOnly;
            
            console.log(`  Element ${i}:`, {
                tagName: el.tagName,
                id: el.id,
                className: el.className,
                contentEditable: el.contentEditable,
                role: el.getAttribute('role'),
                visible: isVisible,
                interactable: isInteractable,
                rect: { width: rect.width, height: rect.height },
                element: el
            });
        });
    });
    
    // Check what element is currently focused
    console.log('\nCurrently focused element:', document.activeElement);
    
    // Look for any element that might be the input
    console.log('\nAll contenteditable elements:');
    document.querySelectorAll('[contenteditable="true"]').forEach((el, i) => {
        const rect = el.getBoundingClientRect();
        console.log(`${i}:`, {
            tagName: el.tagName,
            id: el.id,
            className: el.className,
            visible: rect.width > 0 && rect.height > 0,
            element: el
        });
    });
    
    console.log('\nAll elements with role="textbox":');
    document.querySelectorAll('[role="textbox"]').forEach((el, i) => {
        const rect = el.getBoundingClientRect();
        console.log(`${i}:`, {
            tagName: el.tagName,
            id: el.id,
            className: el.className,
            visible: rect.width > 0 && rect.height > 0,
            element: el
        });
    });
}

// Run the debug
debugInputDetection();

// Make available globally
window.debugInputDetection = debugInputDetection;