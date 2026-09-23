# Navsys Project Setup & Execution Guide

This guide walks you through setting up and running the NARI safety ecosystem on your machine.

---

## Prerequisites

Ensure you have the following installed on your system:
- **Docker Desktop**: Required for running the FastAPI backend and Valhalla routing engine. Make sure Docker Desktop is launched and running.
- **Node.js** (v18+ recommended): Required for frontend apps.
- **npm**: For managing frontend dependencies.
- **cloudflared** (Optional but recommended for mobile access): For creating public HTTPS tunnels without port-forwarding.
- **Git**: For source control and deployment to Netlify/GitHub.

---

## Project Structure

```
navsys/
├── backend/                   # FastAPI Python backend (Valhalla routing + danger polygons)
├── nari-app/                  # React Native (Expo) mobile + web app with live turn-by-turn HUD
├── nari (1)/                  # React + Vite web safety console & public emergency tracker
├── custom_files/              # Valhalla routing tiles and config for Bhubaneswar
├── docker-compose.yml         # Orchestrates backend + Valhalla containers
└── bhubaneswar_women_safe_route_synthetic_dataset.csv
```

---

## Quick Startup Commands (Step-by-Step)

Open separate terminals for each component:

### Step 1 — Start Backend & Valhalla (Docker)
1. Open **Docker Desktop** on Windows.
2. In terminal 1, run:
   ```powershell
   cd c:\Users\satvi\Downloads\navsys_project
   docker-compose up -d --build
   ```
3. Verify the services are active:
   - **Backend API**: [http://localhost:8000/health](http://localhost:8000/health) (returns `{"status":"ok","polygons_loaded":...}`)
   - **Valhalla Engine**: [http://localhost:8002/status](http://localhost:8002/status)

---

### Step 2 — Start Cloudflare Tunnel (For Mobile & Remote Testing)
To allow physical mobile phones running on 4G/5G to access your local Valhalla backend:
```powershell
cloudflared tunnel --url http://localhost:8000
```
- Copy the generated `https://<random-id>.trycloudflare.com` URL.
- Paste this URL as `API_BASE_URL` in [nari-app/src/constants/Config.ts](file:///c:/Users/satvi/Downloads/navsys_project/nari-app/src/constants/Config.ts).

---

### Step 3 — Start Web Safety Dashboard & Emergency Tracker (`nari (1)`)
The primary web interface and public tracking receiver:
```powershell
cd "c:\Users\satvi\Downloads\navsys_project\nari (1)"
npm install
npm run dev
```
- **Local URL**: [http://localhost:5173](http://localhost:5173) (or `http://localhost:5173/?demo=true` for 1-tap demo access)
- **Public Emergency Tracking Route**: [http://localhost:5173/?track=<journeyId>](http://localhost:5173/?track=test) (no login required for emergency contacts!)

---

### Step 4 — Start Mobile Navigation App (`nari-app`)
The React Native / Expo application with active turn-by-turn guidance and live GPS sync:
```powershell
cd c:\Users\satvi\Downloads\navsys_project\nari-app
npm install
npm start
```
- **Physical Device**: Scan the QR code with the **Expo Go** app on Android/iOS.
- **Web Browser**: Run `npm run web` to test in your browser directly.
- **Android Emulator**: Press `a` in the terminal.

---

## 🚀 Newly Implemented Features & How to Test

### 1. Google Maps-Style 3D Camera Zooming
- In `nari-app`, set start and destination points on the map.
- Tap **Find Safe Route**.
- Tap **Start Safe Journey**:
  - The camera smoothly swoops from city-wide overview into a close **3D street-level perspective** (`zoom: 18`, `pitch: 45°`).
  - As you move, the camera auto-rotates with your compass walking heading.
  - Tapping **End Journey** smoothly flies the camera back out to the full route overview.

### 2. Live Turn-by-Turn Guidance HUD
- A floating turn banner at the top shows:
  - Next maneuver icon (Left, Right, Straight)
  - Distance countdown (e.g. *"In 55 m"*)
  - Street name and action instruction.
- The bottom drawer displays live walking speed (km/h), remaining distance, and ETA.

### 3. Off-Route Safety Watchdog
- If you stray > 65 meters away from the safe illuminated corridor:
  - The app displays an amber warning banner: *"OFF ROUTE (~X m) - Return to illuminated path"*.
  - The cloud status automatically shifts to `off_route`, alerting contacts on their tracking map.

### 4. Real-Time Emergency Route Sharing (Firebase)
- When a journey starts, tap **Share Route** to open the native share sheet and send your live tracking link via WhatsApp/SMS.
- Contacts open `http://localhost:3000/?track=<journeyId>` (or your deployed Netlify URL):
  - No login or app installation required.
  - Contacts see your moving avatar, heading orientation, route polyline, and danger zones in real time.
  - If you tap **SOS** in the app, the contact's browser immediately enters critical alarm mode with direct police dispatch (112) options.

---

## Deploying to Netlify / GitHub

To push the latest live tracking features to your GitHub repo so Netlify updates:
```powershell
git add .
git commit -m "Feat: Live navigation, Google Maps zooming, and Firebase public tracker"
git push origin main
```

> [!TIP]
> After your Netlify site deploys (e.g. `https://your-nari-site.netlify.app`), update `WEB_TRACKER_BASE_URL` in [nari-app/src/constants/Config.ts](file:///c:/Users/satvi/Downloads/navsys_project/nari-app/src/constants/Config.ts) to your Netlify URL so shared WhatsApp links point directly to your live production website.

---

## Troubleshooting

- **Docker Desktop not running**: If `docker-compose up` fails with pipe engine errors, launch the Docker Desktop application first.
- **Ports already in use**: If port 8000 or 8002 is occupied, stop any existing containers (`docker stop $(docker ps -q)`) or adjust `docker-compose.yml`.
- **Valhalla initializing**: The backend health check waits for Valhalla tiles to load (~1-2 minutes on first run). If initial startup times out, simply re-run `docker-compose up -d`.
- **Firebase Permission Denied**: Ensure your Firebase Realtime Database rules allow journey reads and writes:
  ```json
  {
    "rules": {
      "journeys": {
        ".read": true,
        ".write": true
      }
    }
  }
  ```
