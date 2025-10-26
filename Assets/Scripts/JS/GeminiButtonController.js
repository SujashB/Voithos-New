// @input Component.Script ocrScript {"hint":"Drag the SimpleOCRButton script here"}
// @input bool enableDebugMode = true

print("========================================");
print("🔘 GEMINI BUTTON CONTROLLER - INITIALIZING");
print("========================================");

script.createEvent("OnStartEvent").bind(() => {
    print("✅ Gemini Button Controller started");
    
    if (!script.ocrScript) {
        print("❗ ERROR: OCR script not connected!");
        return;
    }
    
    if (script.enableDebugMode) {
        print("✅ Gemini Button Controller initialized");
        print("🔘 Button ready to trigger OCR");
    }
});

// This function will be called when the button is pressed
script.onButtonPressed = function() {
    print("🔘 BUTTON PRESSED - Triggering OCR");
    
    if (script.ocrScript && script.ocrScript.captureAndExtractText) {
        script.ocrScript.captureAndExtractText();
        print("✅ OCR triggered successfully");
    } else {
        print("❗ ERROR: OCR script not properly connected!");
    }
};

print("========================================");
print("✅ GEMINI BUTTON CONTROLLER - READY!");
print("Connect this script to your button's press event");
print("========================================");
