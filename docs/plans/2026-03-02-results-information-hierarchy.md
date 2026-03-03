# Results Information Hierarchy Redesign

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Restructure the results section to prioritize AI analysis, reduce information overload with progressive disclosure, tame decorative animations, and persist user preferences.

**Architecture:** Single-file changes to `public/index.html`. Reorder the results HTML section, modify CSS to default-collapse secondary sections, strip decorative animations, add localStorage persistence for section collapse states. No server changes needed.

**Tech Stack:** HTML, Tailwind CSS (CDN), vanilla JS, localStorage

---

### Task 1: Reorder Results HTML — Promote AI Analysis

**Files:**
- Modify: `public/index.html:634-693` (results section HTML)

**Step 1: Restructure the results section**

Change the order of children inside `<section id="results">` from:

```
1. bake-type-info
2. headline-section
3. recipe-cards
4. insights-section (AI analysis)
5. key-ratios
6. baker's-percentages
7. concepts-container
```

To:

```
1. headline-section (verdict — stays top)
2. bake-type-info (made inline/subtle below headline)
3. insights-section (AI analysis — PROMOTED to hero position, always open)
4. recipe-cards (moved below analysis)
5. key-ratios (collapsed by default)
6. baker's-percentages (stays collapsed)
7. concepts-container (collapsed by default)
```

The AI analysis `insights-section` should NOT have the `collapsed` class — it stays open by default. Key Ratios gets the `collapsed` class added to both its toggle and body. Concepts gets wrapped in a collapsible card.

**Step 2: Verify the page loads without JS errors**

Open `http://localhost:3000` in a browser. Confirm the page renders. No need to run a comparison yet — just ensure no structural breakage.

**Step 3: Commit**

```bash
git add public/index.html
git commit -m "Reorder results: promote AI analysis above recipe cards"
```

---

### Task 2: Default-Collapse Secondary Sections

**Files:**
- Modify: `public/index.html:660-692` (Key Ratios and Concepts HTML)
- Modify: `public/index.html` (renderConcepts JS function)

**Step 1: Collapse Key Ratios by default**

In the Key Ratios HTML section, add `collapsed` class to the section-toggle div and its section-body div, matching how Baker's Percentages already works:

```html
<!-- Key Ratios — now collapsed by default -->
<div class="card p-6">
  <div class="section-toggle collapsed" onclick="toggleSection(this)">
    <h2 class="text-lg font-semibold text-slate-800 flex items-center justify-between">
      <span>Key Ratios <span class="text-xs font-medium text-slate-400 bg-slate-100 rounded-full px-2 py-0.5 ml-2">4 ratios</span></span>
      <span class="chevron">&#9660;</span>
    </h2>
    <p class="text-xs text-slate-400 mt-1">Visual comparison of fat, sugar, hydration, and egg ratios</p>
  </div>
  <div class="section-body collapsed mt-4">
    <div id="ratio-bars" class="space-y-6"></div>
  </div>
</div>
```

**Step 2: Wrap Concepts in a collapsible card**

Change the `renderConcepts` function to wrap its output in a collapsible section-toggle pattern, collapsed by default:

```javascript
container.innerHTML = `
  <div class="card p-6">
    <div class="section-toggle collapsed" onclick="toggleSection(this)">
      <h2 class="text-lg font-semibold text-slate-800 flex items-center justify-between">
        <span>Key Concepts <span class="text-xs font-medium text-slate-400 bg-slate-100 rounded-full px-2 py-0.5 ml-2">${concepts.length} concepts</span></span>
        <span class="chevron">&#9660;</span>
      </h2>
    </div>
    <div class="section-body collapsed mt-4">
      <div class="grid md:grid-cols-2 gap-4">
        ${concepts.map(c => { ... }).join("")}
      </div>
    </div>
  </div>`;
```

**Step 3: Add content-preview counts to Baker's Percentages header**

The `bp-count` span already exists and is populated by `renderComparisonTable`. Confirm it still works after reordering.

**Step 4: Verify progressive disclosure works**

Run the app, perform a comparison, and confirm:
- AI Analysis is open by default
- Key Ratios is collapsed with "4 ratios" badge
- Baker's Percentages is collapsed with ingredient count
- Concepts is collapsed with concept count
- Clicking each section header expands/collapses it

**Step 5: Commit**

```bash
git add public/index.html
git commit -m "Collapse secondary sections by default, add content preview counts"
```

---

### Task 3: Strip Decorative Animations

**Files:**
- Modify: `public/index.html` (CSS section, lines ~11-516)
- Modify: `public/index.html` (JS section, animation IIFEs near end of file)

**Step 1: Remove decorative CSS animations**

Delete these CSS blocks entirely:
- `.floating-cookie` and `@keyframes float-around` (floating background emojis)
- `.sparkle` and `@keyframes sparkle-fade` (cursor sparkle trail)
- `.cookie-confetti` and `@keyframes cookie-confetti-fall` (cookie emoji confetti)
- `.floating-ingredient` and `@keyframes ingredient-float` (floating ingredients)
- `.ingredient-rain` and `@keyframes rain-fall` (ingredient rain)
- `.heat-wave` and `@keyframes heat-shimmer` (oven heat waves)
- `.flour-poof` and `@keyframes poof` (flour poof on click)
- `.sugar-sparkle` and `@keyframes sparkle-twinkle` (sugar sparkles)
- `.rolling-pin` and `@keyframes roll-pin` (rolling pin animation)
- `.dough-rise` and `@keyframes rise` (dough rise)
- `.butter-melt` and `@keyframes melt` (butter melt)
- `.egg-crack` and `@keyframes crack` (egg crack)
- `.bounce-letter` and `@keyframes bounce-in` (bouncy title letters)
- `.jelly` / `@keyframes jelly` (jelly card hover — replace with the existing clean translateY hover)
- `.confetti` and `@keyframes confetti-fall` (basic confetti)
- `@keyframes pulse-glow` on compare button (pulsing glow)

Keep these purposeful animations:
- `.bar-fill` transition (data visualization)
- `@keyframes slideUp` (content entrance — but remove stagger delays)
- `.section-body` transition (collapse/expand)
- `.card-ingredients` transition (expand)
- `.cookie-badge` and `.cookie-crumb` (interactive easter egg — user-initiated)
- `.recipe-card` hover translateY + shadow (subtle feedback)
- `.chevron` rotation (toggle indicator)
- `.spinner` / `@keyframes cookie-spin` (loading state)
- `.typing-cursor` (headline effect)
- `.insight-card` entrance (keep but reduce delay)

**Step 2: Remove staggered entrance delays**

Change the `#results > *` animation from staggered (60ms increments) to a single 200ms fade:

```css
#results > * { animation: slideUp 0.2s ease-out both; }
```

Remove the `:nth-child` delay rules.

**Step 3: Remove decorative JS animation code**

Delete these IIFE blocks from the script section:
- `animateTitle()` — bouncy letter-by-letter title
- `spawnFloatingCookies()` — floating emoji background
- `sparkleTrail()` — cursor sparkle trail
- `createFloatingIngredients()` — floating ingredient emojis
- `launchIngredientRain()` function
- `createFlourPoof()` function
- `createSugarSparkle()` function
- `showHeatWave()` / `hideHeatWave()` functions
- The enhanced confetti override (`_originalLaunchConfetti`)
- `cookieBadgeWiggle()` periodic wiggle
- The `launchConfetti()` function body (replace with empty function or remove the call from `renderResults`)

Keep:
- `launchCookieBurst()` (user-initiated easter egg on cookie badge click)
- Ripple effect on buttons (subtle, user-initiated)
- Headline typing effect (purposeful — signals AI-generated content)

**Step 4: Update the `prefers-reduced-motion` media query**

Trim it down to only reference the animations that still exist.

**Step 5: Verify the page still works**

Load the page. Confirm:
- No floating emojis, no sparkle trail, no confetti on results
- Title renders normally (no bouncing letters)
- Cards still have subtle hover effect
- Compare button no longer pulses
- Cookie badge still works as interactive easter egg
- Loading spinner still works

**Step 6: Commit**

```bash
git add public/index.html
git commit -m "Remove decorative animations, keep purposeful transitions"
```

---

### Task 4: Persist Section Collapse State in localStorage

**Files:**
- Modify: `public/index.html` (toggleSection JS function + init code)

**Step 1: Add localStorage persistence to toggleSection**

Modify `toggleSection()` to save state:

```javascript
function toggleSection(el) {
  el.classList.toggle("collapsed");
  const body = el.nextElementSibling;
  if (body.classList.contains("collapsed")) {
    body.classList.remove("collapsed");
    body.style.maxHeight = body.scrollHeight + "px";
  } else {
    body.style.maxHeight = body.scrollHeight + "px";
    requestAnimationFrame(() => body.classList.add("collapsed"));
  }

  // Persist collapse state
  const sectionId = el.closest('.card')?.querySelector('[id]')?.id
    || el.querySelector('h2 span')?.textContent?.trim();
  if (sectionId) {
    const states = JSON.parse(localStorage.getItem('cookieparser_sections') || '{}');
    states[sectionId] = el.classList.contains('collapsed');
    localStorage.setItem('cookieparser_sections', JSON.stringify(states));
  }
}
```

**Step 2: Restore states on renderResults**

Add a function that runs after `renderResults` to restore saved collapse states:

```javascript
function restoreSectionStates() {
  const states = JSON.parse(localStorage.getItem('cookieparser_sections') || '{}');
  document.querySelectorAll('.section-toggle').forEach(toggle => {
    const sectionId = toggle.closest('.card')?.querySelector('[id]')?.id
      || toggle.querySelector('h2 span')?.textContent?.trim();
    if (sectionId && states[sectionId] !== undefined) {
      const isCollapsed = states[sectionId];
      const body = toggle.nextElementSibling;
      toggle.classList.toggle('collapsed', isCollapsed);
      body.classList.toggle('collapsed', isCollapsed);
    }
  });
}
```

Call `restoreSectionStates()` at the end of `renderResults()`.

**Step 3: Verify persistence works**

Run a comparison. Expand "Key Ratios". Refresh the page and run the comparison again. Confirm Key Ratios stays expanded.

**Step 4: Commit**

```bash
git add public/index.html
git commit -m "Persist section collapse states in localStorage"
```

---

### Task 5: Accessibility — Button Toggles with aria-expanded

**Files:**
- Modify: `public/index.html` (section-toggle HTML + JS)

**Step 1: Change section-toggle divs to buttons**

Replace each `<div class="section-toggle" onclick="toggleSection(this)">` with `<button>` elements. Add `aria-expanded` attribute:

```html
<button class="section-toggle w-full text-left" onclick="toggleSection(this)" aria-expanded="true">
```

For collapsed-by-default sections:
```html
<button class="section-toggle collapsed w-full text-left" onclick="toggleSection(this)" aria-expanded="false">
```

**Step 2: Update toggleSection to manage aria-expanded**

Add to `toggleSection()`:

```javascript
el.setAttribute('aria-expanded', !el.classList.contains('collapsed'));
```

**Step 3: Verify keyboard accessibility**

Tab to a section toggle, press Enter or Space. Confirm it expands/collapses. Screen reader should announce the expanded state.

**Step 4: Commit**

```bash
git add public/index.html
git commit -m "Use button elements for section toggles, add aria-expanded"
```

---

### Task 6: Final Polish — Headline + Bake Type Integration

**Files:**
- Modify: `public/index.html` (headline section HTML, renderBakeTypeInfo JS)

**Step 1: Tighten headline + bake type spacing**

Move the bake-type-info badge to sit directly beneath the headline rather than above it, making it feel like a subtitle:

```html
<!-- Headline + Bake Type (combined) -->
<div id="headline-section" class="hidden text-center mb-2">
  <p id="headline-text" class="text-lg font-medium text-slate-700 leading-relaxed"></p>
  <div id="bake-type-info" class="mt-2"></div>
</div>
```

**Step 2: Update renderBakeTypeInfo to center its content**

Add `justify-center` to the flex container inside renderBakeTypeInfo.

**Step 3: Update renderResults to show headline section properly**

Since bake-type-info is now inside headline-section, update the show/hide logic so headline-section always shows when results render (bake type is always present even if headline text is empty).

**Step 4: Remove the old standalone bake-type-info div**

Delete the `<div id="bake-type-info"></div>` that was at the top of results (now moved inside headline-section).

**Step 5: Verify the combined headline + bake type looks right**

Run a comparison. Confirm headline text appears centered, with bake type badge centered below it.

**Step 6: Commit**

```bash
git add public/index.html
git commit -m "Combine headline and bake type into unified header"
```
