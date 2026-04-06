import { sendJson } from "./_lib/http.js";

export default function handler(req, res) {
  if (req.method === "OPTIONS") {
    sendJson(res, 204, {});
    return;
  }

  if (req.method !== "GET") {
    sendJson(res, 405, { error: "Method not allowed." });
    return;
  }

  sendJson(res, 200, {
    ok: true,
    model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
  });
}
