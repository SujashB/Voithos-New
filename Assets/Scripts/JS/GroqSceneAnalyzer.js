// @input Asset.Texture cameraTexture {"hint":"Drag the Device Camera Texture here"}
// @input Component.Text sceneText {"hint":"Text component to display scene analysis"}
// @input float analysisInterval = 5.0 {"hint":"Seconds between scene analyses"}
// @input string groqApiKey {"hint":"Your Groq API key"}
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
    
    if (!script.groqApiKey || script.groqApiKey === "") {
        print("❗ ERROR: Groq API key not set!");
        return;
    }
    
    if (!script.sceneText) {
        print("⚠️ WARNING: Scene text component not set");
    } else {
        updateSceneDisplay("Analyzing...");
    }
    
    if (script.enableDebugMode) {
        print("✅ GroqSceneAnalyzer initialized");
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
            await sendToGroqAPI(base64Image);
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

async function sendToGroqAPI(base64Image) {
    print("🌐 [API] Preparing Groq API request...");
    
    // Use Meta's latest Llama 4 Scout model - supports vision and super fast on Groq
    const imageDataUri = `data:image/jpeg;base64,${base64Image}`;
    const prompt = "Analyze this image and describe what you see. Include: objects, people, text, scene description, colors, and notable details. Keep it concise.";
    
    const requestPayload = {
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        messages: [
            {
                role: "user",
                content: [
                    {
                        type: "text",
                        text: prompt
                    },
                    {
                        type: "image_url",
                        image_url: {
                            url: imageDataUri
                        }
                    }
                ]
            }
        ],
        max_tokens: 1000,
        temperature: 0.3
    };
    
    print("📤 [API] Sending request to Groq API...");
    
    try {
        const response = await Internet.fetch(new Request(
            "https://api.groq.com/openai/v1/chat/completions",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${script.groqApiKey}`
                },
                body: JSON.stringify(requestPayload)
            }
        ));
        
        print("📥 [API] Received response - Status: " + response.status);
        
        if (response.status === 200) {
            const data = await response.json();
            print("✅ [API] Response parsed successfully");

            // Extract analysis from Groq response
            let analysisText = "";

            // Debug: print response structure
            print("🔍 [DEBUG] Response keys: " + Object.keys(data || {}));

            // Groq/OpenAI format: data.choices[0].message.content
            if (data && data.choices && data.choices.length > 0) {
                const message = data.choices[0].message;
                if (message && message.content) {
                    analysisText = message.content.trim();
                    print("🎯 [API] Found text in choices[0].message.content");
                }
            }

            // Try alternative format
            if (!analysisText && data && data.text) {
                analysisText = data.text.trim();
                print("🎯 [API] Found text in data.text");
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
                print("❗ [API] Could not extract text from Groq response");
                print("❗ [API] Full response: " + JSON.stringify(data));
            }
        } else {
            print("❗ [API] Groq API error - Status: " + response.status);
            const errorText = await response.text();
            print("❗ [API] Error details: " + errorText);
        }
    } catch (error) {
        print("❗ [API] Groq request FAILED with exception: " + error);
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
