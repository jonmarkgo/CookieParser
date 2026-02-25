require("dotenv").config();
const { Hono } = require("hono");
const { serve } = require("@hono/node-server");
const { serveStatic } = require("@hono/node-server/serve-static");
const { scrapeRecipe, applyIngredientSections } = require("./lib/scraper");
const { parseIngredients } = require("./lib/ingredient-parser");
const { analyzeRecipe, compareRecipes } = require("./lib/baking-math");
const { aiBatchParseIngredients, aiExtractRecipe, aiCompareRecipes, aiGenerateConcepts } = require("./lib/ai");
const { BAKE_TYPES, detectBakeType, getProfile, getRecipeTags } = require("./lib/bake-types");

const app = new Hono();

// Serve static files from public/
app.use("/*", serveStatic({ root: "./public" }));

// POST /api/scrape - scrape a recipe from a URL
app.post("/api/scrape", async (c) => {
  try {
    const { url } = await c.req.json();
    if (!url) return c.json({ error: "URL is required" }, 400);

    let recipe = await scrapeRecipe(url);

    // If no JSON-LD found, use AI to extract recipe from HTML
    if (recipe._needsAI) {
      console.log(`[AI] No JSON-LD found, extracting recipe from HTML...`);
      const extracted = await aiExtractRecipe(recipe.html);
      console.log(`[AI] Extracted: "${extracted.title}" with ${extracted.rawIngredients.length} ingredients`);
      recipe = {
        title: extracted.title,
        source: url,
        servings: extracted.servings,
        rawIngredients: extracted.rawIngredients,
        ingredients: [],
        sections: [],
        instructions: extracted.instructions || [],
      };
    }

    // Try AI-powered batch parsing (Haiku 4.5) — handles parsing + section detection
    try {
      console.log(`[AI] Batch parsing ${Array.isArray(recipe.rawIngredients) ? recipe.rawIngredients.length : typeof recipe.rawIngredients} raw ingredients...`);
      const aiParsed = await aiBatchParseIngredients(recipe.rawIngredients);
      recipe.ingredients = aiParsed;

      const secondary = aiParsed.filter(i => i.excludeFromAnalysis);
      console.log(`[AI] Parsed ${aiParsed.length} ingredients via Haiku 4.5 (${secondary.length} secondary excluded)`);
    } catch (aiErr) {
      // AI failed — keep rule-based parsing from scraper (if available)
      console.warn(`[AI] Batch parse failed, using rule-based fallback: ${aiErr.message}`);
      if (!recipe.ingredients || recipe.ingredients.length === 0) {
        throw new Error("No ingredient list found on this page. This may be a blog post about a recipe rather than the recipe itself — try the original recipe URL instead.");
      }
    }

    // Don't send raw HTML back to client
    delete recipe.html;
    delete recipe._needsAI;

    return c.json(recipe);
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

// POST /api/compare - compare multiple recipes
app.post("/api/compare", async (c) => {
  try {
    const body = await c.req.json();
    const { recipes, bakeTypeOverride } = body;
    if (!recipes || !Array.isArray(recipes) || recipes.length < 2) {
      return c.json({ error: "At least 2 recipes are required" }, 400);
    }

    // Handle manual recipes that come with raw ingredient strings
    for (const recipe of recipes) {
      if (recipe._raw && Array.isArray(recipe.ingredients) && typeof recipe.ingredients[0] === "string") {
        const rawStrings = recipe.ingredients;

        // Try AI batch parsing first
        try {
          recipe.ingredients = await aiBatchParseIngredients(rawStrings);
          console.log(`[AI] Parsed ${recipe.ingredients.length} manual ingredients via Haiku 4.5`);
        } catch (aiErr) {
          // Fall back to rule-based parsing
          console.warn(`[AI] Manual batch parse failed, using rule-based fallback: ${aiErr.message}`);
          recipe.ingredients = parseIngredients(rawStrings);
        }

        delete recipe._raw;
      }
    }

    const analyses = recipes.map(analyzeRecipe);
    const comparison = compareRecipes(analyses);

    // Bake type detection
    const detectedTypes = recipes.map((r) => detectBakeType(r.title));
    let bakeType;
    let bakeTypeWarning = null;

    if (bakeTypeOverride && BAKE_TYPES[bakeTypeOverride]) {
      bakeType = bakeTypeOverride;
    } else {
      bakeType = detectedTypes[0];
      // Check if types differ
      const uniqueTypes = [...new Set(detectedTypes)];
      if (uniqueTypes.length > 1) {
        const labels = uniqueTypes.map((t) => getProfile(t).label);
        bakeTypeWarning = `These recipes appear to be different types (${labels.join(", ")}). Comparing as "${getProfile(bakeType).label}" — you can override this with the dropdown above.`;
      }
    }

    const profile = getProfile(bakeType);

    // Attach tags to each analysis
    for (const a of comparison.analyses) {
      a.tags = getRecipeTags(a, bakeType);
    }

    // Get AI insights + concepts in parallel
    const [insightsResult, conceptsResult] = await Promise.allSettled([
      aiCompareRecipes(analyses, bakeType),
      aiGenerateConcepts(analyses, bakeType),
    ]);

    const insights = insightsResult.status === "fulfilled"
      ? insightsResult.value
      : "AI analysis unavailable: " + insightsResult.reason?.message;

    const concepts = conceptsResult.status === "fulfilled"
      ? conceptsResult.value
      : [];

    return c.json({
      ...comparison,
      insights,
      bakeType,
      bakeTypeLabel: profile.label,
      bakeTypeWarning,
      referenceRatio: profile.referenceRatio,
      concepts,
      ratioDescriptions: profile.ratioDescriptions,
    });
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

const port = process.env.PORT || 3000;
serve({ fetch: app.fetch, port }, () => {
  console.log(`Cookie Parser running at http://localhost:${port}`);
});
