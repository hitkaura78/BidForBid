## Backend

This folder contains the server-side analysis proxy for the marketplace.

### Files

- `server/index.js`
  Starts the local HTTP API and exposes:
  - `GET /api/health`
  - `POST /api/analysis`
- `server/lib/analysis-engine.js`
  Contains the Gemini-ready analysis engine and fallback logic.

### Environment

Copy `.env.example` values into your local environment before running the backend.

- `GEMINI_API_KEY`
  Your Gemini API key. Keep this only on the backend.
- `GEMINI_MODEL`
  Optional Gemini model name. Default: `gemini-2.5-flash`
- `PORT`
  Backend server port. Default: `8787`

### Development

Run the frontend and backend in separate terminals:

```powershell
npm run dev:server
```

```powershell
npm run dev:client
```
