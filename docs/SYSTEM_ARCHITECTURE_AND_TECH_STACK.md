# 🏗️ WildLife Monitor — System Architecture & Technical Stack

> Comprehensive, in-depth architectural and technology stack documentation detailing every technology, framework, database, satellite provider, pipeline, and module used in the platform, including where and how each is implemented.

---

## 📋 Table of Contents

1. [Architectural Overview & High-Level Topology](#1-architectural-overview--high-level-topology)
2. [Frontend Architecture & Technologies](#2-frontend-architecture--technologies)
3. [Backend Architecture & Technologies](#3-backend-architecture--technologies)
4. [Database & Spatial Persistence (PostGIS)](#4-database--spatial-persistence-postgis)
5. [Storage & Artifact System (MinIO S3)](#5-storage--artifact-system-minio-s3)
6. [Satellite & Remote Sensing Data Providers](#6-satellite--remote-sensing-data-providers)
7. [Geospatial Indexing & Analysis Engines](#7-geospatial-indexing--analysis-engines)
8. [NASA FIRMS Fire Detection Engine](#8-nasa-firms-fire-detection-engine)
9. [OpenStreetMap & Boundary Geocoding Pipeline](#9-openstreetmap--boundary-geocoding-pipeline)
10. [Authentication, Security & Anti-Poaching Controls](#10-authentication-security--anti-poaching-controls)
11. [Docker Multi-Container Orchestration](#11-docker-multi-container-orchestration)
12. [Complete Technology Matrix](#12-complete-technology-matrix)

---

## 1. Architectural Overview & High-Level Topology

WildLife Monitor is constructed as a modern, decoupled, cloud-native **hybrid GIS platform**. It bridges heavy cloud remote-sensing computation (Google Earth Engine and NASA satellites) with ultra-responsive, interactive client-side web mapping and analytical visualizations.

### System Diagram

```
+-----------------------------------------------------------------------------------+
|                                  CLIENT TIER                                      |
|                                                                                   |
|   Next.js 16 (Turbopack) | React 19 | Tailwind CSS | TypeScript                   |
|   +-------------------+  +-------------------+  +-----------------------------+   |
|   |   Public Portal   |  | Investigator Hub  |  |      Admin / Warden HQ      |   |
|   |  (/, /demo, etc.) |  |  (/dashboard,     |  |   (/admin, /admin/members,  |   |
|   |                   |  |   /change-analysis|  |    /settings)               |   |
|   |                   |  |   /compare)       |  |                             |   |
|   +---------+---------+  +---------+---------+  +--------------+--------------+   |
|             |                      |                           |                  |
|             +----------------------+---------------------------+                  |
|                                    | HTTP / REST (JWT Auth)                       |
+------------------------------------+----------------------------------------------+
                                     |
                                     v
+-----------------------------------------------------------------------------------+
|                                  API GATEWAY TIER                                 |
|                                                                                   |
|   FastAPI (Python 3.11) | Async ASGI (Uvicorn) | Pydantic v2 Validation          |
|   +---------------------------------------------------------------------------+   |
|   | Routers: /auth, /areas, /analyses, /hotspots, /public, /admin, /chat      |   |
|   +---------------------------------------------------------------------------+   |
|   | Middleware: CORS, Security Headers, JWT Verification, Rate Limiting       |   |
|   +---------------------------------------------------------------------------+   |
+-------------------+--------------------+--------------------+---------------------+
                    |                    |                    |
                    v                    v                    v
+------------------------+ +------------------------+ +-----------------------------+
|     DATA & STORAGE     | |    PROCESSING ENGINE   | |     EXTERNAL SATELLITES     |
|                        | |                        | |                             |
| PostgreSQL 15 +        | | Python GEE Pipeline    | | Google Earth Engine API     |
|   PostGIS 3.3          | | Dynamic World Engine   | |   Sentinel-2 L2A Harmonized |
| (Spatial Vectors,      | | Priority Scoring       | | NASA FIRMS VIIRS (375m)     |
|  Polygons, GeoJSON)    | | Alert Extraction       | | OpenStreetMap Nominatim/    |
|                        | | Scientific Caching     | |   Overpass API              |
| MinIO (S3 Compatible)  | | Health Index Engine    | | Esri World Imagery Basemap  |
| (GeoTIFFs, Colormaps,  | +------------------------+ +-----------------------------+
|  Presigned Rasters)    |
|                        |
| Redis (Cache & Tasks)  |
+------------------------+
```

---

## 2. Frontend Architecture & Technologies

### 2.1 Next.js 16 (App Router) & React 19

* **Location in Codebase:** `frontend/src/app/`
* **Version:** Next.js 16.0+, React 19.0
* **Where & How It's Used:**
  * Uses the Next.js **App Router** (`app/layout.tsx`, `app/page.tsx`, nested route folders) for file-system-based routing.
  * Server-side rendering (SSR) is combined with dynamic client components (`'use client'`) for Leaflet mapping and Recharts telemetry.
  * Turbopack (`next dev --turbopack`) powers instant Hot Module Replacement during development.
  * Clean route separation ensures distinct user workflows:
    * `/`: Enhanced Landing Page introducing the platform and conservation mission.
    * `/dashboard`: Mission control with real-time reserve telemetry, KPI cards, and embedded slider.
    * `/compare`: Dedicated standalone Satellite Comparison Slider with dynamic card resizing.
    * `/change-analysis`: Change Analysis Studio (Baseline vs Observed vs Difference heatmap, swipe mode).
    * `/areas/[id]`: In-depth protected reserve dossier and spatial telemetry.
    * `/admin`: Chief Wildlife Warden governance, RBAC management, and scientific parameter tuning.

### 2.2 Leaflet & React-Leaflet GIS Engine

* **Location in Codebase:**
  * `frontend/src/components/map/TemporalCompareSlider.tsx`
  * `frontend/src/components/map/ComparisonLeafletMap.tsx`
  * `frontend/src/components/map/GeoMap.tsx`
  * `frontend/src/components/map/HotspotLeafletMap.tsx`
  * `frontend/src/components/public/PublicMap.tsx`
* **Where & How It's Used:**
  * Because Leaflet references `window` directly, dynamic client-side mounting (`ssr: false`) is implemented to prevent hydration mismatches.
  * **Tile Layers (`L.tileLayer`):**
    * Esri World Imagery (`https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/...`) serves sub-meter satellite basemaps.
    * CartoDB Dark Matter / Positron serves sleek contextual cartography.
    * NASA FIRMS WMS (`https://firms.modaps.eosdis.nasa.gov/wms/...`) renders real-time thermal fire tiles (`fires_viirs_snpp_24`).
  * **Image Overlays (`L.imageOverlay`):**
    * Renders raster difference colormaps (vegetation loss, gain, water) dynamically retrieved from backend MinIO storage.
    * Fitted strictly to reserve geospatial bounds `[[minLat, minLon], [maxLat, maxLon]]`.
  * **GeoJSON Layers (`L.geoJSON`):**
    * Renders official national park boundaries and protected perimeter lines with customized SVG stroke styling and transparent fills.
  * **Custom Badges & Hotspot Markers (`L.divIcon`):**
    * Renders rich HTML/CSS glowing badges for all 5 Problem Statement indicators:
      * `[⌖]` AOI Boundary Target
      * `[🔥]` Deforestation / Fire Alert
      * `[🌿]` Canopy Degradation
      * `[💧]` Water Dynamics
      * `[🏢]` Infrastructure Encroachment

### 2.3 Recharts Visualization Suite

* **Location in Codebase:** `frontend/src/app/change-analysis/page.tsx`, `frontend/src/components/map/TemporalCompareSlider.tsx`, `frontend/src/app/admin/page.tsx`
* **Where & How It's Used:**
  * **AreaChart:** Multi-year canopy cover trends and spectral trajectories across 2018–2026.
  * **BarChart:** Land Cover Distribution according to Google Dynamic World classes (Trees, Shrub, Grass, Crops, Built, Bare, Snow, Water).
  * **Histogram:** Distribution of NDVI pixels (frequency vs -1.0 to +1.0 index bins).
  * **PieChart / Donut:** Threat severity breakdowns and operational resource allocation in the Admin Portal.

### 2.4 Tailwind CSS & Lucide Icons

* **Location in Codebase:** `frontend/src/app/globals.css`, `frontend/tailwind.config.js`
* **Where & How It's Used:**
  * Custom dark-mode color palette: Emerald/Forest green primary accents (`#10b981`), deep slate surfaces (`#0f172a`, `#020617`), and tactical alert hues (Crimson `#ef4444`, Amber `#f59e0b`, Cyan `#06b6d4`).
  * Glassmorphism utilities (`backdrop-blur-md`, `bg-slate-900/80`, `border-slate-800/80`) provide an aerospace/intelligence command-center visual feel.
  * Over 80 Lucide React icons represent sensors, telemetry, spatial overlays, and action buttons.

---

## 3. Backend Architecture & Technologies

### 3.1 FastAPI & Asynchronous ASGI Architecture

* **Location in Codebase:** `backend/app/main.py`, `backend/app/api/v1/`
* **Language & Framework:** Python 3.11, FastAPI 0.110+
* **Where & How It's Used:**
  * Asynchronous endpoints (`async def`) handle concurrent satellite requests, database queries, and external API polling without blocking worker threads.
  * High-performance Pydantic v2 schemas strictly validate incoming request payloads and serialize nested GeoJSON and GIS telemetry.
  * Automatic OpenAPI documentation generated at `/docs` and `/redoc`.

### 3.2 Modular Router Breakdown

| Router File | Prefix | Responsibilities |
|-------------|--------|------------------|
| `backend/app/api/v1/auth.py` | `/api/v1/auth` | JWT issuance, user login, registration, token refresh, `/me` profile lookup. |
| `backend/app/api/v1/areas.py` | `/api/v1/areas` | Protected area catalog, boundaries GeoJSON, `/search-live` global OpenStreetMap integration, NASA active fires endpoint. |
| `backend/app/api/v1/analyses.py` | `/api/v1/analyses` | Triggering GEE analysis jobs, retrieving raster layers, presigned MinIO artifact links, CSV report export. |
| `backend/app/api/v1/hotspots.py` | `/api/v1/hotspots` | Threat events, spatial clustering, field patrol dispatch triggers, status updates. |
| `backend/app/api/v1/public.py` | `/api/v1/public` | Curated unauthenticated demo portal endpoints, generalized coordinates for anti-poaching security. |
| `backend/app/api/v1/admin.py` | `/api/v1/admin` | Role delegation, warden audit logging, system resource telemetry, scientific weight tuning. |

### 3.3 Core Backend Services

* **`backend/app/services/analysis_service.py`:**
  * Coordinates baseline vs observed time windows.
  * Dispatches jobs to Google Earth Engine or local fallback providers.
  * Saves structured summaries, NDVI shifts, and area metrics into the database.
* **`backend/app/services/firms.py`:**
  * Direct integration with NASA FIRMS VIIRS satellite REST API.
  * In-memory 10-minute caching to respect rate limits.
  * Dynamic bounding box calculation from PostGIS reserve geometries.
* **`backend/app/services/priority_service.py`:**
  * Computes composite conservation priority scores:
    $$P = (W_m \times M_{magnitude}) + (W_s \times S_{severity}) + (W_c \times C_{proximity})$$
  * Weights are dynamically configurable by administrators in real-time.
* **`backend/app/services/artifact_service.py`:**
  * Uploads GeoTIFFs, PNG colormaps, and PDF/CSV dossiers to MinIO.
  * Generates AWS SigV4 presigned download URLs with 60-minute expiration.
* **`backend/app/services/auth_service.py`:**
  * Bcrypt password hashing, access token (15-min) and refresh token (7-day) generation.

---

## 4. Database & Spatial Persistence (PostGIS)

### 4.1 PostgreSQL 15 & PostGIS 3.3

* **Location in Codebase:** `backend/app/models/`, `backend/alembic/`
* **Where & How It's Used:**
  * Uses the **PostGIS** spatial extension for storing, querying, and indexing geographic data.
  * Coordinate Reference System: Standard **EPSG:4326 (WGS 84)** lat/lon coordinates.
  * **GeoAlchemy2** bridges SQLAlchemy models with native PostGIS geometric types.

### 4.2 Key Spatial Entities & Schema

1. **`protected_areas`:**
   * Contains official names, states, countries, designated status (Tiger Reserve, National Park), and official boundary geometry (`geometry(MultiPolygon, 4326)`).
   * Spatial indices (`GIST`) accelerate bounding box and intersection queries (`ST_Intersects`).
2. **`analysis_records`:**
   * Stores baseline dates, comparison dates, computed mean NDVI, total loss km², gain km², net canopy change, and processing provenance metadata.
3. **`analysis_layers`:**
   * Stores references to raster outputs (difference heatmaps, classification layers) stored in MinIO.
4. **`change_events` / `hotspots`:**
   * High-priority detected threats.
   * Stores exact centroid geometry (`geometry(Point, 4326)`), event category (`deforestation`, `degradation`, `water_dynamics`, `encroachment`), severity rating (`critical`, `high`, `moderate`), and patrol verification status.

---

## 5. Storage & Artifact System (MinIO S3)

### 5.1 Object Storage Architecture

* **Service:** MinIO (High-performance S3-compatible object storage)
* **Bucket:** `wildlife-artifacts`
* **Where & How It's Used:**
  * Satellite rasters (GeoTIFFs, PNG preview tiles) generated by GEE or fixture pipelines are stored directly in MinIO buckets.
  * Prevents bloating the relational PostgreSQL database with large binary image data.
  * Clients obtain secure, time-limited **AWS Signature Version 4 (SigV4) Presigned URLs** via `/api/v1/analyses/{id}/layers/{layer_id}/access`.
  * The frontend Leaflet map directly downloads and displays raster overlays using these presigned links.

---

## 6. Satellite & Remote Sensing Data Providers

### 6.1 Google Earth Engine (GEE) Python API

* **Location in Codebase:** `backend/app/providers/gee/`
* **Data Sources Accessed:**
  * `COPERNICUS/S2_SR_HARMONIZED`: Sentinel-2 Level-2A surface reflectance optical imagery at 10m ground resolution.
  * `GOOGLE/DYNAMIC_WORLD/V1`: Near-real-time 10m land use / land cover (LULC) probability dataset.
* **Processing Pipeline (`pipeline.py`):**
  1. **Filtering:** Filters image collections by reserve boundary polygon (`ee.Geometry.Polygon`) and specified temporal range (`ee.Filter.date`).
  2. **Cloud Masking:** Masks thick and cirrus clouds using the `QA60` quality assessment band and Scene Classification Layer (SCL).
  3. **Median Mosaicing:** Computes pixel-wise median composites across the cloud-free image collection to eliminate transient shadows, smoke, and atmospheric artifacts.
  4. **Spectral Index Calculation:**
     * **NDVI (Normalized Difference Vegetation Index):**
       $$NDVI = \frac{NIR (B8) - RED (B4)}{NIR (B8) + RED (B4)}$$
     * **NDWI (Normalized Difference Water Index):**
       $$NDWI = \frac{GREEN (B3) - NIR (B8)}{GREEN (B3) + NIR (B8)}$$
     * **NDBI (Normalized Difference Built-up Index):**
       $$NDBI = \frac{SWIR (B11) - NIR (B8)}{SWIR (B11) + NIR (B8)}$$
  5. **Difference Computation:**
     $$\Delta NDVI = NDVI_{observed} - NDVI_{baseline}$$
  6. **Thresholding & Event Extraction:**
     * Pixels with $\Delta NDVI \le -0.20$ are classified as severe vegetation loss / deforestation.
     * Pixels with $-0.20 < \Delta NDVI \le -0.10$ are flagged as canopy stress / degradation.
     * Connected components are vectorized into GeoJSON polygons and ingested as threat hotspots.

---

## 7. Geospatial Indexing & Analysis Engines

### 7.1 Google Dynamic World LULC Integration

* Ground-truth 10-meter land cover classification produced in partnership with Google and the World Resources Institute.
* Provides 9 distinct probability bands per pixel:
  * `water`, `trees`, `grass`, `flooded_vegetation`, `crops`, `shrub_and_scrub`, `built`, `bare`, `snow_and_ice`.
* Used to compute exact surface area breakdowns in square kilometers ($km^2$) for baseline vs observed dates.

---

## 8. NASA FIRMS Fire Detection Engine

* **Location in Codebase:** `backend/app/services/firms.py`
* **Sensor:** VIIRS (Visible Infrared Imaging Radiometer Suite) aboard the Suomi-NPP satellite.
* **Resolution:** 375 meters spatial resolution.
* **How It Operates:**
  1. Extracts reserve bounding box `(min_lon, min_lat, max_lon, max_lat)` from PostGIS geometry.
  2. Queries NASA FIRMS REST API: `https://firms.modaps.eosdis.nasa.gov/api/area/csv/{MAP_KEY}/VIIRS_SNPP_NRT/{bbox}/{days}`.
  3. In-memory cache stores responses for 10 minutes to prevent API key throttling.
  4. Parses CSV output into structured fire alerts (latitude, longitude, brightness temperature, fire radiative power [FRP], acquisition time, day/night flag).
  5. Returns live active fire counts directly to dashboard KPI badges.
  6. Visualizes thermal hotspots as WMS layers (`fires_viirs_snpp_24`) and glowing fire icons `[🔥]` on Leaflet maps.

---

## 9. OpenStreetMap & Boundary Geocoding Pipeline

* **Location in Codebase:** `backend/app/scripts/seed_india_habitats.py`, `backend/app/api/v1/areas.py`
* **APIs Used:** OpenStreetMap Nominatim API & Overpass API
* **How It Operates:**
  1. **Pre-Seeded Catalog:** 41 major Indian National Parks and Tiger Reserves pre-loaded into PostgreSQL with official administrative boundaries.
  2. **Live On-Demand Global Search (`/api/v1/areas/search-live`):**
     * When a user searches for any global wildlife habitat (e.g., "Yellowstone", "Serengeti", "Kruger", "Amazon"), the backend checks local PostGIS first.
     * If not found locally, it queries OSM Nominatim with structured parameters:
       `https://nominatim.openstreetmap.org/search?q={query}&format=json&polygon_geojson=1&featuretype=settlement,boundary`
     * Extracts coordinates, polygon GeoJSON, bounding box, and tags.
     * Automatically persists the newly discovered habitat into PostGIS `protected_areas` table so subsequent lookups are instant.

---

## 10. Authentication, Security & Anti-Poaching Controls

### 10.1 Role-Based Access Control (RBAC)

* **Public (Unauthenticated):** Access to public landing page, curated demo showcases (Pench, Tadoba, Sundarbans) with read-only metrics.
* **Investigator:** Full access to all 41+ reserves, global habitat search, live GEE analysis execution, telemetry sliders, and report exports.
* **Admin / Chief Warden:** Access to system governance, user role delegation, scientific formula weight tuning, and audit logs.

### 10.2 Anti-Poaching Coordinate Generalization

* Real-time GPS locations of endangered species or sensitive core-zone nests must never be exposed publicly.
* The Public API (`backend/app/api/v1/public.py`) applies coordinate jitter and grid truncation, masking precise coordinates to general 10km grid zones while preserving the conservation narrative.

### 10.3 Token Refresh Flow

* JWT Access Tokens expire in 15 minutes.
* Secure Refresh Tokens (7-day validity) allow automatic, seamless session extension without interrupting active GIS map investigations.

---

## 11. Docker Multi-Container Orchestration

The entire platform is orchestrated via `compose.yaml`:

```yaml
services:
  codeniti-db:
    image: postgis/postgis:15-3.3
    ports: ["5432:5432"]
    volumes: [postgres_data:/var/lib/postgresql/data]

  codeniti-api:
    build: ./backend
    ports: ["8000:8000"]
    depends_on: [codeniti-db, codeniti-minio, codeniti-redis]
    environment:
      - DATABASE_URL=postgresql+asyncpg://postgres:postgres@codeniti-db:5432/codeniti
      - FIRMS_MAP_KEY=66a86eb1bccf10d464a978f78af683fe
      - S3_ENDPOINT_URL=http://codeniti-minio:9000

  codeniti-frontend:
    build: ./frontend
    ports: ["3000:3000"]
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:8000

  codeniti-minio:
    image: minio/minio:latest
    ports: ["9000:9000", "9001:9001"]
    command: server /data --console-address ":9001"

  codeniti-redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
```

---

## 12. Complete Technology Matrix

| Component | Technology | Version | Purpose in WildLife Monitor |
|-----------|------------|---------|-----------------------------|
| **Frontend Framework** | Next.js (App Router) | 16.0 | SSR, client routing, Turbopack bundling |
| **UI Library** | React | 19.0 | Reactive component rendering, hooks, portals |
| **Language (Frontend)** | TypeScript | 5.0+ | Type safety across GIS schemas and API clients |
| **Styling** | Tailwind CSS | 3.4 | Dark glassmorphic conservation UI design |
| **Icons** | Lucide React | Latest | Over 80 tactical and GIS telemetry icons |
| **Interactive Maps** | Leaflet / React-Leaflet | 1.9 | Dual-card comparison slider, basemaps, raster overlays |
| **Charts** | Recharts | 2.12 | Area charts, histograms, land cover bar charts |
| **Backend Framework** | FastAPI | 0.110+ | Asynchronous REST API and Swagger documentation |
| **Language (Backend)** | Python | 3.11 | Modern async/await, scientific processing |
| **Database** | PostgreSQL | 15 | Relational storage for users, analyses, and audit logs |
| **Spatial Engine** | PostGIS | 3.3 | GeoJSON spatial indexing, polygon intersections |
| **ORM** | SQLAlchemy + GeoAlchemy2 | 2.0 | Async ORM and spatial entity modeling |
| **Migrations** | Alembic | 1.13 | Database schema version control |
| **Object Storage** | MinIO | Latest | S3-compatible storage for GeoTIFFs & difference rasters |
| **Caching** | Redis | 7-alpine | In-memory query caching & task queue readiness |
| **Satellite Imagery** | Copernicus Sentinel-2 | Level-2A | 10m optical surface reflectance imagery |
| **Satellite Engine** | Google Earth Engine | Python API | On-demand cloud NDVI, NDWI, NDBI computation |
| **Active Fires** | NASA FIRMS VIIRS | 375m | Real-time active thermal fire detections |
| **Land Cover** | Dynamic World (Google) | 10m | Real-time 9-class AI land use classification |
| **Boundaries** | OpenStreetMap Nominatim | ODbL | Global boundary geocoding & 41+ reserve vectors |
| **Authentication** | PyJWT + Passlib (Bcrypt) | 2.8 | Secure access/refresh token authentication |
| **Containerization** | Docker & Docker Compose | Latest | Reproducible multi-service deployment |
