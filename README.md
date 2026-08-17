<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# 🚗 CampusSathi — Campus Ride Sharing App

A full-stack campus ride-sharing application built with React, Express, Firebase, and Gemini AI.

## 🚀 One-Click Deploy

### Railway (Recommended — Free Tier)
[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/template/from-repo?repoUrl=https://github.com/vedantyerne1-art/campus-ride)

### Render
[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/vedantyerne1-art/campus-ride)

### Koyeb
[![Deploy to Koyeb](https://www.koyeb.com/static/images/deploy/button.svg)](https://app.koyeb.com/deploy?type=git&repository=github.com/vedantyerne1-art/campus-ride&branch=main&builder=buildpack&run_command=npm+run+start&build_command=npm+install+%26%26+npm+run+build&env[NODE_ENV]=production&env[PORT]=8000)

---

## 🛠 Run Locally

**Prerequisites:** Node.js

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy `.env.example` to `.env.local` and set your `GEMINI_API_KEY`:
   ```bash
   cp .env.example .env.local
   ```
3. Run the app:
   ```bash
   npm run dev
   ```
4. Open http://localhost:3000

## ⚙️ Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GEMINI_API_KEY` | ✅ Yes | Google Gemini AI API key |
| `RAZORPAY_KEY_ID` | ❌ Optional | Razorpay key (test mode works without) |
| `RAZORPAY_KEY_SECRET` | ❌ Optional | Razorpay secret |
| `VITE_RAZORPAY_KEY_ID` | ❌ Optional | Razorpay client-side key |
| `VITE_MAPBOX_ACCESS_TOKEN` | ❌ Optional | Mapbox token (OpenStreetMap used by default) |

## 🏗 Tech Stack

- **Frontend:** React 19, TailwindCSS 4, Leaflet Maps, Motion (Framer), Lucide Icons
- **Backend:** Express.js, Node.js
- **Database:** Firebase Firestore
- **Auth:** Firebase Auth (Google Sign-In)
- **AI:** Google Gemini API
- **Payments:** Razorpay (with test mode fallback)
- **Maps/Routing:** OpenStreetMap + OSRM (free, no API key needed)
- **Geocoding:** Nominatim (OpenStreetMap)

## 📦 Build for Production

```bash
npm run build
npm run start
```

## 📄 License

MIT
