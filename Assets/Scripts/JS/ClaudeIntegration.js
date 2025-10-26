// @input Component.Text suggestionText {"hint":"Text to display Claude's suggestion"}
// @input Component.Text statusText {"hint":"Optional status text UI"}
// @input Component.ScriptComponent rekaEmotionScript {"hint":"Drag the RekaEmotionAnalyzer script component"}
// @input Component.ScriptComponent groqSceneAnalyzerScript {"hint":"Drag the GroqSceneAnalyzer script component"}
// @input string claudeApiKey {"hint":"Anthropic API Key (x-api-key)"}
// @input string claudeModel = "claude-3-5-sonnet-20241022" {"hint":"Anthropic model"}
// @input float minInterval = 5.0 {"hint":"Min seconds between suggestions"}
// @input bool enableDebug = true
// @input int maxHistorySize = 25 {"hint":"Max conversation history items (~12 exchanges)"}

const Internet = require("LensStudio:InternetModule");

let lastSuggestionTime = 0.0;
let isProcessing = false;
let pendingTranscript = "";
let lastUserTranscript = ""; // Store the user's actual question for Tavily
let conversationHistory = []; // Store conversation history [{role: "user", content: "..."}, {role: "assistant", content: "..."}]

script.createEvent("OnStartEvent").bind(function() {
    safeLog("✅ ClaudeIntegration initialized");

    // Subscribe to VoiceML updates to receive eventData from Snapchat STT without modifying the STT script
    try {
        const VoiceMLModule = require("LensStudio:VoiceMLModule");
        VoiceMLModule.onListeningUpdate.add(function(eventData) {
            handleListeningUpdate(eventData);
        });
        safeLog("🎧 Subscribed to VoiceML onListeningUpdate");
    } catch (e) {
        safeLog("⚠️ VoiceMLModule not available or not initialized yet: " + e);
    }
});

function handleListeningUpdate(eventData) {
    // Mirror core eventData to logs for debugging if desired
    if (eventData && eventData.transcription) {
        safeLog("📝 STT update | final=" + eventData.isFinalTranscription + " | text='" + eventData.transcription + "'");
    }

    // Only act on final transcriptions
    if (!eventData || !eventData.isFinalTranscription || !eventData.transcription) {
        return;
    }

    pendingTranscript = (eventData.transcription || "").trim();
    if (pendingTranscript.length === 0) {
        return;
    }
    
    // Store the user's transcript for Tavily to use
    lastUserTranscript = pendingTranscript;
    safeLog("📝 Stored user transcript for Tavily: " + lastUserTranscript);

    const now = getTime();
    if (now - lastSuggestionTime < Math.max(1.0, script.minInterval)) {
        safeLog("⏳ Throttled; waiting min interval before next suggestion");
        return;
    }

    // Pull emotion from RekaEmotionAnalyzer if available
    const emotion = getCurrentEmotionSafe();
    // Pull scene analysis from GroqSceneAnalyzer if available
    const sceneAnalysis = getCurrentSceneAnalysisSafe();
    requestClaudeSuggestion(pendingTranscript, emotion, sceneAnalysis);
}

function getCurrentEmotionSafe() {
    try {
        if (script.rekaEmotionScript && script.rekaEmotionScript.api && script.rekaEmotionScript.api.getCurrentEmotion) {
            const e = script.rekaEmotionScript.api.getCurrentEmotion();
            if (e && typeof e === 'string') {
                return e;
            }
        }
    } catch (e) {
        safeLog("⚠️ Failed to get emotion from Reka: " + e);
    }
    return "Neutral";
}

function getCurrentSceneAnalysisSafe() {
    try {
        if (script.groqSceneAnalyzerScript && script.groqSceneAnalyzerScript.api && script.groqSceneAnalyzerScript.api.getCurrentAnalysis) {
            const scene = script.groqSceneAnalyzerScript.api.getCurrentAnalysis();
            if (scene && typeof scene === 'string' && scene.length > 0) {
                return scene;
            }
        }
    } catch (e) {
        safeLog("⚠️ Failed to get scene analysis from Groq: " + e);
    }
    return "";
}

async function requestClaudeSuggestion(transcript, emotion, sceneAnalysis) {
    if (isProcessing) {
        safeLog("⏸️ Already processing a suggestion");
        return;
    }
    if (!script.claudeApiKey || script.claudeApiKey.length === 0) {
        safeLog("❗ Missing Claude API Key");
        return;
    }

    isProcessing = true;
    lastSuggestionTime = getTime();
    setStatus("💭 Thinking...");

    safeLog("========================================");
    safeLog("🤖 SENDING TO CLAUDE");
    safeLog("========================================");
    safeLog("📝 Transcript: " + transcript);
    safeLog("😊 Emotion: " + emotion);
    safeLog("👁️ Scene Analysis: " + (sceneAnalysis || "No scene data"));
    safeLog("📚 Conversation History: " + conversationHistory.length + " messages");
    safeLog("🔑 API Key Length: " + script.claudeApiKey.length);
    safeLog("🔑 API Key First 10 chars: " + script.claudeApiKey.substring(0, 10) + "...");
    safeLog("🔑 API Key Trimmed: " + script.claudeApiKey.trim().substring(0, 10) + "...");
    safeLog("========================================");

    const prompt = buildPrompt(transcript, emotion, sceneAnalysis);
    
    // Trim the API key to remove any whitespace
    const apiKey = script.claudeApiKey.trim();

    // Build messages array with conversation history + current prompt
    let messages = [];
    
    // Add conversation history if available
    if (conversationHistory.length > 0) {
        safeLog("📚 Including conversation history (" + conversationHistory.length + " messages)");
        messages = messages.concat(conversationHistory);
    }
    
    // Add current prompt
    messages.push({ role: "user", content: prompt });
    
    safeLog("📝 Total messages: " + messages.length + " (includes history)");
    
    const payload = {
        model: script.claudeModel || "claude-3-5-sonnet-20241022",
        max_tokens: 100,
        temperature: 0.7,
        system: "You are a real-time conversation coach for AR glasses. Analyze the user's speech, emotion, and what they are seeing to provide ONE short, actionable conversation suggestion that helps them have a more engaging and fruitful conversation. Keep suggestions under 12 words. Be natural and conversational. Use visual context from their field of view to make more relevant suggestions. Remember the conversation context and build on previous exchanges.",
        messages: messages
    };

    try {
        safeLog("📤 Sending request to Claude API...");
        safeLog("🔑 Using API Key: " + apiKey.substring(0, 15) + "..." + apiKey.substring(apiKey.length - 5));
        
        const resp = await Internet.fetch(new Request("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-api-key": apiKey,
                "anthropic-version": "2023-06-01"
            },
            body: JSON.stringify(payload)
        }));

        safeLog("📥 Claude status: " + resp.status);
        if (resp.status !== 200) {
            const t = await resp.text();
            safeLog("❗ Claude error: " + t);
            setStatus("⚠️ Error");
            isProcessing = false;
            return;
        }

        const data = await resp.json();
        let suggestion = extractClaudeText(data) || "";
        suggestion = (suggestion || "").trim();
        if (suggestion.length === 0) {
            setStatus("⚠️ No suggestion");
            isProcessing = false;
            return;
        }

    safeLog("========================================");
    safeLog("💡 CLAUDE SUGGESTION:");
    safeLog(suggestion);
    safeLog("========================================");

    // Store this exchange in conversation history
    addToConversationHistory(transcript, suggestion);
    
    updateSuggestionDisplay(suggestion);
    setStatus("🎯 Ready");
    } catch (e) {
        safeLog("❗ Claude exception: " + e);
        setStatus("⚠️ Error");
    } finally {
        isProcessing = false;
    }
}

function buildPrompt(transcript, emotion, sceneAnalysis) {
    const mood = emotion || "Neutral";
    
    let p = "CONVERSATION CONTEXT:\n";
    p += "━━━━━━━━━━━━━━━━━━━━━━\n";
    
    // Mention conversation history if available
    if (conversationHistory.length > 0) {
        p += `📚 You have ${conversationHistory.length / 2} previous exchanges with this user - use this context to build on the conversation.\n`;
    }
    
    p += `User's Detected Emotion: ${mood}\n`;
    p += `What they said: "${transcript}"\n`;
    
    // Add visual context if available
    if (sceneAnalysis && sceneAnalysis.length > 0) {
        p += `What they are seeing: ${sceneAnalysis}\n`;
    }
    p += "\n";

    p += "TASK:\n";
    p += "You are an empathetic conversation coach.\n";
    p += "Analyze what the user said and their emotional tone carefully.\n";
    if (conversationHistory.length > 0) {
        p += "Use the conversation history to make your suggestion coherent and build on previous topics naturally.\n";
    }
    if (sceneAnalysis && sceneAnalysis.length > 0) {
        p += "You also have visual context about what they are seeing - use this to make your suggestion more relevant and contextual.\n";
    }
    p += "Generate ONE personalized and emotionally intelligent suggestion that:\n";
    p += "- Builds genuine rapport with the listener\n";
    p += "- Keeps the dialogue natural and human-like\n";
    p += "- Matches or gently balances their emotion\n";
    p += "- Uses language that feels natural for the user's tone and context\n";
    p += "- When conversations feel dry or run out of topics, use visual context to notice and mention something specific about the other person (their outfit, accessories, body language, what they're holding, etc.)\n";
    
    if (mood === "Happy") {
        p += "- Reflect positivity and appreciation of their excitement\n";
    } else if (mood === "Sad" || mood === "Fearful") {
        p += "- Offer warmth or reassurance, avoid sounding forced or overly cheerful\n";
    } else if (mood === "Angry") {
        p += "- Stay calm, empathetic, and redirect toward understanding\n";
    } else if (mood === "Surprised") {
        p += "- Respond with curiosity and shared wonder\n";
    } else if (mood === "Neutral") {
        p += "- Keep tone balanced and open-ended\n";
    }

    p += "\nSTRICT RULES:\n";
    p += "- Output ONLY one sentence (12 words max)\n";
    p += "- DO NOT use generic filler like 'That's interesting' or 'Cool'\n";
    p += "- DO NOT fabricate any new facts, names, or emotions\n";
    p += "- Personalize response to the tone and content of their message\n";
    p += "- Be specific, natural, and emotionally aligned\n\n";

    p += "OUTPUT FORMAT:\n";
    p += "Respond with ONLY the suggested sentence — no explanations or prefixes.\n\n";

    p += "YOUR SUGGESTION (max 12 words):";
    
    return p;
}


function extractClaudeText(data) {
    // Claude responses often have { content: [ { type: 'text', text: '...' } ] }
    try {
        if (Array.isArray(data?.content) && data.content.length > 0) {
            const block = data.content.find(function (b) { return typeof b?.text === 'string' && b.text.length > 0; });
            if (block) { return block.text; }
        }
        if (Array.isArray(data?.content) && data.content.length > 0 && typeof data.content[0] === 'string') {
            return data.content[0];
        }
        if (data?.text && typeof data.text === 'string') { return data.text; }
    } catch (e) {
        safeLog("⚠️ Failed to parse Claude body: " + e);
    }
    const preview = JSON.stringify(data || {}).slice(0, 400);
    safeLog("ℹ️ Unrecognized Claude shape: " + preview);
    return "";
}

function addToConversationHistory(userMessage, assistantResponse) {
    // Add user message
    conversationHistory.push({
        role: "user",
        content: userMessage
    });
    
    // Add assistant response
    conversationHistory.push({
        role: "assistant",
        content: assistantResponse
    });
    
    // Trim history to max size (keep most recent)
    if (conversationHistory.length > script.maxHistorySize) {
        const removeCount = conversationHistory.length - script.maxHistorySize;
        conversationHistory = conversationHistory.slice(removeCount);
        safeLog("🗂️ Trimmed conversation history (removed " + removeCount + " oldest messages)");
    }
    
    safeLog("💾 Added to history. Current history size: " + conversationHistory.length);
}

function clearConversationHistory() {
    conversationHistory = [];
    safeLog("🗑️ Conversation history cleared");
}

function updateSuggestionDisplay(s) {
    if (script.suggestionText) {
        script.suggestionText.text = "💡 " + s;
        // gold color
        script.suggestionText.textFill.color = new vec4(1.0, 0.84, 0.0, 1.0);
    }
    safeLog("✅ Suggestion: " + s);
}

function setStatus(s) {
    if (script.statusText) {
        script.statusText.text = s;
    }
}

function safeLog(msg) {
    if (script.enableDebug) { print(msg); }
}

// Optional external hook if another script wants to forward STT events directly
script.api.onTranscriptionUpdate = function(eventData) {
    handleListeningUpdate(eventData);
};

// Expose the user's transcript for Tavily to search
script.api.getUserTranscript = function() {
    return lastUserTranscript;
};

// Expose conversation history management
script.api.getConversationHistory = function() {
    return conversationHistory.slice(); // Return copy
};

script.api.clearConversationHistory = function() {
    clearConversationHistory();
};

script.api.getHistorySize = function() {
    return conversationHistory.length;
};


