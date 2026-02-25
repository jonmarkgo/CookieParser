/**
 * Bake type profiles: detection, tag evaluation, and per-type configuration
 */

const BAKE_TYPES = {
  cookie: {
    label: "Cookie",
    keywords: ["cookie", "cookies", "biscuit", "biscuits", "shortbread", "snickerdoodle", "macaroon"],
    referenceRatio: { label: "3:2:1 flour:fat:sugar", source: "Ruhlman's Ratio (2009)" },
    tags: [
      { test: (r) => r.fatToFlour > 0.75, label: "Rich", bg: "#fef3c7", color: "#92400e" },
      { test: (r) => r.fatToFlour < 0.5, label: "Lean", bg: "#f0fdf4", color: "#166534" },
      { test: (r) => r.sugarToFlour > 1.0, label: "Sweet", bg: "#fce7f3", color: "#9d174d" },
      { test: (r) => r.sugarToFlour > 0.8 && r.fatToFlour > 0.6, label: "Crispy Edges", bg: "#fff7ed", color: "#9a3412" },
      { test: (r) => r.sugarToFlour < 0.6, label: "Low Sugar", bg: "#f0fdf4", color: "#166534" },
      { test: (r) => r.hydration > 0.25, label: "Moist", bg: "#eff6ff", color: "#1e40af" },
      { test: (r) => r.hydration < 0.12, label: "Dry", bg: "#fefce8", color: "#854d0e" },
      { test: (r) => r.eggToFlour > 0.3, label: "Cakey", bg: "#faf5ff", color: "#7c3aed" },
      { test: (r) => r.eggToFlour < 0.15, label: "Low Egg", bg: "#f5f5f4", color: "#57534e" },
      { test: (r) => r.fatToFlour > 0.7 && r.sugarToFlour > 0.9, label: "More Spread", bg: "#fff1f2", color: "#9f1239" },
      { test: (r) => r.fatToFlour < 0.55 && r.sugarToFlour < 0.7, label: "Less Spread", bg: "#f0fdf4", color: "#14532d" },
    ],
    ratioDescriptions: {
      fatToFlour: "Higher = richer, more tender, more spread",
      sugarToFlour: "Higher = sweeter, crisper edges, more spread",
      hydration: "Higher = more moisture, chewier",
      eggToFlour: "Higher = more structure, cakier texture",
    },
    aiPromptFragment: `Reference these concepts where relevant:
- Ruhlman's base cookie ratio (3:2:1 flour:fat:sugar)
- Tenderizer/toughener balance (from Shirley Corriher's BakeWise)
- Maillard reaction and caramelization from sugars
- Gluten development from flour hydration
- How fat coats flour proteins to limit gluten`,
  },

  cake: {
    label: "Cake",
    keywords: ["cake", "cakes", "cupcake", "cupcakes", "chiffon", "sponge", "genoise", "pound cake", "angel food", "bundt"],
    referenceRatio: { label: "1:1:1:1 flour:sugar:butter:eggs", source: "Classic pound cake ratio" },
    tags: [
      { test: (r) => r.fatToFlour > 0.5, label: "Rich", bg: "#fef3c7", color: "#92400e" },
      { test: (r) => r.fatToFlour < 0.3, label: "Light", bg: "#f0fdf4", color: "#166534" },
      { test: (r) => r.sugarToFlour > 1.2, label: "Very Sweet", bg: "#fce7f3", color: "#9d174d" },
      { test: (r) => r.sugarToFlour < 0.8, label: "Less Sweet", bg: "#f0fdf4", color: "#166534" },
      { test: (r) => r.hydration > 0.5, label: "Moist", bg: "#eff6ff", color: "#1e40af" },
      { test: (r) => r.hydration < 0.3, label: "Dense", bg: "#fefce8", color: "#854d0e" },
      { test: (r) => r.eggToFlour > 0.5, label: "Egg-Rich", bg: "#faf5ff", color: "#7c3aed" },
      { test: (r) => r.eggToFlour < 0.2, label: "Low Egg", bg: "#f5f5f4", color: "#57534e" },
    ],
    ratioDescriptions: {
      fatToFlour: "Higher = richer, denser crumb",
      sugarToFlour: "Higher = sweeter, more moist, tender crumb",
      hydration: "Higher = more moist, lighter texture",
      eggToFlour: "Higher = more structure, spongier",
    },
    aiPromptFragment: `Reference these concepts where relevant:
- Classic pound cake ratio (1:1:1:1 flour:butter:sugar:eggs)
- Reverse creaming vs. conventional creaming method
- Tenderizer/toughener balance (from Shirley Corriher's BakeWise)
- How egg proteins set the cake's structure
- Sugar's role in moisture retention and tenderness`,
  },

  bread: {
    label: "Bread",
    keywords: ["bread", "loaf", "sourdough", "baguette", "focaccia", "ciabatta", "brioche", "challah", "rolls", "roll", "bagel"],
    referenceRatio: { label: "5:3 flour:water (60% hydration)", source: "Standard lean bread" },
    tags: [
      { test: (r) => r.hydration > 0.75, label: "High Hydration", bg: "#eff6ff", color: "#1e40af" },
      { test: (r) => r.hydration >= 0.6 && r.hydration <= 0.75, label: "Standard Hydration", bg: "#f0fdf4", color: "#166534" },
      { test: (r) => r.hydration < 0.6, label: "Low Hydration", bg: "#fefce8", color: "#854d0e" },
      { test: (r) => r.fatToFlour > 0.15, label: "Enriched", bg: "#fef3c7", color: "#92400e" },
      { test: (r) => r.fatToFlour <= 0.03, label: "Lean", bg: "#f5f5f4", color: "#57534e" },
      { test: (r) => r.sugarToFlour > 0.1, label: "Sweet", bg: "#fce7f3", color: "#9d174d" },
      { test: (r) => r.eggToFlour > 0.15, label: "Egg-Enriched", bg: "#faf5ff", color: "#7c3aed" },
    ],
    ratioDescriptions: {
      fatToFlour: "Higher = softer crumb, enriched dough",
      sugarToFlour: "Higher = sweeter, softer, browns faster",
      hydration: "Higher = more open crumb, harder to handle",
      eggToFlour: "Higher = richer, softer, golden color",
    },
    aiPromptFragment: `Reference these concepts where relevant:
- Standard lean bread hydration (60%) and how higher hydration affects crumb
- Enriched vs. lean dough characteristics
- Gluten development and windowpane test
- Fermentation and how sugar/fat affect yeast activity
- How fat inhibits gluten formation for softer crumb`,
  },

  muffin: {
    label: "Muffin",
    keywords: ["muffin", "muffins"],
    referenceRatio: { label: "2:1:1 flour:liquid:fat", source: "Standard muffin method" },
    tags: [
      { test: (r) => r.fatToFlour > 0.5, label: "Rich", bg: "#fef3c7", color: "#92400e" },
      { test: (r) => r.fatToFlour < 0.25, label: "Light", bg: "#f0fdf4", color: "#166534" },
      { test: (r) => r.sugarToFlour > 0.6, label: "Sweet", bg: "#fce7f3", color: "#9d174d" },
      { test: (r) => r.hydration > 0.6, label: "Moist", bg: "#eff6ff", color: "#1e40af" },
      { test: (r) => r.hydration < 0.35, label: "Dense", bg: "#fefce8", color: "#854d0e" },
      { test: (r) => r.eggToFlour > 0.3, label: "Egg-Rich", bg: "#faf5ff", color: "#7c3aed" },
    ],
    ratioDescriptions: {
      fatToFlour: "Higher = richer, more cake-like",
      sugarToFlour: "Higher = sweeter, more tender crumb",
      hydration: "Higher = more moist, taller dome",
      eggToFlour: "Higher = more structure, lighter",
    },
    aiPromptFragment: `Reference these concepts where relevant:
- Standard muffin ratio (2:1:1 flour:liquid:fat)
- The muffin method: minimal mixing to avoid gluten development
- Muffin vs. cupcake distinction (fat/sugar ratios)
- How hydration and leavening affect dome height
- Tenderizer/toughener balance`,
  },

  pie: {
    label: "Pie",
    keywords: ["pie", "pies", "tart", "tarts", "galette", "crostata", "quiche", "pie crust", "pie dough"],
    referenceRatio: { label: "3:2:1 flour:fat:water", source: "Standard pie dough" },
    tags: [
      { test: (r) => r.fatToFlour > 0.7, label: "Flaky", bg: "#fef3c7", color: "#92400e" },
      { test: (r) => r.fatToFlour < 0.5, label: "Mealy", bg: "#f5f5f4", color: "#57534e" },
      { test: (r) => r.hydration > 0.4, label: "High Water", bg: "#eff6ff", color: "#1e40af" },
      { test: (r) => r.hydration < 0.2, label: "Low Water", bg: "#fefce8", color: "#854d0e" },
      { test: (r) => r.sugarToFlour > 0.15, label: "Sweet Crust", bg: "#fce7f3", color: "#9d174d" },
      { test: (r) => r.eggToFlour > 0.1, label: "Egg in Dough", bg: "#faf5ff", color: "#7c3aed" },
    ],
    ratioDescriptions: {
      fatToFlour: "Higher = flakier, more tender crust",
      sugarToFlour: "Higher = sweeter, cookie-like crust",
      hydration: "Higher = easier to work, less tender",
      eggToFlour: "Higher = sturdier, richer crust",
    },
    aiPromptFragment: `Reference these concepts where relevant:
- Standard pie dough ratio (3:2:1 flour:fat:water)
- Flaky vs. mealy crust (fat piece size and distribution)
- How water activates gluten and toughens crust
- Role of cold fat temperature in creating flaky layers
- How egg enriches and strengthens the dough`,
  },

  brownie: {
    label: "Brownie",
    keywords: ["brownie", "brownies", "blondie", "blondies"],
    referenceRatio: { label: "High fat + sugar, low flour", source: "Fudgy brownie principle" },
    tags: [
      { test: (r) => r.fatToFlour > 0.8, label: "Fudgy", bg: "#451a03", color: "#fef3c7" },
      { test: (r) => r.fatToFlour < 0.6, label: "Cakey", bg: "#faf5ff", color: "#7c3aed" },
      { test: (r) => r.sugarToFlour > 1.2, label: "Very Sweet", bg: "#fce7f3", color: "#9d174d" },
      { test: (r) => r.eggToFlour > 0.4, label: "Cakey Structure", bg: "#eff6ff", color: "#1e40af" },
      { test: (r) => r.eggToFlour < 0.2, label: "Dense", bg: "#fefce8", color: "#854d0e" },
      { test: (r) => r.fatToFlour > 1.0 && r.sugarToFlour > 1.5, label: "Ultra-Fudgy", bg: "#1c1917", color: "#fbbf24" },
    ],
    ratioDescriptions: {
      fatToFlour: "Higher = fudgier, more dense and rich",
      sugarToFlour: "Higher = shinier top, chewier, more sweet",
      hydration: "Higher = more moist interior",
      eggToFlour: "Higher = cakier texture, more lift",
    },
    aiPromptFragment: `Reference these concepts where relevant:
- Fudgy vs. cakey brownie spectrum (fat:flour ratio is key)
- How sugar creates the shiny, crackly top crust
- Bar chocolate vs. cocoa powder impact on texture
- Egg's dual role: structure (whites) vs. richness (yolks)
- Why brownies use so much more fat and sugar than other baked goods`,
  },

  pastry: {
    label: "Pastry",
    keywords: ["pastry", "croissant", "danish", "puff pastry", "choux", "eclair", "profiterole", "scone", "scones", "biscuits (baking)"],
    referenceRatio: { label: "Varies widely by pastry type", source: "Laminated and non-laminated styles" },
    tags: [
      { test: (r) => r.fatToFlour > 0.7, label: "Butter-Rich", bg: "#fef3c7", color: "#92400e" },
      { test: (r) => r.fatToFlour < 0.3, label: "Lean", bg: "#f0fdf4", color: "#166534" },
      { test: (r) => r.hydration > 0.5, label: "High Moisture", bg: "#eff6ff", color: "#1e40af" },
      { test: (r) => r.eggToFlour > 0.4, label: "Egg-Rich", bg: "#faf5ff", color: "#7c3aed" },
      { test: (r) => r.sugarToFlour > 0.3, label: "Sweet", bg: "#fce7f3", color: "#9d174d" },
      { test: (r) => r.sugarToFlour < 0.05, label: "Savory", bg: "#f5f5f4", color: "#57534e" },
    ],
    ratioDescriptions: {
      fatToFlour: "Higher = richer, more flaky layers",
      sugarToFlour: "Higher = sweeter, more caramelization",
      hydration: "Higher = puffier, more steam during baking",
      eggToFlour: "Higher = richer, more structure",
    },
    aiPromptFragment: `Reference these concepts where relevant:
- Laminated vs. non-laminated pastry techniques
- How cold fat creates distinct flaky layers
- The choux principle: pre-cooking flour for hollow puffs
- Steam's role in puff and lift
- How egg enrichment affects texture and color`,
  },

  other: {
    label: "Baked Good",
    keywords: [],
    referenceRatio: { label: "Varies by type", source: "General baking" },
    tags: [
      { test: (r) => r.fatToFlour > 0.7, label: "High Fat", bg: "#fef3c7", color: "#92400e" },
      { test: (r) => r.fatToFlour < 0.3, label: "Low Fat", bg: "#f0fdf4", color: "#166534" },
      { test: (r) => r.sugarToFlour > 1.0, label: "Very Sweet", bg: "#fce7f3", color: "#9d174d" },
      { test: (r) => r.sugarToFlour < 0.3, label: "Low Sugar", bg: "#f0fdf4", color: "#166534" },
      { test: (r) => r.hydration > 0.5, label: "High Moisture", bg: "#eff6ff", color: "#1e40af" },
      { test: (r) => r.hydration < 0.15, label: "Low Moisture", bg: "#fefce8", color: "#854d0e" },
      { test: (r) => r.eggToFlour > 0.4, label: "Egg-Rich", bg: "#faf5ff", color: "#7c3aed" },
    ],
    ratioDescriptions: {
      fatToFlour: "Higher = richer, more tender",
      sugarToFlour: "Higher = sweeter, more browning",
      hydration: "Higher = more moisture",
      eggToFlour: "Higher = more structure and richness",
    },
    aiPromptFragment: `Reference these concepts where relevant:
- Tenderizer/toughener balance (from Shirley Corriher's BakeWise)
- How fat coats flour proteins to limit gluten
- Hydration's role in texture and structure
- Maillard reaction and caramelization from sugars
- How eggs provide both structure and richness`,
  },
};

/**
 * Detect bake type from recipe title using keyword matching
 * @param {string} title
 * @returns {string} slug (e.g. "cookie", "cake", "bread", or "other")
 */
function detectBakeType(title) {
  if (!title) return "other";
  const lower = title.toLowerCase();
  for (const [slug, profile] of Object.entries(BAKE_TYPES)) {
    if (slug === "other") continue;
    for (const kw of profile.keywords) {
      if (lower.includes(kw)) return slug;
    }
  }
  return "other";
}

/**
 * Get profile for a bake type slug
 * @param {string} slug
 * @returns {object} profile
 */
function getProfile(slug) {
  return BAKE_TYPES[slug] || BAKE_TYPES.other;
}

/**
 * Evaluate tags for a recipe analysis using type-specific + universal tags
 * @param {object} analysis - RecipeAnalysis from baking-math
 * @param {string} slug - bake type slug
 * @returns {Array<{label: string, bg: string, color: string}>}
 */
function getRecipeTags(analysis, slug) {
  const profile = getProfile(slug);
  const ratios = analysis.ratios;
  const tags = [];

  // Type-specific tags
  for (const tagDef of profile.tags) {
    if (tagDef.test(ratios)) {
      tags.push({ label: tagDef.label, bg: tagDef.bg, color: tagDef.color });
    }
  }

  // Universal tags: tenderizer/toughener balance
  if (analysis.tenderizerPct > 50) tags.push({ label: "Tender", bg: "#fdf2f8", color: "#be185d" });
  if (analysis.toughenerPct > 30) tags.push({ label: "Structured", bg: "#ecfdf5", color: "#065f46" });

  // Universal tags: flour type detection
  const flours = analysis.recipe.ingredients.filter((i) => i.category === "flour");
  if (flours.length > 1) tags.push({ label: "Flour Blend", bg: "#f0f9ff", color: "#0369a1" });
  if (flours.some((f) => /bread/i.test(f.name))) tags.push({ label: "High Protein", bg: "#fef9c3", color: "#854d0e" });
  if (flours.some((f) => /cake/i.test(f.name))) tags.push({ label: "Low Protein", bg: "#fce7f3", color: "#831843" });

  // Universal tags: special ingredients
  const hasChocolate = analysis.recipe.ingredients.some((i) => /chocolate|cocoa/i.test(i.name));
  const hasNuts = analysis.recipe.ingredients.some((i) => /nuts|walnut|pecan|almond/i.test(i.name));
  const hasCornstarch = analysis.recipe.ingredients.some((i) => /cornstarch/i.test(i.name));
  if (hasChocolate) tags.push({ label: "Chocolate", bg: "#451a03", color: "#fef3c7" });
  if (hasNuts) tags.push({ label: "Nuts", bg: "#fef9c3", color: "#713f12" });
  if (hasCornstarch) tags.push({ label: "Cornstarch", bg: "#e0e7ff", color: "#3730a3" });

  return tags;
}

module.exports = { BAKE_TYPES, detectBakeType, getProfile, getRecipeTags };
