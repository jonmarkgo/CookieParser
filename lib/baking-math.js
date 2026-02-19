/**
 * Baking math engine: baker's percentages, ratios, tenderizer/toughener analysis
 */

const { normalizeName } = require("./ingredient-parser");

// Categories that count as tenderizers
const TENDERIZER_CATS = new Set(["fat", "sugar", "egg"]); // egg yolks are tenderizers, but whole eggs are mixed
// Categories that count as tougheners
const TOUGHENER_CATS = new Set(["flour"]);

/**
 * Analyze a single recipe
 * @param {object} recipe - Recipe with parsed ingredients
 * @returns {object} RecipeAnalysis
 */
function analyzeRecipe(recipe) {
  const ingredients = recipe.ingredients.filter((i) => i.grams != null && i.grams > 0 && !i.excludeFromAnalysis);

  // Sum flour grams
  const flourIngredients = ingredients.filter((i) => i.category === "flour");
  const totalFlourGrams = flourIngredients.reduce((sum, i) => sum + i.grams, 0);

  // Baker's percentages (relative to total flour)
  const bakersPercentages = {};
  if (totalFlourGrams > 0) {
    for (const ing of ingredients) {
      bakersPercentages[ing.name] = (ing.grams / totalFlourGrams) * 100;
    }
  }

  // Sum by category
  const catSums = {};
  for (const ing of ingredients) {
    catSums[ing.category] = (catSums[ing.category] || 0) + ing.grams;
  }

  const fatGrams = catSums["fat"] || 0;
  const sugarGrams = catSums["sugar"] || 0;
  const eggGrams = catSums["egg"] || 0;
  const liquidGrams = (catSums["liquid"] || 0) + (catSums["dairy"] || 0);
  const totalGrams = ingredients.reduce((s, i) => s + i.grams, 0);

  // Key ratios
  const ratios = {
    fatToFlour: totalFlourGrams > 0 ? fatGrams / totalFlourGrams : 0,
    sugarToFlour: totalFlourGrams > 0 ? sugarGrams / totalFlourGrams : 0,
    hydration: totalFlourGrams > 0 ? (liquidGrams + eggGrams * 0.75) / totalFlourGrams : 0,
    eggToFlour: totalFlourGrams > 0 ? eggGrams / totalFlourGrams : 0,
  };

  // Tenderizer/toughener balance
  let tenderizerGrams = 0;
  let toughenerGrams = 0;
  for (const ing of ingredients) {
    if (TENDERIZER_CATS.has(ing.category)) tenderizerGrams += ing.grams;
    if (TOUGHENER_CATS.has(ing.category)) toughenerGrams += ing.grams;
  }

  return {
    recipe,
    totalFlourGrams,
    bakersPercentages,
    ratios,
    tenderizerPct: totalGrams > 0 ? (tenderizerGrams / totalGrams) * 100 : 0,
    toughenerPct: totalGrams > 0 ? (toughenerGrams / totalGrams) * 100 : 0,
  };
}

/**
 * Compare multiple recipe analyses, grouping similar ingredients together.
 * Uses normalizeName() to align ingredients across recipes while preserving
 * original names for display.
 *
 * @param {object[]} analyses - RecipeAnalysis[]
 * @returns {object} ComparisonResult
 */
function compareRecipes(analyses) {
  // Build groups: normalized name → { displayNames: Map<recipeIdx, originalName>, category }
  const groups = new Map();

  for (let i = 0; i < analyses.length; i++) {
    const a = analyses[i];
    for (const ing of a.recipe.ingredients) {
      if (ing.grams == null || ing.grams <= 0 || ing.excludeFromAnalysis) continue;
      const norm = normalizeName(ing.name);
      if (!groups.has(norm)) {
        groups.set(norm, { displayNames: new Map(), category: ing.category });
      }
      const g = groups.get(norm);
      // Collect the original name used by this recipe
      if (!g.displayNames.has(i)) {
        g.displayNames.set(i, ing.name);
      }
    }
  }

  // Build the sorted list of group keys
  const allGroups = Array.from(groups.keys()).sort();

  // Build percentage matrix and gram matrix: groupKey → { recipeIndex: value }
  // Also build a display label for each group (shows variants if they differ)
  const percentageMatrix = {};
  const gramMatrix = {};
  const groupLabels = {};
  const groupCategories = {};

  for (const norm of allGroups) {
    const g = groups.get(norm);
    percentageMatrix[norm] = {};
    gramMatrix[norm] = {};
    groupCategories[norm] = g.category;

    // Collect unique display names across recipes
    const uniqueNames = new Set(g.displayNames.values());

    // If all recipes use the same name, just show that; otherwise show the normalized name
    if (uniqueNames.size === 1) {
      groupLabels[norm] = uniqueNames.values().next().value;
    } else {
      groupLabels[norm] = norm;
    }

    for (let i = 0; i < analyses.length; i++) {
      const a = analyses[i];
      // Sum baker's % for all ingredients in this recipe that normalize to this group
      let pctSum = 0;
      let gramSum = 0;
      let found = false;
      for (const ing of a.recipe.ingredients) {
        if (ing.grams == null || ing.grams <= 0 || ing.excludeFromAnalysis) continue;
        if (normalizeName(ing.name) === norm) {
          pctSum += a.bakersPercentages[ing.name] || 0;
          gramSum += ing.grams;
          found = true;
        }
      }
      percentageMatrix[norm][i] = found ? pctSum : 0;
      gramMatrix[norm][i] = found ? gramSum : null;
    }
  }

  return {
    analyses,
    allIngredients: allGroups,
    percentageMatrix,
    gramMatrix,
    groupLabels,
    groupCategories,
  };
}

module.exports = { analyzeRecipe, compareRecipes };
