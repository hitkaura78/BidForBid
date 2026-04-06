# Bid For Bid

Bid For Bid is a Vite + React auction marketplace backed by Firebase, with a Gemini-powered price analysis API.

## Features

- Open and sealed auctions
- One-time and max-limit bidding
- Gemini-powered price analysis with reasoning and citations
- Firebase-backed real-time marketplace flow

## Tech stack

- Frontend: React + Vite
- Backend: Node.js API logic for Gemini analysis
- Database and auth: Firebase
- AI: Google Gemini (`gemini-2.5-flash` by default)

## Prerequisites

- Node.js 18 or newer
- npm
- A Firebase project with Firestore and Authentication enabled
- A Google Gemini API key

## Environment setup

Copy `.env.example` to `.env` for local backend development:

```powershell
Copy-Item .env.example .env
```

Local `.env` example:

```env
VITE_API_BASE_URL=http://localhost:8787
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash
PORT=8787
```

You can also provide the Firebase web config through `VITE_FIREBASE_*` variables.

## Local development

Install dependencies:

```powershell
npm install
```

Run the frontend:

```powershell
npm run dev
```

Run the local backend for development:

```powershell
npm run dev:server
```

The Vite dev server proxies `/api/*` requests to `http://localhost:8787`.

## Project structure

```text
BidForBid/
|-- api/              Vercel serverless API routes
|-- server/           Shared backend analysis logic for local dev and Vercel
|-- src/              React frontend source
|-- .env.example      Environment variable template
|-- firestore.rules   Firestore security rules
|-- vercel.json       SPA routing config for Vercel
|-- vite.config.js    Vite config
`-- package.json
```

## Firestore rules

Deploy Firestore rules with:

```powershell
npm run deploy:firebase
```

## Vercel deployment

This repo is set up so the frontend and API can be deployed together on Vercel:

- The frontend builds with Vite into `dist/`
- The API runs through Vercel serverless functions in `api/`
- Client-side routes are handled by `vercel.json`

### Vercel project settings

- Framework preset: `Vite`
- Build command: `npm run build`
- Output directory: `dist`

### Required environment variables

Set these in the Vercel dashboard before deploying:

- `GEMINI_API_KEY`
- `GEMINI_MODEL` (optional, defaults to `gemini-2.5-flash`)
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_MEASUREMENT_ID`

`VITE_API_BASE_URL` can stay empty on Vercel because the frontend calls the same deployment's `/api/*` routes.

## Deployment flow

1. Push this repository to GitHub.
2. Import the repository into Vercel.
3. Add the environment variables listed above.
4. Deploy.

## API routes

The Vercel deployment exposes:

- `GET /api/health`
- `POST /api/analysis`
