// Type documentation (plain JS, types are in JSDoc comments)

/**
 * @typedef {Object} ParsedIngredient
 * @property {string} original - "2 1/4 cups all-purpose flour, sifted"
 * @property {number} quantity - 2.25
 * @property {string} unit - "cups"
 * @property {string} name - "all-purpose flour"
 * @property {number} grams - 270
 * @property {string} category - flour|fat|sugar|egg|liquid|leavening|dairy|flavoring|other
 */

/**
 * @typedef {Object} Recipe
 * @property {string} title
 * @property {string} source - URL or "manual"
 * @property {string} servings
 * @property {ParsedIngredient[]} ingredients
 * @property {string[]} [instructions]
 */

/**
 * @typedef {Object} RecipeAnalysis
 * @property {Recipe} recipe
 * @property {number} totalFlourGrams
 * @property {Record<string, number>} bakersPercentages - ingredient name → % of flour
 * @property {{fatToFlour: number, sugarToFlour: number, hydration: number, eggToFlour: number}} ratios
 * @property {number} tenderizerPct
 * @property {number} toughenerPct
 */

/**
 * @typedef {Object} ComparisonResult
 * @property {RecipeAnalysis[]} analyses
 * @property {string[]} allIngredients - union of all ingredient names
 * @property {Record<string, Record<string, number>>} percentageMatrix - ingredient → recipe index → baker's %
 */

module.exports = {};
