---
name: system-audit
tier: atomic
trust_tier: T1
status: active
---

# system-audit

Runs a safe read-only audit of the current project directory.

## What it is
A diagnostic tool that scans the project for configuration, dependencies, and potential issues without making changes.

## How to use it
1. Run `aiskill system-audit` from the Console.
2. Review the output for warnings about missing files, outdated deps, or misconfigurations.
3. Use the findings to decide on next actions like sync or doctor.

This skill is safe for T1 and provides quick health insights.

# e2e test edit comment