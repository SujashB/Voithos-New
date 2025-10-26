// @input Component.AudioListenerComponent audioListener {"hint":"Drag the Audio Listener component here"}
// @input Component.Text outputText {"hint":"Text component to display transcription"}
// @input Component.Text statusText {"hint":"Optional status text component"}
// @input bool enableContinuousListening {"hint":"Enable continuous listening mode"}
// @input Component.Text transcriptFile {"hint":"Text component to act as a text file (can be hidden)"}
// @input Component.Text conversationStorage {"hint":"Text component to store all conversation (for Claude to read)"}

print("========================================");
print("🚀 SNAPCHAT SPEECH-TO-TEXT - LOADING");
print("Using Lens Studio VoiceML Module");
print("========================================");

// VoiceML Module
let voiceMLModule;
let isListening = false;

// Initialize API object
script.api = {};

// Storage state - stores all transcripts
let currentTranscript = "";

script.createEvent("OnStartEvent").bind(function() {
    print("========================================");
    print("✅ SNAPCHAT STT - INITIALIZED!");
    print("========================================");
    
    try {
        voiceMLModule = require("LensStudio:VoiceMLModule");
        print("✓ VoiceML module loaded");
        
        // Check if Audio Listener is connected
        if (script.audioListener) {
            print("✓ Audio Listener connected: " + script.audioListener.getTypeName());
        } else {
            print("⚠️  Warning: Audio Listener not connected (optional)");
        }
        
        if (script.outputText) {
            script.outputText.text = "🎤 Ready to listen...";
            print("✓ Output text connected");
        } else {
            print("⚠️  Warning: Output text component not connected");
        }
        
        if (script.statusText) {
            script.statusText.text = "Initializing...";
            print("✓ Status text connected");
        }
        
        // Start after 2 seconds
        var delayedStart = script.createEvent("DelayedCallbackEvent");
        delayedStart.bind(function() {
            print("⏰ Starting voice recognition...");
            startListening();
        });
        delayedStart.reset(2.0);
        
    } catch (e) {
        print("❌ ERROR: " + e);
        if (script.statusText) {
            script.statusText.text = "❌ Error: " + e;
        }
    }
});

function startListening() {
    if (isListening) {
        print("⚠️  Already listening, skipping start");
        return;
    }
    
    print("========================================");
    print("🎤 LISTENING FOR SPEECH");
    print("========================================");
    
    if (script.outputText) {
        script.outputText.text = "🎤 Listening...";
    }
    
    if (script.statusText) {
        script.statusText.text = "🎤 Active";
    }
    
    try {
        var options = VoiceML.ListeningOptions.create();
        options.shouldReturnAsrTranscription = true;
        options.shouldReturnInterimAsrTranscription = true;
        
        print("✓ Options created");
        
        voiceMLModule.onListeningUpdate.add(function(eventData) {
            print("========================================");
            print("📝 SPEECH DETECTED!");
            print("========================================");
            
            if (eventData.transcription) {
                print("Text: " + eventData.transcription);
                print("Final: " + eventData.isFinalTranscription);
                
                if (script.outputText) {
                    if (eventData.isFinalTranscription) {
                        // Store in conversation history
                        addToConversationHistory(eventData.transcription);
                        
                        script.outputText.text = "✅ " + eventData.transcription;
                        print("========================================");
                        print("🎯 FINAL: " + eventData.transcription);
                        print("========================================");
                        
                        if (script.statusText) {
                            script.statusText.text = "✅ Complete";
                        }
                    } else {
                        script.outputText.text = "... " + eventData.transcription;
                        if (script.statusText) {
                            script.statusText.text = "🔄 Processing...";
                        }
                    }
                }
            }
        });
        
        print("✓ Callback registered");
        
        voiceMLModule.startListening(options);
        isListening = true;
        print("✅ LISTENING ACTIVE - SPEAK NOW!");
        
        // Auto-restart if continuous listening is enabled
        if (script.enableContinuousListening) {
            var stopTimer = script.createEvent("DelayedCallbackEvent");
            stopTimer.bind(function() {
                print("⏰ Restarting listening cycle...");
                voiceMLModule.stopListening();
                isListening = false;
                
                var restartTimer = script.createEvent("DelayedCallbackEvent");
                restartTimer.bind(function() {
                    startListening();
                });
                restartTimer.reset(2.0);
            });
            stopTimer.reset(10.0);
        }
        
    } catch (e) {
        print("❌ ERROR in startListening: " + e);
        if (script.statusText) {
            script.statusText.text = "❌ Error: " + e;
        }
        isListening = false;
    }
}

// Public function to manually start/stop listening
script.startListening = function() {
    if (!isListening) {
        startListening();
    }
};

script.stopListening = function() {
    if (isListening && voiceMLModule) {
        voiceMLModule.stopListening();
        isListening = false;
        print("🛑 Listening stopped");
        if (script.statusText) {
            script.statusText.text = "🛑 Stopped";
        }
    }
};

// Add to conversation history - SIMPLE VERSION like AI Playground
function addToConversationHistory(transcription) {
    print("💬 [STT] Storing transcription: '" + transcription + "'");
    
    // Simply append to the stored transcript string
    if (currentTranscript.length > 0) {
        currentTranscript += " " + transcription;
    } else {
        currentTranscript = transcription;
    }
    
    print("💬 [STT] Total transcript length: " + currentTranscript.length + " characters");
    
    // ALSO save to persistent storage (acts like a database)
    if (global.persistentStorageSystem) {
        const store = global.persistentStorageSystem.store;
        
        // Save the full transcript to persistent storage
        store.putString("speechTranscript", currentTranscript);
        print("💾 [STT] Saved to database: " + currentTranscript.length + " chars");
        
        // ALSO save a timestamp for this transcript
        store.putFloat("lastTranscriptTime", getTime());
        
        // Save the count of how many transcriptions we've stored
        const currentCount = store.getInt("transcriptCount") || 0;
        store.putInt("transcriptCount", currentCount + 1);
        print("💾 [STT] Entry #" + (currentCount + 1));
    } else {
        print("⚠️  [STT] Persistent storage not available");
    }
    
    // ALSO write to Text component (acts like a .txt file)
    if (script.transcriptFile) {
        script.transcriptFile.text = currentTranscript;
        print("📄 [STT] Written to text file component: " + currentTranscript.length + " characters");
    } else {
        print("⚠️  [STT] transcriptFile text component not connected");
    }
}

// Public API for other scripts - SIMPLE like AI Playground
script.api.getCurrentText = function() {
    print("📖 [STT] getCurrentText() called - returning " + currentTranscript.length + " characters of transcript");
    return currentTranscript;
};

print("========================================");
print("✅ SNAPCHAT STT - READY!");
print("Speak to test voice recognition");
print("========================================");

