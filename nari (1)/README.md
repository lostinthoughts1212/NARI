# src/

Frontend source code for the NARI app.

- `components/` — Reusable UI components (map, SOS button, hazard cards, etc.)
- `pages/` — App screens (Route Navigation, SOS Dispatch, Wearable Hub, Profile, etc.)
- `hooks/` — Custom React hooks
- `services/` — API calls and backend integration
- `utils/` — Helper functions
- `assets/` — Images, icons, and static files
- `App.jsx` — Root component
- `main.jsx` — App entry point

Run locally: `npm install && npm run dev`


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`
