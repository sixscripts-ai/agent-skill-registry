# Universal AI Skill Lab — Design System & Visual Guidelines

This document outlines the visual language, design system tokens, typography, and layout principles governing the **Universal AI Skill Lab** interface. Our design takes inspiration from the premium, high-contrast, glowing dark interfaces of modern developer tooling (such as `omo.dev`).

---

## 🌌 Core Aesthetic Theme: Glassmorphic Dark Mode

The Skill Lab is built on a high-fidelity dark-mode foundation designed to feel alive, responsive, and premium. It avoids flat browser defaults in favor of deep-space ink surfaces, subtle backdrop blurs, and neon glowing borders.

### Key Pillars:
1. **Glassmorphism**: Translucent container panels that let ambient background glows filter through.
2. **Neon Accents**: High-contrast glowing borders and status indicators highlighting active interactive components.
3. **Structured Monospace Trace Views**: Collapsible monospace blocks mimicking terminal logs, presenting the inner reasoning of AI agents.
4. **Fluid Motion**: Smooth scale adjustments and color transition states on hover to increase user engagement.

---

## 🎨 Color Palette Tokens

The interface utilizes a curated HSL color palette tailored to a deep developer console theme.

### 1. Base Dark Backgrounds
* **App Canvas**: `#07070a` (Deep Indigo-Ink) — The main base background.
* **Default Card Panel**: `#0a0a0a` / `var(--color-ink-950)` — Layer 1 containers.
* **Secondary Card Panel**: `#111111` / `var(--color-ink-900)` — Layer 2 sub-components.
* **Insets & Code Editor**: `#040406` (Console pitch black) — Used for code blocks, terminal screens, and editors.

### 2. Accent Glow Colors
* **Cyan Glow (`#00f0ff` / `rgb(0, 240, 255)`)**: Primary focus rings, input highlight borders, active navigation states, and planner/developer identifiers.
* **Emerald Glow (`#10b981` / `rgb(16, 185, 129)`)**: Success badges, passed evals, and active MCP status indicators.
* **Violet Glow (`#8b5cf6` / `rgb(139, 92, 246)`)**: Core branding badges, documentation cards, and background ambient glow backdrops.
* **Amber Glow (`#f59e0b` / `rgb(245, 158, 11)`)**: Warning indicators and simulated demo mode warnings.

---

## 📂 Typography & Hierarchy

We establish clear typographic contrast by pairing a modern geometric sans-serif for display headers with a robust monospace font for developer configurations and LLM trace logs.

* **Display & Body Headers**: **Hanken Grotesk**
  * Display titles utilize bold, tight tracking (`tracking-tight`) and crisp contrast.
  * Body copy uses regular weights with relaxed line heights (`leading-relaxed` / `1.625`) to ensure readability on dark surfaces.
* **Code & Logs**: **JetBrains Mono**
  * Used for command lines, JSON/YAML views, and `<thinking>` trace logs.
  * Sized at `11px` to `12px` to fit dense planning streams.

---

## 🎛️ Layout Grids & Structural Containers

### 1. Split-Screen Playground Layout
* Partitioned as a persistent **50/50 vertical grid** on desktop viewports.
* **Left Column**: Skill definition editor — featuring a syntax-style raw textarea.
* **Right Column**: Interactive sandbox chat pane — with floating badges, scrollable history timelines, and quick action bars.

### 2. Glassmorphic CSS Classes
* `.gp-glass-panel`: Applies backdrop blur (`blur-md`), dark translucent backgrounds (`rgba(255,255,255,0.015)`), and thin borders (`rgba(255,255,255,0.06)`).
* `.gp-radial-glow`: Spawns a soft radial indigo background glow beneath the panels to simulate depth.

---

## 🎬 Animation & Micro-Interactions

* **Interactive Border Glows**: Hovering over inputs or cards scales borders from `rgba(255, 255, 255, 0.06)` to active glow states (`rgba(6, 182, 212, 0.45)`) backed by subtle drop-shadow glows.
* **Active Pulse Indicators**: MCP active lights pulse periodically to represent live connections.
* **Transition Timings**: Standard interactive state changes utilize `150ms cubic-bezier(0.4, 0, 0.2, 1)` for smooth visual response.
