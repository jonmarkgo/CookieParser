const Anthropic = require("@anthropic-ai/sdk").default;
const { getProfile } = require("./bake-types");

let client = null;
function getClient() {
  if (!client) {
    client = new Anthropic();
  }
  return client;
}

// Tool schema for structured ingredient parsing
const INGREDIENT_PARSE_TOOL = {
  name: "parsed_ingredients",
  description: "Return parsed baking ingredients with quantities, units, names, weights in grams, and baking categories",
  input_schema: {
    type: "object",
    properties: {
      ingredients: {
        type: "array",
        items: {
          type: "object",
          properties: {
            quantity: { type: "number", description: "Numeric quantity (e.g., 2.25 for '2 1/4')" },
            unit: { type: "string", description: "Canonical unit: cup, tbsp, tsp, oz, lb, g, kg, ml, stick, each, or empty string" },
            name: { type: "string", description: "Lowercase normalized ingredient name (e.g., 'butter' not 'unsalted butter softened')" },
            grams: { type: "number", description: "Total weight in grams" },
            category: {
              type: "string",
              enum: ["flour", "fat", "sugar", "egg", "liquid", "leavening", "dairy", "flavoring", "other"],
              description: "Baking category for ratio analysis"
            },
            section: {
              type: "string",
              enum: ["primary", "secondary"],
              description: "primary = main bake (cake, cookie, bread dough). secondary = frosting, icing, ganache, glaze, topping, filling, drizzle, buttercream, whipped cream, decoration, assembly, or garnish."
            }
          },
          required: ["quantity", "unit", "name", "grams", "category", "section"]
        }
      }
    },
    required: ["ingredients"]
  }
};

/**
 * AI-powered batch ingredient parsing using Haiku 4.5.
 * Parses ALL ingredients in a single API call for efficiency and accuracy.
 * Uses tool_use for guaranteed structured JSON output.
 *
 * @param {string[]} rawIngredients - raw ingredient strings from recipe
 * @returns {Promise<object[]>} parsed ingredients array
 */
async function aiBatchParseIngredients(rawIngredients) {
  if (!Array.isArray(rawIngredients)) {
    throw new Error(`Expected array of ingredients, got ${typeof rawIngredients}`);
  }
  const anthropic = getClient();

  const numberedList = rawIngredients.map((ing, i) => `${i + 1}. ${ing}`).join("\n");

  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 4096,
    tool_choice: { type: "tool", name: "parsed_ingredients" },
    tools: [INGREDIENT_PARSE_TOOL],
    messages: [
      {
        role: "user",
        content: `Parse these baking ingredients. For each one, extract the quantity, unit, normalized name, total weight in grams, and baking category.

Rules:
- Strip brand names (Hershey's, Nestlé, King Arthur, Toll House, etc.)
- Strip prep words (sifted, melted, softened, chopped, room temperature, divided, etc.)
- Normalize names to consistent canonical forms. IMPORTANT — always use these exact names:
  - "butter" (not "unsalted butter" or "salted butter")
  - "egg" (not "large eggs", "eggs", or "large egg")
  - "granulated sugar" (not "sugar", "white sugar", or "cane sugar")
  - "brown sugar" (not "light brown sugar" or "dark brown sugar")
  - "powdered sugar" (not "confectioners sugar" or "icing sugar")
  - "chocolate chips" (not "semi-sweet chocolate chips", "chocolate morsels", etc.)
  - "vanilla extract" (not "pure vanilla extract")
  - "all-purpose flour" (not "unbleached all-purpose flour")
  - "cocoa powder" (not "unsweetened cocoa powder" or "dutch process cocoa")
  - "baking soda" (not "bicarbonate of soda")
- For eggs: 1 large egg = 50g, 1 egg yolk = 17g, 1 egg white = 33g
- Standard weights: butter 1 cup = 227g / 1 stick = 113g / 1 tbsp = 14g, all-purpose flour 1 cup = 120g, granulated sugar 1 cup = 200g, brown sugar 1 cup = 213g
- Use King Arthur Flour weight chart for other ingredients
- If a parenthetical weight is given like "(170g)" or "(8 oz)", use that as the gram value
- Handle compound quantities like "2 cups plus 2 tablespoons" — combine both parts
- Handle fractions: "2 1/4" = 2.25, "½" = 0.5
- Categories: flour (all flours/starches), fat (butter/oil/shortening/lard/cream cheese), sugar (sugars/honey/syrups/molasses), egg (whole eggs/yolks/whites), liquid (water/milk/juice), dairy (cream/sour cream/yogurt), leavening (baking powder/soda/yeast), flavoring (vanilla/cocoa/spices/salt/extracts), other (chocolate chips/nuts/oats/fruit)
- Condensed milk is category "sugar" (it's sweetened)
- Section detection — use BOTH explicit headers AND baking knowledge:
  1. Look for section headers (e.g., "For the cake:", "For the ganache:", "Frosting:"). Ingredients after a secondary header are "secondary".
  2. Even WITHOUT headers, use baking context to detect secondary components. Only mark as "secondary" a SMALL cluster of finishing ingredients at the very end. Common patterns:
     - Powdered sugar + liquid (juice/milk/water) at the end = glaze (secondary)
     - Heavy cream + chocolate near the end = ganache (secondary)
     - Butter + powdered sugar + vanilla near the end = frosting/buttercream (secondary)
     - Small amounts of decorating ingredients at the end (sprinkles, nuts for topping) = secondary
  3. IMPORTANT: If the recipe has TWO batters/doughs (e.g., "chocolate ricotta pound cake AND lemon poppyseed pound cake"), ALL structural ingredients for BOTH batters are "primary". Structural ingredients = flour, sugar, butter, eggs, baking powder, leavening, salt. Do NOT mark a second batter's butter/sugar as "secondary" just because they appear later in the list.
  4. Only mark as "secondary" things that are clearly finishing/topping/coating — NOT batter/dough ingredients.
  5. Ingredients for the main bake (cake batter, cookie dough, bread dough) are "primary"
  6. Ingredients for frosting, icing, ganache, glaze, topping, filling, drizzle, buttercream, whipped cream, decoration, assembly, or garnish are "secondary"
- If a line is a section header (no quantity, just a label like "For the ganache:"), skip it — do NOT include it as an ingredient. Return only real ingredients.
- Return ingredients in the SAME ORDER as the input (minus any skipped section headers)
- Return EXACTLY the number of real ingredients (excluding section headers)

Ingredients:
${numberedList}`
      }
    ]
  });

  const toolUse = message.content.find(block => block.type === "tool_use");
  if (!toolUse) throw new Error("AI did not return structured output");

  const parsed = toolUse.input.ingredients;
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error(`AI returned no ingredients`);
  }

  return parsed.map((ing, i) => ({
    original: i < rawIngredients.length ? rawIngredients[i] : ing.name,
    quantity: ing.quantity || 0,
    unit: ing.unit || "",
    name: (ing.name || "").toLowerCase().trim(),
    grams: ing.grams != null ? Math.round(ing.grams * 10) / 10 : null,
    category: ing.category || "other",
    excludeFromAnalysis: ing.section === "secondary",
    section: ing.section === "secondary" ? "secondary" : undefined,
  }));
}

// Tool schema for extracting a recipe from HTML
const RECIPE_EXTRACT_TOOL = {
  name: "extracted_recipe",
  description: "Return recipe data extracted from HTML page content",
  input_schema: {
    type: "object",
    properties: {
      title: { type: "string", description: "Recipe title" },
      servings: { type: "string", description: "Servings/yield (e.g., '24 cookies', '12 servings')" },
      ingredients: {
        type: "array",
        items: { type: "string", description: "Raw ingredient string as written (e.g., '2 cups all-purpose flour')" }
      },
      instructions: {
        type: "array",
        items: { type: "string", description: "Each step of the recipe method, in order" }
      }
    },
    required: ["title", "servings", "ingredients", "instructions"]
  }
};

/**
 * Extract recipe data from raw HTML using Haiku 4.5.
 * Used as fallback when no JSON-LD structured data is found.
 * @param {string} html - raw HTML of the page
 * @returns {Promise<{title: string, servings: string, rawIngredients: string[]}>}
 */
async function aiExtractRecipe(html) {
  const anthropic = getClient();

  // Strip scripts, styles, nav, footer to reduce token usage
  const cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "")
    .replace(/<header[\s\S]*?<\/header>/gi, "")
    .replace(/<aside[\s\S]*?<\/aside>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<[^>]+>/g, " ")       // strip remaining tags
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();

  // Truncate to ~15k chars to stay within context limits
  const truncated = cleaned.length > 15000 ? cleaned.slice(0, 15000) : cleaned;

  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 2048,
    tool_choice: { type: "tool", name: "extracted_recipe" },
    tools: [RECIPE_EXTRACT_TOOL],
    messages: [
      {
        role: "user",
        content: `Extract the baking recipe from this page content. Return the recipe title, servings, the complete list of ingredients exactly as written on the page, and all recipe instructions/steps in order. Include ALL ingredients, including those for frosting, ganache, glaze, etc. Do not skip any. For instructions, include each step as a separate string.

Page content:
${truncated}`
      }
    ]
  });

  const toolUse = message.content.find(block => block.type === "tool_use");
  if (!toolUse) throw new Error("AI could not extract recipe from page");

  const result = toolUse.input;
  if (!result.ingredients || result.ingredients.length === 0) {
    throw new Error("AI found no ingredients on this page");
  }

  const rawIngredients = Array.isArray(result.ingredients)
    ? result.ingredients.map(String)
    : [];
  if (rawIngredients.length === 0) {
    throw new Error("AI found no ingredients on this page");
  }

  const instructions = Array.isArray(result.instructions)
    ? result.instructions.map(String)
    : [];

  return {
    title: result.title || "Untitled Recipe",
    servings: result.servings || "",
    rawIngredients,
    instructions,
  };
}

// Tool schema for structured comparison output
const COMPARISON_TOOL = {
  name: "recipe_comparison",
  description: "Return a structured comparison of baking recipes",
  input_schema: {
    type: "object",
    properties: {
      headline: {
        type: "string",
        description: "One punchy sentence (under 25 words) summarizing the most important difference between these recipes. This is the first thing the user reads. Example: 'nytimes goes all-in on butter and a 36-hour rest for chewy, caramelized edges — sallysbakingaddiction keeps it simple and balanced.'"
      },
      recipeDescriptions: {
        type: "array",
        items: {
          type: "object",
          properties: {
            title: { type: "string", description: "Recipe title (exact match from input)" },
            character: { type: "string", description: "One sentence (under 15 words) describing this recipe's personality/character. Example: 'Rich and chewy with browned butter and extra egg yolk.'" }
          },
          required: ["title", "character"]
        },
        description: "One entry per recipe, in the same order as input"
      },
      analysis: {
        type: "string",
        description: "Markdown-formatted comparison with ## headings and bullet points (the detailed analysis)"
      }
    },
    required: ["headline", "recipeDescriptions", "analysis"]
  }
};

/**
 * Generate a baker-friendly comparison analysis using Sonnet 4.6
 * Returns structured data: headline, per-recipe descriptions, and detailed analysis.
 * @param {object[]} analyses - RecipeAnalysis[]
 * @param {string} bakeType - bake type slug (e.g. "cookie", "cake")
 * @returns {Promise<{headline: string, recipeDescriptions: object[], analysis: string}>}
 */
async function aiCompareRecipes(analyses, bakeType = "other") {
  const anthropic = getClient();
  const profile = getProfile(bakeType);

  const summaries = analyses.map((a, i) => {
    const bp = Object.entries(a.bakersPercentages)
      .map(([name, pct]) => `  ${name}: ${pct.toFixed(1)}%`)
      .join("\n");
    let siteName = "";
    try {
      siteName = new URL(a.recipe.source).hostname.replace(/^www\./, "").replace(/\.(com|net|org|co\.uk)$/, "");
    } catch { siteName = `Recipe ${i + 1}`; }

    const instructions = Array.isArray(a.recipe.instructions) && a.recipe.instructions.length > 0
      ? `\nMethod:\n${a.recipe.instructions.map((step, j) => `  ${j + 1}. ${step}`).join("\n")}`
      : "";

    return `${siteName} ("${a.recipe.title}")
Total flour: ${a.totalFlourGrams}g
Baker's percentages:
${bp}
Ratios: fat:flour=${a.ratios.fatToFlour.toFixed(2)}, sugar:flour=${a.ratios.sugarToFlour.toFixed(2)}, hydration=${a.ratios.hydration.toFixed(2)}, egg:flour=${a.ratios.eggToFlour.toFixed(2)}${instructions}`;
  });

  const typeLabel = profile.label.toLowerCase();
  const refRatio = profile.referenceRatio;

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    tool_choice: { type: "tool", name: "recipe_comparison" },
    tools: [COMPARISON_TOOL],
    messages: [
      {
        role: "user",
        content: `You are a baking scientist writing for home bakers. Compare these ${typeLabel} recipes using baker's percentages, ratios, and technique.

Reference: ${refRatio.label} (${refRatio.source})

Return:
1. A "headline" — one punchy sentence (under 25 words) that captures THE key difference a baker should know. Be specific and opinionated, not generic.
2. A "character" description for each recipe — one sentence (under 15 words) capturing its personality. Think of it as a flavor profile for the recipe itself.
3. A detailed "analysis" in markdown with these rules:
  - If recipes are fundamentally different variants (e.g., oatmeal vs chocolate chip), START with a ## Quick Take section (1-2 bullets).
  - Then 3-5 sections using ## headings. Choose the MOST INTERESTING themes — don't use generic headings. Possible angles:
    - Texture, fat strategy, sugar balance, hydration, egg's role
    - Mixing method, rest/chill time, oven temp, standout techniques
    - Tenderizer/toughener balance, flavor/add-ins, leavening
  - Pick only what matters most for THESE recipes.
  - 2-3 bullet points per section MAX.
  - Each bullet: ONE short sentence (under 20 words). Punchy and specific.
  - Use **bold** for key terms. Include specific numbers.
  - Refer to recipes by site name (e.g., "sallysbakingaddiction"), NOT "Recipe 1".

${profile.aiPromptFragment}

${summaries.join("\n\n")}`,
      },
    ],
  });

  const toolUse = message.content.find(block => block.type === "tool_use");
  if (!toolUse) {
    // Fallback: return plain text as before
    const text = message.content[0]?.text || "Analysis unavailable.";
    return { headline: "", recipeDescriptions: [], analysis: text };
  }

  return {
    headline: toolUse.input.headline || "",
    recipeDescriptions: toolUse.input.recipeDescriptions || [],
    analysis: toolUse.input.analysis || "",
  };
}

// Tool schema for generating educational concepts
const CONCEPTS_TOOL = {
  name: "baking_concepts",
  description: "Return 4 educational baking science concepts relevant to the recipes being compared",
  input_schema: {
    type: "object",
    properties: {
      concepts: {
        type: "array",
        items: {
          type: "object",
          properties: {
            title: { type: "string", description: "Short concept name (2-4 words)" },
            text: { type: "string", description: "2-3 sentence explanation for home bakers. Use <strong> for key terms." },
            source: { type: "string", description: "Book or authoritative reference (e.g., 'Shirley Corriher, BakeWise (2008)' or 'Michael Ruhlman, Ratio (2009)')" },
          },
          required: ["title", "text", "source"]
        },
        minItems: 4,
        maxItems: 4,
      }
    },
    required: ["concepts"]
  }
};

/**
 * Generate 4 educational baking concepts relevant to the recipes being compared.
 * Uses Haiku 4.5 for fast, cheap generation.
 * @param {object[]} analyses - RecipeAnalysis[]
 * @param {string} bakeType - detected bake type slug
 * @returns {Promise<object[]>} array of concept objects
 */
async function aiGenerateConcepts(analyses, bakeType = "other") {
  const anthropic = getClient();
  const profile = getProfile(bakeType);

  const recipeSummary = analyses.map(a => {
    return `"${a.recipe.title}" — fat:flour=${a.ratios.fatToFlour.toFixed(2)}, sugar:flour=${a.ratios.sugarToFlour.toFixed(2)}, hydration=${a.ratios.hydration.toFixed(2)}, egg:flour=${a.ratios.eggToFlour.toFixed(2)}`;
  }).join("\n");

  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    tool_choice: { type: "tool", name: "baking_concepts" },
    tools: [CONCEPTS_TOOL],
    messages: [
      {
        role: "user",
        content: `Generate 4 educational "Key Concepts" cards for home bakers comparing these ${profile.label.toLowerCase()} recipes:

${recipeSummary}

Rules:
- Each concept should explain a baking science principle that's directly relevant to understanding the differences between THESE specific recipes
- First concept should always explain Baker's Percentages (what they are and how to read them)
- Other 3 concepts should be chosen based on what's most relevant: tenderizer/toughener balance, hydration, fat's role, sugar types, egg function, gluten, leavening, etc.
- Each "text" field: 2-3 sentences max. Write for curious home bakers, not professionals.
- Use <strong> HTML tags for key terms.
- For "source", cite authoritative baking books: BakeWise by Shirley Corriher, Ratio by Michael Ruhlman, On Food and Cooking by Harold McGee, The Bread Baker's Apprentice by Peter Reinhart, BraveTart by Stella Parks, Keys to Good Cooking by Harold McGee, etc. Use format "Author, Book Title (Year)".
- Do NOT cite URLs or websites. Books don't go 404.`
      }
    ]
  });

  const toolUse = message.content.find(block => block.type === "tool_use");
  if (!toolUse) return [];

  const bgs = ["indigo", "amber", "emerald", "rose"];
  return toolUse.input.concepts.map((c, i) => ({
    title: c.title,
    bg: bgs[i] || "indigo",
    text: c.text,
    source: { label: c.source, url: null },
  }));
}

module.exports = { aiBatchParseIngredients, aiExtractRecipe, aiCompareRecipes, aiGenerateConcepts };
