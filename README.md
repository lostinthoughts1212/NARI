# NARI: NextGen AI-Powered Route Investigation

<p align="center">
  <b>An IoT wearable and AI-powered mobile safety platform for women to detect distress automatically, alert instantly, and guide users along demonstrably safer routes.</b>
</p>

---

## 🚨 About the Project

**NARI** (meaning *woman* in Hindi and Sanskrit, and an acronym for **NextGen AI-powered ROUTE Investigation**) is an integrated, end-to-end safety ecosystem. It bridges the critical safety gap in modern navigation and emergency response by combining **IoT physiological sensing** with **AI-driven dynamic routing**. 

Traditional mapping applications optimize strictly for speed or distance, completely ignoring crime density, lighting conditions, and real-time safety risks. Furthermore, existing safety apps require manual panic button triggers—which are impossible to execute when a user is frozen, shocked, or incapacitated. NARI solves this by automating distress detection and proactively steering users away from danger.

---

## ✨ Core Pillars & Architecture

NARI operates across three distinct chronological layers of a journey: **Before, During, and After**.

```
[IoT Wearable / Sensors] ---> (Automatic Distress Detection) ---> [Instant SOS & Live GPS]
|
[AI Navigation Engine]  ---> (Crime, Lighting & Crowd Scoring)   ---> [Safer Route Selection]
```

### 1. Proactive Safety Navigation
* **AI-Powered Routing Engine:** Unlike standard navigation tools, NARI’s routing algorithm evaluates crime logs, street lighting quality, crowd density, and police proximity using a localized Valhalla engine.
* **Unsafe Area Entry Warnings:** Real-time notifications alert users before entering high-risk zones or historical crime hotspots.
* **Living Safety Heatmaps:** Aggregates community-sourced hazard reports and municipal data to keep safety maps up-to-date.

### 2. Automated & Frictionless Distress Detection
* **IoT Wearable Integration:** Monitors physiological markers including heart rate spikes, sudden deceleration, violent shaking, and fall detection.
* **Multi-Modal Triggers:** Combines automatic physiological detection with alternative triggers like custom voice-phrase detection and quick physical gestures.
* **Zero-Effort Activation:** Removes the need to unlock a phone or press a manual button during moments of high panic.

### 3. Immediate Emergency Response
* **Instant Multi-Channel Alerting:** Automatically transmits live GPS tracking links and emergency messages to trusted contacts and the nearest police station simultaneously.
* **Cellular SMS & Public Web Fallback:** Emergency contacts do not need the app installed; they can track live movement and route status in any browser.

---

## 🚀 Implemented Features (Current Release)

### 🗺️ Dynamic Safe Routing & Danger Zone Avoidance
- **Valhalla Integration**: Computes optimized pedestrian routes using OpenStreetMap data for Bhubaneswar.
- **Crime Hotspot Polygons**: Analyzes crime, lighting, and isolation metrics from synthetic datasets, creating avoidance polygons around high-risk sectors.
- **Alternative Routes**: Displays secondary candidate routes with safety ratings.

### 🧭 Active Turn-by-Turn Navigation HUD
- **Google Maps-Style 3D Camera Zoom**: Tapping "Start Safe Journey" smoothly flies the camera from a high-altitude city view down to street level (`zoom: 18`, `pitch: 45°` 3D perspective tilt).
- **Heading Auto-Rotation**: Camera dynamically rotates with the user's compass walking direction.
- **Maneuver Banners**: Displays step-by-step turn guidance (turn left, right, proceed straight), street names, and real-time distance countdowns (e.g. *"In 45 m, turn left on Janpath"*).
- **Live Metrics**: Shows live walking speed in km/h, remaining distance, and ETA.

### 🛡️ Real-Time Safety Watchdog & Route Deviation Alarms
- **Off-Route Detection**: Continuously computes perpendicular distance from the user's GPS coordinates to the safe route polyline.
- **Amber Deviation Alert**: If a user strays > 65 meters away from the safe corridor, the app triggers an on-screen alert banner and updates the cloud safety status to `off_route`.

### 📡 Cloud-Synced Live Tracking via Firebase
- **Zero Local Server Bandwidth**: Live coordinates stream directly from the phone to Google Firebase Realtime Database every 2–3 seconds.
- **Native Share Sheet**: One-tap sharing to WhatsApp, SMS, or Telegram with a secure tracking URL.

### 👁️ Public Emergency Contact Live Tracker
- **No App or Login Needed**: Guardians and contacts open `http://<host>/?track=<journeyId>` in any browser.
- **Live Moving User Marker**: Radar-pulsing avatar with a directional arrow matching the user's heading.
- **Safety Overlays**: Shows the planned safe route polyline, historical breadcrumbs, and high-risk danger polygons.
- **Real-Time Status Indicator**:
  - 🟢 **Safe & On Route**
  - 🟡 **Off-Route Warning (~X m deviated)**
  - 🔴 **EMERGENCY SOS ACTIVE**
- **Emergency Action Triggers**: Direct one-tap buttons to call the user or dial Police (112).

### 🚨 1-Tap Emergency Panic Button
- Instant distress trigger updates Firebase status to `sos` in milliseconds, triggering audible sirens and flashing red alert banners for all emergency watchers.

---

## 📊 Why NARI Matters Now

* **60%+** of women feel unsafe walking alone at night.
* **80%** of harassment incidents go unreported due to friction in traditional reporting processes.
* **71%** feel available public transit and walking routes are unsafe after dark.

By uniting IoT smart hardware, mature artificial intelligence, and smart-city data integration, NARI provides an autonomous, real-time safety umbrella that protects users before, during, and after distress occurs.
