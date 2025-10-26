# API Keys Setup Guide

## 🔑 How to Set Up API Keys

This project uses several AI services that require API keys. **DO NOT commit your API keys to GitHub!**

---

## 📋 Required API Keys

### 1. **Claude/Anthropic API Key** (for conversation suggestions)
- **Get it from:** https://console.anthropic.com/
- **Used in:** ClaudeIntegration.js
- **Format:** `sk-ant-api03-...`
- **Cost:** Pay-as-you-go (add credits to your account)

### 2. **Reka API Key** (for emotion detection)
- **Get it from:** https://www.reka.ai/
- **Used in:** RekaEmotionAnalyzer.js
- **Format:** Custom Reka format
- **Cost:** Check Reka pricing

### 3. **Tavily API Key** (for web search)
- **Get it from:** https://tavily.com/
- **Used in:** TavilySuggestions.js
- **Format:** `tvly-...`
- **Cost:** Free tier available, check Tavily pricing

### 4. **Deepgram API Key** (optional - if using external STT)
- **Get it from:** https://deepgram.com/
- **Used in:** DeepgramSTT.js (if enabled)
- **Format:** Custom Deepgram format

### 5. **Groq API Key** (for visual scene analysis)
- **Get it from:** https://console.groq.com/
- **Used in:** GroqSceneAnalyzer.js
- **Format:** `gsk_...`
- **Cost:** Free tier available, very fast inference

### 6. **OpenAI API Key** (optional - for TTS/Vision)
- **Get it from:** https://platform.openai.com/
- **Used in:** TextToSpeechOpenAI.js, VisionOpenAI_DALLE.js
- **Format:** `sk-...`

---

## ⚙️ How to Add API Keys in Lens Studio

### **Method 1: Direct in Inspector (Recommended)**

1. Open your project in **Lens Studio**
2. In the **Objects Panel**, select the script component:
   - For Claude: Select object with **ClaudeIntegration** script
   - For Reka: Select object with **RekaEmotionAnalyzer** script
   - For Groq: Select object with **GroqSceneAnalyzer** script
   - For Tavily: Select object with **TavilySuggestions** script
3. In the **Inspector Panel**, find the API Key field:
   - **Claude Api Key** field
   - **Reka Api Key** field
   - **Groq Api Key** field
   - **Tavily Api Key** field
4. **Paste your API key** directly into the field
5. **Save the project**

### **Method 2: Using Config File (Advanced)**

1. Copy `config.example.js` to `config.js`
2. Fill in your actual API keys in `config.js`
3. `config.js` is gitignored and won't be pushed to GitHub

---

## ⚠️ Security Best Practices

1. **Never commit API keys** to Git
2. **Scene.scene is gitignored** - it contains your API keys from the Inspector
3. **Keep `config.js` local** - don't push it
4. **Rotate keys** if accidentally exposed
5. **Use separate keys** for development and production

---

## 🚨 If You Accidentally Pushed API Keys

1. **Rotate the keys immediately** at the service's console
2. **Remove from Git history:**
   ```bash
   git filter-branch --force --index-filter \
   'git rm --cached --ignore-unmatch Assets/Scene.scene' \
   --prune-empty --tag-name-filter cat -- --all
   ```
3. **Force push** (if necessary)

---

## ✅ Current Setup in Project

| Service | Script | Input Field Name | Status |
|---------|--------|------------------|--------|
| Claude | ClaudeIntegration.js | `claudeApiKey` | Required |
| Reka | RekaEmotionAnalyzer.js | `rekaApiKey` | Required |
| Tavily | TavilySuggestions.js | `tavilyApiKey` | Required |
| Groq | GroqSceneAnalyzer.js | `groqApiKey` | Required |
| Deepgram | DeepgramSTT.js | N/A (using Snapchat STT) | Optional |
| OpenAI | TextToSpeechOpenAI.js | N/A | Optional |

---

## 📝 Notes

- API keys are entered as **@input string** fields in each script
- They appear in the **Inspector** when you select the script component
- **Scene.scene** stores these values, so it's now gitignored
- Each team member needs to add their own API keys locally

---

**For questions or issues, contact the team lead.**

