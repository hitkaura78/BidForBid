export function sendJson(res, status, payload) {
  res.status(status);
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.send(payload);
}

export function isValidListing(listing) {
  return listing
    && typeof listing.title === "string"
    && typeof listing.category === "string"
    && typeof listing.description === "string"
    && Number.isFinite(Number(listing.year))
    && Number.isFinite(Number(listing.minimumPrice))
    && Number.isFinite(Number(listing.currentBid));
}
