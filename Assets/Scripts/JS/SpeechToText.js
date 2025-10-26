// @input Component.Text text {"hint":"Text component to display live speech transcription"}
// @input Component.Text statusText {"hint":"Optional status text component"}
// Remote service module for fetching data
var voiceMLModule = require("LensStudio:VoiceMLModule");

// Persistent Storage
var persistentStorageSystem = global.persistentStorageSystem;
var store = persistentStorageSystem.store;

// Key for storing transcriptions
var STORAGE_KEY = "speech_transcriptions";

// Load existing transcriptions on start
var transcriptionHistory = [];

print("========================================");
print("🎤 SPEECH-TO-TEXT WITH STORAGE INITIALIZING");
print("========================================");

script.createEvent("OnStartEvent").bind(() => {
    print("✅ SpeechToText script started");
    
    // Load previous transcriptions from storage
    loadTranscriptions();
    
    // Initialize status
    if (script.statusText) {
        script.statusText.text = "🎤 Initializing...";
    }
    if (script.text) {
        script.text.text = "Captions will appear...";
        print("✓ Text component connected");
    } else {
        print("⚠️ Warning: Text component not connected");
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

function loadTranscriptions() {
    try {
        if (store.has(STORAGE_KEY)) {
            var storedData = store.getString(STORAGE_KEY);
            transcriptionHistory = JSON.parse(storedData);
            print("📦 Loaded " + transcriptionHistory.length + " previous transcriptions");
        } else {
            print("📦 No previous transcriptions found");
            transcriptionHistory = [];
        }
    } catch (e) {
        print("⚠️ Error loading transcriptions: " + e);
        transcriptionHistory = [];
    }
}

function saveTranscriptions() {
    try {
        var dataToStore = JSON.stringify(transcriptionHistory);
        store.putString(STORAGE_KEY, dataToStore);
        print("💾 Saved " + transcriptionHistory.length + " transcriptions to storage");
    } catch (e) {
        print("⚠️ Error saving transcriptions: " + e);
    }
}

function onListenUpdate(eventData) {
    print("========================================");
    print("📝 SPEECH DETECTED!");
    print("Text: " + eventData.transcription);
    print("Final: " + eventData.isFinalTranscription);
    print("========================================");
    
    if (eventData.transcription && script.text) {
        if (eventData.isFinalTranscription) {
            // Final transcription - store it
            var transcriptionEntry = {
                text: eventData.transcription,
                timestamp: new Date().toISOString(),
                timeSeconds: getTime()
            };
            
            transcriptionHistory.push(transcriptionEntry);
            
            // Save to persistent storage
            saveTranscriptions();
            
            // Display with confirmation
            script.text.text = "✅ " + eventData.transcription;
            print("🎯 FINAL TRANSCRIPTION: " + eventData.transcription);
            print("📊 Total stored: " + transcriptionHistory.length);
            
            if (script.statusText) {
                script.statusText.text = "✅ Saved (" + transcriptionHistory.length + ")";
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

// Optional: Function to retrieve all stored transcriptions
function getAllTranscriptions() {
    return transcriptionHistory;
}

// Optional: Function to clear storage
function clearTranscriptions() {
    transcriptionHistory = [];
    store.remove(STORAGE_KEY);
    print("🗑️ Cleared all transcriptions");
}

// Optional: Function to export as text
function exportAsText() {
    var output = "=== TRANSCRIPTION HISTORY ===\n\n";
    for (var i = 0; i < transcriptionHistory.length; i++) {
        var entry = transcriptionHistory[i];
        output += "[" + entry.timestamp + "] " + entry.text + "\n";
    }
    return output;
}

print("========================================");
print("✅ SPEECH-TO-TEXT WITH STORAGE READY!");
print("Speak to see live transcription");
print("Previous transcriptions: " + transcriptionHistory.length);
print("========================================");