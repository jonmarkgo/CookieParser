// Conversion database: (ingredient, unit) → grams
// Sources: King Arthur Flour weight chart, USDA

// Weight per unit in grams for common baking ingredients
const INGREDIENT_WEIGHTS = {
  // Flours
  "all-purpose flour": { cup: 120, tbsp: 8, tsp: 2.6 },
  "bread flour": { cup: 120, tbsp: 8, tsp: 2.6 },
  "cake flour": { cup: 114, tbsp: 7, tsp: 2.3 },
  "pastry flour": { cup: 114, tbsp: 7, tsp: 2.3 },
  "whole wheat flour": { cup: 120, tbsp: 8, tsp: 2.6 },
  "self-rising flour": { cup: 120, tbsp: 8, tsp: 2.6 },
  "almond flour": { cup: 96, tbsp: 6, tsp: 2 },
  "coconut flour": { cup: 112, tbsp: 7, tsp: 2.3 },
  "rye flour": { cup: 102, tbsp: 6.4, tsp: 2.1 },
  "oat flour": { cup: 92, tbsp: 5.75, tsp: 1.9 },
  "cornstarch": { cup: 128, tbsp: 8, tsp: 2.7 },

  // Sugars
  "granulated sugar": { cup: 200, tbsp: 12.5, tsp: 4.2 },
  "sugar": { cup: 200, tbsp: 12.5, tsp: 4.2 },
  "white sugar": { cup: 200, tbsp: 12.5, tsp: 4.2 },
  "brown sugar": { cup: 213, tbsp: 13.3, tsp: 4.4 },
  "light brown sugar": { cup: 213, tbsp: 13.3, tsp: 4.4 },
  "dark brown sugar": { cup: 213, tbsp: 13.3, tsp: 4.4 },
  "powdered sugar": { cup: 113, tbsp: 7, tsp: 2.3 },
  "confectioners sugar": { cup: 113, tbsp: 7, tsp: 2.3 },
  "honey": { cup: 340, tbsp: 21, tsp: 7 },
  "maple syrup": { cup: 312, tbsp: 20, tsp: 6.5 },
  "molasses": { cup: 328, tbsp: 20.5, tsp: 6.8 },
  "corn syrup": { cup: 328, tbsp: 20.5, tsp: 6.8 },

  // Fats
  "butter": { cup: 227, tbsp: 14, tsp: 4.7, stick: 113 },
  "unsalted butter": { cup: 227, tbsp: 14, tsp: 4.7, stick: 113 },
  "salted butter": { cup: 227, tbsp: 14, tsp: 4.7, stick: 113 },
  "vegetable oil": { cup: 218, tbsp: 13.6, tsp: 4.5 },
  "canola oil": { cup: 218, tbsp: 13.6, tsp: 4.5 },
  "olive oil": { cup: 216, tbsp: 13.5, tsp: 4.5 },
  "coconut oil": { cup: 218, tbsp: 13.6, tsp: 4.5 },
  "shortening": { cup: 191, tbsp: 12, tsp: 4 },
  "lard": { cup: 205, tbsp: 12.8, tsp: 4.3 },
  "cream cheese": { cup: 227, tbsp: 14, tsp: 4.7 },

  // Dairy / Liquids
  "milk": { cup: 242, tbsp: 15, tsp: 5 },
  "whole milk": { cup: 242, tbsp: 15, tsp: 5 },
  "buttermilk": { cup: 242, tbsp: 15, tsp: 5 },
  "heavy cream": { cup: 238, tbsp: 15, tsp: 5 },
  "sour cream": { cup: 230, tbsp: 14.4, tsp: 4.8 },
  "yogurt": { cup: 245, tbsp: 15.3, tsp: 5.1 },
  "greek yogurt": { cup: 245, tbsp: 15.3, tsp: 5.1 },
  "water": { cup: 237, tbsp: 15, tsp: 5 },
  "evaporated milk": { cup: 252, tbsp: 15.75, tsp: 5.25 },
  "condensed milk": { cup: 306, tbsp: 19, tsp: 6.4 },

  // Eggs (by count, each large egg)
  "egg": { each: 50, large: 50, medium: 44, small: 38 },
  "eggs": { each: 50, large: 50, medium: 44, small: 38 },
  "large egg": { each: 50 },
  "large eggs": { each: 50 },
  "egg yolk": { each: 17 },
  "egg yolks": { each: 17 },
  "egg white": { each: 33 },
  "egg whites": { each: 33 },

  // Leaveners
  "baking powder": { tbsp: 14, tsp: 4.6 },
  "baking soda": { tbsp: 14, tsp: 4.6 },

  // Salt
  "salt": { tbsp: 18, tsp: 6 },
  "kosher salt": { tbsp: 15, tsp: 5 },
  "fine salt": { tbsp: 18, tsp: 6 },
  "sea salt": { tbsp: 18, tsp: 6 },
  "table salt": { tbsp: 18, tsp: 6 },

  // Flavorings
  "vanilla extract": { tbsp: 13, tsp: 4.3 },
  "vanilla": { tbsp: 13, tsp: 4.3 },
  "cocoa": { cup: 85, tbsp: 5.3, tsp: 1.8 },
  "cocoa powder": { cup: 85, tbsp: 5.3, tsp: 1.8 },
  "unsweetened cocoa powder": { cup: 85, tbsp: 5.3, tsp: 1.8 },
  "dutch process cocoa": { cup: 85, tbsp: 5.3, tsp: 1.8 },
  "cinnamon": { tbsp: 8, tsp: 2.6 },
  "ground cinnamon": { tbsp: 8, tsp: 2.6 },
  "nutmeg": { tbsp: 7, tsp: 2.3 },
  "ginger": { tbsp: 6, tsp: 2 },
  "ground ginger": { tbsp: 6, tsp: 2 },
  "espresso powder": { tbsp: 6, tsp: 2 },
  "instant coffee": { tbsp: 6, tsp: 2 },
  "instant espresso": { tbsp: 6, tsp: 2 },

  // Mix-ins
  "chocolate chips": { cup: 170, tbsp: 10.6, tsp: 3.5 },
  "semi-sweet chocolate chips": { cup: 170, tbsp: 10.6, tsp: 3.5 },
  "dark chocolate chips": { cup: 170, tbsp: 10.6, tsp: 3.5 },
  "white chocolate chips": { cup: 170, tbsp: 10.6, tsp: 3.5 },
  "chocolate morsels": { cup: 170, tbsp: 10.6, tsp: 3.5 },
  "semi-sweet chocolate morsels": { cup: 170, tbsp: 10.6, tsp: 3.5 },
  "chopped nuts": { cup: 113, tbsp: 7, tsp: 2.3 },
  "walnuts": { cup: 113, tbsp: 7, tsp: 2.3 },
  "pecans": { cup: 109, tbsp: 6.8, tsp: 2.3 },
  "almonds": { cup: 143, tbsp: 8.9, tsp: 3 },
  "raisins": { cup: 145, tbsp: 9, tsp: 3 },
  "rolled oats": { cup: 81, tbsp: 5, tsp: 1.7 },
  "oats": { cup: 81, tbsp: 5, tsp: 1.7 },
  "shredded coconut": { cup: 85, tbsp: 5.3, tsp: 1.8 },
};

// Category classification
const INGREDIENT_CATEGORIES = {
  // Flours / tougheners
  "all-purpose flour": "flour",
  "bread flour": "flour",
  "cake flour": "flour",
  "pastry flour": "flour",
  "whole wheat flour": "flour",
  "self-rising flour": "flour",
  "almond flour": "flour",
  "coconut flour": "flour",
  "rye flour": "flour",
  "oat flour": "flour",
  "cornstarch": "other",

  // Fats / tenderizers
  "butter": "fat",
  "unsalted butter": "fat",
  "salted butter": "fat",
  "vegetable oil": "fat",
  "canola oil": "fat",
  "olive oil": "fat",
  "coconut oil": "fat",
  "shortening": "fat",
  "lard": "fat",
  "cream cheese": "fat",

  // Sugars / tenderizers
  "granulated sugar": "sugar",
  "sugar": "sugar",
  "white sugar": "sugar",
  "brown sugar": "sugar",
  "light brown sugar": "sugar",
  "dark brown sugar": "sugar",
  "powdered sugar": "sugar",
  "confectioners sugar": "sugar",
  "honey": "sugar",
  "maple syrup": "sugar",
  "molasses": "sugar",
  "corn syrup": "sugar",

  // Eggs
  "egg": "egg",
  "eggs": "egg",
  "large egg": "egg",
  "large eggs": "egg",
  "egg yolk": "egg",
  "egg yolks": "egg",
  "egg white": "egg",
  "egg whites": "egg",

  // Liquids
  "milk": "liquid",
  "whole milk": "liquid",
  "buttermilk": "liquid",
  "heavy cream": "dairy",
  "sour cream": "dairy",
  "yogurt": "dairy",
  "greek yogurt": "dairy",
  "water": "liquid",
  "evaporated milk": "liquid",
  "condensed milk": "sugar", // it's sweetened

  // Leavening
  "baking powder": "leavening",
  "baking soda": "leavening",

  // Salt
  "salt": "flavoring",
  "kosher salt": "flavoring",
  "fine salt": "flavoring",
  "sea salt": "flavoring",
  "table salt": "flavoring",

  // Flavorings
  "vanilla extract": "flavoring",
  "vanilla": "flavoring",
  "cocoa": "flavoring",
  "cocoa powder": "flavoring",
  "unsweetened cocoa powder": "flavoring",
  "dutch process cocoa": "flavoring",
  "cinnamon": "flavoring",
  "ground cinnamon": "flavoring",
  "nutmeg": "flavoring",
  "ginger": "flavoring",
  "ground ginger": "flavoring",
  "espresso powder": "flavoring",
  "instant coffee": "flavoring",
  "instant espresso": "flavoring",

  // Mix-ins
  "chocolate chips": "other",
  "semi-sweet chocolate chips": "other",
  "dark chocolate chips": "other",
  "white chocolate chips": "other",
  "chocolate morsels": "other",
  "semi-sweet chocolate morsels": "other",
  "chopped nuts": "other",
  "walnuts": "other",
  "pecans": "other",
  "almonds": "other",
  "raisins": "other",
  "rolled oats": "other",
  "oats": "other",
  "shredded coconut": "other",
};

// Unit aliases → canonical unit
const UNIT_ALIASES = {
  "cup": "cup", "cups": "cup", "c": "cup", "c.": "cup",
  "tablespoon": "tbsp", "tablespoons": "tbsp", "tbsp": "tbsp", "tbsp.": "tbsp", "tbsps": "tbsp", "tbs": "tbsp", "tbs.": "tbsp", "T": "tbsp",
  "teaspoon": "tsp", "teaspoons": "tsp", "tsp": "tsp", "tsp.": "tsp", "tsps": "tsp", "tsps.": "tsp", "t": "tsp",
  "ounce": "oz", "ounces": "oz", "oz": "oz", "oz.": "oz",
  "pound": "lb", "pounds": "lb", "lb": "lb", "lbs": "lb", "lb.": "lb", "lbs.": "lb",
  "gram": "g", "grams": "g", "g": "g", "g.": "g",
  "kilogram": "kg", "kilograms": "kg", "kg": "kg", "kg.": "kg",
  "milliliter": "ml", "milliliters": "ml", "ml": "ml", "ml.": "ml",
  "liter": "l", "liters": "l", "l": "l", "l.": "l",
  "stick": "stick", "sticks": "stick",
  "large": "large", "medium": "medium", "small": "small",
  "pinch": "pinch", "dash": "dash",
  "each": "each",
};

// Conversion factors to grams for weight/volume units (generic, not ingredient-specific)
const UNIT_TO_GRAMS = {
  "g": 1,
  "kg": 1000,
  "oz": 28.35,
  "lb": 453.6,
  "ml": 1, // approximate for water-like liquids
  "l": 1000,
  "pinch": 0.5,
  "dash": 0.5,
};

/**
 * Convert an ingredient quantity to grams
 * @param {string} ingredientName - normalized ingredient name
 * @param {number} quantity - numeric quantity
 * @param {string} unit - canonical unit
 * @returns {number|null} grams, or null if unknown
 */
function toGrams(ingredientName, quantity, unit) {
  const name = ingredientName.toLowerCase().trim();
  const canonicalUnit = UNIT_ALIASES[unit] || unit;

  // Direct weight units
  if (UNIT_TO_GRAMS[canonicalUnit]) {
    return quantity * UNIT_TO_GRAMS[canonicalUnit];
  }

  // Ingredient-specific volumetric conversion
  const entry = findIngredientEntry(name);
  if (entry && entry[canonicalUnit]) {
    return quantity * entry[canonicalUnit];
  }

  // Egg handling: if no unit or countable unit, treat as "each"
  if (isEggIngredient(name) && (!canonicalUnit || canonicalUnit === "each" || canonicalUnit === "large" || canonicalUnit === "medium" || canonicalUnit === "small")) {
    const eggEntry = findIngredientEntry(name);
    if (eggEntry) {
      const unitKey = canonicalUnit && eggEntry[canonicalUnit] ? canonicalUnit : "each";
      return quantity * eggEntry[unitKey];
    }
  }

  return null;
}

function findIngredientEntry(name) {
  // Exact match
  if (INGREDIENT_WEIGHTS[name]) return INGREDIENT_WEIGHTS[name];

  // Try removing common prefixes/suffixes
  for (const key of Object.keys(INGREDIENT_WEIGHTS)) {
    if (name.includes(key) || key.includes(name)) {
      return INGREDIENT_WEIGHTS[key];
    }
  }
  return null;
}

function isEggIngredient(name) {
  return /\beggs?\b|\byolks?\b|\bwhites?\b/.test(name);
}

function getCategory(name) {
  const lower = name.toLowerCase().trim();
  if (INGREDIENT_CATEGORIES[lower]) return INGREDIENT_CATEGORIES[lower];

  // Fuzzy match
  for (const [key, cat] of Object.entries(INGREDIENT_CATEGORIES)) {
    if (lower.includes(key) || key.includes(lower)) {
      return cat;
    }
  }

  // Keyword-based fallback
  if (/flour|starch/i.test(lower)) return "flour";
  if (/butter|oil|shortening|lard|margarine/i.test(lower)) return "fat";
  if (/sugar|honey|syrup|molasses|sweetener/i.test(lower)) return "sugar";
  if (/egg/i.test(lower)) return "egg";
  if (/milk|cream|buttermilk|yogurt/i.test(lower)) return "dairy";
  if (/water|juice|coffee|liquor|liqueur/i.test(lower)) return "liquid";
  if (/baking powder|baking soda|yeast/i.test(lower)) return "leavening";
  if (/vanilla|extract|spice|cinnamon|nutmeg|salt|cocoa/i.test(lower)) return "flavoring";

  return "other";
}

module.exports = {
  INGREDIENT_WEIGHTS,
  INGREDIENT_CATEGORIES,
  UNIT_ALIASES,
  UNIT_TO_GRAMS,
  toGrams,
  findIngredientEntry,
  getCategory,
};
