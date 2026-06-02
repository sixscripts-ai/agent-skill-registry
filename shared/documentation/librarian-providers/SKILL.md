---
name: librarian-providers
tier: documentation
trust_tier: T1
status: active
---

# Librarian: Providers

How providers, models, and roles are configured for different agent tasks without lock-in.

## What it is
The lab supports multiple AI providers (OpenAI, Anthropic, Gemini, Ollama, local) via configuration. Roles like planner, executor can be routed to different models.

## How to use it
- Configure in providers.yaml or via the Providers page in the UI.
- Set default_provider and per-role overrides.
- Use AI_API_KEY, AI_BASE_URL, AI_MODEL env for the Librarian explainer.

This skill provides the knowledge for explaining providers and LLM configuration.
