import React, { useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import {
  BrowserRouter as Router,
  Navigate,
  Route,
  Routes,
  useNavigate,
} from "react-router-dom";
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  query,
  runTransaction,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import {
  onAuthStateChanged,
  signInAnonymously,
  signOut,
  updateProfile,
} from "firebase/auth";
import { auth, db } from "./firebase/config";
import IntroPage from "./IntroPage";
import { getPriceAnalysis } from "./services/analysisApi";

const SESSION_KEY = "marketplace-session";
const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});
const categories = {
  "Car Bidding":
    "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=80",
  "Device Bidding":
    "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80",
  "Bike Bidding":
    "https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=1200&q=80",
  Collectibles:
    "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=1200&q=80",
  Furniture:
    "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80",
};

// Safely restores cached session data from localStorage during app startup.
function loadJSON(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

// Shared formatting and bidding helpers keep UI and Firestore writes consistent.
const fmt = (value) => currency.format(Number(value || 0));
const normalizeName = (value) => value.trim().toLowerCase().replace(/\s+/g, " ");
const sortNewest = (a, b) => Number(b?.createdAt || 0) - Number(a?.createdAt || 0);
const nextBid = (listing) =>
  Number(listing.currentBid || listing.minimumPrice || 0) +
  Number(listing.increment || Math.max(1000, Math.round(Number(listing.minimumPrice || 0) * 0.05)));
const getLeaderMaxBid = (listing) => Number(listing.highestBidderMaxBid || listing.currentBid || listing.minimumPrice || 0);
const getLeaderAutoIncrement = (listing) => Number(listing.highestBidderAutoIncrement || listing.increment || 0);

// Ensures Firebase always has an anonymous user before protected writes run.
async function ensureUser() {
  if (auth.currentUser) return auth.currentUser;
  const result = await signInAnonymously(auth);
  return result.user;
}

function formatFirebaseError(error, fallbackMessage) {
  if (!error) return fallbackMessage;
  const code = error.code ? ` (${error.code})` : "";
  const detail = error.message ? `: ${error.message}` : "";
  return `${fallbackMessage}${code}${detail}`;
}

// Writes an in-app notification document that can be shown in the history area.
async function addNote(recipientNameKey, title, message, tone, relatedListingId = null) {
  if (!recipientNameKey) return;
  await addDoc(collection(db, "notifications"), {
    recipientNameKey,
    title,
    message,
    tone,
    relatedListingId,
    createdAt: Date.now(),
  });
}

function CornerIdentity() {
  return (
    <div className="corner-identity" aria-label="Student identity">
      <span>HITEN KAURA</span>
      <strong>24BCI0060</strong>
    </div>
  );
}

function ConnectingScreen() {
  return (
    <div className="login-screen">
      <CornerIdentity />
      <div className="login-card">
        <p className="eyebrow">Connecting</p>
        <h1>Preparing Firebase</h1>
        <p className="subtle">Signing in anonymously so the marketplace can sync in real time.</p>
      </div>
    </div>
  );
}

function LoginScreen({ onLogin }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", phone: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Creates the local session and the matching Firestore user profile record.
  const submit = async (e) => {
    e.preventDefault();
    const name = form.name.trim();
    const nameKey = normalizeName(name);
    const phone = form.phone.trim();
    if (name.length < 2) return setError("Please enter your name.");
    if (!/^\d{10}$/.test(phone)) return setError("Phone number must contain exactly 10 digits.");
    setLoading(true);
    setError("");
    try {
      const user = await ensureUser();
      await updateProfile(user, { displayName: name });
      await setDoc(doc(db, "users", nameKey), { name, nameKey, phone, updatedAt: Date.now() }, { merge: true });
      const session = { name, nameKey, phone };
      window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      onLogin(session);
      navigate("/dashboard");
    } catch (loginErr) {
      console.error(loginErr);
      setError(
        formatFirebaseError(
          loginErr,
          "Firebase login failed. Check Anonymous Authentication and authorized domains in the Firebase console."
        )
      );
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="login-screen">
      <CornerIdentity />
      <div className="login-card">
        <p className="eyebrow">Login first</p>
        <h1>Enter your name and 10-digit number</h1>
        <p className="subtle">Firebase anonymous auth keeps the marketplace shared across users.</p>
        <form className="login-form" onSubmit={submit}>
          <label className="field">
            <span>Name</span>
            <input value={form.name} onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))} placeholder="Your name" />
          </label>
          <label className="field">
            <span>10-digit number</span>
            <input
              type="tel"
              maxLength="10"
              inputMode="numeric"
              value={form.phone}
              onChange={(e) => setForm((c) => ({ ...c, phone: e.target.value.replace(/\D/g, "") }))}
              placeholder="9876543210"
            />
          </label>
          {error && <p className="error-text">{error}</p>}
          <button className="primary-button full-width" type="submit" disabled={loading}>
            {loading ? "Logging in..." : "Login and continue"}
          </button>
          <button
            className="ghost-button full-width"
            type="button"
            onClick={() => navigate("/")}
          >
            Back to intro
          </button>
        </form>
      </div>
    </div>
  );
}
LoginScreen.propTypes = { onLogin: PropTypes.func.isRequired };

function DashboardShell({
  session,
  listings,
  myBids,
  sellerBids,
  notifications,
  analyses,
  onReview,
  onSold,
  onBid,
  onChooseSealedBid,
  onSaveAnalysis,
  onRefreshAnalysis,
  onLogout,
}) {
  const navigate = useNavigate();
  const currentYear = new Date().getFullYear();
  const [tab, setTab] = useState("buy");
  const [selected, setSelected] = useState(null);
  const [bidMode, setBidMode] = useState("one-time");
  const [bidAmount, setBidAmount] = useState("");
  const [bidIncrement, setBidIncrement] = useState("");
  const [bidMsg, setBidMsg] = useState("");
  const [bidMsgTone, setBidMsgTone] = useState("success");
  const [sellForm, setSellForm] = useState({ name: "", category: "Device Bidding", minimumPrice: "", year: "", image: "", description: "", bidType: "open" });
  const [sellError, setSellError] = useState("");
  const [posting, setPosting] = useState(false);
  const [analysisMsg, setAnalysisMsg] = useState("");
  const [analysisTone, setAnalysisTone] = useState("success");
  const [analysisBusyId, setAnalysisBusyId] = useState("");
  const active = useMemo(() => listings.filter((x) => x.status === "active"), [listings]);
  const mine = useMemo(() => listings.filter((x) => x.sellerNameKey === session.nameKey).sort(sortNewest), [listings, session.nameKey]);
  const sellerBidMap = useMemo(() => {
    const grouped = new Map();
    sellerBids.forEach((bid) => {
      const list = grouped.get(bid.listingId) || [];
      list.push(bid);
      grouped.set(bid.listingId, list);
    });
    return grouped;
  }, [sellerBids]);
  const savedAnalysisMap = useMemo(
    () => new Map(analyses.map((analysis) => [analysis.listingId, analysis])),
    [analyses]
  );

  // Resets bid form defaults whenever the buyer opens a different listing.
  useEffect(() => {
    if (selected) {
      setBidAmount(String(nextBid(selected)));
      setBidIncrement(String(selected.increment || Math.max(1, Math.round(nextBid(selected) * 0.05))));
      setBidMsg("");
      setBidMsgTone("success");
      setBidMode("one-time");
    }
  }, [selected]);

  useEffect(() => {
    if (!selected) return;
    const latest = listings.find((listing) => listing.id === selected.id);
    if (!latest) {
      setSelected(null);
      return;
    }
    setSelected(latest);
  }, [listings, selected]);

  const logout = async () => {
    window.localStorage.removeItem(SESSION_KEY);
    onLogout();
    await signOut(auth);
    navigate("/");
  };

  // Validates seller input before creating a new listing document in Firestore.
  const submitSell = async (e) => {
    e.preventDefault();
    const minimumPrice = Number(sellForm.minimumPrice);
    const year = Number(sellForm.year);
    const description = sellForm.description.trim();
    if (
      !sellForm.name.trim()
      || !Number.isFinite(minimumPrice)
      || minimumPrice <= 0
      || !Number.isInteger(year)
      || year < 1600
      || year > currentYear
      || !description
    ) {
      return setSellError(`Please complete the sell form. Year must be between 1600 and ${currentYear}, and description is required.`);
    }
    setPosting(true);
    setSellError("");
    try {
      await ensureUser();
      const user = auth.currentUser;
      const nameKey = normalizeName(session.name);
      const bidType = sellForm.bidType === "sealed" ? "sealed" : "open";
      // Each listing stores enough metadata to support both open and sealed bidding flows.
      await addDoc(collection(db, "listings"), {
        title: sellForm.name.trim(),
        category: sellForm.category,
        image: sellForm.image.trim() || categories[sellForm.category] || categories["Device Bidding"],
        minimumPrice,
        year,
        currentBid: minimumPrice,
        increment: Math.max(1000, Math.round(minimumPrice * 0.05)),
        description,
        details: [`Purchase / Production year: ${year}`, bidType === "sealed" ? "Sealed bid: seller reviews private offers" : "Open bid: live auction pricing", "Posted from the seller dashboard"],
        sellerName: session.name,
        sellerNameKey: nameKey,
        sellerUid: user?.uid || "",
        bidType,
        status: "active",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        highestBidderUid: null,
        highestBidderName: "",
        highestBidderNameKey: "",
        highestBidderMaxBid: 0,
        highestBidderAutoIncrement: 0,
        selectedBidId: "",
        sealedBidCount: 0,
        bidCount: 0,
      });
      setSellForm({ name: "", category: "Device Bidding", minimumPrice: "", year: "", image: "", description: "", bidType: "open" });
      setTab("buy");
    } catch (err) {
      console.error(err);
      setSellError(
        `Firebase denied the write${err?.code ? ` (${err.code})` : ""}. Make sure the Firestore rules file is published in the Firebase console for this project.`
      );
    } finally {
      setPosting(false);
    }
  };

  const submitBid = async () => {
    if (!selected) return;
    const amount = Number(bidAmount);
    const autoIncrement = Number(bidIncrement);
    const minNext = selected.bidType === "sealed" ? Number(selected.minimumPrice || 0) : nextBid(selected);
    if (!Number.isFinite(amount) || amount <= 0) {
      setBidMsgTone("danger");
      return setBidMsg("Enter a valid bid amount.");
    }
    if (selected.bidType === "sealed" && amount < Number(selected.minimumPrice || 0)) {
      setBidMsgTone("danger");
      return setBidMsg(`For sealed bids, enter at least the seller minimum of ${fmt(selected.minimumPrice)}.`);
    }
    if (bidMode === "max-limit" && (!Number.isFinite(autoIncrement) || autoIncrement <= 0)) {
      setBidMsgTone("danger");
      return setBidMsg("Enter a valid auto increment size for max limit bidding.");
    }
    try {
      const outcome = await onBid(selected, amount, bidMode, bidMode === "max-limit" ? autoIncrement : null);
      setBidMsgTone(outcome.accepted ? "success" : "danger");
      setBidMsg(outcome.reason || `Rejected. Minimum next bid is ${fmt(minNext)}.`);
    } catch (err) {
      console.error(err);
      setBidMsgTone("danger");
      setBidMsg("Bid submission failed. Please try again.");
    }
  };

  const suggestions = selected
    ? selected.bidType === "sealed"
      ? [
          Number(selected.minimumPrice || 0),
          Math.round(Number(selected.minimumPrice || 0) * 1.1),
          Math.round(Number(selected.minimumPrice || 0) * 1.2),
        ]
      : [nextBid(selected), Math.round(nextBid(selected) * 1.05), Math.round(nextBid(selected) * 1.1)]
    : [];

  // Saves a listing snapshot into the analysis collection so recommendations can be revisited later.
  const saveToAnalysis = async (listing) => {
    try {
      setAnalysisBusyId(listing.id);
      setAnalysisMsg("");
      setAnalysisTone("success");
      await onSaveAnalysis(listing);
      setSelected(null);
      setTab("analysis");
      setAnalysisMsg(`${listing.title} was added to Analysis.`);
    } catch (error) {
      console.error(error);
      setAnalysisTone("danger");
      setAnalysisMsg("Could not add this listing to Analysis. Please try again.");
    } finally {
      setAnalysisBusyId("");
    }
  };

  const refreshAnalysis = async (analysis) => {
    try {
      setAnalysisBusyId(analysis.id);
      setAnalysisMsg("");
      setAnalysisTone("success");
      await onRefreshAnalysis(analysis);
      setAnalysisMsg(`Updated recommendation for ${analysis.title}.`);
    } catch (error) {
      console.error(error);
      setAnalysisTone("danger");
      setAnalysisMsg(error?.message || "Could not refresh the recommendation right now.");
    } finally {
      setAnalysisBusyId("");
    }
  };

  return (
    <div className="app-shell">
      <CornerIdentity />
      <header className="topbar">
        <div>
          <p className="eyebrow">Marketplace Dashboard</p>
          <h1>Welcome, {session.name}</h1>
          <p className="subtle">Firebase now powers the shared buy, sell, and history flow.</p>
        </div>
        <div className="topbar-actions">
          <div className="session-pill"><span>Active user</span><strong>{session.name}</strong></div>
          <button className="ghost-button" type="button" onClick={logout}>Logout</button>
        </div>
      </header>

      <section className="stats-grid">
        <article className="stat-card"><span>Active buy cards</span><strong>{active.length}</strong></article>
        <article className="stat-card"><span>My listings</span><strong>{mine.length}</strong></article>
        <article className="stat-card"><span>My bids</span><strong>{myBids.length}</strong></article>
        <article className="stat-card"><span>Analysis cards</span><strong>{analyses.length}</strong></article>
      </section>

      <nav className="tabbar">
        {["buy", "sell", "analysis", "history"].map((name) => (
          <button key={name} type="button" className={tab === name ? "tab active" : "tab"} onClick={() => setTab(name)}>
            {name.charAt(0).toUpperCase() + name.slice(1)}
          </button>
        ))}
      </nav>
      {analysisMsg && <p className={`bid-message ${analysisTone}`}>{analysisMsg}</p>}

      {tab === "buy" && (
        <section className="panel-grid">
          {active.length === 0 ? (
            <div className="panel"><p className="empty-state">No active listings yet.</p></div>
          ) : active.map((listing) => (
            <article key={listing.id} className="market-card">
              <img src={listing.image} alt={listing.title} className="market-image" />
              <div className="market-card-body">
                <div className="market-card-heading">
                  <div><p className="card-tag">{listing.category} · {listing.bidType === "sealed" ? "Sealed Bid" : "Open Bid"}</p><h2>{listing.title}</h2></div>
                  <span className="price-chip">{fmt(listing.currentBid)}</span>
                </div>
                <p className="subtle">{listing.description}</p>
                {listing.year && <p className="subtle">Purchase / Production year: {listing.year}</p>}
                <ul className="detail-list">{(listing.details || []).map((d) => <li key={d}>{d}</li>)}</ul>
                <div className="card-actions">
                  <span className="subtle">
                    {listing.bidType === "sealed" ? `Private offers: ${Number(listing.sealedBidCount || 0)}` : `Next bid: ${fmt(nextBid(listing))}`}
                  </span>
                  <div className="action-cluster">
                    <button className="ghost-button" type="button" onClick={() => saveToAnalysis(listing)} disabled={analysisBusyId === listing.id}>
                      {savedAnalysisMap.has(listing.id) ? "Open analysis" : "Add to analysis"}
                    </button>
                    <button className="primary-button" type="button" onClick={() => setSelected(listing)}>Open bidding</button>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </section>
      )}

      {tab === "sell" && (
        <section className="two-column-layout">
          <form className="panel" onSubmit={submitSell}>
            <div className="panel-header"><div><p className="eyebrow">Sell section</p><h2>Post an item for bidding</h2></div></div>
            <label className="field"><span>Item name</span><input value={sellForm.name} onChange={(e) => setSellForm((c) => ({ ...c, name: e.target.value }))} placeholder="Example: Designer chair" /></label>
            <div className="field-row">
              <label className="field">
                <span>Category</span>
                <select value={sellForm.category} onChange={(e) => setSellForm((c) => ({ ...c, category: e.target.value }))}>
                  <option>Car Bidding</option><option>Device Bidding</option><option>Bike Bidding</option><option>Collectibles</option><option>Furniture</option>
                </select>
              </label>
              <label className="field"><span>Minimum price</span><input type="number" min="1" value={sellForm.minimumPrice} onChange={(e) => setSellForm((c) => ({ ...c, minimumPrice: e.target.value }))} placeholder="25000" /></label>
            </div>
            <label className="field">
              <span>Bid type</span>
              <select value={sellForm.bidType} onChange={(e) => setSellForm((c) => ({ ...c, bidType: e.target.value }))}>
                <option value="open">Open Bid</option>
                <option value="sealed">Sealed Bid</option>
              </select>
            </label>
            <label className="field">
              <span>Purchase / Production year</span>
              <input
                type="number"
                min="1900"
                max={currentYear}
                value={sellForm.year}
                onChange={(e) => setSellForm((c) => ({ ...c, year: e.target.value }))}
                placeholder={`Example: ${currentYear - 2}`}
              />
            </label>
            <label className="field"><span>Image URL</span><input type="url" value={sellForm.image} onChange={(e) => setSellForm((c) => ({ ...c, image: e.target.value }))} placeholder="Optional" /></label>
            <label className="field"><span>Description</span><textarea rows="4" value={sellForm.description} onChange={(e) => setSellForm((c) => ({ ...c, description: e.target.value }))} placeholder="Write a few words about the item." /></label>
            {sellError && <p className="error-text">{sellError}</p>}
            <button className="primary-button full-width" type="submit" disabled={posting}>{posting ? "Posting..." : "Post for review"}</button>
          </form>
          <div className="panel">
            <div className="panel-header"><div><p className="eyebrow">Sell preview</p><h2>How your post will appear</h2></div></div>
            <article className="preview-card">
              <img className="market-image" src={sellForm.image.trim() || categories[sellForm.category] || categories["Device Bidding"]} alt={sellForm.name || "Preview"} />
              <div className="market-card-body">
                <p className="card-tag">{sellForm.category} · {sellForm.bidType === "sealed" ? "Sealed Bid" : "Open Bid"}</p><h3>{sellForm.name || "Your item name"}</h3>
                <p className="subtle">{sellForm.description || "Add a required description so buyers know the product condition."}</p>
                <p className="subtle">Purchase / Production year: {sellForm.year || "Required"}</p>
                <p className="subtle">{sellForm.bidType === "sealed" ? "Buyer offers stay private and the seller chooses the winner." : "Buyer offers are visible through the live bidding flow."}</p>
                <div className="card-actions"><span className="price-chip">{sellForm.minimumPrice ? fmt(sellForm.minimumPrice) : "Minimum price"}</span><span className="subtle">Posted by {session.name}</span></div>
              </div>
            </article>
          </div>
        </section>
      )}

      {tab === "history" && (
        <section className="history-layout">
          <div className="panel">
            <div className="panel-header"><div><p className="eyebrow">Posted products</p><h2>Accept, reject, or mark sold</h2></div></div>
            {mine.length === 0 ? <p className="empty-state">No posted products yet.</p> : (
              <div className="history-list">
                {mine.map((listing) => (
                  <article key={listing.id} className="history-card">
                    <img src={listing.image} alt={listing.title} className="history-image" />
                    <div className="history-content">
                      <div className="market-card-heading">
                        <div><p className="card-tag">{listing.category} · {listing.bidType === "sealed" ? "Sealed Bid" : "Open Bid"}</p><h3>{listing.title}</h3></div>
                        <span className={`status ${listing.status}`}>{listing.status}</span>
                      </div>
                      <p className="subtle">{listing.description}</p>
                      {listing.year && <p className="subtle">Purchase / Production year: {listing.year}</p>}
                      <div className="card-actions">
                        <span className="subtle">Minimum: {fmt(listing.minimumPrice)}</span>
                        <span className="subtle">{listing.bidType === "sealed" ? `Private offers: ${Number(listing.sealedBidCount || 0)}` : `Current: ${fmt(listing.currentBid)}`}</span>
                      </div>
                      {listing.highestBidderName && listing.status === "active" && <p className="subtle">Highest bidder: {listing.highestBidderName}</p>}
                      {listing.bidType === "sealed" && listing.status === "active" && (
                        <div className="sealed-offers">
                          <p className="subtle">Private offers for seller only</p>
                          {((sellerBidMap.get(listing.id) || []).length === 0) ? (
                            <p className="empty-state">No sealed offers yet.</p>
                          ) : (
                            <div className="sealed-offer-list">
                              {(sellerBidMap.get(listing.id) || []).map((bid) => (
                                <article key={bid.id} className="sealed-offer-card">
                                  <div>
                                    <strong>{bid.bidderName}</strong>
                                    <p className="subtle">Offer: {fmt(bid.amount)}</p>
                                    <p className="subtle">{new Date(Number(bid.createdAt || Date.now())).toLocaleString()}</p>
                                  </div>
                                  <button className="primary-button" type="button" onClick={() => onChooseSealedBid(listing, bid)}>
                                    Sell to buyer
                                  </button>
                                </article>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                      {listing.status === "pending" && (
                        <div className="card-actions">
                          <button className="primary-button" type="button" onClick={() => onReview(listing, "accept")}>Accept</button>
                          <button className="danger-button" type="button" onClick={() => onReview(listing, "reject")}>Reject</button>
                        </div>
                      )}
                      {listing.status === "active" && listing.bidType !== "sealed" && <div className="card-actions"><button className="ghost-button" type="button" onClick={() => onSold(listing)}>Mark sold</button></div>}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
          <div className="panel">
            <div className="panel-header"><div><p className="eyebrow">My bids</p><h2>Accepted and rejected bids</h2></div></div>
            {myBids.length === 0 ? <p className="empty-state">Your bid activity will show here.</p> : (
              <div className="history-list">
                {myBids.map((bid) => (
                  <article key={bid.id} className="history-card compact">
                    <div className="history-content">
                      <div className="market-card-heading">
                        <div><p className="card-tag">Bid record</p><h3>{bid.listingTitle}</h3></div>
                        <span className={`status ${bid.status}`}>{bid.status}</span>
                      </div>
                      <p className="subtle">
                        {bid.mode === "max-limit" ? "Max limit" : "Entered bid"}: {fmt(bid.requestedAmount || bid.amount)}
                      </p>
                      {bid.mode === "max-limit" && Number(bid.autoIncrement || 0) > 0 && (
                        <p className="subtle">Auto increment step: {fmt(bid.autoIncrement)}</p>
                      )}
                      {Number(bid.effectiveAmount || 0) > 0 && (
                        <p className="subtle">Auction price after this action: {fmt(bid.effectiveAmount)}</p>
                      )}
                      <p className="subtle">{bid.reason}</p>
                    </div>
                  </article>
                ))}
              </div>
            )}
            <div className="panel-divider" />
            <div className="panel-header"><div><p className="eyebrow">Notifications</p><h2>Accepted and rejected updates</h2></div></div>
            {notifications.length === 0 ? <p className="empty-state">Notifications will appear here.</p> : (
              <div className="notification-list">
                {notifications.map((note) => (
                  <article key={note.id} className={`notification ${note.tone}`}>
                    <strong>{note.title}</strong>
                    <span>{note.message}</span>
                    <span>{new Date(Number(note.createdAt || Date.now())).toLocaleString()}</span>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {tab === "analysis" && (
        <section className="history-layout">
          <div className="panel">
            <div className="panel-header"><div><p className="eyebrow">Analysis section</p><h2>Saved cards and AI-backed ranges</h2></div></div>
            <p className="subtle">
              Save a listing from the Buy tab, then refresh its recommendation here. If no backend analysis endpoint is configured, the app uses a local fallback estimator.
            </p>
            {analyses.length === 0 ? <p className="empty-state">Add a product from Buy to start tracking price analysis.</p> : (
              <div className="history-list">
                {analyses.map((analysis) => {
                  const linkedListing = listings.find((listing) => listing.id === analysis.listingId);
                  const analysisCard = {
                    ...linkedListing,
                    ...analysis,
                    title: analysis.title || linkedListing?.title || "Saved listing",
                    category: analysis.category || linkedListing?.category || "",
                    bidType: analysis.bidType || linkedListing?.bidType || "open",
                    image: analysis.image || linkedListing?.image || categories[linkedListing?.category] || categories["Device Bidding"],
                    description: analysis.description || linkedListing?.description || "",
                    details: (analysis.details && analysis.details.length ? analysis.details : linkedListing?.details) || [],
                    year: analysis.year || linkedListing?.year || "",
                    minimumPrice: Number(analysis.minimumPrice || linkedListing?.minimumPrice || 0),
                    currentBid: Number(analysis.currentBid || linkedListing?.currentBid || linkedListing?.minimumPrice || 0),
                  };
                  return (
                    <article key={analysis.id} className="history-card compact analysis-card">
                      <div className="analysis-card-top">
                        <img src={analysisCard.image} alt={analysisCard.title} className="analysis-image" />
                        <div className="history-content">
                          <div className="market-card-heading">
                            <div><p className="card-tag">{analysisCard.category}{analysisCard.bidType ? ` · ${analysisCard.bidType === "sealed" ? "Sealed Bid" : "Open Bid"}` : ""}</p><h3>{analysisCard.title}</h3></div>
                            <span className={`status ${analysis.analysisStatus || "pending"}`}>{analysis.analysisStatus || "saved"}</span>
                          </div>
                          <p className="subtle">Analysis card for listing: {analysisCard.title}</p>
                          <div className="card-actions">
                            <span className="subtle">Listing snapshot in Analysis</span>
                            <button className="primary-button" type="button" onClick={() => refreshAnalysis(analysisCard)} disabled={analysisBusyId === analysis.id}>
                              {analysisBusyId === analysis.id ? "Analyzing..." : analysis.analysisStatus === "ready" ? "Run analysis again" : "Start analysis"}
                            </button>
                          </div>
                          <p className="subtle">{analysisCard.description || "No description available for this saved listing."}</p>
                          <p className="subtle">Purchase / Production year: {analysisCard.year || "Not available"}</p>
                          <ul className="detail-list">{analysisCard.details.map((detail) => <li key={detail}>{detail}</li>)}</ul>
                          <div className="analysis-range">
                            <div><span>Current bid</span><strong>{fmt(analysisCard.currentBid)}</strong></div>
                            <div><span>Suggested maximum bid</span><strong>{fmt(analysis.recommendedMax || analysisCard.currentBid || analysisCard.minimumPrice)}</strong></div>
                          </div>
                          <p className="subtle">{analysis.summary || "No recommendation yet. Run analysis to generate a suggested maximum bid."}</p>
                          {!!analysis.reasons?.length && (
                            <ul className="detail-list">{analysis.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>
                          )}
                          {!!analysis.citations?.length && (
                            <div className="citation-list">
                              {analysis.citations.map((citation, index) => (
                                <a key={`${citation.url}-${index}`} className="citation-link" href={citation.url} target="_blank" rel="noreferrer">
                                  {citation.title || citation.url}
                                </a>
                              ))}
                            </div>
                          )}
                          <div className="card-actions">
                            <span className="subtle">
                              Source: {analysis.analysisSource || "saved"}{analysis.analysisModel ? ` - ${analysis.analysisModel}` : ""}
                            </span>
                            <span className="subtle">Internet-grounded pricing guidance</span>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      )}

      {selected && (
        <div className="modal-backdrop" onClick={() => setSelected(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-media"><img src={selected.image} alt={selected.title} /></div>
            <div className="modal-body">
              <div className="market-card-heading">
                <div><p className="card-tag">{selected.category} · {selected.bidType === "sealed" ? "Sealed Bid" : "Open Bid"}</p><h2>{selected.title}</h2></div>
                <button type="button" className="icon-button" onClick={() => setSelected(null)}>Close</button>
              </div>
              <p className="subtle">{selected.description}</p>
              {selected.year && <p className="subtle">Purchase / Production year: {selected.year}</p>}
              <div className="detail-grid">
                <div><span>{selected.bidType === "sealed" ? "Seller minimum" : "Current bid"}</span><strong>{fmt(selected.bidType === "sealed" ? selected.minimumPrice : selected.currentBid)}</strong></div>
                <div><span>{selected.bidType === "sealed" ? "Private offers" : "Minimum next bid"}</span><strong>{selected.bidType === "sealed" ? Number(selected.sealedBidCount || 0) : fmt(nextBid(selected))}</strong></div>
              </div>
              {selected.bidType !== "sealed" && (
                <div className="bid-mode-toggle" role="radiogroup" aria-label="Bid type">
                  <button
                    type="button"
                    className={bidMode === "one-time" ? "toggle-chip active" : "toggle-chip"}
                    onClick={() => setBidMode("one-time")}
                  >
                    One-time bid
                  </button>
                  <button
                    type="button"
                    className={bidMode === "max-limit" ? "toggle-chip active" : "toggle-chip"}
                    onClick={() => setBidMode("max-limit")}
                  >
                    Max limit bid
                  </button>
                </div>
              )}
              <p className="subtle">
                {selected.bidType === "sealed"
                  ? "Your offer stays private from other buyers. The seller will review all sealed offers and choose one buyer manually."
                  : bidMode === "one-time"
                  ? `Your bid can win immediately, or be used as your maximum if auto-bidding is already active against another buyer.`
                  : `Your maximum stays hidden. The system raises your visible bid by your chosen step until it reaches ${fmt(Number(bidAmount) || 0)}.`}
              </p>
              <div className="card-actions">
                {suggestions.map((s) => <button key={s} type="button" className="ghost-button" onClick={() => setBidAmount(String(s))}>{fmt(s)}</button>)}
              </div>
              <ul className="detail-list">{(selected.details || []).map((d) => <li key={d}>{d}</li>)}</ul>
              <label className="field">
                <span>{selected.bidType === "sealed" ? "Your private offer" : bidMode === "max-limit" ? "Your maximum limit" : "Your bid amount"}</span>
                <input type="number" min="1" value={bidAmount} onChange={(e) => setBidAmount(e.target.value)} placeholder={`Enter at least ${fmt(selected.bidType === "sealed" ? selected.minimumPrice : nextBid(selected))}`} />
              </label>
              {selected.bidType !== "sealed" && bidMode === "max-limit" && (
                <label className="field">
                  <span>Auto increment size</span>
                  <input type="number" min="1" value={bidIncrement} onChange={(e) => setBidIncrement(e.target.value)} placeholder={`Example: ${selected.increment || 200}`} />
                </label>
              )}
              {selected.bidType !== "sealed" && bidMode === "max-limit" && (
                <p className="subtle">
                  Challengers cannot bid inside the protected gap above {fmt(Math.max(0, Number(bidAmount || 0) - Number(bidIncrement || 0)))} and up to your max limit.
                </p>
              )}
              <div className="card-actions">
                <span className="subtle">
                  Seller: {selected.sellerName}
                </span>
                <div className="action-cluster">
                  <button type="button" className="ghost-button" onClick={() => saveToAnalysis(selected)} disabled={analysisBusyId === selected.id}>
                    {savedAnalysisMap.has(selected.id) ? "Open analysis" : "Add to analysis"}
                  </button>
                  <button type="button" className="primary-button" onClick={submitBid}>
                    {selected.bidType === "sealed" ? "Submit sealed offer" : bidMode === "max-limit" ? "Set max limit" : "Place bid"}
                  </button>
                </div>
              </div>
              {bidMsg && <p className={`bid-message ${bidMsgTone}`}>{bidMsg}</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
DashboardShell.propTypes = {
  session: PropTypes.shape({ name: PropTypes.string.isRequired, nameKey: PropTypes.string.isRequired, phone: PropTypes.string.isRequired }).isRequired,
  listings: PropTypes.arrayOf(PropTypes.object).isRequired,
  myBids: PropTypes.arrayOf(PropTypes.object).isRequired,
  notifications: PropTypes.arrayOf(PropTypes.object).isRequired,
  analyses: PropTypes.arrayOf(PropTypes.object).isRequired,
  sellerBids: PropTypes.arrayOf(PropTypes.object).isRequired,
  onReview: PropTypes.func.isRequired,
  onSold: PropTypes.func.isRequired,
  onBid: PropTypes.func.isRequired,
  onChooseSealedBid: PropTypes.func.isRequired,
  onSaveAnalysis: PropTypes.func.isRequired,
  onRefreshAnalysis: PropTypes.func.isRequired,
  onLogout: PropTypes.func.isRequired,
};

function App() {
  // App-level state mirrors the currently logged-in user plus the Firestore collections
  // that drive dashboard cards, bid history, notifications, and saved analyses.
  const [session, setSession] = useState(() => loadJSON(SESSION_KEY, null));
  const [authReady, setAuthReady] = useState(false);
  const [listings, setListings] = useState([]);
  const [myBids, setMyBids] = useState([]);
  const [allBids, setAllBids] = useState([]);
  const [sellerBids, setSellerBids] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [analyses, setAnalyses] = useState([]);

  // Waits for Firebase auth to resolve before deciding which route to show.
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setAuthReady(true);
        return;
      }
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "listings"), async (snap) => {
      const docs = snap.docs.map((item) => ({ id: item.id, ...item.data() }));
      setListings(docs.sort(sortNewest));
    });
    return () => unsub();
  }, []);

  // User-specific listeners stay disabled until we know which dashboard session is active.
  useEffect(() => {
    if (!session?.nameKey) {
      setMyBids([]);
      setAllBids([]);
      setSellerBids([]);
      setNotifications([]);
      setAnalyses([]);
      return;
    }
    const unsubBids = onSnapshot(query(collection(db, "bids"), where("bidderNameKey", "==", session.nameKey)), (snap) => {
      setMyBids(
        snap.docs
          .map((item) => ({ id: item.id, ...item.data() }))
          .sort(sortNewest)
      );
    });
    const unsubNotes = onSnapshot(query(collection(db, "notifications"), where("recipientNameKey", "==", session.nameKey)), (snap) => {
      setNotifications(
        snap.docs
          .map((item) => ({ id: item.id, ...item.data() }))
          .sort(sortNewest)
      );
    });
    const unsubAllBids = onSnapshot(query(collection(db, "bids"), where("bidderNameKey", "==", session.nameKey)), (snap) => {
      setAllBids(
        snap.docs
          .map((item) => ({ id: item.id, ...item.data() }))
          .sort(sortNewest)
      );
    });
    const unsubSellerBids = onSnapshot(query(collection(db, "bids"), where("sellerNameKey", "==", session.nameKey)), (snap) => {
      setSellerBids(
        snap.docs
          .map((item) => ({ id: item.id, ...item.data() }))
          .sort(sortNewest)
      );
    });
    const unsubAnalyses = onSnapshot(query(collection(db, "analyses"), where("ownerNameKey", "==", session.nameKey)), (snap) => {
      setAnalyses(
        snap.docs
          .map((item) => ({ id: item.id, ...item.data() }))
          .sort(sortNewest)
      );
    });
    return () => {
      unsubBids();
      unsubNotes();
      unsubAllBids();
      unsubSellerBids();
      unsubAnalyses();
    };
  }, [session?.nameKey]);

  // Creates or updates the user's saved analysis document with the latest listing snapshot.
  const upsertAnalysis = async (listing, analysisResult = null) => {
    const user = await ensureUser();
    const existing = analyses.find((item) => item.listingId === listing.id);
    // Analysis documents keep a listing snapshot plus the latest recommendation payload.
    const payload = {
      listingId: listing.id,
      title: listing.title,
      category: listing.category,
      bidType: listing.bidType || "open",
      image: listing.image,
      description: listing.description,
      details: listing.details || [],
      year: listing.year,
      minimumPrice: Number(listing.minimumPrice || 0),
      currentBid: Number(listing.currentBid || 0),
      ownerUid: user.uid,
      ownerNameKey: session.nameKey,
      updatedAt: Date.now(),
      ...(analysisResult ? {
        recommendedMin: Number(
          analysisResult.recommendedMin
          ?? existing?.recommendedMin
          ?? listing.minimumPrice
          ?? 0
        ),
        recommendedMax: Number(
          analysisResult.recommendedMax
          ?? existing?.recommendedMax
          ?? listing.currentBid
          ?? listing.minimumPrice
          ?? 0
        ),
        summary: analysisResult.summary || existing?.summary || "No recommendation was returned by the backend.",
        reasons: Array.isArray(analysisResult.reasons) && analysisResult.reasons.length
          ? analysisResult.reasons
          : existing?.reasons || ["The backend did not return detailed reasons for this recommendation."],
        citations: analysisResult.citations || [],
        analysisSource: analysisResult.source,
        analysisModel: analysisResult.model,
        analysisStatus: "ready",
        lastAnalyzedAt: Date.now(),
      } : {
        analysisStatus: existing?.analysisStatus || "saved",
      }),
    };

    if (existing) {
      await updateDoc(doc(db, "analyses", existing.id), payload);
      setAnalyses((current) =>
        current
          .map((item) => (item.id === existing.id ? { ...item, ...payload, id: existing.id } : item))
          .sort(sortNewest)
      );
      return existing.id;
    }

    const initialDoc = {
      ...payload,
      createdAt: Date.now(),
      recommendedMin: Number(listing.minimumPrice || 0),
      recommendedMax: Number(listing.currentBid || listing.minimumPrice || 0),
      summary: "Saved for analysis. Run the recommendation to generate a suggested maximum bid.",
      reasons: ["The card is saved in Firestore and ready for price analysis."],
      citations: [],
      analysisSource: "saved",
      analysisModel: "",
      lastAnalyzedAt: null,
    };
    const created = await addDoc(collection(db, "analyses"), initialDoc);
    setAnalyses((current) => [{ id: created.id, ...initialDoc }, ...current].sort(sortNewest));
    return created.id;
  };

  const saveAnalysis = async (listing) => {
    if (!session?.nameKey) return;
    await upsertAnalysis(listing, null);
  };

  // Calls the backend pricing service and merges its recommendation into the saved card.
  const refreshAnalysis = async (analysis) => {
    if (!session?.nameKey) return;
    const listing = listings.find((item) => item.id === analysis.listingId) || analysis;
    const listingBids = allBids.filter((bid) => bid.listingId === listing.id);
    const result = await getPriceAnalysis(listing, listingBids);
    await upsertAnalysis(listing, result);
  };

  const reviewListing = async (listing, decision) => {
    if (!session?.nameKey || listing.sellerNameKey !== session.nameKey || listing.status !== "pending") return;
    await updateDoc(doc(db, "listings", listing.id), { status: decision === "accept" ? "active" : "rejected", updatedAt: Date.now() });
    await addNote(
      session.nameKey,
      decision === "accept" ? `${listing.title} accepted` : `${listing.title} rejected`,
      decision === "accept" ? "Your product is now visible in the Buy section." : "Your product was rejected from the review queue.",
      decision === "accept" ? "success" : "danger",
      listing.id
    );
  };

  const markSold = async (listing) => {
    if (!session?.nameKey || listing.sellerNameKey !== session.nameKey || listing.status !== "active") return;
    await updateDoc(doc(db, "listings", listing.id), { status: "sold", updatedAt: Date.now(), soldAt: Date.now() });
    if (listing.highestBidderUid) {
      await addNote(
        listing.highestBidderNameKey,
        `${listing.title} sold`,
        `Your offer of ${fmt(listing.currentBid)} was finalized.`,
        "success",
        listing.id
      );
    }
  };

  // Sellers use this to privately accept one sealed offer and close the listing.
  const chooseSealedBid = async (listing, bid) => {
    if (!session?.nameKey || listing.sellerNameKey !== session.nameKey || listing.bidType !== "sealed" || listing.status !== "active") return;
    await updateDoc(doc(db, "listings", listing.id), {
      status: "sold",
      currentBid: Number(bid.amount || listing.minimumPrice || 0),
      highestBidderUid: bid.bidderNameKey,
      highestBidderName: bid.bidderName,
      highestBidderNameKey: bid.bidderNameKey,
      highestBidderPhone: bid.bidderPhone || "",
      selectedBidId: bid.id,
      updatedAt: Date.now(),
      soldAt: Date.now(),
    });
    await addNote(
      bid.bidderNameKey,
      `${listing.title} sold to you`,
      `The seller accepted your sealed offer of ${fmt(bid.amount)}.`,
      "success",
      listing.id
    );
    const otherBidders = sellerBids.filter((entry) => entry.listingId === listing.id && entry.id !== bid.id);
    await Promise.all(
      otherBidders.map((entry) => addNote(
        entry.bidderNameKey,
        `${listing.title} sealed bid closed`,
        "The seller chose another buyer for this sealed-bid listing.",
        "danger",
        listing.id
      ))
    );
  };

  const submitBid = async (listing, amount, mode = "one-time", autoIncrement = null) => {
    if (!session?.nameKey) return { accepted: false, reason: "Please log in again." };
    const user = await ensureUser();
    let accepted = false;
    let reason = "";
    let previousBidder = null;
    let previousBid = 0;
    let leaderStayedAhead = false;
    let effectiveAmount = amount;
    let savedAutoIncrement = Number(autoIncrement || 0);
    const ref = doc(db, "listings", listing.id);

    // Firestore transactions keep open-bid state consistent across concurrent buyers.
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists()) {
        reason = "This listing no longer exists.";
        return;
      }
      const current = snap.data();
      if (current.status !== "active") {
        reason = "This listing is no longer active.";
        return;
      }
      if (current.bidType === "sealed") {
        // Sealed bids are private seller-facing offers, so the visible listing price stays unchanged.
        tx.update(ref, {
          bidCount: Number(current.bidCount || 0) + 1,
          sealedBidCount: Number(current.sealedBidCount || 0) + 1,
          updatedAt: Date.now(),
        });
        accepted = true;
        effectiveAmount = amount;
        reason = `Submitted. Your sealed offer of ${fmt(amount)} is now visible only to the seller.`;
        return;
      }
      const minNext = nextBid(current);
      if (!Number.isFinite(amount) || amount < minNext) {
        reason = `Rejected. Minimum next bid is ${fmt(minNext)}.`;
        return;
      }
      const increment = Number(current.increment || Math.max(1000, Math.round(Number(current.minimumPrice || 0) * 0.05)));
      const currentLeaderKey = current.highestBidderNameKey || "";
      const currentLeaderMax = getLeaderMaxBid(current);
      const currentLeaderStep = getLeaderAutoIncrement(current);
      const autoStep = currentLeaderStep > 0 ? currentLeaderStep : increment;
      const now = Date.now();
      const incomingMax = amount;
      const openingBid = mode === "max-limit" ? minNext : amount;
      const incomingStep = mode === "max-limit" ? Number(autoIncrement) : increment;

      if (mode === "max-limit" && (!Number.isFinite(incomingStep) || incomingStep <= 0)) {
        reason = "Rejected. Add a valid auto increment size for max limit bidding.";
        return;
      }

      if (currentLeaderKey === session.nameKey) {
        // Leaders can raise only their hidden ceiling without changing the visible bid immediately.
        if (mode !== "max-limit" || incomingMax <= currentLeaderMax) {
          reason = `You already lead this auction at ${fmt(current.currentBid)}. Enter a higher max limit than ${fmt(currentLeaderMax)} to extend auto-bidding.`;
          return;
        }
        tx.update(ref, {
          highestBidderMaxBid: incomingMax,
          highestBidderAutoIncrement: incomingStep,
          bidCount: Number(current.bidCount || 0) + 1,
          updatedAt: now,
        });
        accepted = true;
        effectiveAmount = Number(current.currentBid || 0);
        savedAutoIncrement = incomingStep;
        reason = `Accepted. Your max limit is now ${fmt(incomingMax)} with an auto increment of ${fmt(incomingStep)}, and your visible bid stays at ${fmt(current.currentBid)} until someone challenges it.`;
        return;
      }

      previousBidder = current.highestBidderUid || null;
      previousBid = Number(current.currentBid || 0);

      if (!currentLeaderKey) {
        effectiveAmount = openingBid;
        tx.update(ref, {
          currentBid: effectiveAmount,
          highestBidderUid: session.nameKey,
          highestBidderName: session.name,
          highestBidderNameKey: session.nameKey,
          highestBidderPhone: session.phone,
          highestBidderMaxBid: incomingMax,
          highestBidderAutoIncrement: mode === "max-limit" ? incomingStep : 0,
          bidCount: Number(current.bidCount || 0) + 1,
          updatedAt: now,
        });
        accepted = true;
        savedAutoIncrement = mode === "max-limit" ? incomingStep : 0;
        reason = mode === "max-limit"
          ? `Accepted. Your max limit is ${fmt(incomingMax)} with an auto increment of ${fmt(incomingStep)}, and the auction opens with you leading at ${fmt(effectiveAmount)}.`
          : `Accepted. You are now the highest bidder at ${fmt(effectiveAmount)}.`;
        return;
      }

      if (currentLeaderStep > 0) {
        // Challengers cannot bid inside the protected auto-bid gap.
        const protectedFloor = currentLeaderMax - currentLeaderStep;
        if (incomingMax > protectedFloor && incomingMax <= currentLeaderMax) {
          reason = `Rejected. This bid falls inside the protected auto-bid gap. Bid ${fmt(protectedFloor)} or less, or go above ${fmt(currentLeaderMax)}.`;
          return;
        }
      }

      if (incomingMax <= currentLeaderMax) {
        // The current leader auto-bids only enough to stay ahead.
        leaderStayedAhead = true;
        effectiveAmount = Math.min(currentLeaderMax, incomingMax + autoStep);
        tx.update(ref, {
          currentBid: effectiveAmount,
          bidCount: Number(current.bidCount || 0) + 1,
          updatedAt: now,
        });
        reason = `Rejected. The current leader's auto-bid kept them ahead at ${fmt(effectiveAmount)}.`;
        return;
      }

      effectiveAmount = incomingMax;
      // A stronger challenger becomes the new visible leader.
      tx.update(ref, {
        currentBid: effectiveAmount,
        highestBidderUid: session.nameKey,
        highestBidderName: session.name,
        highestBidderNameKey: session.nameKey,
        highestBidderPhone: session.phone,
        highestBidderMaxBid: incomingMax,
        highestBidderAutoIncrement: mode === "max-limit" ? incomingStep : 0,
        bidCount: Number(current.bidCount || 0) + 1,
        updatedAt: now,
      });
      accepted = true;
      savedAutoIncrement = mode === "max-limit" ? incomingStep : 0;
      reason = mode === "max-limit"
        ? `Accepted. Your max limit is ${fmt(incomingMax)} with an auto increment of ${fmt(incomingStep)}, and you now lead at ${fmt(effectiveAmount)}.`
        : `Accepted. You now lead at ${fmt(effectiveAmount)}.`;
    });
    await addDoc(collection(db, "bids"), {
      // Every accepted or rejected attempt is recorded for history and seller review.
      listingId: listing.id,
      listingTitle: listing.title,
      listingBidType: listing.bidType || "open",
      bidderUid: session.nameKey,
      bidderAuthUid: user.uid,
      bidderNameKey: session.nameKey,
      bidderName: session.name,
      bidderPhone: session.phone,
      sellerUid: listing.sellerUid || "",
      sellerNameKey: listing.sellerNameKey,
      amount,
      requestedAmount: amount,
      effectiveAmount,
      autoIncrement: savedAutoIncrement,
      mode: listing.bidType === "sealed" ? "sealed-offer" : mode,
      status: listing.bidType === "sealed" ? "submitted" : accepted ? "accepted" : "rejected",
      reason,
      createdAt: Date.now(),
    });
    await addNote(session.nameKey, accepted ? "Bid accepted" : "Bid rejected", reason, accepted ? "success" : "danger", listing.id);
    if (listing.bidType === "sealed") {
      await addNote(
        listing.sellerNameKey,
        `${listing.title} - new sealed offer`,
        `${session.name} submitted a private offer of ${fmt(amount)}.`,
        "success",
        listing.id
      );
      return { accepted, reason };
    }
    if (accepted && previousBidder && previousBidder !== session.nameKey) {
      await addNote(
        previousBidder,
        `${listing.title} - you were outbid`,
        `A higher bid of ${fmt(amount)} replaced your offer of ${fmt(previousBid)}.`,
        "danger",
        listing.id
      );
    }
    if (leaderStayedAhead && previousBidder) {
      await addNote(
        previousBidder,
        `${listing.title} auto-bid`,
        `Your max limit kept you in front at ${fmt(effectiveAmount)}.`,
        "success",
        listing.id
      );
    }
    return { accepted, reason };
  };

  const logout = async () => {
    window.localStorage.removeItem(SESSION_KEY);
    setSession(null);
    await signOut(auth);
  };

  return (
    // Route gating keeps intro, login, and dashboard aligned with session state.
    <Router basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route path="/" element={<IntroPage session={session} />} />
        <Route
          path="/login"
          element={session ? <Navigate to="/dashboard" replace /> : !authReady && !session ? <ConnectingScreen /> : <LoginScreen onLogin={setSession} />}
        />
        <Route
          path="/dashboard"
          element={
            session ? (
              <DashboardShell
                session={session}
                listings={listings}
                myBids={myBids}
                sellerBids={sellerBids}
                notifications={notifications}
                analyses={analyses}
                onReview={reviewListing}
                onSold={markSold}
                onBid={submitBid}
                onChooseSealedBid={chooseSealedBid}
                onSaveAnalysis={saveAnalysis}
                onRefreshAnalysis={refreshAnalysis}
                onLogout={logout}
              />
            ) : (
              !authReady && !session ? <ConnectingScreen /> : <Navigate to="/login" replace />
            )
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
