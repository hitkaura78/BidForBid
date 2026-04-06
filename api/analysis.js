import { analyzeListing } from "../server/lib/analysis-engine.js";
import { isValidListing, sendJson } from "./_lib/http.js";

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    sendJson(res, 204, {});
    return;
  }

  if (req.method !== "POST") {
    sendJson(res, 405, { error: "Method not allowed." });
    return;
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    if (!isValidListing(body?.listing)) {
      sendJson(res, 400, { error: "Invalid listing payload." });
      return;
    }

    const result = await analyzeListing(body.listing, Array.isArray(body.bidHistory) ? body.bidHistory : []);
    sendJson(res, 200, result);
  } catch (error) {
    console.error(error);
    sendJson(res, Number(error?.statusCode || 500), {
      error: error?.message || "Analysis request failed.",
      httpStatus: Number(error?.statusCode || 500),
      upstreamStatus: error?.upstreamStatus || null,
    });
  }
}
