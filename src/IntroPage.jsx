import React, { useEffect, useRef } from "react";
import PropTypes from "prop-types";
import { useNavigate } from "react-router-dom";

// Top-level intro cards that explain the project brief and constraints.
const problemCards = [
  {
    icon: "🛠️",
    title: "Given Problem Statement",
    body:
      "Design and implement a web-based marketplace where multiple users can buy and sell items through live bidding, sealed offers, and cloud-synced analysis workflows.",
  },
  {
    icon: "⚙️",
    title: "Core Requirement",
    body:
      "Support concurrent bids without race conditions, persist data across sessions and devices, separate seller-only sealed offers from public bids, and keep onboarding friction low.",
  },
  {
    icon: "👥",
    title: "Target Users",
    body:
      "Sellers who want either open auctions or private sealed offers, and buyers who want transparent bidding plus AI-assisted guidance before placing a ceiling bid.",
  },
  {
    icon: "🛡️",
    title: "Security Constraint",
    body:
      "All reads and writes are guarded by Firestore Security Rules so buyers cannot see others' sealed offers, forge bid data, or alter another user's listings and analysis cards.",
  },
];

// Headline metrics shown in the project description section.
const stats = [
  { num: "5", label: "Item Categories (Cars, Devices, Bikes, Collectibles, Furniture)" },
  { num: "5", label: "Firestore Collections (users, listings, bids, analyses, notifications)" },
  { num: "4", label: "Dashboard Tabs (Buy, Sell, Analysis, History)" },
  { num: "2", label: "Bid Modes for Sellers (Open Bid and Sealed Bid)" },
  { num: "∞", label: "Real-time Firebase listeners keep the marketplace in sync" },
];

// Module documentation blocks rendered in the "Module Details" section.
const modules = [
  {
    num: "01",
    variant: "auth",
    icon: "👤",
    title: "Authentication Module",
    body: "Handles identity using Firebase Anonymous Auth. Users enter a name and 10-digit phone number - no password needed.",
    feats: [
      "Anonymous Firebase sign-in on first load",
      "Name normalized into a unique `nameKey`",
      "Session persisted in `localStorage`",
      "Profile written to Firestore `users`",
    ],
  },
  {
    num: "02",
    variant: "buy",
    icon: "🛍️",
    title: "Buy / Browse Module",
    body: "Displays active listings in real time and lets buyers enter either public auction bids or private sealed offers depending on the listing type.",
    feats: [
      "Live grid of active listing cards",
      "Bid type shown as Open Bid or Sealed Bid",
      "Current price, year, description, and seller snapshot",
      "Next minimum bid auto-calculated for open auctions",
      "Private offer entry for sealed listings",
    ],
  },
  {
    num: "03",
    variant: "sell",
    icon: "🏷️",
    title: "Sell / Listing Module",
    body: "Sellers post items with required year and description fields, then choose whether the product runs as an open auction or a sealed-bid sale.",
    feats: [
      "Required purchase / production year field",
      "Required product description field",
      "Bid type selector for open or sealed mode",
      "Default stock images by category",
      "Increment set automatically from the minimum price",
      "Posts directly to Firestore `listings`",
    ],
  },
  {
    num: "04",
    variant: "bid",
    icon: "📈",
    title: "Bidding Engine Module",
    body: "Handles public open bids with Firestore transactions, plus private sealed offers that only the seller can review and finalize.",
    feats: [
      "Atomic `runTransaction` read + write",
      "One-time bid and max-limit bid for open auctions",
      "Protected auto-bid gap logic for max-limit mode",
      "Rejected bids still recorded in `bids`",
      "Seller-only sealed offer selection flow",
    ],
  },
  {
    num: "05",
    variant: "analysis",
    icon: "🧠",
    title: "Analysis Module",
    body: "Lets buyers save listings into a personal Analysis tab and request a Gemini-powered recommendation for the highest sensible bid.",
    feats: [
      "Listings can be added from Buy into Analysis",
      "Analysis cards store a listing snapshot in Firestore",
      "Backend API calls Gemini with grounded web search",
      "Suggested maximum bid, reasons, and citations shown in the UI",
    ],
  },
  {
    num: "06",
    variant: "hist",
    icon: "📜",
    title: "History Module",
    body: "Shows sellers their listings and buyer activity, while also exposing seller-only sealed offers and sale finalization controls.",
    feats: [
      "Seller listings with status chips",
      "Seller can mark an open listing as sold",
      "Seller can choose the winning sealed offer privately",
      "Buyer bid history sorted newest first",
    ],
  },
  {
    num: "07",
    variant: "notif",
    icon: "📨",
    title: "Notifications Module",
    body: "Real-time user-scoped notifications for outbid alerts, sealed-offer events, bid results, and listing status changes.",
    feats: [
      "Stored per `recipientNameKey`",
      "Tone-coded success and danger alerts",
      "Outbid alerts and sealed-bid updates",
      "Live via filtered Firestore listeners",
    ],
  },
];

function IntroPage({ session }) {
  const navigate = useNavigate();
  const rootRef = useRef(null);
  // Logged-in users jump straight to the dashboard; others go to login.
  const launchPath = session ? "/dashboard" : "/login";
  const launchLabel = session ? "Continue to dashboard" : "Launch App";
  const portfolioUrl = "";

  // Submission metadata shown near the top of the page.
  const assessmentDetails = [
    { label: "Name", value: "HITEN KAURA" },
    { label: "Rg. No", value: "24BCI0060" },
    { label: "Assessment", value: "Assessment 6 - Mini Project" },
    { label: "Programme Name", value: "B.Tech." },
    { label: "Faculty Name", value: "Dr. V. SIVAKUMAR" },
    { label: "Semester", value: "Winter Semester 2025-26" },
    { label: "Course Code", value: "BCSE203E" },
    { label: "Course Title", value: "Web Programming" },
    { label: "ClassNbr", value: "VL2025260504802" },
    { label: "Slot", value: "L1+L2+ L29+L30" },
    { label: "Date", value: "06-04-2026" },
  ];

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    const revealEls = root.querySelectorAll(".reveal");

    // Fall back gracefully on browsers without IntersectionObserver support.
    if (!("IntersectionObserver" in window)) {
      revealEls.forEach((el) => el.classList.add("visible"));
      return undefined;
    }

    // Reveals each section once it scrolls into view.
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            window.setTimeout(() => entry.target.classList.add("visible"), 80);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );

    revealEls.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={rootRef} className="intro-page">
      {/* Decorative background layers for the landing page atmosphere. */}
      <div className="ambient ambient-1" />
      <div className="ambient ambient-2" />
      <div className="ambient ambient-3" />

      <div className="wrap">
        {/* Hero section with the app identity and launch CTA. */}
        <section className="hero">
          <span className="badge">
            <span className="badge-dot" />
            B.Tech Mini Project - Web Technologies
          </span>

          <h1 className="hero-title">
            <span className="line">BID</span>
            <span className="line">
              <span>FOR BID</span>
            </span>
            <span className="line">Platform</span>
          </h1>

          <p className="hero-sub">
            A real-time bidding marketplace- enabling buyers and sellers to
            interact through open auctions, sealed bids, and AI-assisted price analysis with instant notifications and zero signup friction.
          </p>

          <div className="assessment-box reveal">
            <div className="assessment-heading">
              <p className="section-tag">Assessment details</p>
              <h2>Mini Project Submission</h2>
            </div>
            <div className="assessment-grid">
              {assessmentDetails.map((item) => (
                <div key={item.label} className="assessment-item">
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>
          </div>

          <div className="hero-cta">
            <button type="button" className="btn-primary" onClick={() => navigate(launchPath)}>
              {launchLabel} &nbsp;→
            </button>
            <a href="#problem" className="btn-ghost">
              View Documentation
            </a>
          </div>

          <div className="hero-scroll">
            <div className="scroll-line" />
            Scroll to explore
          </div>
        </section>
      </div>

      <div className="divider" />

      <div className="wrap">
        {/* Project problem framing and motivation cards. */}
        <section id="problem">
          <p className="section-tag reveal">01 - Problem Statement</p>
          <h2 className="section-title reveal">Why does BID FOR BID exist?</h2>
          <p className="section-lead reveal">
            Traditional classifieds and local selling platforms lack real-time bidding mechanics,
            private offer handling, instant conflict resolution, and zero-friction onboarding - creating a broken
            experience for both buyers and sellers.
          </p>

          <div className="ps-grid">
            {problemCards.map((card) => (
              <article key={card.title} className="ps-card reveal">
                <div className="ps-card-icon">{card.icon}</div>
                <h3>{card.title}</h3>
                <p>{card.body}</p>
              </article>
            ))}
          </div>
        </section>
      </div>

      <div className="divider" />

      <div className="wrap">
        {/* Longer explanation of the business and technical challenge. */}
        <section id="description">
          <p className="section-tag reveal">02 - Problem Description</p>
          <h2 className="section-title reveal">A deeper look at the challenge</h2>

          <div className="pd-layout">
            <div className="pd-text reveal">
              <p>
                Existing peer-to-peer selling platforms either fix a price, rely on manual
                negotiation over chat, or expose too little structure for serious bidding.
                This platform supports both transparent open bidding and seller-private sealed bidding.
              </p>
              <p>
                The technical challenge is building this bidding logic correctly. When two users
                submit bids simultaneously, only one can succeed. The solution is Firestore
                transactions, which verify the live state before updating the listing. On top of
                that, the system must keep sealed offers private and route price analysis through
                a backend API instead of exposing AI keys in the browser.
              </p>
              <div className="pd-highlight">
                A marketplace platform that combines React, Firebase Anonymous Authentication,
                Firestore real-time listeners, Firestore Security Rules, and a backend Gemini
                analysis service to keep data secure and workflows practical.
              </div>
            </div>

            <div className="pd-stats reveal">
              {stats.map((stat) => (
                <div key={stat.label} className="stat-box">
                  <span className="stat-num">{stat.num}</span>
                  <span className="stat-label">{stat.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      <div className="divider" />

      <div className="wrap">
        {/* Breakdown of the app into feature modules. */}
        <section id="modules">
          <p className="section-tag reveal">03 - Module Details</p>
          <h2 className="section-title reveal">Seven core modules</h2>
          <p className="section-lead reveal">
            Each module is a focused concern - from anonymous identity to bid execution to AI-backed
            analysis - connected through React, Firebase, and a lightweight backend service.
          </p>

          <div className="modules-grid">
            {modules.map((module) => (
              <article key={module.title} className={`module-card m-${module.variant} reveal`} data-num={module.num}>
                <div className="mod-icon">{module.icon}</div>
                <h3>{module.title}</h3>
                <p>{module.body}</p>
                <ul className="feat-list">
                  {module.feats.map((feat) => (
                    <li key={feat}>{feat}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>
      </div>

      <div className="divider" />

      <div className="wrap">
        {/* Visual workflow from landing page to bidding and notifications. */}
        <section id="workflow">
          <p className="section-tag reveal">04 - Design Layout</p>
          <h2 className="section-title reveal">Workflow Diagram</h2>
          <p className="section-lead reveal">
            A pictorial representation of how data flows through the system, from login and listing
            creation to open bidding, sealed offer selection, analysis calls, and notification delivery.
          </p>

          <div className="flow-wrap reveal">
            <div className="flow-row">
              {[
                ["🌐", "User Visits App", "Intro page"],
                ["🔐", "Login Screen", "Name + Phone"],
                ["👤", "Firebase Anon Auth", "signInAnonymously()"],
                ["💾", "Save Session", "localStorage + Firestore"],
                ["📊", "Dashboard", "4 Tabs"],
              ].map(([icon, label, sub], index, arr) => (
                <span key={label} className="flow-node">
                  <span className="node-box nb-amber">
                    <span className="node-icon">{icon}</span>
                    <span className="node-label">{label}</span>
                    <span className="node-sub">{sub}</span>
                  </span>
                  {index < arr.length - 1 ? (
                    <span className="flow-arrow">
                      <span className="arrow-line" />
                    </span>
                  ) : null}
                </span>
              ))}
            </div>

            <div className="flow-vconn">
              <div className="vline" />
            </div>

            <div className="flow-row flow-row-three">
              {[
                ["🛍️", "BUY Tab", "Browse open and sealed listings", "green"],
                ["🏷️", "SELL Tab", "Post item + choose bid type", "purple"],
                ["🧠", "ANALYSIS Tab", "Save listings + request AI guidance", "blue"],
                ["📈", "HISTORY Tab", "Listings, bids, sealed offers", "amber"],
              ].map(([icon, label, sub, tone]) => (
                <div key={label} className="flow-node">
                  <div className={`node-box nb-${tone}`}>
                    <div className="node-icon">{icon}</div>
                    <div className="node-label">{label}</div>
                    <div className="node-sub">{sub}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flow-vconn">
              <div className="vline" />
            </div>

            <div className="flow-row">
              {
[
  ["🔍", "Open Listing", 'Buy tab or Analysis tab'],
  ["💰", "Choose Bid Flow", "One-time, max-limit, or sealed offer"],
  ["🔄", "Validate Action", "Transaction or private sealed submit"],
  ["⚖️", "System Decision", "Accept, reject, or save for seller review"]
]
              .map(([icon, label, sub], index, arr) => (
                <span key={label} className="flow-node">
                  <span className="node-box nb-amber">
                    <span className="node-icon">{icon}</span>
                    <span className="node-label">{label}</span>
                    <span className="node-sub">{sub}</span>
                  </span>
                  {index < arr.length - 1 ? (
                    <span className="flow-arrow">
                      <span className="arrow-line" />
                    </span>
                  ) : null}
                </span>
              ))}
            </div>

            <div className="flow-vconn">
              <div className="vline" />
            </div>

              <div className="result-row">
              <div className="result-box res-accept">
                Open Bid Accepted
                <br />
                <span>
                  Listing updated, bid logged, auto-bid and notification flow triggered
                </span>
              </div>
              <div className="result-box res-reject">
                Sealed / Analysis Flow
                <br />
                <span>Private offer stored or analysis card sent to backend recommendation flow</span>
              </div>
            </div>

            <div className="flow-vconn">
              <div className="vline" />
            </div>

            <div className="flow-row">
              {[
  ["🔔", "Notifications", "Outbid, sealed-offer, and sale alerts", "green"],
  ["🧠", "Analysis API", "Gemini web-grounded suggestion", "blue"],
  ["🛡️", "Seller Decision", "Choose sealed winner or close listing", "purple"],
  ["📢", "Final Outcome", "Winning buyer and final status confirmed", "green"]
].map(([icon, label, sub, tone], index, arr) => (
                <span key={label} className="flow-node">
                  <span className={`node-box nb-${tone}`}>
                    <span className="node-icon">{icon}</span>
                    <span className="node-label">{label}</span>
                    <span className="node-sub">{sub}</span>
                  </span>
                  {index < arr.length - 1 ? (
                    <span className="flow-arrow">
                      <span className="arrow-line" />
                    </span>
                  ) : null}
                </span>
              ))}
            </div>
          </div>
        </section>
      </div>

      <div className="divider" />

      <div className="wrap">
        {/* Optional portfolio area for the project owner. */}
        <section className="portfolio-cta reveal">
          <p className="section-tag">Portfolio</p>
          <h3>PortFolio</h3>
          <a
            className="btn-primary portfolio-button"
            href={https://portfolio-gamma-gold-80.vercel.app/}
            target="_blank"
            rel="noreferrer"
          >
            Open Portfolio &nbsp;→
          </a>
        </section>
      </div>

      <div className="divider" />

      <div className="wrap">
        {/* Final CTA shown at the bottom of the intro page. */}
        <div className="footer-cta reveal">
          <h2>
            Ready to explore
            <br />
            <span>BID FOR BID?</span>
          </h2>
          <p>
            Click below to launch the live app and experience real-time bidding.
          </p>
          <button type="button" className="btn-primary" onClick={() => navigate(launchPath)}>
            {launchLabel} &nbsp;→
          </button>
          <p className="footer-note">
            Built with React 19 - Firebase 12 - Vite 7 - Node backend - Gemini API - Firestore Security Rules
            <br />
          </p>
        </div>
      </div>
    </div>
  );
}

IntroPage.propTypes = {
  session: PropTypes.shape({
    name: PropTypes.string,
    nameKey: PropTypes.string,
    phone: PropTypes.string,
  }),
};

IntroPage.defaultProps = {
  session: null,
};

export default IntroPage;
