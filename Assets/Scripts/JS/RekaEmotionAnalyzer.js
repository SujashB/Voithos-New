// @input Asset.Texture cameraTexture {"hint":"Drag the Device Camera Texture here"}
// @input Component.Text emotionText {"hint":"Text component to display emotion"}
// @input float analysisInterval = 3.0 {"hint":"Seconds between emotion analyses"}
// @input string rekaApiKey {"hint":"Your REKA API key"}
// @input bool enableDebugMode = true

const remoteServiceModule = require("LensStudio:RemoteServiceModule");

let isProcessing = false;
let lastAnalysisTime = 0;
let currentEmotion = "Neutral";
let emotionHistory = [];
const MAX_HISTORY = 5;

// Emotion emoji mapping
const EMOTION_EMOJIS = {
    "Happy": "😊",
    "Sad": "😢",
    "Angry": "😠",
    "Surprised": "😲",
    "Fearful": "😨",
    "Disgusted": "🤢",
    "Neutral": "😐"
};

// Emotion color mapping
const EMOTION_COLORS = {
    "Happy": new vec4(0.2, 1.0, 0.2, 1.0),      // Green
    "Sad": new vec4(0.3, 0.3, 1.0, 1.0),        // Blue
    "Angry": new vec4(1.0, 0.2, 0.2, 1.0),      // Red
    "Surprised": new vec4(1.0, 0.8, 0.2, 1.0),  // Yellow
    "Fearful": new vec4(0.6, 0.2, 0.8, 1.0),    // Purple
    "Disgusted": new vec4(0.5, 0.8, 0.2, 1.0),  // Yellow-Green
    "Neutral": new vec4(1.0, 1.0, 1.0, 1.0)     // White
};

script.createEvent("OnStartEvent").bind(() => {
    if (!script.cameraTexture) {
        print("❗ ERROR: Camera texture not set!");
        return;
    }
    
    if (!script.rekaApiKey || script.rekaApiKey === "") {
        print("❗ ERROR: REKA API key not set!");
        return;
    }
    
    if (!script.emotionText) {
        print("⚠️ WARNING: Emotion text component not set");
    } else {
        updateEmotionDisplay("Neutral");
    }
    
    if (script.enableDebugMode) {
        print("✅ RekaEmotionAnalyzer initialized");
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
            analyzeEmotion();
        } else {
            print("⏸️ [Loop] Skipping analysis - still processing previous request");
        }
        scheduleNextAnalysis(); // Continue the loop
    });
    delayedEvent.reset(script.analysisInterval);
}

async function analyzeEmotion() {
    if (!script.cameraTexture || isProcessing) {
        if (script.enableDebugMode) {
            print("⚠️ [Analysis] Skipped - No texture or already processing");
        }
        return;
    }
    
    isProcessing = true;
    lastAnalysisTime = getTime();
    
    print("🔍 [Analysis] Starting emotion analysis... (Time: " + lastAnalysisTime.toFixed(2) + ")");
    
    try {
        print("📸 [Analysis] Encoding camera texture to base64...");
        // Convert camera texture to base64
        const base64Image = await encodeTextureToBase64(script.cameraTexture);
        
        if (base64Image) {
            print("✅ [Analysis] Texture encoded! Size: " + base64Image.length + " chars");
            await sendToRekaAPI(base64Image);
        } else {
            print("❗ [Analysis] Failed to encode camera texture");
        }
    } catch (error) {
        print("❗ [Analysis] ERROR analyzing emotion: " + error);
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

async function sendToRekaAPI(base64Image) {
    print("🌐 [API] Preparing REKA API request...");
    
    const requestPayload = {
        messages: [
            {
                role: "user",
                content: [
                    {
                        type: "image_url",
                        image_url: `data:image/jpeg;base64,${base64Image}`
                    },
                    {
                        type: "text",
                        text: "Analyze the primary emotion visible in this image. Respond with ONLY ONE of these emotions: Happy, Sad, Angry, Surprised, Fearful, Disgusted, or Neutral. Provide only the emotion word, nothing else."
                    }
                ]
            }
        ],
        model: "reka-core",
        temperature: 0.3,
        max_tokens: 10
    };
    
    print("📤 [API] Sending request to REKA API...");
    
    try {
        const response = await remoteServiceModule.fetch(new Request(
            "https://api.reka.ai/v1/chat",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${script.rekaApiKey}`
                },
                body: JSON.stringify(requestPayload)
            }
        ));
        
        print("📥 [API] Received response - Status: " + response.status);
        
        if (response.status === 200) {
            const data = await response.json();
            print("✅ [API] Response parsed successfully");
            
            if (data && data.choices && data.choices.length > 0) {
                const emotionText = data.choices[0].message.content.trim();
                print("🎯 [API] Raw emotion from REKA: '" + emotionText + "'");
                
                const emotion = parseEmotion(emotionText);
                print("🔍 [Parse] Parsed emotion: " + emotion);
                
                // Add to history
                emotionHistory.push(emotion);
                if (emotionHistory.length > MAX_HISTORY) {
                    emotionHistory.shift();
                }
                print("📊 [History] Emotion added. History size: " + emotionHistory.length);
                
                // Get smoothed emotion (most common in recent history)
                const smoothedEmotion = getSmoothedEmotion();
                print("📈 [Smooth] Smoothed emotion: " + smoothedEmotion + " (previous: " + currentEmotion + ")");
                
                if (smoothedEmotion !== currentEmotion) {
                    currentEmotion = smoothedEmotion;
                    updateEmotionDisplay(smoothedEmotion);
                    print("😊 [Result] Emotion CHANGED to: " + smoothedEmotion);
                } else {
                    print("➡️ [Result] Emotion UNCHANGED: " + currentEmotion);
                }
            } else {
                print("❗ [API] Invalid REKA response format - no choices found");
            }
        } else {
            print("❗ [API] REKA API error - Status: " + response.status);
            const errorText = await response.text();
            print("❗ [API] Error details: " + errorText);
        }
    } catch (error) {
        print("❗ [API] REKA request FAILED with exception: " + error);
    }
}

function parseEmotion(emotionText) {
    const validEmotions = ["Happy", "Sad", "Angry", "Surprised", "Fearful", "Disgusted", "Neutral"];
    const normalized = emotionText.trim();
    
    for (let i = 0; i < validEmotions.length; i++) {
        const emotion = validEmotions[i];
        if (normalized.toLowerCase().indexOf(emotion.toLowerCase()) !== -1) {
            return emotion;
        }
    }
    
    return "Neutral";
}

function getSmoothedEmotion() {
    if (emotionHistory.length === 0) {
        return "Neutral";
    }
    
    // Count occurrences
    const counts = {};
    for (let i = 0; i < emotionHistory.length; i++) {
        const emotion = emotionHistory[i];
        counts[emotion] = (counts[emotion] || 0) + 1;
    }
    
    // Find most common
    let maxCount = 0;
    let mostCommon = "Neutral";
    for (const emotion in counts) {
        if (counts[emotion] > maxCount) {
            maxCount = counts[emotion];
            mostCommon = emotion;
        }
    }
    
    return mostCommon;
}

function updateEmotionDisplay(emotion) {
    if (!script.emotionText) {
        return;
    }
    
    const emoji = EMOTION_EMOJIS[emotion] || "😐";
    const displayText = emoji + " " + emotion;
    
    script.emotionText.text = displayText;
    
    // Set color based on emotion
    const color = EMOTION_COLORS[emotion] || new vec4(1, 1, 1, 1);
    script.emotionText.textFill.color = color;
}

// Public API for other scripts
script.api.getCurrentEmotion = function() {
    return currentEmotion;
};

script.api.getEmotionWithConfidence = function() {
    let count = 0;
    for (let i = 0; i < emotionHistory.length; i++) {
        if (emotionHistory[i] === currentEmotion) {
            count++;
        }
    }
    
    const confidence = emotionHistory.length > 0 ? count / emotionHistory.length : 0;
    
    return {
        emotion: currentEmotion,
        confidence: confidence
    };
};

script.api.forceAnalysis = function() {
    if (!isProcessing) {
        analyzeEmotion();
    }
};