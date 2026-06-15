# Qwen Local LLM Module

Replaces the previous Phi-2 + LoRA setup. Uses
[Qwen2.5-1.5B-Instruct](https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct) by
default - small enough to run on a 4GB GPU with 4-bit quantization, or on
CPU (slower).

## Lazy loading

The model is **not** loaded at import time or app startup. It loads on the
first request to any `/api/llm/*` endpoint (except `/health`, which only
reports status) and is cached for the lifetime of the process.

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `LOCAL_LLM_MODEL_ID` | `Qwen/Qwen2.5-1.5B-Instruct` | HuggingFace model id |
| `LOCAL_LLM_DEVICE` | `auto` | `auto`, `cuda`, or `cpu` |
| `LOCAL_LLM_LOAD_IN_4BIT` | `true` | 4-bit quantization on CUDA (ignored on CPU) |
| `LOCAL_LLM_MAX_NEW_TOKENS` | `512` | Max tokens generated per response |
| `LOCAL_LLM_TEMPERATURE` | `0.7` | Sampling temperature |
| `LOCAL_LLM_TOP_P` | `0.9` | Nucleus sampling top-p |

## Endpoints

All endpoints are mounted under `/api/llm`.

- `GET /api/llm/health` - reports whether the model is loaded, the resolved
  device, and any load error. Does not trigger a load.
- `POST /api/llm/generate` - free-form generation with an optional system
  prompt. Returns `{ output, model_id, disclaimer }`.
- `POST /api/llm/financial-advice` - takes `{ question, profile }` and
  returns advice tailored to the profile, always with a disclaimer.
- `POST /api/llm/intent` - classifies a voice/text command into
  `{ intent, risk_level, parameters }`. `risk_level: "high"` (including
  `forbidden_action`) must never be auto-executed by the client.
- `POST /api/llm/scam-check` - analyzes a message for scam/phishing
  indicators and returns `{ is_suspicious, risk_level, reasons, explanation }`.

## Safety

- `safety.py` provides a deterministic prompt-injection filter and a
  forbidden-action keyword list (transfers, payments, account deletion,
  privilege changes) that short-circuit the LLM for obviously high-risk
  input.
- `prompts.py` instructs the model to avoid guaranteed-return language and to
  always append the standard "educational, not financial advice" disclaimer.
- Structured endpoints (`/intent`, `/scam-check`) request strict JSON and
  fall back to safe defaults (`unknown` / `low` risk) if the model's output
  cannot be parsed.

## Disabled features from Phi-2

- LoRA fine-tuned checkpoints (`./phi2-finetuned`) are no longer loaded.
- The `/api/chat` and `/api/translate` endpoints previously served by
  `agent/Phi_Model/phi_model_router.py` have been removed. Equivalent
  free-form chat is now available via `/api/llm/generate` or
  `/api/llm/financial-advice`, and `/chatbot/chat` (Gemini-based) remains
  available if `GEMINI_API_KEY` is configured.
