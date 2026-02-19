const { parseIngredients } = require("./ingredient-parser");

/**
 * Scrape a recipe from a URL by extracting JSON-LD structured data
 * @param {string} url
 * @returns {Promise<object>} Recipe
 */
async function scrapeRecipe(url) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; BakingComparer/1.0)",
      "Accept": "text/html",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();

  // Extract all JSON-LD scripts
  const jsonLdBlocks = [];
  const regex = /<script\s+type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    try {
      jsonLdBlocks.push(JSON.parse(match[1]));
    } catch {
      // skip invalid JSON
    }
  }

  // Find the Recipe object
  const recipe = findRecipe(jsonLdBlocks);
  if (!recipe) {
    throw new Error("No structured recipe data (JSON-LD) found on this page. The site may not include machine-readable recipe markup.");
  }

  // Extract fields
  const title = recipe.name || "Untitled Recipe";
  const servings = Array.isArray(recipe.recipeYield)
    ? recipe.recipeYield[0]
    : recipe.recipeYield || "";

  const rawIngredients = recipe.recipeIngredient || [];
  if (rawIngredients.length === 0) {
    throw new Error("Recipe found but no ingredients listed in structured data.");
  }

  // Rule-based parsing as default (AI parsing happens in server.js)
  const ingredients = parseIngredients(rawIngredients);

  // Detect ingredient sections (cake vs frosting, etc.)
  const sections = extractIngredientSections(html, rawIngredients);
  if (sections.length >= 2) {
    const totalSectionCount = sections.reduce((s, sec) => s + sec.count, 0);
    if (totalSectionCount >= ingredients.length * 0.8 && totalSectionCount <= ingredients.length * 1.2) {
      applyIngredientSections(ingredients, sections);
    }
  }

  const instructions = extractInstructions(recipe.recipeInstructions);

  return {
    title,
    source: url,
    servings: String(servings),
    ingredients,
    rawIngredients,
    sections,
    instructions,
  };
}

/**
 * Recursively search for a Recipe type in JSON-LD data
 */
function findRecipe(data) {
  if (!data) return null;

  if (Array.isArray(data)) {
    for (const item of data) {
      const found = findRecipe(item);
      if (found) return found;
    }
    return null;
  }

  if (typeof data === "object") {
    // Check @type
    const type = data["@type"];
    if (type === "Recipe" || (Array.isArray(type) && type.includes("Recipe"))) {
      return data;
    }

    // Check @graph
    if (data["@graph"]) {
      return findRecipe(data["@graph"]);
    }

    // Check nested objects
    for (const value of Object.values(data)) {
      if (typeof value === "object") {
        const found = findRecipe(value);
        if (found) return found;
      }
    }
  }

  return null;
}

/**
 * Extract instruction text from various JSON-LD formats
 */
function extractInstructions(instructions) {
  if (!instructions) return [];
  if (typeof instructions === "string") return [instructions];
  if (Array.isArray(instructions)) {
    return instructions.map((step) => {
      if (typeof step === "string") return step;
      if (step.text) return step.text;
      if (step.itemListElement) {
        return step.itemListElement.map((s) => s.text || s).join(" ");
      }
      return String(step);
    });
  }
  return [];
}

// Patterns that indicate a non-primary section (frosting, topping, etc.)
const SECONDARY_SECTION_PATTERN = /\b(frosting|icing|ganache|glaze|topping|filling|drizzle|buttercream|cream cheese|whipped|decoration|assembly|garnish)\b/i;

/**
 * Extract ingredient section headers from the HTML to determine which
 * ingredients belong to frosting/topping vs. the primary bake.
 * Returns an array of { name, count } in order, or [] if no sections found.
 */
function extractIngredientSections(html, rawIngredients) {
  const sections = [];

  // Strategy 1: Tasty Recipes plugin — <h4> tags inside ingredients body
  const tastyPattern = /tasty-recipes-ingredients-body[^>]*>([\s\S]*?)(?:<\/div>\s*<\/div>|tasty-recipes-instructions)/i;
  const tastyMatch = html.match(tastyPattern);
  if (tastyMatch) {
    const body = tastyMatch[1];
    // Split by <h4> tags to get sections
    const h4Parts = body.split(/<h4[^>]*>/i);
    for (let i = 1; i < h4Parts.length; i++) {
      const nameMatch = h4Parts[i].match(/^([^<]+)/);
      const name = nameMatch ? nameMatch[1].trim() : "";
      const liCount = (h4Parts[i].match(/<li[\s>]/gi) || []).length;
      if (name && liCount > 0) sections.push({ name, count: liCount });
    }
    if (sections.length > 0) return sections;
  }

  // Strategy 2: WP Recipe Maker — .wprm-recipe-group-name
  const wprmPattern = /wprm-recipe-ingredient-group[\s\S]*?wprm-recipe-group-name[^>]*>([^<]*)<[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/gi;
  let wprmMatch;
  while ((wprmMatch = wprmPattern.exec(html)) !== null) {
    const name = wprmMatch[1].trim();
    const liCount = (wprmMatch[2].match(/<li[\s>]/gi) || []).length;
    if (name && liCount > 0) sections.push({ name, count: liCount });
  }
  if (sections.length > 0) return sections;

  // Strategy 3: Check raw ingredient strings for section headers
  // (strings with no quantity that look like labels)
  const headerPattern = /^(?:for\s+(?:the\s+)?)?(.+?)(?:\s*:|\s*-)\s*$/i;
  let currentSection = null;
  let currentCount = 0;
  for (const raw of rawIngredients) {
    const trimmed = raw.trim();
    // Section header: short string, no digits, ends with colon or is very short
    if (trimmed.length < 40 && !/\d/.test(trimmed) && headerPattern.test(trimmed)) {
      if (currentSection !== null) {
        sections.push({ name: currentSection, count: currentCount });
      }
      currentSection = trimmed.replace(headerPattern, "$1").trim();
      currentCount = 0;
    } else if (currentSection !== null) {
      currentCount++;
    }
  }
  if (currentSection !== null && currentCount > 0) {
    sections.push({ name: currentSection, count: currentCount });
  }
  // Only use if we found at least 2 sections
  if (sections.length >= 2) return sections;

  return [];
}

/**
 * Apply section metadata to parsed ingredients.
 * Marks ingredients in secondary sections (frosting, icing, etc.) as excluded.
 */
function applyIngredientSections(ingredients, sections) {
  let idx = 0;
  for (const section of sections) {
    const isSecondary = SECONDARY_SECTION_PATTERN.test(section.name);
    for (let i = 0; i < section.count && idx < ingredients.length; i++, idx++) {
      ingredients[idx].section = section.name;
      if (isSecondary) {
        ingredients[idx].excludeFromAnalysis = true;
      }
    }
  }
}

module.exports = { scrapeRecipe, applyIngredientSections };
