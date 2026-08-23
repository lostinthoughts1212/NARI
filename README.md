# Navsys Project (NARI)

Welcome to the NARI project! This monorepo contains the React frontend, FastAPI backend, and Valhalla routing engine for secure, safe-route navigation.

## ⚠️ Important: Downloading the Map Data
To keep this Git repository lightweight, the massive map data files have been excluded. 

If you just cloned this repo, you **must** download the map data before the Valhalla routing engine will start:

1. Go to the [Releases](https://github.com/lostinthoughts1212/NARI/releases) tab on GitHub.
2. Download `valhalla_tiles.tar` and `eastern-zone.osm.pbf` from the latest release assets.
3. Place both files inside the `custom_files/` directory in this repo.
4. Run `docker-compose up -d` to start the backend!

## Running the Frontend
Navigate into the `nari (1)` directory:
```bash
cd "nari (1)"
npm install
npm run dev
```
