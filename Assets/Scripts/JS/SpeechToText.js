// @input Component.Text text {"hint":"Text component to display live speech transcription"}
// @input Component.Text statusText {"hint":"Optional status text component"}

// Remote service module for fetching data
var voiceMLModule = require("LensStudio:VoiceMLModule");

print("========================================");
print("🎤 SPEECH-TO-TEXT INITIALIZING");
print("========================================");

script.createEvent("OnStartEvent").bind(() => {
    print("✅ SpeechToText script started");
    
    // Initialize status
    if (script.statusText) {
        script.statusText.text = "🎤 Initializing...";
    }
    
    if (script.text) {
        script.text.text = "Captions will appear...";
        print("✓ Text component connected");
    } else {
        print("⚠️  Warning: Text component not connected");
    }
    
    // Set up voice recognition
    let options = VoiceML.ListeningOptions.create();
    options.shouldReturnAsrTranscription = true;
    options.shouldReturnInterimAsrTranscription = true;
    
    print("✓ VoiceML options configured");

    voiceMLModule.onListeningEnabled.add(() => {
        print("🎤 Voice recognition enabled - starting to listen");
        if (script.statusText) {
            script.statusText.text = "🎤 Listening...";
        }
        voiceMLModule.startListening(options);
        voiceMLModule.onListeningUpdate.add(onListenUpdate);
    });
});

function onListenUpdate(eventData) {
    print("========================================");
    print("📝 SPEECH DETECTED!");
    print("Text: " + eventData.transcription);
    print("Final: " + eventData.isFinalTranscription);
    print("========================================");
    
    if (eventData.transcription && script.text) {
        if (eventData.isFinalTranscription) {
            // Final transcription - display with confirmation
            script.text.text = "✅ " + eventData.transcription;
            print("🎯 FINAL TRANSCRIPTION: " + eventData.transcription);
            
            if (script.statusText) {
                script.statusText.text = "✅ Transcribed";
            }
        } else {
            // Interim transcription - show as it's being processed
            script.text.text = "... " + eventData.transcription;
            print("🔄 INTERIM: " + eventData.transcription);
            
            if (script.statusText) {
                script.statusText.text = "🔄 Processing...";
            }
        }
    }
}

print("========================================");
print("✅ SPEECH-TO-TEXT READY!");
print("Speak to see live transcription");
print("========================================");