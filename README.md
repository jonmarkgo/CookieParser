# Cookie Parser

Parse, compare, and understand baking recipes — baker's percentages, ratios, technique, and the science behind each recipe.

Cookie Parser scrapes recipe URLs, parses ingredients with AI, and gives you a side-by-side breakdown of what makes each recipe different: how much fat, how much sugar, what technique they use, and what that means for the final bake.

## How It Works

1. **Paste 2-4 recipe URLs** (or type ingredients manually)
2. **AI parses every ingredient** — quantities, weights in grams, baking categories
3. **Baker's percentages** show each ingredient relative to total flour (flour = 100%)
4. **AI-powered analysis** highlights the most interesting differences: texture, technique, flavor, and more
5. **Educational concept cards** explain the baking science, citing books like BakeWise, Ratio, and On Food and Cooking

## Features

- **AI ingredient parsing** — handles messy recipe formats, fractions, brand names, parenthetical weights
- **Section detection** — automatically separates frosting/ganache/glaze from the main bake
- **Technique analysis** — compares mixing methods, rest times, oven temperatures, and standout techniques
- **8 bake types** — cookie, cake, bread, muffin, pie, brownie, pastry, and general. Each has tailored reference ratios, tags, and analysis prompts
- **Smart comparison** — AI picks the most interesting themes rather than filling generic sections. If one recipe rests dough for 36 hours and another doesn't, it'll call that out.
- **Shareable URLs** — `?r=url1&r=url2&auto=1` for direct comparison links
- **Chrome extension** — queue recipes as you browse, then compare in one click

## Quick Start

```bash
git clone https://github.com/jonmarkgo/CookieParser.git
cd CookieParser
npm install
```

Create a `.env` file:

```
ANTHROPIC_API_KEY=your-api-key-here
```

Run:

```bash
npm start
```

Open http://localhost:3000

## Chrome Extension

The extension lets you queue recipe URLs from any site while you browse.

**Install:**
1. Open `chrome://extensions/`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked** → select the `extension/` folder

**Use:**
1. Browse to a recipe page
2. Click the Cookie Parser extension icon → **Add This Recipe**
3. Repeat for 2-4 recipes
4. Click **Compare Recipes** — opens the app and auto-compares

The extension stores your queue in Chrome local storage and supports a configurable app URL.

## Architecture

```
server.js                  Hono web server — /api/scrape, /api/compare
lib/
  ai.js                    Anthropic SDK — parsing, extraction, insights, concepts
  scraper.js               URL fetching, JSON-LD extraction, section detection
  bake-types.js            8 bake type profiles with tags, ratios, AI prompts
  baking-math.js           Baker's percentages, ratio analysis, tenderizer/toughener
  ingredient-parser.js     Rule-based fallback parser
  conversions.js           Ingredient weight database
public/
  index.html               Frontend — input, comparison table, ratio bars, analysis cards
extension/
  manifest.json            Chrome extension (Manifest V3)
  popup.html / popup.js    Extension popup — queue management
```

## AI Models

| Task | Model | Why |
|------|-------|-----|
| Ingredient parsing | Claude Haiku 4.5 | Fast, cheap. All ingredients in one batch call via `tool_use`. |
| Recipe extraction (no JSON-LD) | Claude Haiku 4.5 | Extracts title, ingredients, and instructions from raw HTML. |
| Comparison analysis | Claude Sonnet 4.6 | Higher reasoning quality for nuanced baking science insights. |
| Educational concepts | Claude Haiku 4.5 | Generates 4 concept cards with book citations. |

All AI calls use `tool_use` with `tool_choice: { type: "tool" }` for guaranteed structured JSON output — no prompt-and-pray parsing.

## URL Parameters

Pre-fill recipes via URL for sharing or the Chrome extension:

```
http://localhost:3000/?r=https://sallysbakingaddiction.com/chewy-chocolate-chip-cookies/&r=https://cooking.nytimes.com/recipes/1015819-chocolate-chip-cookies&auto=1
```

| Param | Description |
|-------|-------------|
| `r` | Recipe URL (repeat up to 4 times) |
| `auto` | Set to `1` to auto-compare on page load |

## What It Analyzes

- **Baker's percentages** — every ingredient as a % of total flour weight
- **Key ratios** — fat:flour, sugar:flour, hydration, egg:flour
- **Tenderizer/toughener balance** — fats + sugars vs flour + eggs
- **Technique** — mixing method, rest/chill time, oven temp, unique steps
- **Tags** — auto-generated labels like "Rich," "High Hydration," "Low Egg," "Fudgy"
- **Ingredient comparison table** — highlights differences >15% across recipes

## Tech Stack

- [Hono](https://hono.dev/) — lightweight web framework
- [Anthropic SDK](https://docs.anthropic.com/en/docs/initial-setup) — Claude AI integration
- [Tailwind CSS](https://tailwindcss.com/) — styling (via CDN)
- [Marked](https://marked.js.org/) — markdown rendering
- Vanilla JS — no frontend framework
