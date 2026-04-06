BidForBid
A full-stack online auction platform that supports open and sealed bidding, one-time and max-limit proxy bids, and AI-powered price analysis using Google Gemini.

Features

Open & Sealed auctions — sellers choose between a transparent live auction or a confidential sealed-tender model
One-time & Max-limit bidding — buyers place a fixed bid or set a ceiling and let the platform auto-bid on their behalf
AI Price Analysis — Google Gemini analyses each listing and returns a recommended price range with reasoning and citations


Tech Stack

Frontend — React + Vite
Backend — Node.js / Express (AI proxy server)
Database & Auth — Firebase (Firestore, Authentication, Storage)
AI — Google Gemini (gemini-2.5-flash)


Prerequisites
Make sure you have the following installed before running the project:

Node.js (v18 or higher recommended)
npm
A Firebase project with Firestore, Authentication, and Storage enabled
A Google Gemini API key


Environment Setup
Copy the example environment file and fill in your credentials:
cp .env.example .env
Open .env and add your values:
envVITE_API_BASE_URL=http://localhost:8787
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash
PORT=8787
Also add your Firebase config to the appropriate file in src/ (typically src/firebase.js or similar).

**Installation**
Install all dependencies from the root of the project:
npm install
**Running the Project**
BidForBid requires two terminals running simultaneously — one for the backend AI server and one for the React frontend.
Terminal 1 — Start the backend server
npm run dev:server
Once running, verify the server is healthy by visiting:
http://localhost:8787/health
You should see a response confirming the server is running with gemini-2.5-flash. If this check fails, confirm your GEMINI_API_KEY is set correctly in .env.
Terminal 2 — Start the frontend client
npm run dev:client
The React app will be available at:
http://localhost:5173

Project Structure
BidForBid/
├── server/          # Node.js Express backend (Gemini AI proxy)
├── src/             # React frontend source
├── .env.example     # Environment variable template
├── firebase.json    # Firebase project config
├── firestore.rules  # Firestore security rules
├── index.html       # Vite entry point
└── package.json

Firestore Security Rules
All bid and listing validation is enforced at the database level via firestore.rules. Deploy rules using the Firebase CLI:
bashfirebase deploy --only firestore:rules

Deployment
To deploy the frontend to Firebase Hosting:
npm run build
firebase deploy
