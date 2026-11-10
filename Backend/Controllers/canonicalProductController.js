const { CanonicalProduct, computeProductIdentityKey, identityPart } = require("../models/CanonicalProduct");

function levenshteinDistance(a, b) {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

const getProductSuggestions = async (req, res) => {
  const { q, category, limit = 10 } = req.query;

  if (!q || typeof q !== "string" || q.trim().length < 2) {
    return res.status(200).json({ suggestions: [] });
  }

  const rawQuery = q.trim();
  const normalizedQuery = identityPart(rawQuery);
  const escapedQuery = normalizedQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const maxLimit = Math.min(30, Math.max(1, Number(limit) || 10));

  try {
    // 1. Primary search with regex on name, brand, aliases, category
    const filter = {
      $or: [
        { normalizedName: new RegExp(`^${escapedQuery}`, "i") },
        { normalizedName: new RegExp(`\\b${escapedQuery}`, "i") },
        { brand: new RegExp(`^${escapedQuery}`, "i") },
        { aliases: new RegExp(`^${escapedQuery}`, "i") },
        { aliases: new RegExp(`\\b${escapedQuery}`, "i") },
        { name: new RegExp(escapedQuery, "i") },
      ],
    };

    if (category && category !== "All" && category.trim()) {
      filter.category = new RegExp(category.trim(), "i");
    }

    let candidates = await CanonicalProduct.find(filter)
      .select("name brand category unit packSize image basePrice tier aliases")
      .limit(maxLimit * 2)
      .lean();

    // 2. Token-based fallback if candidates < maxLimit
    const tokens = normalizedQuery.split(/\s+/).filter((t) => t.length >= 2);
    if (candidates.length < maxLimit && tokens.length > 1) {
      const tokenConditions = tokens.map((token) => ({
        $or: [
          { normalizedName: new RegExp(token, "i") },
          { brand: new RegExp(token, "i") },
          { aliases: new RegExp(token, "i") },
          { category: new RegExp(token, "i") },
        ],
      }));

      const tokenQuery = { $and: tokenConditions };
      if (category && category !== "All" && category.trim()) {
        tokenQuery.category = new RegExp(category.trim(), "i");
      }

      const tokenMatches = await CanonicalProduct.find(tokenQuery)
        .select("name brand category unit packSize image basePrice tier aliases")
        .limit(maxLimit)
        .lean();
      const existingIds = new Set(candidates.map((c) => c._id.toString()));
      for (const tm of tokenMatches) {
        if (!existingIds.has(tm._id.toString())) {
          candidates.push(tm);
          existingIds.add(tm._id.toString());
        }
      }
    }

    // 3. Fuzzy spelling fallback if still very few matches and query is at least 3 chars
    if (candidates.length < maxLimit && normalizedQuery.length >= 3) {
      const allCategoryProducts = await CanonicalProduct.find(
        category && category !== "All" && category.trim()
          ? { category: new RegExp(category.trim(), "i") }
          : {}
      ).limit(200);

      const existingIds = new Set(candidates.map((c) => c._id.toString()));

      for (const prod of allCategoryProducts) {
        if (existingIds.has(prod._id.toString())) continue;

        const words = (
          prod.normalizedName +
          " " +
          (prod.brand || "").toLowerCase() +
          " " +
          (prod.aliases || []).join(" ")
        ).split(/\s+/);

        let isFuzzyMatch = false;
        for (const token of tokens) {
          const maxDist = token.length <= 4 ? 1 : 2;
          for (const word of words) {
            if (Math.abs(word.length - token.length) <= maxDist) {
              const dist = levenshteinDistance(token, word);
              if (dist <= maxDist) {
                isFuzzyMatch = true;
                break;
              }
            }
          }
          if (isFuzzyMatch) break;
        }

        if (isFuzzyMatch) {
          candidates.push(prod);
          existingIds.add(prod._id.toString());
          if (candidates.length >= maxLimit * 2) break;
        }
      }
    }

    // 4. Score and Rank candidates
    const scored = candidates.map((prod) => {
      let score = 0;
      const prodNorm = prod.normalizedName || identityPart(prod.name);
      const brandNorm = identityPart(prod.brand);

      if (prodNorm === normalizedQuery) score += 100;
      else if (prodNorm.startsWith(normalizedQuery)) score += 80;
      else if (brandNorm && brandNorm.startsWith(normalizedQuery)) score += 70;
      else if (prodNorm.includes(normalizedQuery)) score += 60;
      else if (prod.aliases?.some((a) => a.toLowerCase().startsWith(normalizedQuery))) score += 55;
      else if (prod.aliases?.some((a) => a.toLowerCase().includes(normalizedQuery))) score += 45;
      else score += 30;

      if (prod.tier === "staple") score += 5;

      return { prod, score };
    });

    scored.sort((a, b) => b.score - a.score);

    const topResults = scored.slice(0, maxLimit).map(({ prod }) => ({
      _id: prod._id,
      id: prod._id,
      canonicalProductId: prod._id,
      name: prod.name,
      normalizedName: prod.normalizedName,
      category: prod.category,
      brand: prod.brand || "",
      unit: prod.unit,
      packSize: prod.packSize || "",
      description: prod.description || "",
      image: prod.image || "",
      tier: prod.tier,
      basePrice: prod.basePrice || 0,
      aliases: prod.aliases || [],
    }));

    return res.status(200).json({ suggestions: topResults });
  } catch (err) {
    console.error("Get product suggestions failed:", err);
    return res.status(500).json({ message: "Unable to retrieve suggestions", suggestions: [] });
  }
};

const getCanonicalProductById = async (req, res) => {
  const { id } = req.params;
  try {
    const product = await CanonicalProduct.findById(id);
    if (!product) {
      return res.status(404).json({ message: "Canonical product not found" });
    }
    return res.status(200).json({ product });
  } catch (err) {
    return res.status(500).json({ message: "Unable to fetch canonical product" });
  }
};

module.exports = {
  getProductSuggestions,
  getCanonicalProductById,
  levenshteinDistance,
};
