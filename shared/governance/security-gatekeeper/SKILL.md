---
name: security-gatekeeper
tier: governance
trust_tier: T4
status: active
---

# security-gatekeeper

Applies G1-G4 verification gates before execution.

## What it is
The core governance engine that enforces trust tiers. T4 skills (high risk) require explicit human approval before they can run.

## How to use it
- Low-trust operations (T1) run automatically.
- Higher tiers trigger gates in the Console and Builder.
- Review blocked commands in the Governance page.
- Approve or reject T4 actions when prompted.

Always respect the gates — they protect the lab from unsafe changes.
