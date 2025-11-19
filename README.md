# HarvestPlan: Recipe Planner + Grocery Helper

HarvestPlan is a beautiful, fast recipe planner that lets you favorite and tag recipes, plan your week, and auto-generate a smart grocery list. Built by [Teda.dev](https://teda.dev), the AI app builder for everyday problems.

## Features
- Recipe library with favorites and tagging
- Powerful search by name or ingredient
- Weekly planner: assign recipes to days
- Grocery helper: aggregate ingredients from your plan, check off in-store, and add custom items
- LocalStorage persistence so everything stays after reload
- Responsive, accessible UI with smooth CSS animations

## Tech Stack
- HTML5, CSS3, Tailwind CSS (Play CDN)
- jQuery 3.7.x for interactions
- Modular JavaScript with a single global namespace `window.App`

## Files
- index.html: Marketing landing page with floating hero and CTAs
- app.html: Main application interface
- styles/main.css: Custom styles and animations
- scripts/helpers.js: Utilities, storage, and ingredient parsing
- scripts/ui.js: App logic, rendering, and event binding
- scripts/main.js: Entry point that initializes the app
- assets/logo.svg: App logo

## Getting Started
1. Download the project files.
2. Open `index.html` for the landing page or `app.html` to jump straight into the app.
3. Add your recipes, plan your week, and generate your grocery list.

No build step required. Everything runs directly in your browser.

## Accessibility
- Keyboard navigable controls and high-contrast design
- Reduced motion respects CSS animations (browser-level setting)

## Data Persistence
Your data is stored in browser LocalStorage under a scoped namespace. To reset, use your browser storage tools or click Clear in the planner and grocery sections.

## License
MIT
