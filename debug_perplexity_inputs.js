// Enhanced input detection for Perplexity
// Run this in the browser console on perplexity.ai to find the actual input elements

function debugPerplexityInputs() {
    console.log('=== Enhanced Input Detection ===');

    // Check all input types
    console.log('All inputs:', document.querySelectorAll('input'));
    console.log('All textareas:', document.querySelectorAll('textarea'));
    console.log('All contenteditable:', document.querySelectorAll('[contenteditable]'));

    // Check inside main element specifically
    const main = document.querySelector('main');
    if (main) {
        console.log('Inputs in main:', main.querySelectorAll('input'));
        console.log('Textareas in main:', main.querySelectorAll('textarea'));
        console.log('Contenteditable in main:', main.querySelectorAll('[contenteditable]'));
    }

    // Check for any element that might be the search input
    const searchElements = document.querySelectorAll('[data-testid*="search"]');
    searchElements.forEach((el, i) => {
        console.log(`Search element ${i}:`, el);
        console.log(`  Inputs inside:`, el.querySelectorAll('input'));
        console.log(`  Textareas inside:`, el.querySelectorAll('textarea'));
        console.log(`  Contenteditable inside:`, el.querySelectorAll('[contenteditable]'));
    });

    // Look for any element with placeholder text
    const elementsWithPlaceholder = document.querySelectorAll('[placeholder]');
    console.log('Elements with placeholder:', elementsWithPlaceholder);
    elementsWithPlaceholder.forEach((el, i) => {
        console.log(`Placeholder element ${i}:`, {
            tagName: el.tagName,
            placeholder: el.placeholder,
            type: el.type,
            visible: el.getBoundingClientRect().width > 0,
            element: el
        });
    });

    // Check if there's a form
    const forms = document.querySelectorAll('form');
    console.log('Forms found:', forms);
    forms.forEach((form, i) => {
        console.log(`Form ${i} inputs:`, form.querySelectorAll('input, textarea, [contenteditable]'));
    });

    // Try to find the actual input by looking for common patterns
    const possibleInputs = document.querySelectorAll('*');
    const inputLikeElements = [];
    possibleInputs.forEach(el => {
        if (el.placeholder && el.placeholder.toLowerCase().includes('ask')) {
            inputLikeElements.push(el);
        }
        if (el.getAttribute('role') === 'textbox') {
            inputLikeElements.push(el);
        }
        if (el.getAttribute('aria-label') && el.getAttribute('aria-label').toLowerCase().includes('search')) {
            inputLikeElements.push(el);
        }
    });
    console.log('Input-like elements:', inputLikeElements);

    // Check for elements with role="textbox"
    const textboxElements = document.querySelectorAll('[role="textbox"]');
    console.log('Elements with role="textbox":', textboxElements);

    // Check for any div that might be acting as an input
    const editableDivs = document.querySelectorAll('div[contenteditable], div[role="textbox"]');
    console.log('Editable divs:', editableDivs);

    // Look for elements with specific classes that might indicate input
    const inputClasses = ['input', 'search', 'textbox', 'field'];
    inputClasses.forEach(className => {
        const elements = document.querySelectorAll(`[class*="${className}"]`);
        if (elements.length > 0) {
            console.log(`Elements with class containing "${className}":`, elements);
        }
    });

    console.log('\n=== Focus Detection ===');
    console.log('Instructions: Click on the Perplexity input field, then run checkFocusedElement()');
}

function checkFocusedElement() {
    console.log('Currently focused element:', document.activeElement);
    const focused = document.activeElement;
    if (focused) {
        console.log('Focused element details:', {
            tagName: focused.tagName,
            type: focused.type,
            placeholder: focused.placeholder,
            'data-testid': focused.getAttribute('data-testid'),
            className: focused.className,
            id: focused.id,
            role: focused.getAttribute('role'),
            contentEditable: focused.contentEditable,
            element: focused
        });
    }
}

function findSubmitButton() {
    console.log('\n=== Submit Button Detection ===');
    
    // Look for buttons that might be submit buttons
    const buttons = document.querySelectorAll('button');
    const submitButtons = [];
    
    buttons.forEach((btn, i) => {
        const rect = btn.getBoundingClientRect();
        const isVisible = rect.width > 0 && rect.height > 0;
        const hasSubmitText = btn.textContent.toLowerCase().includes('submit') || 
                             btn.textContent.toLowerCase().includes('send') ||
                             btn.textContent.toLowerCase().includes('search');
        const hasSubmitType = btn.type === 'submit';
        const hasSubmitIcon = btn.querySelector('svg') !== null;
        
        if (isVisible && (hasSubmitText || hasSubmitType || hasSubmitIcon)) {
            submitButtons.push({
                index: i,
                element: btn,
                text: btn.textContent.trim(),
                type: btn.type,
                'aria-label': btn.getAttribute('aria-label'),
                'data-testid': btn.getAttribute('data-testid'),
                hasIcon: hasSubmitIcon
            });
        }
    });
    
    console.log('Potential submit buttons:', submitButtons);
    
    // Also check for any button near the input area
    const main = document.querySelector('main');
    if (main) {
        const mainButtons = main.querySelectorAll('button');
        console.log('Buttons in main area:', mainButtons);
    }
}

// Auto-run the debug function
debugPerplexityInputs();

// Make functions available globally
window.debugPerplexityInputs = debugPerplexityInputs;
window.checkFocusedElement = checkFocusedElement;
window.findSubmitButton = findSubmitButton;