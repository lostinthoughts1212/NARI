# Navsys Project Setup Guide

This guide will walk you through setting up the Navsys project from scratch on your local machine.

## Prerequisites

Before you begin, ensure you have the following installed on your system:
- **Docker** and **Docker Compose**: Required for running the backend and Valhalla routing engine.
- **Node.js** (v18+ recommended): Required for the frontend apps.
- **npm**: For managing frontend dependencies.
- **Git**: For version control (optional but recommended).

## Project Structure

```
navsys/
├── backend/                   # FastAPI Python backend (routing + danger zones)
├── nari-app/                  # React Native (Expo) mobile + web frontend
├── nari (1)/                  # React + Vite web dashboard frontend  ← main web UI
├── custom_files/              # Valhalla routing tiles and config
├── docker-compose.yml         # Orchestrates backend + Valhalla
└── bhubaneswar_women_safe_route_synthetic_dataset.csv
```

---

## Step 1 — Start the Backend Services (Docker)

The backend (FastAPI) and routing engine (Valhalla) are fully dockerized.

1. Open a terminal and navigate to the project root directory:
   ```bash
   cd navsys
   ```

2. Start the services:
   ```bash
   docker-compose up --build
   ```
   *(Append `-d` to run in the background)*

   This will:
   - Pull the Valhalla routing engine image (uses the pre-built tiles in `custom_files/`).
   - Build the FastAPI Python backend image.
   - Mount the Bhubaneswar dataset.
   - Start both containers.  
   > **Note**: The backend waits for Valhalla to pass its health check before starting.

3. Verify the services are running:
   - **Backend API**: [http://localhost:8000/health](http://localhost:8000/health)
   - **Valhalla Engine**: [http://localhost:8002/status](http://localhost:8002/status)

---

## Step 2A — Run the Web Dashboard (`nari (1)`)

The primary web interface — a full NARI safety dashboard with navigation, SOS, wearable hub, feedback, and profile tabs.

1. Navigate to the web app directory:
   ```bash
   cd "navsys/nari (1)"
   ```

2. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```
   The default `VITE_NAV_API_URL=http://localhost:8000` is correct for local development.

3. Install dependencies:
   ```bash
   npm install
   ```

4. Start the dev server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.  
   - **Login credentials**: Username `nari_guardian_1`, Password `secure2026` (or any username/password)
   - Navigate to the **Route Navigation** tab to use the live map.

---

## Step 2B — Run the Mobile App (`nari-app`) — Optional

The React Native / Expo mobile app (Android, iOS, or web).

1. Navigate to the mobile app directory:
   ```bash
   cd navsys/nari-app
   ```

2. Install the dependencies:
   ```bash
   npm install
   ```

3. Start the Expo development server:
   ```bash
   npm start
   ```

4. Run the App:
   - **Physical Device**: Scan the QR code with the **Expo Go** app.
   - **Simulator/Emulator**: Press `i` (iOS) or `a` (Android).
   - **Web**: Press `w`.

---

## Troubleshooting

- **Ports already in use**: If ports `8000` or `8002` are occupied, stop those services or change the port mappings in `docker-compose.yml`.
- **App cannot connect to the backend on a physical device**: Update `nari-app/src/constants/Config.ts` to point to your machine's LAN IP (e.g., `http://192.168.x.x:8000`).
- **Missing Dataset**: Ensure `bhubaneswar_women_safe_route_synthetic_dataset.csv` stays in the `navsys/` root directory — the backend Docker container mounts it from there.
- **Backend shows "Offline" in the map UI**: Make sure both Docker containers are running (`docker-compose ps`). The web dashboard auto-retries on load.
- **Valhalla not ready yet**: The backend health check waits up to ~2 minutes for Valhalla tiles to be served. If `docker-compose up` fails, run it again — tiles only need to be processed once.
