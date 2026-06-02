---
name: provider-router
tier: functional
trust_tier: T2
status: active
---

# provider-router

Selects model providers by task role without vendor lock-in.

## What it is
A smart router that maps roles (planner, executor, critic, etc.) to the best available provider (OpenAI, Gemini, local, Tetrate, etc.) based on providers.yaml and current env status.

## How to use it
- Configure roles in Providers page or providers.yaml.
- The runtime automatically routes calls.
- Use for cost, speed, or capability optimization.
- Check /providers for current routing and env health.

Enables true multi-provider setups.
