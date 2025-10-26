# Groq Scene Analyzer Integration Summary

## ✅ What Was Added

### 1. **GroqSceneAnalyzer.js** (NEW)
- **Location:** `Assets/Scripts/JS/GroqSceneAnalyzer.js`
- **Purpose:** Analyzes the visual scene from the user's perspective in real-time
- **How it works:**
  - Captures camera feed from the Spectacles
  - Sends frames to Groq API every 5 seconds (configurable)
  - Uses Meta's Llama 4 Scout model for fast inference
  - Returns concise scene descriptions

### 2. **Modified ClaudeIntegration.js**
- **New Input:** `groqSceneAnalyzerScript` - Reference to the Groq Scene Analyzer script component
- **Integration:** Claude now receives visual context along with speech and emotion
- **Enhanced Prompt:** Claude's suggestions now consider what the user is seeing

## 🔧 How It Works

```
Camera Feed → GroqSceneAnalyzer → Visual Description
                                    ↓
User Speech + Emotion + Visual Context → Claude → Conversation Suggestion
```

## ⚙️ Setup Instructions

### 1. Add the Script Component in Lens Studio

1. Open your project in **Lens Studio**
2. Create a new object or select an existing one
3. Add the **GroqSceneAnalyzer** script component
4. Configure the required inputs:
   - **Camera Texture**: Drag the Device Camera Texture
   - **Scene Text**: Optional text component to display analysis
   - **Analysis Interval**: How often to analyze (default: 5.0 seconds)
   - **Groq Api Key**: Your Groq API key from https://console.groq.com/
   - **Enable Debug Mode**: Toggle debug logging

### 2. Connect to ClaudeIntegration

1. Select the object with **ClaudeIntegration** script
2. In the Inspector, find **Groq Scene Analyzer Script** field
3. Drag the object that has the **GroqSceneAnalyzer** script component into this field
4. Save the project

### 3. Configure API Keys

**Groq API Key:**
- Sign up at https://console.groq.com/
- Get your API key (starts with `gsk_`)
- Paste it into the Groq Scene Analyzer script component

**Claude API Key:**
- Already configured in ClaudeIntegration
- Make sure it's set up correctly

## 📊 What Claude Receives Now

When generating conversation suggestions, Claude considers:

1. **User's Speech** - What they said
2. **Emotion** - From RekaEmotionAnalyzer
3. **Visual Context** - From GroqSceneAnalyzer (NEW!)
   - Objects visible in the scene
   - People present
   - Text detected
   - Scene description
   - Colors and notable details

## 🎯 Example Scenario

**Before (without visual context):**
- User says: "That's really nice"
- Claude suggests: "Share what specifically caught your eye"

**After (with visual context):**
- User says: "That's really nice"
- Groq sees: "A modern living room with a blue sofa, plants, and abstract art"
- Claude suggests: "The blue sofa and plants create a calming vibe - point that out"

## 🔍 Debugging

If scene analysis isn't working:

1. **Check API Key:** Make sure your Groq API key is valid
2. **Check Camera Texture:** Ensure Device Camera Texture is connected
3. **Check Logs:** Enable Debug Mode to see detailed logs
4. **Check Network:** Groq API must be reachable from your device
5. **Check ClaudeIntegration:** Ensure `groqSceneAnalyzerScript` is connected

## 📝 Files Modified

- ✅ `Assets/Scripts/JS/GroqSceneAnalyzer.js` (NEW)
- ✅ `Assets/Scripts/JS/GroqSceneAnalyzer.js.meta` (NEW)
- ✅ `Assets/Scripts/JS/ClaudeIntegration.js` (MODIFIED)
- ✅ `API_KEYS_SETUP.md` (UPDATED)
- ✅ `config.example.js` (UPDATED)

## 🚀 Benefits

1. **Contextual Suggestions:** Claude can now see what you're seeing
2. **Visual Awareness:** Suggestions adapt to your visual environment
3. **Fast Inference:** Groq provides super-fast model inference
4. **Free Tier:** Groq offers free tier with generous limits

## 📚 API Documentation

- **Groq Console:** https://console.groq.com/
- **Groq Models:** https://console.groq.com/docs/models
- **Llama 4 Scout:** Latest vision model with 17B parameters

---

**Next Steps:**
1. Set up your Groq API key
2. Add the GroqSceneAnalyzer script to your scene
3. Connect it to ClaudeIntegration
4. Test in Lens Studio and on device!

