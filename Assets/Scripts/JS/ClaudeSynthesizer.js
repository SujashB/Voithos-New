// @input Asset.Texture cameraTexture {"hint":"Drag the Device Camera Texture here (for reference)"}
// @input Component.Text statusText {"hint":"Text component to display status updates"}
// @input Component.Script speechToTextScript {"hint":"Speech to text script component - will read stored data"}
// @input Component.Script groqAnalyzerScript {"hint":"Groq scene analyzer script"}
// @input Component.Script rekaEmotionScript {"hint":"Reka emotion analyzer script"}
// @input float analysisInterval = 5.0 {"hint":"Seconds between synthesis"}
// @input string claudeApiKey {"hint":"Your Claude API key"}
// @input bool enableDebugMode = true

const Internet = require("LensStudio:InternetModule");

let isProcessing = false;
let lastAnalysisTime = 0;
let currentStatus = "Analyzing...";
let statusHistory = [];
const MAX_HISTORY = 3;

script.createEvent("OnStartEvent").bind(() => {
    if (!script.cameraTexture) {
        print("❗ ERROR: Camera texture not set!");
        return;
    }
    
    if (!script.claudeApiKey || script.claudeApiKey === "") {
        print("❗ ERROR: Claude API key not set!");
        return;
    }
    
    if (!script.speechToTextScript || !script.groqAnalyzerScript || !script.rekaEmotionScript) {
        print("❗ ERROR: One or more input scripts not set!");
        return;
    }
    
    if (!script.statusText) {
        print("⚠️ WARNING: Status text component not set");
    } else {
        updateStatusDisplay("Analyzing...");
    }
    
    if (script.enableDebugMode) {
        print("✅ ClaudeSynthesizer initialized");
    }
    
    // Start the analysis loop
    scheduleNextAnalysis();
});

function scheduleNextAnalysis() {
    if (script.enableDebugMode) {
        print("⏰ [Loop] Scheduling next synthesis in " + script.analysisInterval + " seconds...");
    }
    
    const delayedEvent = script.createEvent("DelayedCallbackEvent");
    delayedEvent.bind(() => {
        if (script.enableDebugMode) {
            print("🔄 [Loop] Timer fired! Processing: " + isProcessing);
        }
        
        if (!isProcessing) {
            synthesizeContext();
        } else {
            print("⏸️ [Loop] Skipping synthesis - still processing previous request");
        }
        scheduleNextAnalysis(); // Continue the loop
    });
    delayedEvent.reset(script.analysisInterval);
}

async function synthesizeContext() {
    if (!script.cameraTexture || isProcessing) {
        if (script.enableDebugMode) {
            print("⚠️ [Analysis] Skipped - No texture or already processing");
        }
        return;
    }
    
    isProcessing = true;
    lastAnalysisTime = getTime();
    
    print("🤖 [Analysis] Starting context synthesis... (Time: " + lastAnalysisTime.toFixed(2) + ")");
    
    try {
        print("📸 [Analysis] Gathering data from other scripts...");
        
        // Get all current data from the other scripts
        let speechTranscript = "";
        let sceneAnalysis = "";
        let currentEmotion = "";
        
        // Get speech from persistent storage (database)
        if (global.persistentStorageSystem) {
            const store = global.persistentStorageSystem.store;
            speechTranscript = store.getString("speechTranscript") || "";
            
            if (speechTranscript.length > 0) {
                const transcriptCount = store.getInt("transcriptCount") || 0;
                print("📝 [CLAUDE] Speech: " + speechTranscript.length + " chars | " + transcriptCount + " transcriptions");
                print("📝 [CLAUDE] Preview: '" + speechTranscript.substring(0, 50) + "...'");
            } else {
                print("⚠️  [CLAUDE] No speech data yet");
            }
        } else {
            print("⚠️  [CLAUDE] Database not available");
        }
        
        // Get Groq scene analysis
        if (script.groqAnalyzerScript && script.groqAnalyzerScript.api && script.groqAnalyzerScript.api.getCurrentAnalysis) {
            sceneAnalysis = script.groqAnalyzerScript.api.getCurrentAnalysis() || "";
            if (sceneAnalysis) {
                print("🗣️  [CLAUDE] Scene: " + sceneAnalysis.substring(0, 50) + "...");
            }
        }
        
        // Get Reka emotion
        if (script.rekaEmotionScript && script.rekaEmotionScript.api && script.rekaEmotionScript.api.getCurrentEmotion) {
            currentEmotion = script.rekaEmotionScript.api.getCurrentEmotion() || "";
            if (currentEmotion) {
                print("😊 [CLAUDE] Emotion: " + currentEmotion);
            }
        }
        
        // Send to Claude
        await sendToClaude(speechTranscript, sceneAnalysis, currentEmotion);
        
    } catch (error) {
        print("❗ [Analysis] ERROR synthesizing context: " + error);
    } finally {
        print("✔️ [Analysis] Complete - Setting isProcessing to false");
        isProcessing = false;
    }
}

async function sendToClaude(speech, scene, emotion) {
    print("🌐 [API] Preparing Claude synthesis request...");
    
    const systemPrompt = "You are a conversational assistant in AR glasses. Your ONLY job is to suggest BRIEF (1-2 sentences max) helpful things to say based on the context. Consider emotions, scene, and conversation. Give practical, empathetic, concise suggestions. NO status updates, NO summaries - ONLY suggested responses the user could say.";
    
    let userPrompt = "CONTEXT:\n\n";
    
    if (speech && speech.trim()) {
        userPrompt += `What they said: "${speech}"\n\n`;
    }
    
    if (scene && scene.trim()) {
        userPrompt += `What I see around them: ${scene.substring(0, 150)}\n\n`;
    }
    
    if (emotion && emotion.trim() && emotion !== "Neutral") {
        userPrompt += `Their emotional state: ${emotion}\n\n`;
    }
    
    userPrompt += "Based on this context, suggest 1-2 brief, natural conversational responses they could say. Be empathetic and context-aware. Maximum 20 words total. ONLY give suggested phrases, nothing else.";
    
    const requestPayload = {
        model: "claude-haiku-4-5",
        max_tokens: 200,
        system: systemPrompt,
        messages: [
            {
                role: "user",
                content: userPrompt
            }
        ]
    };
    
    print("📤 [CLAUDE] Sending to Claude API (" + userPrompt.length + " chars)...");
    
    try {
        const response = await Internet.fetch(new Request(
            "https://api.anthropic.com/v1/messages",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-api-key": script.claudeApiKey,
                    "anthropic-version": "2023-06-01"
                },
                body: JSON.stringify(requestPayload)
            }
        ));
        
        if (response.status === 200) {
            const data = await response.json();

            // Extract text from Claude response
            let statusText = "";

            if (data && data.content && Array.isArray(data.content)) {
                for (let i = 0; i < data.content.length; i++) {
                    if (data.content[i].type === "text") {
                        statusText = data.content[i].text.trim();
                        break;
                    }
                }
            }

            if (statusText) {
                print("✅ [CLAUDE] Response: '" + statusText + "'");

                // Add to history
                statusHistory.push(statusText);
                if (statusHistory.length > MAX_HISTORY) {
                    statusHistory.shift();
                }

                // Update display
                currentStatus = statusText;
                updateStatusDisplay(statusText);
            } else {
                print("⚠️  [CLAUDE] No response");
            }
        } else {
            print("❌ [CLAUDE] API error: " + response.status);
            updateStatusDisplay("API Error");
        }
    } catch (error) {
        print("❌ [CLAUDE] Failed: " + error);
        updateStatusDisplay("Network Error");
    }
}

function updateStatusDisplay(status) {
    if (!script.statusText) {
        return;
    }
    
    script.statusText.text = status;
}

// Public API for other scripts
script.api.getCurrentStatus = function() {
    return currentStatus;
};

script.api.getStatusHistory = function() {
    return statusHistory.slice(); // Return copy of history
};

script.api.forceSynthesis = function() {
    if (!isProcessing) {
        synthesizeContext();
    }
};
