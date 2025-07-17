// Shared types and utilities for AI Proxy System

// OpenAI API compatible message format
const MessageRole = {
    SYSTEM: 'system',
    USER: 'user',
    ASSISTANT: 'assistant'
};

// Supported AI services
const AIService = {
    GEMINI: 'gemini',
    PERPLEXITY: 'perplexity'
};

// Message types for extension communication
const MessageType = {
    REQUEST: 'request',
    RESPONSE: 'response',
    STATUS: 'status',
    ERROR: 'error'
};

// Utility functions
const Utils = {
    // Generate unique request ID
    generateRequestId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },
    
    // Format OpenAI compatible response
    formatOpenAIResponse(requestId, content, model = 'gpt-3.5-turbo') {
        return {
            id: `chatcmpl-${requestId}`,
            object: 'chat.completion',
            created: Math.floor(Date.now() / 1000),
            model: model,
            choices: [{
                index: 0,
                message: {
                    role: MessageRole.ASSISTANT,
                    content: content
                },
                finish_reason: 'stop'
            }],
            usage: {
                prompt_tokens: 0,
                completion_tokens: 0,
                total_tokens: 0
            }
        };
    },
    
    // Validate OpenAI request format
    validateOpenAIRequest(body) {
        if (!body.messages || !Array.isArray(body.messages)) {
            throw new Error('Invalid request: messages array is required');
        }
        
        if (body.messages.length === 0) {
            throw new Error('Invalid request: messages array cannot be empty');
        }
        
        const lastMessage = body.messages[body.messages.length - 1];
        if (!lastMessage.content || typeof lastMessage.content !== 'string') {
            throw new Error('Invalid request: last message must have content');
        }
        
        return true;
    },
    
    // Extract service from model name
    getServiceFromModel(model) {
        if (!model) return AIService.GEMINI;
        
        const modelLower = model.toLowerCase();
        if (modelLower.includes('perplexity') || modelLower.includes('pplx')) {
            return AIService.PERPLEXITY;
        }
        
        return AIService.GEMINI;
    }
};

// Export for Node.js (server) and browser (extension)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        MessageRole,
        AIService,
        MessageType,
        Utils
    };
} else if (typeof window !== 'undefined') {
    window.AIProxyTypes = {
        MessageRole,
        AIService,
        MessageType,
        Utils
    };
}