const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

const roundPrice = (value) => Math.max(500, Math.round(Number(value || 0) / 500) * 500);

function normalizeAnalysisPayload(payload) {
  const recommendedMax = roundPrice(payload?.recommendedMax || 0);
  const reasons = Array.isArray(payload?.reasons) ? payload.reasons.filter(Boolean).slice(0, 4) : [];

  return {
    recommendedMax,
    summary: payload?.summary || "No recommendation was returned by the backend.",
    reasons,
    source: payload?.source || "backend",
    model: payload?.model || "",
    citations: Array.isArray(payload?.citations) ? payload.citations : [],
  };
}

export async function getPriceAnalysis(listing, bidHistory = []) {
  const response = await fetch(`${API_BASE_URL}/api/analysis`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      listing: {
        id: listing.id,
        title: listing.title,
        category: listing.category,
        year: listing.year,
        description: listing.description,
        minimumPrice: listing.minimumPrice,
        currentBid: listing.currentBid,
        increment: listing.increment,
      },
      bidHistory: bidHistory.map((bid) => ({
        amount: bid.effectiveAmount || bid.amount,
        status: bid.status,
        createdAt: bid.createdAt,
      })),
    }),
  });

  if (!response.ok) {
    let payload = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }
    const detail = payload?.error ? ` ${payload.error}` : "";
    const upstream = payload?.upstreamStatus ? ` Upstream HTTP ${payload.upstreamStatus}.` : "";
    throw new Error(`HTTP ${response.status}.${upstream}${detail}`.trim());
  }

  const payload = await response.json();
  return normalizeAnalysisPayload(payload);
}
