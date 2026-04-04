import { createServer } from "node:http";
import { analyzeListing } from "./lib/analysis-engine.js";

const PORT = Number(process.env.PORT || 8787);

// Sends consistent JSON responses for both success and error cases.
function sendJson(res, status, payload) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  });
  res.end(JSON.stringify(payload));
}

// Collects and parses the JSON request body for POST routes.
function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
    });
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

// Guards the analysis API against malformed listing payloads.
function isValidListing(listing) {
  return listing
    && typeof listing.title === "string"
    && typeof listing.category === "string"
    && typeof listing.description === "string"
    && Number.isFinite(Number(listing.year))
    && Number.isFinite(Number(listing.minimumPrice))
    && Number.isFinite(Number(listing.currentBid));
}

// Lightweight backend used by the frontend analysis tab.
const server = createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    sendJson(res, 204, {});
    return;
  }

  // Simple health route to confirm the backend is alive and sees the Gemini key.
  if (req.method === "GET" && req.url === "/api/health") {
    sendJson(res, 200, {
      ok: true,
      model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
      hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
    });
    return;
  }

  // Analysis route that validates input, calls Gemini logic, and returns structured output.
  if (req.method === "POST" && req.url === "/api/analysis") {
    try {
      const body = await readBody(req);
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
    return;
  }

  // Fallback for unknown routes.
  sendJson(res, 404, { error: "Not found." });
});

// Starts the local HTTP server for Vite proxy and direct API access.
server.listen(PORT, () => {
  console.log(`Analysis backend running on http://localhost:${PORT}`);
});
