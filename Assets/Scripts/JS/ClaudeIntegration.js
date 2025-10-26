// @input Component.Text suggestionText {"hint":"Text to display Claude's suggestion"}
// @input Component.Text statusText {"hint":"Optional status text UI"}
// @input Component.ScriptComponent rekaEmotionScript {"hint":"Drag the RekaEmotionAnalyzer script component"}
// @input string claudeApiKey {"hint":"Anthropic API Key (x-api-key)"}
// @input string claudeModel = "claude-3-5-sonnet-20241022" {"hint":"Anthropic model"}
// @input float minInterval = 5.0 {"hint":"Min seconds between suggestions"}
// @input bool enableDebug = true

const Internet = require("LensStudio:InternetModule");

let lastSuggestionTime = 0.0;
let isProcessing = false;
let pendingTranscript = "";

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

    const now = getTime();
    if (now - lastSuggestionTime < Math.max(1.0, script.minInterval)) {
        safeLog("⏳ Throttled; waiting min interval before next suggestion");
        return;
    }

    // Pull emotion from RekaEmotionAnalyzer if available
    const emotion = getCurrentEmotionSafe();
    requestClaudeSuggestion(pendingTranscript, emotion);
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

async function requestClaudeSuggestion(transcript, emotion) {
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

    const prompt = buildPrompt(transcript, emotion);

    const payload = {
        model: script.claudeModel || "claude-3-5-sonnet-20241022",
        max_tokens: 80,
        temperature: 0.7,
        system: "You are a concise social AI assistant for AR glasses. Provide one short, natural suggestion.",
        messages: [
            { role: "user", content: prompt }
        ]
    };

    try {
        const resp = await Internet.fetch(new Request("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-api-key": script.claudeApiKey,
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

        updateSuggestionDisplay(suggestion);
        setStatus("🎯 Ready");
    } catch (e) {
        safeLog("❗ Claude exception: " + e);
        setStatus("⚠️ Error");
    } finally {
        isProcessing = false;
    }
}

function buildPrompt(transcript, emotion) {
    let p = "You are a helpful social coach.\n";
    if (emotion && emotion !== "Neutral") {
        p += "Detected emotion: " + emotion + "\n";
    }
    p += "User just said: \"" + transcript + "\"\n";
    p += "Provide ONE brief, natural suggestion the user could say next (<= 12 words).\n";
    p += "Return only the suggestion text, no quotes or punctuation extras.";
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


