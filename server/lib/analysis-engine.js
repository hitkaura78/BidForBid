const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const roundPrice = (value) => Math.max(500, Math.round(Number(value || 0) / 500) * 500);

// Normalizes text so we can detect low-quality copied summaries.
function normalizeText(value = "") {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

// Flags summaries that are effectively just copied listing descriptions.
function looksLikeCopiedDescription(summary, description) {
  const left = normalizeText(summary);
  const right = normalizeText(description);
  if (!left || !right) return false;
  return left === right || left.includes(right) || right.includes(left);
}

// Builds a cleaner summary when grounded citations exist but model text is weak.
function buildSummaryFromData(listing, priceHistory, citations, fallback) {
  if (citations.length) {
    return `Grounded web research for ${listing.title} suggests that a practical maximum bid is around ${fallback.recommendedMax} INR, based on comparable market references found online.`;
  }
  return fallback.summary;
}

// Builds fallback reasoning when Gemini does not provide usable bullet points.
function buildReasonsFromData(listing, priceHistory, citations, fallback) {
  const reasons = [];
  if (citations.length) {
    reasons.push(`The recommendation is grounded in ${citations.length} web source${citations.length > 1 ? "s" : ""}, which are linked in the Analysis card.`);
  }
  reasons.push(...fallback.reasons);
  return reasons.slice(0, 4);
}

// Uses description keywords as a lightweight condition signal for fallback pricing.
function pickConditionScore(description = "") {
  const text = description.toLowerCase();
  let score = 0;
  if (/(excellent|mint|like new|single owner|well maintained|premium)/.test(text)) score += 0.08;
  if (/(good|clean|working|original|genuine)/.test(text)) score += 0.04;
  if (/(fair|used|minor scratches|regular wear)/.test(text)) score -= 0.03;
  if (/(damaged|repair|broken|crack|rust|heavy wear|accident)/.test(text)) score -= 0.12;
  return score;
}

// Local estimator used when Gemini is unavailable or when we need a conservative backup reference.
function buildLocalAnalysis(listing, bidHistory = []) {
  const currentYear = new Date().getFullYear();
  const minimumPrice = Number(listing.minimumPrice || 0);
  const currentBid = Number(listing.currentBid || 0);
  const increment = Math.max(500, Number(listing.increment || 1000));
  const basePrice = Math.max(minimumPrice, currentBid * 0.92, 1000);
  const age = Math.max(0, currentYear - Number(listing.year || currentYear));
  const agePenalty = Math.min(0.22, age * 0.008);
  const categoryBoost = ({
    "Car Bidding": 0.1,
    "Bike Bidding": 0.05,
    "Device Bidding": -0.02,
    Collectibles: 0.08,
    Furniture: 0.03,
  })[listing.category] || 0;
  const conditionScore = pickConditionScore(listing.description || "");
  const acceptedBids = bidHistory.filter((bid) => bid.status === "accepted").length;
  const demandBoost = Math.min(0.08, acceptedBids * 0.015);
  const lowerFactor = 0.88 + categoryBoost + conditionScore + demandBoost - agePenalty;
  const upperFactor = 1.18 + categoryBoost + conditionScore + demandBoost - agePenalty * 0.3;
  const recommendedMin = roundPrice(basePrice * Math.max(0.72, lowerFactor));
  const recommendedMax = roundPrice(
    Math.max(
      recommendedMin + increment * 2,
      basePrice * Math.max(0.95, upperFactor),
      currentBid > 0 ? currentBid + increment * 2 : 0
    )
  );

  return {
    recommendedMin,
    recommendedMax,
    summary: `A careful buyer should cap the bid for ${listing.title} at around ${recommendedMax} INR after accounting for age, condition cues, and current resale demand.`,
    reasons: [
      `The title, ${listing.year} purchase year, and condition signals in the description were used to estimate realistic resale value.`,
      `The recommendation stays above the current auction level by a limited buffer instead of simply copying the live bid.`,
      acceptedBids > 0
        ? `${acceptedBids} accepted bid action${acceptedBids > 1 ? "s" : ""} suggest active demand, so the ceiling can stretch a little higher.`
        : "Bid history is limited, so the recommended ceiling stays conservative.",
    ],
    source: "local-backend-fallback",
    model: "rule-based-estimator",
    citations: [],
  };
}

// Extracts a JSON object even if the model wraps it in markdown fences.
function extractJsonBlock(text) {
  const fenced = text.match(/```json\s*([\s\S]*?)```/i);
  if (fenced) return fenced[1];
  const objectMatch = text.match(/\{[\s\S]*\}/);
  return objectMatch ? objectMatch[0] : "";
}

// Cleans and stabilizes Gemini output before it is stored in Firestore or shown in the UI.
function normalizeGeminiPayload(payload, fallback) {
  const baseReference = Math.max(fallback.recommendedMin, 1000);
  let recommendedMin = roundPrice(payload?.recommendedMin || fallback.recommendedMin);
  let recommendedMax = roundPrice(Math.max(recommendedMin, payload?.recommendedMax || fallback.recommendedMax));
  const minimumSpread = Math.max(1000, Math.round(baseReference * 0.08));

  if (recommendedMin <= 0) recommendedMin = roundPrice(baseReference);
  if (recommendedMax <= recommendedMin) {
    recommendedMax = roundPrice(recommendedMin + minimumSpread);
  }
  if (recommendedMax - recommendedMin < minimumSpread) {
    recommendedMax = roundPrice(recommendedMin + minimumSpread);
  }

  const citations = Array.isArray(payload?.citations) ? payload.citations.slice(0, 6) : [];
  const currentBid = Number(payload?.currentBid || 0);
  const increment = Math.max(500, Number(payload?.listing?.increment || 1000));

  if (currentBid > 0 && recommendedMin === currentBid && recommendedMax === currentBid) {
    recommendedMin = fallback.recommendedMin;
    recommendedMax = fallback.recommendedMax;
  }

  if (currentBid > 0 && recommendedMax <= currentBid) {
    recommendedMax = roundPrice(Math.max(fallback.recommendedMax, currentBid + increment * 2));
  }

  if (recommendedMin === fallback.recommendedMin && recommendedMax === fallback.recommendedMax) {
    recommendedMax = roundPrice(Math.max(recommendedMax, recommendedMin + minimumSpread));
  }

  let summary = payload?.summary || fallback.summary;
  if (!summary || summary.length < 30 || looksLikeCopiedDescription(summary, payload?.listingDescription || "")) {
    summary = buildSummaryFromData(payload?.listing || {}, [], citations, fallback);
  }

  const reasons = Array.isArray(payload?.reasons) && payload.reasons.length
    ? payload.reasons.filter(Boolean).slice(0, 4)
    : buildReasonsFromData(payload?.listing || {}, [], citations, fallback);

  return {
    recommendedMin,
    recommendedMax,
    summary,
    reasons,
    citations,
    source: payload?.source || "gemini-grounded",
    model: payload?.model || GEMINI_MODEL,
  };
}

// Pulls grounded search citations from Gemini metadata for frontend display.
function extractGroundingCitations(data) {
  const chunks = data?.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  return chunks
    .map((chunk) => ({
      title: chunk?.web?.title || "",
      url: chunk?.web?.uri || "",
    }))
    .filter((item) => item.url)
    .filter((item, index, arr) => index === arr.findIndex((entry) => entry.url === item.url))
    .slice(0, 6);
}

// Performs the live Gemini request with grounded web search enabled.
async function callGeminiAnalysis(listing, bidHistory = []) {
  const apiKey = process.env.GEMINI_API_KEY;
  const fallback = buildLocalAnalysis(listing, bidHistory);
  if (!apiKey) return fallback;

  const prompt = [
    // The prompt is strict so the API returns one practical bid ceiling instead of generic advice.
    "You are a strict resale-price analyst for an auction marketplace.",
    "Use grounded internet research to estimate the highest sensible bid a buyer should place.",
    "Return only valid JSON. No markdown. No explanation outside the JSON object.",
    "You must not copy or paraphrase the listing description as the summary.",
    "You must not simply repeat the current bid unless strong internet evidence supports it.",
    "Your answer must be based on comparable market or resale information found online.",
    "If evidence is limited or mixed, be conservative and say so in the reasons.",
    "Goal:",
    "Determine one recommended maximum bid in INR for this buyer.",
    "Evaluation rules:",
    "1. Read the listing title carefully to infer the product type and likely market segment.",
    "2. Use the purchase/production year to adjust for age and depreciation.",
    "3. Use the description to infer condition, completeness, defects, authenticity, and maintenance.",
    "4. Search the internet for comparable resale, second-hand, used-market, or market-price references.",
    "5. Prefer realistic resale-style sources over generic retail pricing when possible.",
    "6. If only weak evidence exists, return a conservative maximum bid and explicitly mention that evidence quality is limited.",
    "7. The recommended maximum bid should be a ceiling, not an average and not an opening bid suggestion.",
    "8. Do not return a minimum price range. Return only one maximum bid number.",
    "Output requirements:",
    "1. recommendedMax must be a number in INR.",
    "2. summary must be a short original market assessment in 1 to 2 sentences.",
    "3. reasons must contain 2 to 4 concrete, evidence-based points.",
    "4. citations should contain the web sources you relied on when available.",
    "5. source should describe the analysis method briefly, such as 'gemini-grounded'.",
    "6. model should contain the model name.",
    'JSON schema: {"recommendedMax": number, "summary": string, "reasons": string[], "citations": [{"title": string, "url": string}], "source": string, "model": string}',
    "Bad outputs to avoid:",
    "- repeating the listing description",
    "- returning the current bid as the answer without justification",
    "- giving broad advice like 'depends on condition' without a concrete number",
    "- inventing certainty when internet evidence is weak",
    `Listing title: ${listing.title}`,
    `Category: ${listing.category}`,
    `Purchase/production year: ${listing.year}`,
    `Description: ${listing.description}`,
    `Current bid: ${listing.currentBid} INR`,
    "Return the maximum bid a careful buyer should be willing to place after internet research.",
  ].join("\n");

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      tools: [{ google_search: {} }],
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2,
      },
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    // Surface upstream failures clearly so the frontend can show the real HTTP status.
    const error = new Error(`Gemini request failed with HTTP ${response.status}. ${text}`);
    error.statusCode = 502;
    error.upstreamStatus = response.status;
    throw error;
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("\n") || "";
  const jsonText = extractJsonBlock(text);
  if (!jsonText) {
    const error = new Error("Gemini returned no JSON payload.");
    error.statusCode = 502;
    throw error;
  }

  let parsed;
  try {
    parsed = JSON.parse(jsonText);
  } catch (parseError) {
    // Invalid JSON is treated as a backend failure so it is easier to debug in the UI.
    const error = new Error(`Gemini returned invalid JSON. ${parseError.message}`);
    error.statusCode = 502;
    throw error;
  }
  const citations = extractGroundingCitations(data);
  return normalizeGeminiPayload(
    {
      ...parsed,
      listing,
      listingDescription: listing.description,
      currentBid: listing.currentBid,
      citations: parsed?.citations?.length ? parsed.citations : citations,
    },
    fallback
  );
}

// Public wrapper used by the server route.
export async function analyzeListing(listing, bidHistory = []) {
  return callGeminiAnalysis(listing, bidHistory);
}
