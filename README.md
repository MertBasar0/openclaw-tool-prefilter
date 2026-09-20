# OpenClaw Tool Pre-filter (`openclaw-tool-prefilter`)

[![ClawHub](https://img.shields.io/badge/ClawHub-Plugin-blue)](https://clawhub.ai)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Dynamic two-stage skill and tool pre-filtering plugin for [OpenClaw](https://openclaw.ai), powered by Decision Models (such as Jev / TypeSafe).

---

## 🎯 The Problem

By default, an AI agent loads dozens of tool schemas and skill definitions on **every single turn**. This causes:
- **Excess Context Bloat:** 5,000–10,000+ tokens consumed per turn just for tool schemas.
- **Higher Costs & Latency:** Slower time-to-first-token (TTFT) and unnecessary API expenses.
- **Tool Hallucinations:** Conversational queries ("Hello", "Explain how quicksort works") risk triggering unrelated tools accidentally.

---

## 💡 The Solution

`openclaw-tool-prefilter` hooks into the agent runtime at `before_prompt_build`:

```
User Turn
   │
   ▼
[Decision Model: Jev / TypeSafe]  ── (Fast, ~40ms, <$0.0001)
   │
   ├─ Probability < threshold (e.g. Pure Chat) ──► Prune tool schemas (`toolsAllow: []`)
   │                                                ⚡ Saves 5,000-10,000 tokens!
   │
   └─ Probability >= threshold (Action Needed) ──► Pass-through tools unconstrained
```

- **Pure Conversation Optimization:** Strips tool definitions when no actions are needed, saving thousands of tokens.
- **Zero Hallucination:** Eliminates unwanted tool calls on casual chit-chat, explanations, or code reviews.
- **Bulletproof Fail-Open Safety:** If the decision provider experiences network issues, rate limits, or timeouts, the plugin immediately fails open (no restrictions). Agent dialogue is **never blocked**.
- **Compliant Request Boundaries:** Correctly respects empty message inputs (e.g., image-only messages) without polluting context from historical prompt strings.

---

## 📦 Installation

### From ClawHub (Recommended)
```bash
openclaw plugins install clawhub:openclaw-tool-prefilter
```

### From npm
```bash
openclaw plugins install npm:openclaw-tool-prefilter
```

### From Local Source
```bash
git clone https://github.com/MertBasar0/openclaw-tool-prefilter.git
openclaw plugins install ./openclaw-tool-prefilter
```

---

## ⚙️ Configuration

In your `openclaw.json` or agent configuration:

```json
{
  "plugins": {
    "tool-prefilter": {
      "enabled": true,
      "thresholdAnyTool": 0.35,
      "timeoutMs": 500
    }
  }
}
```

### Options

| Parameter | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `enabled` | `boolean` | `true` | Enable or disable pre-filtering. |
| `thresholdAnyTool` | `number` | `0.35` | Probability threshold. Turns below this are treated as pure conversation. |
| `timeoutMs` | `number` | `500` | Hard timeout for decision evaluation before failing open. |

---

## 📊 Token Savings Benchmark

| Scenario | Raw Context | With Tool Pre-filter | Savings |
| :--- | :--- | :--- | :--- |
| "Nasılsın? Bugün hava nasıl?" | ~8,400 tokens | ~420 tokens | **95.0%** |
| "Explain how raft consensus works" | ~9,200 tokens | ~580 tokens | **93.7%** |
| "Git status kontrol et ve commit at" | ~8,900 tokens | ~8,900 tokens | Pass-through |

---

## 🧪 Testing & Verification

Run the automated test suite:

```bash
npm test
```

Build the distribution bundle:

```bash
npm run build
```

---

## 📄 License

MIT © [Mert Başar](https://github.com/MertBasar0)
