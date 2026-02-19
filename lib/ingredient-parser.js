const { UNIT_ALIASES, toGrams, getCategory } = require("./conversions");

// Canonical ingredient name normalization
// Maps variant names → standard name for comparison alignment
const NAME_NORMALIZATIONS = {
  // Salts — only normalize "fine salt" and "table salt" (same product)
  "fine salt": "table salt",
  "table salt": "table salt",
  "fine sea salt": "sea salt",
  "coarse sea salt": "sea salt",
  "flaky sea salt": "sea salt",

  // Vanilla
  "pure vanilla extract": "vanilla extract",
  "natural vanilla extract": "vanilla extract",
  "vanilla": "vanilla extract",
  "king arthur pure vanilla extract": "vanilla extract",

  // Butter
  "unsalted butter": "butter",
  "salted butter": "butter",
  "butter softened": "butter",

  // Brown sugar
  "light brown sugar": "brown sugar",
  "dark brown sugar": "brown sugar",
  "light or dark brown sugar": "brown sugar",
  "packed brown sugar": "brown sugar",

  // White sugar
  "sugar": "granulated sugar",
  "white sugar": "granulated sugar",
  "cane sugar": "granulated sugar",

  // Powdered sugar
  "confectioners sugar": "powdered sugar",
  "icing sugar": "powdered sugar",

  // Eggs (normalize to singular)
  "large egg": "egg",
  "large eggs": "egg",
  "eggs": "egg",

  // Flour variants (keep specific, but normalize brand names)
  "king arthur unbleached all-purpose flour": "all-purpose flour",
  "unbleached all-purpose flour": "all-purpose flour",
  "bleached all-purpose flour": "all-purpose flour",

  // Chocolate
  "semi-sweet chocolate chips": "chocolate chips",
  "semisweet chocolate chips": "chocolate chips",
  "dark chocolate chips": "chocolate chips",
  "semi-sweet chocolate chips or chocolate chunks": "chocolate chips",
  "chocolate chunks": "chocolate chips",
  "semi-sweet chocolate morsels": "chocolate chips",
  "chocolate morsels": "chocolate chips",

  // Bittersweet / dark chocolate (disks, fèves, bars)
  "bittersweet chocolate chips": "chocolate chips",
  "bittersweet chocolate": "chocolate chips",

  // Cocoa
  "cocoa": "cocoa powder",
  "unsweetened cocoa powder": "cocoa powder",
  "dutch process cocoa": "cocoa powder",
  "natural cocoa powder": "cocoa powder",

  // Leaveners (already consistent, but just in case)
  "baking soda": "baking soda",
  "bicarbonate of soda": "baking soda",
};

// Fuzzy normalization for branded/decorated names
function normalizeName(name) {
  // Exact match
  if (NAME_NORMALIZATIONS[name]) return NAME_NORMALIZATIONS[name];

  // Strip brand prefixes (e.g., "nestlé® toll house® semi-sweet chocolate morsels")
  let stripped = name
    .replace(/[\u00ae\u2122]/g, "")  // ® ™
    .replace(/nestl[eé]\s*/gi, "")
    .replace(/toll house\s*/gi, "")
    .replace(/king arthur\s*/gi, "")
    .replace(/hershey'?s?\s*/gi, "")
    .replace(/^\s+|\s+$/g, "")
    .replace(/\s+/g, " ");

  if (NAME_NORMALIZATIONS[stripped]) return NAME_NORMALIZATIONS[stripped];

  // Check if stripped name contains a known key (only for long-enough keys to avoid false positives)
  for (const [key, canonical] of Object.entries(NAME_NORMALIZATIONS)) {
    if (key.length >= 10 && stripped.includes(key)) return canonical;
  }

  // Catch-all for chocolate variants (disks, fèves, bars, chunks, wafers, etc.)
  if (/\b(bittersweet|semisweet|semi-sweet|dark)\s+chocolate\b/.test(stripped)) {
    return "chocolate chips";
  }

  return name;
}

// Unicode fraction map
const UNICODE_FRACTIONS = {
  "½": 0.5, "⅓": 1/3, "⅔": 2/3, "¼": 0.25, "¾": 0.75,
  "⅕": 0.2, "⅖": 0.4, "⅗": 0.6, "⅘": 0.8,
  "⅙": 1/6, "⅚": 5/6, "⅛": 0.125, "⅜": 0.375, "⅝": 0.625, "⅞": 0.875,
};

// Prep phrases to strip from ingredient names (only trailing commas + notes, or standalone words)
const TRAILING_PREP = /,\s*(sifted|melted|softened|room temperature|at room temperature|chilled|cold|warm|hot|divided|plus more|optional|to taste|chopped|diced|minced|sliced|grated|shredded|finely chopped|coarsely chopped|roughly chopped).*$/gi;
// Prep adjectives that appear before the ingredient name
const LEADING_PREP = /\b(packed|lightly packed|firmly packed|sifted|melted|softened)\s+/gi;

// Regex for units
const UNIT_PATTERN = new RegExp(
  "\\b(" + Object.keys(UNIT_ALIASES).join("|") + ")\\b\\.?",
  "i"
);

/**
 * Parse a quantity string like "2 1/4" or "2.5" or "½"
 * @param {string} str
 * @returns {number|null}
 */
function parseQuantity(str) {
  if (!str || !str.trim()) return null;
  let s = str.trim();

  // Replace unicode fractions
  for (const [frac, val] of Object.entries(UNICODE_FRACTIONS)) {
    if (s.includes(frac)) {
      // Could be "2½" (whole + fraction) or just "½"
      const before = s.substring(0, s.indexOf(frac)).trim();
      const whole = before ? parseFloat(before) : 0;
      s = s.replace(frac, "");
      return whole + val;
    }
  }

  // "2 1/4" or "2-1/4" pattern (whole number + fraction)
  const mixedMatch = s.match(/^(\d+)\s*[-\s]\s*(\d+)\s*\/\s*(\d+)$/);
  if (mixedMatch) {
    return parseInt(mixedMatch[1]) + parseInt(mixedMatch[2]) / parseInt(mixedMatch[3]);
  }

  // Simple fraction "1/4"
  const fracMatch = s.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (fracMatch) {
    return parseInt(fracMatch[1]) / parseInt(fracMatch[2]);
  }

  // Plain number
  const num = parseFloat(s);
  return isNaN(num) ? null : num;
}

/**
 * Parse a free-text ingredient string into structured data
 * @param {string} text - e.g. "2 1/4 cups all-purpose flour, sifted"
 * @returns {object} ParsedIngredient
 */
function parseIngredient(text) {
  const original = text.trim();
  let remaining = original;

  // Check for parenthetical weight hints: "(170g)", "(8 1/2 ounces)", "(8 oz)"
  let hintGrams = null;
  const gramHint = remaining.match(/\((\d+)\s*g\b/i);
  if (gramHint) {
    hintGrams = parseFloat(gramHint[1]);
  }
  if (hintGrams === null) {
    // Check for ounce hints: "(8 1/2 ounces)", "(8 ounces)", "(8.5 oz)", "(12-ounce package)"
    const ozHint = remaining.match(/\((\d+(?:\s+\d+\s*\/\s*\d+)?(?:\.\d+)?)\s*-?\s*(?:ounces?|oz\.?)(?:\s+\w+)?\)/i);
    if (ozHint) {
      hintGrams = parseQuantity(ozHint[1]) * 28.35;
    }
  }

  // Handle "X and Y/Z" pattern: "1 and 1/4" → "1 1/4"
  remaining = remaining.replace(/^(\d+)\s+and\s+(\d+\s*\/\s*\d+)/, "$1 $2");

  // Handle compound quantities: "2 cups plus 2 tablespoons" or "2 cups minus 2 tablespoons"
  // We resolve these into a single gram value before normal parsing
  let compoundGrams = null;
  const compoundMatch = remaining.match(
    /^(\d+(?:\s+\d+\s*\/\s*\d+)?(?:\.\d+)?)\s+(cups?|tablespoons?|tbsp\.?|teaspoons?|tsp\.?)\s+(plus|minus)\s+(\d+(?:\s+\d+\s*\/\s*\d+)?(?:\.\d+)?)\s+(cups?|tablespoons?|tbsp\.?|teaspoons?|tsp\.?)\s+/i
  );
  if (compoundMatch) {
    const qty1 = parseQuantity(compoundMatch[1]);
    const unit1 = UNIT_ALIASES[compoundMatch[2].toLowerCase().replace(".", "")] || compoundMatch[2].toLowerCase();
    const op = compoundMatch[3].toLowerCase();
    const qty2 = parseQuantity(compoundMatch[4]);
    const unit2 = UNIT_ALIASES[compoundMatch[5].toLowerCase().replace(".", "")] || compoundMatch[5].toLowerCase();

    // Strip the compound quantity + units from remaining, leaving just the ingredient name
    remaining = remaining.substring(compoundMatch[0].length);
    // Remove parenthetical notes
    remaining = remaining.replace(/\(.*?\)/g, "");
    remaining = remaining.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");

    let name = remaining
      .replace(TRAILING_PREP, "")
      .replace(LEADING_PREP, "")
      .replace(/[*#]+/g, "")
      .replace(/,\s*$/, "")
      .replace(/[\u00ae\u2122]/g, "")
      .replace(/hershey'?s?\s+/gi, "")
      .replace(/nestl[eé]'?s?\s+/gi, "")
      .replace(/toll house\s+/gi, "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();

    // Calculate grams from the two parts
    const grams1 = toGrams(name, qty1, unit1);
    const grams2 = toGrams(name, qty2, unit2);
    if (grams1 !== null && grams2 !== null) {
      compoundGrams = op === "plus" ? grams1 + grams2 : grams1 - grams2;
    }

    const grams = hintGrams !== null ? hintGrams : (compoundGrams !== null ? Math.round(compoundGrams * 10) / 10 : null);
    const category = getCategory(name);

    return {
      original,
      quantity: qty1,
      unit: unit1,
      name,
      grams: grams !== null ? Math.round(grams * 10) / 10 : null,
      category,
    };
  }

  // Remove parenthetical notes early (before quantity extraction) to avoid confusing the parser
  remaining = remaining.replace(/\(.*?\)/g, "");

  // Decode HTML entities
  remaining = remaining.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");

  // Extract quantity from the beginning
  // Match patterns like: "2 1/4", "2.5", "½", "2½", "1/2", or just "2"
  const qtyMatch = remaining.match(
    /^(\d+\s*[-\s]\s*\d+\s*\/\s*\d+|\d*[½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞]|\d+\s*\/\s*\d+|\d+\.?\d*)\s*/
  );

  let quantity = null;
  if (qtyMatch) {
    quantity = parseQuantity(qtyMatch[1]);
    remaining = remaining.substring(qtyMatch[0].length);
  }

  // Extract unit
  let unit = "";
  const unitMatch = remaining.match(UNIT_PATTERN);
  if (unitMatch) {
    unit = UNIT_ALIASES[unitMatch[1].toLowerCase().replace(".", "")] || unitMatch[1].toLowerCase();
    remaining = remaining.substring(0, unitMatch.index) + remaining.substring(unitMatch.index + unitMatch[0].length);
  }

  // Check for "of" at the beginning of remaining text
  remaining = remaining.replace(/^\s*(of\s+)/, "");

  // Fix concatenated words from bad source data (e.g., "buttersoftened" → "butter softened")
  remaining = remaining.replace(/(butter|sugar|flour|cream|milk)(softened|melted|chilled|sifted|packed)/gi, '$1 $2');

  // Clean up the ingredient name
  let name = remaining
    .replace(TRAILING_PREP, "")
    .replace(LEADING_PREP, "")
    .replace(/[*#]+/g, "")            // remove asterisks, hash marks
    .replace(/,\s*$/, "")             // remove trailing comma
    .replace(/[\u00ae\u2122]/g, "")   // ® ™
    .replace(/hershey'?s?\s+/gi, "")  // strip brand: HERSHEY'S
    .replace(/nestl[eé]'?s?\s+/gi, "")
    .replace(/toll house\s+/gi, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

  // Handle eggs: "3 large eggs" → quantity = 3, unit = "large", name = "eggs"
  if (!unit && quantity) {
    const eggMatch = name.match(/^(large|medium|small)\s+(eggs?|egg\s+yolks?|egg\s+whites?)/i);
    if (eggMatch) {
      unit = eggMatch[1].toLowerCase();
      name = eggMatch[2].toLowerCase();
    }
  }

  // If no unit found but we have eggs, default to "each"
  if (!unit && quantity && /^eggs?$|^egg\s+(yolks?|whites?)$/.test(name)) {
    unit = "each";
  }

  // If quantity is null but we have a name with egg, default to 1
  if (quantity === null && /^eggs?$/.test(name)) {
    quantity = 1;
    unit = "each";
  }

  // Calculate grams — prefer the inline gram hint if available
  const grams = hintGrams !== null ? hintGrams : (quantity !== null ? toGrams(name, quantity, unit) : null);
  const category = getCategory(name);

  return {
    original,
    quantity: quantity || 0,
    unit,
    name,
    grams: grams !== null ? Math.round(grams * 10) / 10 : null,
    category,
  };
}

/**
 * Parse an array of ingredient strings.
 * Splits compound ingredients joined by "+" into separate entries.
 * @param {string[]} ingredients
 * @returns {object[]} ParsedIngredient[]
 */
function parseIngredients(ingredients) {
  const results = [];
  for (const text of ingredients) {
    // Split on " + " to handle compound ingredients like "1 large egg + 1 egg yolk"
    const parts = text.split(/\s*\+\s*/);
    if (parts.length > 1 && parts.every(p => /\d/.test(p))) {
      for (const part of parts) {
        results.push(parseIngredient(part));
      }
    } else {
      results.push(parseIngredient(text));
    }
  }
  return results;
}

module.exports = { parseIngredient, parseIngredients, parseQuantity, normalizeName };
