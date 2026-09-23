# 🌿 WildLife Monitor — User Manual

> Complete guide for using the WildLife Monitor Conservation Intelligence Platform

---

## Table of Contents

1. [Platform Overview](#1-platform-overview)
2. [Getting Started — Landing Page](#2-getting-started--landing-page)
3. [Public Demo Portal](#3-public-demo-portal)
4. [Investigator Portal — Dashboard](#4-investigator-portal--dashboard)
5. [Change Analysis Studio](#5-change-analysis-studio)
6. [Satellite Comparison Slider](#6-satellite-comparison-slider)
7. [Hotspot Inspector](#7-hotspot-inspector)
8. [Timeline Viewer](#8-timeline-viewer)
9. [Explore & Areas](#9-explore--areas)
10. [Reports & Alerts](#10-reports--alerts)
11. [Admin Panel](#11-admin-panel)
12. [Understanding the 5 PS Symbols](#12-understanding-the-5-ps-symbols)
13. [FAQs](#13-faqs)

---

## 1. Platform Overview

**WildLife Monitor** is a real-time satellite-based conservation intelligence platform that helps wildlife researchers, forest officials, and conservation organizations monitor:

- 🔥 **Deforestation** — illegal forest clearing and fire events
- 🌿 **Vegetation Degradation** — slow canopy loss and stress
- 💧 **Water Body Changes** — shrinking reservoirs, rivers, wetlands
- 🏢 **Urban Encroachment** — settlements expanding into protected zones
- ⌖ **Protected Area Boundary** — AOI monitoring and boundary integrity

### Data Sources

| Source | Data Type |
|--------|-----------|
| Copernicus Sentinel-2 (ESA) | Optical satellite imagery (10m resolution) |
| NASA FIRMS VIIRS S-NPP | Real-time active fire detections (375m) |
| Google Earth Engine (GEE) | On-demand NDVI, NDWI, NDBI computation |
| Dynamic World (Google) | Land cover classification (CC BY 4.0) |
| OpenStreetMap / Nominatim | Protected area boundaries (ODbL) |

---

## 2. Getting Started — Landing Page

**URL:** `http://localhost:3000/`

### Navigation Bar

| Link | Description |
|------|-------------|
| **Home** | Returns to landing page |
| **About Us** | Mission, team, and conservation goals |
| **Features** | Platform capabilities |
| **Blogs** | Conservation articles and updates |
| **Contact** | Get in touch |
| **Login** | Investigator / Admin portal access |
| **Get Started** | Jump directly to public demo |

### Key Sections on Landing Page

1. **Hero Banner** — "Protecting Wilderness from Space" with animated satellite visuals
2. **Live Stats Ticker** — Total areas monitored, active fires, threats detected
3. **Feature Cards** — Change Analysis, Hotspot Detection, Species Insights, etc.
4. **How It Works** — 3-step satellite → analysis → action pipeline
5. **Conservation Blog** — Latest field reports

---

## 3. Public Demo Portal

**URL:** `http://localhost:3000/` (scroll down to Demo section)

Anyone — **without logging in** — can explore the curated demo reserves.

### How to Use the Public Demo

**Step 1 — Select a Reserve**

Click on any demo tile:
- 🐅 **Pench Tiger Reserve** (Madhya Pradesh/Maharashtra)
- 🐯 **Tadoba Andhari Tiger Reserve** (Maharashtra)
- 🦚 **Sundarbans National Park** (West Bengal)

**Step 2 — View the Satellite Map**

The interactive Leaflet map will:
- Pan and zoom to the selected reserve
- Show the protected area boundary in green
- Display hotspot markers (colour-coded by threat type)

**Step 3 — Click a Hotspot Marker**

Click any coloured pin on the map to see:
- Threat type (Deforestation / Water loss / Encroachment)
- Severity (Low / Medium / High / Critical)
- Detection date
- Area affected (in hectares)

**Step 4 — Read the Intelligence Summary**

The right panel shows:
- Total area of the reserve
- Forest cover percentage
- Active fire count (live NASA FIRMS data)
- Recent change events list

> **Note:** Public demo uses real boundary data and real telemetry but hides exact GPS coordinates for anti-poaching security.

---

## 4. Investigator Portal — Dashboard

**URL:** `http://localhost:3000/dashboard`
**Access:** Login required

### Login

1. Go to `http://localhost:3000/login`
2. Enter your email and password
3. Click **Sign In**

### Dashboard Overview

#### KPI Cards

Four metric cards at the top show for the selected reserve:
- **Vegetation Loss** (km²) — area with significant NDVI decline
- **Water Bodies Change** (ha) — change in surface water extent
- **Urban Expansion** (ha) — newly built-up detected area
- **Active Fires** — real-time count from NASA FIRMS (last 3 days)

#### Satellite Map (GeoMap)

The main Leaflet map shows:
- High-resolution Esri satellite basemap
- Protected area boundary overlay
- Colour-coded hotspot pins
- Click any pin → see full event details in right panel

#### Left Sidebar Links

| Page | Purpose |
|------|---------|
| Dashboard | Main overview |
| Change Analysis | Detailed change detection studio |
| Compare | Satellite comparison slider |
| Hotspots | All detected threats list |
| Timeline | NDVI and water trends over time |
| Areas | Protected area catalog |
| Explore | Browse all reserves on a map |
| Reports | Download data reports |
| Alerts | Critical notification feed |
| Admin | (Admin only) System management |

---

## 5. Change Analysis Studio

**URL:** `http://localhost:3000/change-analysis`

This is the core science tool — compare two time periods side-by-side.

### How to Run a Change Analysis

**Step 1 — Select a Reserve**

Use the dropdown at the top to select your area of interest (AOI).

**Step 2 — Set Date Windows**

- **Baseline Period** — the "before" period (e.g., June 2020)
- **Comparison Period** — the "after" period (e.g., June 2024)

**Step 3 — Select Layers**

Choose which environmental layers to compute:
- ☑️ Vegetation (NDVI from Sentinel-2)
- ☑️ Water Bodies (NDWI from Dynamic World)
- ☑️ Urban / Built-up (NDBI)
- ☑️ Forest Alerts (Global Forest Watch)

**Step 4 — Click "Run Analysis"**

The system submits a job to Google Earth Engine. Processing takes 30–120 seconds.

**Step 5 — View Results**

Three map panels appear:

| Panel | Shows |
|-------|-------|
| **Baseline** | Satellite imagery from Before period |
| **Comparison** | Satellite imagery from After period |
| **Difference Heatmap** | Change colormap (red = loss, blue = gain) |

**Step 6 — Swipe Mode**

Click **Swipe** tab to drag a vertical handle between Baseline and Comparison maps.

**Step 7 — Interpret KPI Cards**

- **Vegetation Loss** — total area (km²) where NDVI dropped below threshold
- **Vegetation Gain** — recovered or newly forested area
- **Net Change** — net NDVI delta across AOI
- **Mean NDVI Δ** — average NDVI change value

---

## 6. Satellite Comparison Slider

**URL:** `http://localhost:3000/compare`

This is the **visual comparison** tool — drag the slider to compare Before vs After satellite images of any habitat.

### Using the Comparison Slider

**Step 1 — Search for Any Habitat**

Click the **🌍 Habitat Search** box in the top ribbon:
- Type any wildlife reserve name (e.g., "Kaziranga", "Corbett", "Yellowstone")
- Results appear instantly from the 41+ park catalog
- If not found locally, click **"Search worldwide via OpenStreetMap"** to fetch live

**Step 2 — Set Before & After Dates**

Use the **Dates** selector to choose:
- **Before** year (e.g., 2018)
- **After** year (e.g., 2026)

**Step 3 — Drag the Slider Handle**

The central **⟨ ⟩** handle divides the screen into two cards:

**Left Card (OLD)** — shows the habitat as it was in the "Before" year:
- 🟢 Intact Forest Canopy markers
- 💧 Full Surface Water Reservoirs
- ⌖ Protected AOI boundary
- Baseline NDVI, Forest km², Water km²

**Right Card (NEW)** — shows what happened since:
- 🔴 Deforestation hotspot pins
- 🌿 Vegetation Degradation patches
- 💧 Water Dynamics changes
- 🏢 Encroachment markers
- Detected alerts count, NDVI delta, Net Forest Change %

Drag the handle left/right to resize both cards dynamically.

**Step 4 — Switch Detection Type**

Use **View** selector:
| Mode | Shows |
|------|-------|
| Natural Color | True color satellite imagery |
| NDVI False Color | Vegetation health (green = healthy) |
| NDWI Water Bodies | Surface water extent (blue = water) |
| Urban Encroachment | Built-up detection (purple = urban) |
| 🔥 NASA FIRMS Active Fires | Live fire overlay from NASA VIIRS |

**Step 5 — Bottom Analytics Panels**

Three panels below the maps:
1. **Change Analysis** — Forest Cover, Water Bodies, Bare Land delta percentages
2. **Forest Cover Trend** — multi-year area chart
3. **Other Indices** — NDVI, NDWI, NDBI sparklines with delta values

---

## 7. Hotspot Inspector

**URL:** `http://localhost:3000/hotspots`

Full list of all detected change events across all reserves.

### Filters Available

| Filter | Options |
|--------|---------|
| Reserve | All / Pench / Tadoba / Kaziranga / ... |
| Severity | Low / Medium / High / Critical |
| Change Type | Deforestation / Water / Urban / Vegetation |
| Sort | By Area / Priority / Date |

### Reading a Hotspot Card

- **ID** — unique event identifier
- **Coordinates** — lat/lon (blurred for critical habitats)
- **Area** — affected area in hectares
- **NDVI Change** — from baseline to observed (negative = loss)
- **Severity** — algorithmic priority score
- **Status** — Unverified / Verified / Dismissed

### Verify a Hotspot

Click **Verify** on any event card to:
1. Set status (Confirmed / False Positive / Needs Field Visit)
2. Add investigator notes
3. Save to audit trail

---

## 8. Timeline Viewer

**URL:** `http://localhost:3000/timeline`

Monthly vegetation and water trend for any reserve.

- X-axis: dates (monthly captures)
- Y-axis: NDVI (0–1) and Water Cover (ha)
- Hover on any point to see exact values
- Monsoon months (Jun–Sep) are marked — data may be cloud-affected

---

## 9. Explore & Areas

**URL:** `http://localhost:3000/explore` and `http://localhost:3000/areas`

### Explore

Interactive globe map showing all 41+ monitored protected areas.
- Click any area → pan to that reserve
- See basic stats and latest analysis date

### Areas Catalog

Full table listing all reserves:
- Name, State, Country
- Area (km²)
- Last Analyzed date
- Health Index score
- Click **View** → goes to detailed area page

### Area Detail Page

**URL:** `http://localhost:3000/areas/[slug]`

Shows:
- Full reserve boundary on satellite map
- NDVI timeline chart
- Land cover distribution
- Active fire count (live)
- Latest analysis history
- Run New Analysis button

---

## 10. Reports & Alerts

### Reports (`/reports`)

Download your analysis results:
1. Select an analysis from the list
2. Choose format: **CSV** or **GeoJSON**
3. Click **Create Report** → system generates and uploads to secure storage
4. Click **Download** to get a presigned URL (valid 1 hour)

### Alerts (`/alerts`)

Real-time notifications for new threats:

| Colour | Meaning |
|--------|---------|
| 🔴 Red | Critical — immediate field response recommended |
| 🟠 Amber | High — schedule patrol within 48h |
| 🟡 Yellow | Medium — monitor |
| ⚪ Grey | Low / Informational |

Click any alert to:
- See the linked hotspot
- Mark as Read
- Assign to field team

---

## 11. Admin Panel

**URL:** `http://localhost:3000/admin`
**Access:** Admin role required

### Admin Overview

- System health dashboard
- Total workspaces, users, analyses
- GEE quota usage and MinIO storage usage
- Area Chart — analysis submissions over time
- Pie Chart — analysis status distribution

### Members Management (`/admin/members`)

- List all investigators
- Invite new users (send email invite)
- Change roles: Viewer / Investigator / Admin
- Revoke access

### Settings (`/settings`)

Configure scientific parameters:
- `W_m` — Magnitude weight (how much raw NDVI change matters)
- `W_s` — Spatial weight (cluster coherence)
- `W_c` — Confidence weight (cloud cover penalty)

> Note: Weights must sum to 1.00

---

## 12. Understanding the 5 PS Symbols

Every map, card, and report uses these 5 standardized symbols:

| Symbol | Name | What It Means |
|--------|------|--------------|
| ⌖ | **Protected AOI** | The selected Area of Interest boundary |
| 🔥 | **Deforestation** | Confirmed forest clearing or fire-driven loss |
| 🌿 | **Vegetation Degradation** | Canopy stress, thinning, or slow NDVI decline |
| 💧 | **Water Dynamics** | Shrinking lakes, dried rivers, or flooded zones |
| 🏢 | **Urban Encroachment** | New built-up area detected inside or adjacent to protected zone |

### Color Coding on Maps

| Color | Meaning |
|-------|---------|
| 🟢 Green | Stable / Healthy (Intact Canopy) |
| 🔴 Red | Severe Loss / Deforestation |
| 🟡 Yellow | Degradation / Warning |
| 🔵 Blue | Water Change |
| 🟣 Purple | Encroachment |

---

## 13. FAQs

**Q: Is the satellite data real or simulated?**
> Real. All imagery comes from Copernicus Sentinel-2 (European Space Agency), processed live on Google Earth Engine. Fire data comes from NASA FIRMS VIIRS satellite.

**Q: Why do some reserves show "analysis not computed yet"?**
> Analyses are computed on-demand. Click "Run Analysis" to trigger a fresh GEE job for any reserve.

**Q: Can I search for any wildlife reserve in the world?**
> Yes! Use the Habitat Search in the Comparison Slider — type any national park or reserve name globally. The system fetches real boundaries from OpenStreetMap in real-time and caches them for instant future access.

**Q: How accurate is the fire detection?**
> NASA FIRMS VIIRS has ~375m resolution. Fires < 1 hectare may not be detected. Detection latency is < 3 hours from satellite overpass.

**Q: What do the NDVI values mean?**
> NDVI ranges from -1 to +1. Values > 0.5 = dense healthy forest. Values 0.2–0.5 = sparse/degraded. Values < 0.2 = bare ground or water.

**Q: How many reserves are in the system?**
> Currently 41 protected areas, covering all major Indian national parks and tiger reserves across all states. The search feature adds any global habitat on demand via OpenStreetMap.

---

*WildLife Monitor — Powered by Copernicus Sentinel-2, Google Earth Engine, NASA FIRMS, and OpenStreetMap*

*© 2026 Conservation Intelligence Platform*
