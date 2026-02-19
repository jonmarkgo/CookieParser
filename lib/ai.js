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
- Section detection: look for section headers in the list (e.g., "For the cake:", "For the ganache:", "Frosting:"). Ingredients for the main bake (cake batter, cookie dough, bread dough) are "primary". Ingredients for frosting, icing, ganache, glaze, topping, filling, drizzle, buttercream, whipped cream, decoration, assembly, or garnish are "secondary". If no section headers are present, mark everything as "primary".
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

/**
 * Generate a baker-friendly comparison analysis using Sonnet 4.6
 * @param {object[]} analyses - RecipeAnalysis[]
 * @param {string} bakeType - bake type slug (e.g. "cookie", "cake")
 * @returns {Promise<string>} markdown-formatted analysis
 */
async function aiCompareRecipes(analyses, bakeType = "other") {
  const anthropic = getClient();
  const profile = getProfile(bakeType);

  const summaries = analyses.map((a, i) => {
    const bp = Object.entries(a.bakersPercentages)
      .map(([name, pct]) => `  ${name}: ${pct.toFixed(1)}%`)
      .join("\n");
    // Extract site name from URL for readable references
    let siteName = "";
    try {
      siteName = new URL(a.recipe.source).hostname.replace(/^www\./, "").replace(/\.(com|net|org|co\.uk)$/, "");
    } catch { siteName = `Recipe ${i + 1}`; }
    return `${siteName} ("${a.recipe.title}")
Total flour: ${a.totalFlourGrams}g
Baker's percentages:
${bp}
Ratios: fat:flour=${a.ratios.fatToFlour.toFixed(2)}, sugar:flour=${a.ratios.sugarToFlour.toFixed(2)}, hydration=${a.ratios.hydration.toFixed(2)}, egg:flour=${a.ratios.eggToFlour.toFixed(2)}
Tenderizer: ${a.tenderizerPct.toFixed(1)}%, Toughener: ${a.toughenerPct.toFixed(1)}%`;
  });

  const typeLabel = profile.label.toLowerCase();
  const refRatio = profile.referenceRatio;

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `You are a baking scientist writing for home bakers. Compare these ${typeLabel} recipes using baker's percentages and ratios.

Reference: ${refRatio.label} (${refRatio.source})

Format rules:
- Use EXACTLY these ## headings in this order: ## Texture & Structure, ## Sweetness & Moisture, ## Richness, ## Flavor Profile
- Under each heading, write 2-3 bullet points MAX
- Each bullet: ONE short sentence (under 20 words). Be punchy and specific.
- Use **bold** for key terms. Include specific numbers (ratios, percentages).
- Do NOT use a top-level heading. Do NOT add any other sections.
- Focus on practical differences a home baker would notice, not theory.
- Refer to each recipe by its site name (e.g., "sallysbakingaddiction", "hersheyland"), NOT "Recipe 1" or "Recipe 2".

${profile.aiPromptFragment}

${summaries.join("\n\n")}`,
      },
    ],
  });

  return message.content[0].text;
}

module.exports = { aiBatchParseIngredients, aiCompareRecipes };
