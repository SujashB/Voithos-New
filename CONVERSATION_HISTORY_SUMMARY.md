# Conversation History Feature Summary

## ✅ What Was Added

Added conversation history to **ClaudeIntegration.js** to maintain context across multiple exchanges during longer conversations.

## 🎯 Why It Matters

**Before:** Claude only saw the current exchange
- User: "I love this painting"
- Claude: "Share why it resonates with you"
- User: "It reminds me of my grandmother"
- Claude: "That sounds meaningful" (doesn't know about the painting!)

**After:** Claude remembers previous exchanges
- User: "I love this painting"
- Claude: "Share why it resonates with you"
- User: "It reminds me of my grandmother"
- Claude: "The connection to your grandmother through art is beautiful - tell them about her" (remembers the painting and context!)

## 🔧 How It Works

```
User Speech → Added to History
         ↓
Claude Response → Added to History
         ↓
Next User Speech → Claude sees both current + history → Better suggestions
```

### Technical Flow

1. **User speaks** → Transcript stored
2. **Claude responds** → Both user message and response stored
3. **History maintained** → Sliding window of last N exchanges
4. **Next request** → Claude receives full history + current message
5. **Auto-trim** → Oldest messages removed when limit reached

## ⚙️ Configuration

### In Lens Studio Inspector

When you select the **ClaudeIntegration** script component, you'll see:

- **Max History Size** (new input field)
  - Default: `6` (means 3 exchanges: 6 messages = 3 user + 3 assistant)
  - Recommended: `6-10` for good balance
  - Higher = more context but more tokens (cost)

### How Max History Size Works

- **6** = 3 exchanges (6 messages: user → assistant → user → assistant → user → assistant)
- **10** = 5 exchanges
- **20** = 10 exchanges

## 📊 Memory Management

### Automatic Trimming
- When history exceeds `maxHistorySize`, oldest messages are removed
- Keeps most recent context
- Example: If max is 6 and you have 8 messages, oldest 2 are removed

### Manual Clearing
You can clear history programmatically:
```javascript
// From another script
const claudeScript = // ... get reference to ClaudeIntegration
claudeScript.api.clearConversationHistory();
```

## 🎯 What Claude Sees Now

Each request to Claude now includes:

1. **Conversation History** (if available)
   - Previous user messages and assistant responses
   - Example:
     ```
     User: "I love this painting"
     Assistant: "Share why it resonates with you"
     User: "It reminds me of my grandmother"
     ```

2. **Current Context**
   - New user message
   - Emotion detection
   - Visual scene analysis
   - Current prompt

3. **Enhanced Suggestions**
   - Build on previous topics
   - Maintain coherence
   - Reference earlier conversation
   - Natural flow

## 📝 System Prompt Update

The system message now includes:
> "Remember the conversation context and build on previous exchanges."

And in the prompt:
> "📚 You have X previous exchanges with this user - use this context to build on the conversation."

## 🔍 Debugging

Enable debug mode to see conversation history logs:

```
========================================
🤖 SENDING TO CLAUDE
========================================
📝 Transcript: [current message]
😊 Emotion: Happy
👁️ Scene Analysis: [visual context]
📚 Conversation History: 4 messages    ← NEW!
========================================
📚 Including conversation history (4 messages)
📝 Total messages: 3 (includes history)   ← Includes history!
💾 Added to history. Current history size: 6
```

## 🛠️ API Functions

New functions exposed:

```javascript
// Get conversation history
const history = script.api.getConversationHistory();
// Returns: [{role: "user", content: "..."}, {role: "assistant", content: "..."}, ...]

// Clear conversation history
script.api.clearConversationHistory();

// Get current history size
const size = script.api.getHistorySize();
// Returns: number of messages
```

## 🚀 Benefits

1. **Context-Aware**: Claude remembers what was discussed
2. **Coherent**: Suggestions build on previous topics
3. **Natural**: Conversation flows better
4. **Configurable**: Adjust memory size via Inspector
5. **Automatic**: No manual management needed

## ⚙️ Example Conversation Flow

### Exchange 1:
- **User**: "This room is too dark"
- **Emotion**: Neutral
- **History**: [] (empty)
- **Claude**: "Mention needing more natural light"

### Exchange 2:
- **User**: "The walls are so bare"
- **Emotion**: Neutral
- **History**: [User: "too dark", Assistant: "natural light"]
- **Claude**: "Both darkness and bare walls - suggest art or wallpaper" ✅ _Remembers the room context!_

### Exchange 3:
- **User**: "Maybe I should add a lamp"
- **Emotion**: Surprised
- **History**: [darkness, light suggestion, bare walls, art suggestion]
- **Claude**: "Great idea! Lamp for light + art on walls ties it together" ✅ _Refers back to both issues!_

## 💡 Best Practices

1. **History Size**: 
   - Short conversations: `6` (3 exchanges)
   - Medium conversations: `10` (5 exchanges)
   - Long conversations: `14` (7 exchanges)

2. **Clear When Needed**:
   - Reset between different conversation topics
   - Clear when starting new conversations
   - Use `clearConversationHistory()` API

3. **Memory Limits**:
   - More history = more tokens = higher cost
   - Balance context vs. cost
   - Default of 6 is a good starting point

## 📁 Files Modified

- ✅ `Assets/Scripts/JS/ClaudeIntegration.js` (modified)
  - Added `maxHistorySize` input
  - Added `conversationHistory` array
  - Added history management functions
  - Updated prompt to include history context
  - Exposed API functions

## 🎉 Next Steps

1. Open your project in Lens Studio
2. Select the object with **ClaudeIntegration** script
3. Set **Max History Size** (recommended: 6)
4. Test with a multi-turn conversation
5. Check logs to see history being used
6. Watch Claude remember previous context!

---

**Pro Tip:** Start with `maxHistorySize = 6` and adjust based on your use case. Longer conversations benefit from higher values, but remember token costs increase too!


