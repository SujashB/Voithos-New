// API Keys Configuration
// INSTRUCTIONS:
// 1. Copy this file and rename it to: config.js
// 2. Fill in your actual API keys below
// 3. config.js is gitignored and will not be pushed to GitHub

const API_KEYS = {
    // Claude/Anthropic API Key
    // Get from: https://console.anthropic.com/
    CLAUDE_API_KEY: "sk-ant-api03-your-key-here",
    
    // Reka API Key  
    // Get from: https://www.reka.ai/
    REKA_API_KEY: "your-reka-key-here",
    
    // Tavily API Key (for web search)
    // Get from: https://tavily.com/
    TAVILY_API_KEY: "tvly-your-key-here",
    
    // Groq API Key (for visual scene analysis)
    // Get from: https://console.groq.com/
    GROQ_API_KEY: "gsk-your-key-here",
    
    // Deepgram API Key (optional)
    DEEPGRAM_API_KEY: "your-deepgram-key-here",
    
    // OpenAI API Key (optional)
    OPENAI_API_KEY: "your-openai-key-here"
};

// Export for use in Lens Studio scripts
module.exports = API_KEYS;

