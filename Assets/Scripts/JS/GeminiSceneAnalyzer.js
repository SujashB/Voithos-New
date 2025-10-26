// @input Asset.Texture cameraTexture {"hint":"Drag the Device Camera Texture here"}
// @input Component.Text sceneText {"hint":"Text component to display scene analysis"}
// @input float analysisInterval = 10.0 {"hint":"Seconds between scene analyses"}
// @input string geminiApiKey {"hint":"Your Gemini API key"}
// @input bool enableDebugMode = true

const Internet = require("LensStudio:InternetModule");

let isProcessing = false;
let lastAnalysisTime = 0;
let currentAnalysis = "Analyzing...";
let analysisHistory = [];
const MAX_HISTORY = 3;

script.createEvent("OnStartEvent").bind(() => {
    if (!script.cameraTexture) {
        print("❗ ERROR: Camera texture not set!");
        return;
    }
    
    if (!script.geminiApiKey || script.geminiApiKey === "") {
        print("❗ ERROR: Gemini API key not set!");
        return;
    }
    
    if (!script.sceneText) {
        print("⚠️ WARNING: Scene text component not set");
    } else {
        updateSceneDisplay("Analyzing...");
    }
    
    if (script.enableDebugMode) {
        print("✅ GeminiSceneAnalyzer initialized");
    }
    
    // Start the analysis loop
    scheduleNextAnalysis();
});

function scheduleNextAnalysis() {
    if (script.enableDebugMode) {
        print("⏰ [Loop] Scheduling next analysis in " + script.analysisInterval + " seconds...");
    }
    
    const delayedEvent = script.createEvent("DelayedCallbackEvent");
    delayedEvent.bind(() => {
        if (script.enableDebugMode) {
            print("🔄 [Loop] Timer fired! Processing: " + isProcessing);
        }
        
        if (!isProcessing) {
            analyzeScene();
        } else {
            print("⏸️ [Loop] Skipping analysis - still processing previous request");
        }
        scheduleNextAnalysis(); // Continue the loop
    });
    delayedEvent.reset(script.analysisInterval);
}

async function analyzeScene() {
    if (!script.cameraTexture || isProcessing) {
        if (script.enableDebugMode) {
            print("⚠️ [Analysis] Skipped - No texture or already processing");
        }
        return;
    }
    
    isProcessing = true;
    lastAnalysisTime = getTime();
    
    print("🔍 [Analysis] Starting scene analysis... (Time: " + lastAnalysisTime.toFixed(2) + ")");
    
    try {
        print("📸 [Analysis] Encoding camera texture to base64...");
        // Convert camera texture to base64
        const base64Image = await encodeTextureToBase64(script.cameraTexture);
        
        if (base64Image) {
            print("✅ [Analysis] Texture encoded! Size: " + base64Image.length + " chars");
            await sendToGeminiAPI(base64Image);
        } else {
            print("❗ [Analysis] Failed to encode camera texture");
        }
    } catch (error) {
        print("❗ [Analysis] ERROR analyzing scene: " + error);
    } finally {
        print("✔️ [Analysis] Complete - Setting isProcessing to false");
        isProcessing = false;
    }
}

function encodeTextureToBase64(texture) {
    return new Promise((resolve, reject) => {
        Base64.encodeTextureAsync(
            texture,
            resolve,
            reject,
            CompressionQuality.LowQuality,
            EncodingType.Jpg
        );
    });
}

async function sendToGeminiAPI(base64Image) {
    print("🌐 [API] Preparing Gemini API request...");
    
    const requestPayload = {
        contents: [
            {
                parts: [
                    {
                        text: "Analyze this image and describe what you see. Include: objects, people, text, scene description, colors, and notable details. Keep it concise."
                    },
                    {
                        inline_data: {
                            mime_type: "image/jpeg",
                            data: base64Image
                        }
                    }
                ]
            }
        ],
        generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 2000
        }
    };
    
    print("📤 [API] Sending request to Gemini API...");
    
    try {
        const response = await Internet.fetch(new Request(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${script.geminiApiKey}`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(requestPayload)
            }
        ));
        
        print("📥 [API] Received response - Status: " + response.status);
        
        if (response.status === 200) {
            const data = await response.json();
            print("✅ [API] Response parsed successfully");

            // Extract analysis from Gemini response - robust parsing
            let analysisText = "";

            // Debug: print response structure
            print("🔍 [DEBUG] Response keys: " + Object.keys(data || {}));
            print("🔍 [DEBUG] Response preview: " + JSON.stringify(data).slice(0, 500));

            // Try different response formats
            if (data && data.candidates && data.candidates.length > 0) {
                const candidate = data.candidates[0];
                print("🔍 [DEBUG] Candidate finishReason: " + candidate.finishReason);
                
                if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
                    analysisText = candidate.content.parts[0].text.trim();
                    print("🎯 [API] Found text in candidates[0].content.parts[0].text");
                } else if (candidate.finishReason === "MAX_TOKENS") {
                    print("⚠️ [API] Response truncated due to token limit");
                    analysisText = "Analysis truncated - response too long";
                }
            }

            // Try alternative response format
            if (!analysisText && data && data.text) {
                analysisText = data.text.trim();
                print("🎯 [API] Found text in data.text");
            }

            // Try another format
            if (!analysisText && data && data.content) {
                if (typeof data.content === 'string') {
                    analysisText = data.content.trim();
                    print("🎯 [API] Found text in data.content (string)");
                } else if (Array.isArray(data.content) && data.content.length > 0) {
                    const textPart = data.content.find(part => part.text);
                    if (textPart) {
                        analysisText = textPart.text.trim();
                        print("🎯 [API] Found text in data.content array");
                    }
                }
            }

            // Try response format
            if (!analysisText && data && data.response) {
                analysisText = data.response.trim();
                print("🎯 [API] Found text in data.response");
            }

            if (analysisText) {
                print("🎯 [API] Raw analysis text: '" + analysisText + "'");

                // Add to history
                analysisHistory.push(analysisText);
                if (analysisHistory.length > MAX_HISTORY) {
                    analysisHistory.shift();
                }
                print("📊 [History] Analysis added. History size: " + analysisHistory.length);

                // Update display
                currentAnalysis = analysisText;
                updateSceneDisplay(analysisText);
                print("🔍 [Result] Scene analysis UPDATED");
            } else {
                print("❗ [API] Could not extract text from response");
                print("❗ [API] Full response: " + JSON.stringify(data));
            }
        } else {
            print("❗ [API] Gemini API error - Status: " + response.status);
            const errorText = await response.text();
            print("❗ [API] Error details: " + errorText);
        }
    } catch (error) {
        print("❗ [API] Gemini request FAILED with exception: " + error);
    }
}

function updateSceneDisplay(analysis) {
    if (!script.sceneText) {
        return;
    }
    
    script.sceneText.text = analysis;
}

// Public API for other scripts
script.api.getCurrentAnalysis = function() {
    return currentAnalysis;
};

script.api.getAnalysisHistory = function() {
    return analysisHistory.slice(); // Return copy of history
};

script.api.forceAnalysis = function() {
    if (!isProcessing) {
        analyzeScene();
    }
};
