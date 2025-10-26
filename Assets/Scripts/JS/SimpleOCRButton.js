// @input Asset.Texture cameraTexture {"hint":"Drag the Device Camera Texture here"}
// @input Component.Text outputText {"hint":"Text component to display extracted text"}
// @input Component.Text statusText {"hint":"Optional status text component"}
// @input string geminiApiKey {"hint":"Your Gemini API key"}
// @input bool enableDebugMode = true

const Internet = require("LensStudio:InternetModule");

let isProcessing = false;

print("========================================");
print("📸 GEMINI OCR BUTTON - INITIALIZING");
print("========================================");

script.createEvent("OnStartEvent").bind(() => {
    print("✅ Gemini OCR Button started");
    
    if (!script.cameraTexture) {
        print("❗ ERROR: Camera texture not set!");
        return;
    }
    
    if (!script.geminiApiKey || script.geminiApiKey === "") {
        print("❗ ERROR: Gemini API key not set!");
        return;
    }
    
    if (script.outputText) {
        script.outputText.text = "📸 Ready to capture text";
        print("✓ Output text connected");
    } else {
        print("⚠️  Warning: Output text component not connected");
    }
    
    if (script.statusText) {
        script.statusText.text = "Ready";
        print("✓ Status text connected");
    }
    
    if (script.enableDebugMode) {
        print("✅ Gemini OCR Button initialized");
    }
});

// Public function to trigger OCR - call this from button
script.captureAndExtractText = async function() {
    if (isProcessing) {
        print("⚠️  Already processing, please wait...");
        return;
    }
    
    if (!script.cameraTexture) {
        print("❗ ERROR: Camera texture not set!");
        return;
    }
    
    isProcessing = true;
    
    print("========================================");
    print("📸 CAPTURING AND EXTRACTING TEXT");
    print("========================================");
    
    try {
        // Update status
        if (script.statusText) {
            script.statusText.text = "📸 Capturing...";
        }
        
        if (script.outputText) {
            script.outputText.text = "📸 Taking photo...";
        }
        
        // Encode camera texture to base64
        print("📸 Encoding camera texture to base64...");
        const base64Image = await encodeTextureToBase64(script.cameraTexture);
        
        if (base64Image) {
            print("✅ Texture encoded! Size: " + base64Image.length + " chars");
            
            // Update status
            if (script.statusText) {
                script.statusText.text = "🔍 Analyzing...";
            }
            
            if (script.outputText) {
                script.outputText.text = "🔍 Extracting text...";
            }
            
            // Send to Gemini for OCR
            await sendToGeminiOCR(base64Image);
        } else {
            print("❗ Failed to encode camera texture");
            if (script.outputText) {
                script.outputText.text = "❌ Capture failed";
            }
            if (script.statusText) {
                script.statusText.text = "❌ Error";
            }
        }
    } catch (error) {
        print("❗ ERROR in OCR process: " + error);
        if (script.outputText) {
            script.outputText.text = "❌ Error: " + error;
        }
        if (script.statusText) {
            script.statusText.text = "❌ Error";
        }
    } finally {
        isProcessing = false;
        print("✔️ OCR process complete");
    }
};

function encodeTextureToBase64(texture) {
    return new Promise((resolve, reject) => {
        Base64.encodeTextureAsync(
            texture,
            resolve,
            reject,
            CompressionQuality.HighQuality, // Better quality for text
            EncodingType.Jpg
        );
    });
}

async function sendToGeminiOCR(base64Image) {
    print("🌐 [API] Preparing Gemini OCR request...");
    
    const requestPayload = {
        contents: [
            {
                parts: [
                    {
                        text: "Extract all visible text from this image. Return only the text content, nothing else. If no text is visible, respond with 'No text detected'."
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
            temperature: 0.1,
            maxOutputTokens: 1000
        }
    };
    
    print("📤 [API] Sending request to Gemini...");
    
    try {
        const response = await Internet.fetch(new Request(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${script.geminiApiKey}`,
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
            
            // Extract text from Gemini response
            let extractedText = "";
            
            if (data && data.candidates && data.candidates.length > 0) {
                const candidate = data.candidates[0];
                if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
                    extractedText = candidate.content.parts[0].text.trim();
                }
            }
            
            if (extractedText && extractedText !== "No text detected") {
                print("🎯 [OCR] Extracted text: " + extractedText);
                
                if (script.outputText) {
                    script.outputText.text = extractedText;
                }
                
                if (script.statusText) {
                    script.statusText.text = "✅ Text extracted";
                }
                
                print("✅ [OCR] Text extraction successful!");
            } else {
                print("📝 [OCR] No text detected in image");
                
                if (script.outputText) {
                    script.outputText.text = "No text detected";
                }
                
                if (script.statusText) {
                    script.statusText.text = "📝 No text found";
                }
            }
        } else {
            print("❗ [API] Gemini API error - Status: " + response.status);
            const errorText = await response.text();
            print("❗ [API] Error details: " + errorText);
            
            if (script.outputText) {
                script.outputText.text = "❌ API Error: " + response.status;
            }
            if (script.statusText) {
                script.statusText.text = "❌ API Error";
            }
        }
    } catch (error) {
        print("❗ [API] Gemini request FAILED with exception: " + error);
        
        if (script.outputText) {
            script.outputText.text = "❌ Network Error";
        }
        if (script.statusText) {
            script.statusText.text = "❌ Network Error";
        }
    }
}

print("========================================");
print("✅ GEMINI OCR BUTTON - READY!");
print("Call script.captureAndExtractText() to capture and extract text");
print("========================================");
