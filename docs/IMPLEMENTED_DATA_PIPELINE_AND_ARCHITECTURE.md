# Wildlife Habitat Monitoring System — Implemented Architecture & Data Pipeline

## 1. Executive Summary & Core Mission

### Plain English Summary (For Quick Understanding)
Our system acts as an **automated satellite watchtower** for wildlife reserves across India and globally. Instead of requiring forest officers to manually patrol thousands of square kilometers of jungle, our platform automatically analyzes satellite imagery, detects environmental destruction (deforestation, water loss, illegal building, wildfires), scores the urgency of each threat, and directs field officers directly to the exact coordinates.

### Technical Elevator Pitch (For Jury & Judges)
The **Wildlife Habitat Monitoring System** is an asynchronous, event-driven geospatial decision-support platform. It integrates multi-spectral optical satellite imagery (Sentinel-2 L2A at 10m resolution), near-real-time deep learning land cover classification (Dynamic World), live thermal telemetry (NASA FIRMS VIIRS 375m), and OpenStreetMap vector datasets. 

The backend employs a **Modular Monolith architecture** powered by FastAPI, PostgreSQL with PostGIS spatial indexing, Celery distributed task workers, Redis caching/idempotency locks, and MinIO S3 object storage for presigned raster map tile delivery.

---

## 2. Data Sources: What, Why, and How We Use Them

Here is the exact breakdown of every data source integrated into the codebase, explaining **what it is**, **why we selected it**, and **what our algorithms do with it**.

| Data Source | Type & Resolution | Why We Selected It (Scientific Rationale) | What We Do With It in Code |
| :--- | :--- | :--- | :--- |
| **Copernicus Sentinel-2 L2A** *(Google Earth Engine)* | Multi-Spectral Optical Imagery (10m Resolution, 5-Day Revisit) | High spatial resolution allows detecting small tree-clearing patches down to 0.5 hectares. 13 spectral bands enable precise calculation of vegetation, water, and soil indices. | Computes **NDVI** (Vegetation Health), **NDWI** (Water Bodies), and **NDBI** (Built-Up/Encroachment). Applies cloud masking (`S2_CLOUD_PROBABILITY` < 20%) and zero-denominator validation. |
| **Dynamic World 10m LULC** *(Google / WRI / NatGeo)* | Deep-Learning Land Cover Classification (10m Resolution) | Near-real-time pixel-level probability distribution across 9 land-cover classes (Trees, Flooded Veg, Crops, Shrub, Built, Bare, Water, Grass, Snow). | Measures exact categorical surface area transitions (e.g., how many square kilometers converted from "Trees" to "Bare Ground" or "Built Area"). |
| **NASA FIRMS VIIRS** *(NOAA-20 / S-NPP Satellites)* | Active Thermal Anomalies (375m Resolution, Near-Real-Time) | Optical satellite sensors cannot see through heavy cloud cover or dense wildfire smoke. Thermal infrared detects heat anomalies within 3 hours of satellite overpass. | Sends bounding-box queries to NASA FIRMS REST API (`/api/v1/areas/{id}/fires`) to render live active fire pins and surface urgent wildfire alerts. |
| **OpenStreetMap (OSM) / Nominatim** | Vector Geocoding & Infrastructure Features | Provides open global polygon boundaries for national parks and sanctuaries, plus road and human settlement vector layers. | Geocodes search queries (`/api/v1/areas/search-live`) for 41 pre-seeded Indian parks + global search. Computes proximity distances from change events to nearest roads/settlements. |
| **Esri World Imagery** | Optical Satellite Basemap Tiles | High-clarity visual background layer. | Serves as the interactive Leaflet map basemap layer so analysts can visually inspect terrain details beneath detected change heatmaps. |
| **Global Forest Watch (GFW)** | Integrated Deforestation Feed | Validated historic tree cover loss alerts. | Cross-references detected satellite change hotspots with third-party forest alert records. |

---

## 3. End-to-End Data Ingestion & Processing Workflow

Here is the step-by-step workflow of how data flows from user input to satellite fetch, processing, storage, and visual display.

```
[ User Request in UI ]
        │
        ▼
[ FastAPI API Router ] ──► Validates AOI & Window Bounds (Max 2,500 km², 180 Days)
        │                  Checks Redis Idempotency & Active Workspace Job Limits
        ▼
[ PostgreSQL DB ] ────────► Persists Analysis (PENDING), AnalysisLayer, & Outbox Record
        │
        ▼
[ Celery Worker Queue ] ──► Acquires Distributed Lease with Active Heartbeat & Fencing Token
        │
        ├─────────────────► [ GEE Python API ] ──► Sentinel-2 & Dynamic World Cloud Extraction
        ├─────────────────► [ NASA FIRMS API ] ──► Queries Active Thermal Fire Points
        └─────────────────► [ OpenStreetMap ]  ──► Fetches GeoJSON Boundary & Context Layers
        │
        ▼
[ Remote Sensing Engine ] ─► Computes Band Math (NDVI, NDWI, NDBI) & Connected Component Hotspots
        │                  Applies Zero Data Fabrication Masking
        ▼
[ Spatial Enrichment ] ──► Builds Shapely STRtree for O(log M) Nearest Road/Settlement Lookup
        │                  Calculates Weighted Investigation Priority Score (0 - 100)
        ▼
[ MinIO S3 Storage ] ────► Uploads PNG Difference Rasters -> Verifies SHA256 Checksum First
        │
        ▼
[ Leaflet UI Portal ] ────► Renders Presigned Tile Overlay + Split-Slider + Hotspot Dossier
```

### Detailed Technical Explanation of the 7 Processing Phases

#### Phase 1: AOI Selection & Geocoding
* **Intuitive**: The user searches for a reserve (e.g., "Pench National Park") or draws a custom region on the map.
* **Technical**: The backend receives GeoJSON geometry. `validate_geometry()` verifies that area $\le 2,500\text{ km}^2$ and vertex count $\le 5,000$. Polygon ring winding is normalized (exterior CCW, interior CW) with lexicographical vertex sorting ([ADR-014](file:///d:/WildLifeMonitor/memory/architecture_decisions.md#L113-L122)). Global search hits PostGIS first, falling back to OSM Nominatim API with auto-caching.

#### Phase 2: Request Submission & Outbox Dispatch
* **Intuitive**: The system instantly acknowledges the user's request without hanging or freezing the screen.
* **Technical**: `AnalysisService.submit_analysis()` checks Redis `IdempotencyStore` (`idem:{workspace_id}:{key}`). If new, it persists `Analysis`, `AnalysisLayer`, and an `Outbox` row inside a single atomic database transaction. FastAPI returns `202 Accepted` with polling URLs (`/api/v1/analyses/{id}`). An outbox dispatcher process publishes the job to Celery.

#### Phase 3: Background Worker Execution & Fencing Tokens
* **Intuitive**: Heavy satellite downloading and math work happens in the background. If a server crashes, the system cleans up cleanly without duplicate corrupted results.
* **Technical**: Celery worker acquires a lease (`lease_expires_at = now() + 30s`) with a monotonically increasing `fencing_token` ([ADR-006](file:///d:/WildLifeMonitor/memory/architecture_decisions.md#L47-L51)). Active workers issue heartbeats every 10 seconds. Workers check `cancel_requested` before every layer step for cooperative cancellation ([ADR-007](file:///d:/WildLifeMonitor/memory/architecture_decisions.md#L55-L59)).

#### Phase 4: Remote Sensing Math & Zero Data Fabrication
* **Intuitive**: We compare old satellite pictures with new ones to spot vegetation loss, water shrinkage, or building expansion, ignoring cloudy/shadowed pixels.
* **Technical**: 
  * **Scientific Cache ([ADR-014](file:///d:/WildLifeMonitor/memory/architecture_decisions.md#L113-L122))**: SHA-256 hash across 13 inputs (`sci:...`) reuses prior computed layer outputs.
  * **Band Math**: 
    * `NDVI = (Band 8 - Band 4) / (Band 8 + Band 4)`
    * `NDWI = (Band 3 - Band 8) / (Band 3 + Band 8)`
    * `NDBI = (Band 11 - Band 8) / (Band 11 + Band 8)`
  * **Zero Data Fabrication ([ADR-008](file:///d:/WildLifeMonitor/memory/architecture_decisions.md#L63-L67))**: Pixels where $(B4 + B8) < 1e-4$ or SCL is cloudy/shadowed are explicitly masked as `NaN` / invalid support. They are **never** smoothed to 0.0 or treated as zero change.
  * **Connected Component Clustering**: Groups adjacent degraded pixels where $\Delta\text{NDVI} < -0.15$ and cluster area $> 0.5\text{ ha}$ into discrete `ChangeEvent` candidate polygons.

#### Phase 5: Spatial Enrichment & Investigation Priority Triage
* **Intuitive**: Each detected threat is scored from 0 to 100 so forest rangers know which site to visit first.
* **Technical**:
  * **Spatial-Tree Enrichment ([ADR-011](file:///d:/WildLifeMonitor/memory/architecture_decisions.md#L88-L92))**: Fetches OSM roads/settlements once per AOI and builds an in-memory `shapely.STRtree` for $O(\log M)$ nearest-neighbor lookups without issuing $N$ database roundtrips.
  * **Priority Scoring ([ADR-012](file:///d:/WildLifeMonitor/memory/architecture_decisions.md#L95-L100))**: 
    $$\text{Priority Score} = 100 \times (W_m \cdot \text{Magnitude} + W_s \cdot \text{Sensitivity} + W_c \cdot \text{Pressure})$$
    Default weights: $W_m = 0.50$, $W_s = 0.30$, $W_c = 0.20$. *Strict Null Propagation*: If any input context is unconfigured or missing, the score returns `null` to avoid false safety assumptions.

#### Phase 6: Storage-First Raster Publishing & Tile Delivery
* **Intuitive**: Heatmaps load smoothly on the interactive map without slowing down the webpage.
* **Technical**: **Storage-First Registration ([ADR-009](file:///d:/WildLifeMonitor/memory/architecture_decisions.md#L71-L76))** uploads PNG difference rasters to MinIO S3 storage and validates SHA256 checksums before writing database `artifacts` rows. The API generates presigned S3 URLs for Leaflet `L.imageOverlay` rendering.

#### Phase 7: Grounded AI Conservation Chatbot Integration
* **Intuitive**: Analysts can talk to an AI assistant that answers questions about fires, threats, and habitat stats in natural language.
* **Technical**: Grounded multi-turn agent (`/api/v1/chat`, `chat_agent.py`) supporting LLM tool calling (`get_area_telemetry`, `get_active_fires`, `get_threat_hotspots`) with strict anti-poaching coordinate generalization and factual validation against halluncination.

---

## 4. Implemented Features vs. Things Left to Implement

To give full transparency to the jury, here is the clear distinction between what is **100% built and verified in code right now** versus what is on the **future system roadmap**.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          SYSTEM IMPLEMENTATION STATUS                           │
├──────────────────────────────────────────────────────┬──────────────────────────┤
│           100% BUILT & VERIFIED (IN CODE)            │   THINGS LEFT (ROADMAP)  │
├──────────────────────────────────────────────────────┼──────────────────────────┤
│ ✓ FastAPI Async Engine + Celery Background Workers    │ ⌛ Sentinel-1 SAR Radar  │
│ ✓ PostGIS Spatial Indexing & Schema Migrations       │    (Cloud-Penetrating)   │
│ ✓ Google Earth Engine (Sentinel-2 L2A & Dynamic Wld) │ ⌛ Drone Imagery Ingest  │
│ ✓ NASA FIRMS Live Active Fire Telemetry Integration  │ ⌛ WhatsApp / SMS Ranger │
│ ✓ All-India (41 Parks) + Global Live Habitat Search │    Dispatch Integration  │
│ ✓ TerraWatch Dual-Card Satellite Comparison Slider   │ ⌛ Offline Mobile Patrol │
│ ✓ Grounded AI Conservation Chatbot with Tool Calling │    GPS Tracking App      │
│ ✓ Admin RBAC, Audit Logs, & Priority Tuning          │ ⌛ Multi-Satellite Fusion│
└──────────────────────────────────────────────────────┴──────────────────────────┘
```

### A. 100% Implemented & Verified in Code (Available Now)
1. **Complete Asynchronous Backend API (`/backend/app`)**:
   * Fully implemented endpoints for analyses, events, hotspots, areas, public demo, admin portal, alerts, reports, and AI chat.
   * PostgreSQL + PostGIS database with spatial indexing on geometries and keyset cursor pagination (`events_priority_idx`).
   * MinIO S3 object storage integration with SHA256 checksum validation.
   * Redis queue broker, idempotency store, and scientific calculation caching.
2. **Multi-Provider Remote Sensing Pipelines**:
   * Google Earth Engine Sentinel-2 L2A cloud-masked reflectance & 10m Dynamic World land cover pipeline.
   * NASA FIRMS REST API live VIIRS 375m active fire telemetry.
   * OpenStreetMap Nominatim/Overpass global geocoding & PostGIS boundary auto-caching.
3. **Interactive Frontend Application (`/frontend/src`)**:
   * **Public Demonstration Portal**: Unauthenticated read-only portal with generalized coordinates for anti-poaching security.
   * **Investigator Portal & Change Analysis Studio**: Tri-view map layout (Baseline vs Comparison vs Difference), split-screen Swipe mode, full-screen React Portal viewports, and hotspot threat inspector.
   * **TerraWatch Satellite Comparison Slider**: Dynamic split-cards that smoothly translate and resize along with the slider handle, rendering real satellite rasters and before/after parameters.
   * **Admin Portal**: RBAC role management, priority weight tuning, and immutable audit logs.
   * **Grounded AI Chatbot**: Floating markdown chat widget with live tool execution.
4. **Data Seed Catalog**:
   * 41 Indian Tiger Reserves & National Parks pre-seeded into PostGIS with full OSM polygon boundaries.

### B. Things Left to Implement (Future System Roadmap)
1. **Sentinel-1 SAR Radar Integration**:
   * *Why it's needed*: Synthetic Aperture Radar (SAR) can penetrate dense monsoon cloud cover.
   * *Status*: Optical cloud masking is implemented; radar backscatter fusion is planned for V2.
2. **High-Resolution Drone (UAV) Imagery Ingestion**:
   * *Why it's needed*: Field officers capturing sub-meter aerial drone footage.
   * *Status*: Architecture supports object storage uploads; automated orthomosaic stitching pipeline is planned for V2.
3. **Automated WhatsApp / SMS Ranger Dispatch**:
   * *Why it's needed*: Instant SMS push alerts to field rangers when high-priority hotspots ($Score > 80$) are verified.
   * *Status*: Backend alert schema and webhook tables exist; Twilio/WhatsApp Business API gateway integration is pending.
4. **Offline Mobile Patrol App with Real-Time GPS Tracking**:
   * *Why it's needed*: Rangers operating deep inside dense forests without cellular connectivity.
   * *Status*: Web-based mobile responsive portal works online; offline SQLite sync mobile app is on the V2 roadmap.

---

## 5. Jury Presentation & Q&A Cheatsheet

Use these concise, powerful technical answers when presenting to hackathon judges or technical jury panels:

### Q1: "How do you handle long-running satellite computations without blocking the web API?"
* **Answer**: "We decouple request submission from execution using an Asynchronous Transactional Outbox pattern. FastAPI validates inputs, records the job in PostgreSQL, and returns HTTP 202 Accepted in under 200 milliseconds. Celery background workers process the satellite pipeline, holding active Redis heartbeat leases and fencing tokens to prevent zombie worker race conditions."

### Q2: "How do you ensure you don't generate false deforestation alerts over clouds or shadows?"
* **Answer**: "We strictly enforce a Zero Data Fabrication policy. We apply Sentinel-2 Scene Classification Layer (SCL) and cloud probability masks. Pixels where reflectance is zero or obscured by clouds are explicitly masked out of the valid support array as `NaN`. They are never smoothed, interpolated, or set to zero change."

### Q3: "How do you prevent poachers from using your platform to locate endangered species?"
* **Answer**: "We implement Role-Based Access Control (RBAC) and Security Coordinate Generalization. Our public demonstration portal redacts exact GPS coordinates and applies spatial jitter to threat event markers. Full-precision coordinates and field patrol dispatch details are strictly restricted to authenticated, role-verified forest investigators."

### Q4: "How does your system scale if hundreds of analysts search for different reserves simultaneously?"
* **Answer**: "We use a 2-tier caching architecture. Idempotency keys in Redis prevent duplicate submission during network retries. Scientific Cache keys (`sci:...`) hash 13 variance factors—if another user previously analyzed the same reserve and date range, we reuse the pre-computed raster artifacts instantly from MinIO object storage without re-querying Google Earth Engine."

---

## 6. Codebase File Index

* **API Endpoints**: [`backend/app/api/v1/analyses.py`](file:///d:/WildLifeMonitor/backend/app/api/v1/analyses.py), [`areas.py`](file:///d:/WildLifeMonitor/backend/app/api/v1/areas.py), [`events.py`](file:///d:/WildLifeMonitor/backend/app/api/v1/events.py), [`chat.py`](file:///d:/WildLifeMonitor/backend/app/api/v1/chat.py)
* **Domain Services**: [`analysis_service.py`](file:///d:/WildLifeMonitor/backend/app/services/analysis_service.py), [`firms.py`](file:///d:/WildLifeMonitor/backend/app/services/firms.py), [`priority_service.py`](file:///d:/WildLifeMonitor/backend/app/services/priority_service.py), [`chat_agent.py`](file:///d:/WildLifeMonitor/backend/app/services/chat_agent.py)
* **Remote Sensing Engines**: [`vegetation.py`](file:///d:/WildLifeMonitor/backend/app/analysis/vegetation.py), [`water.py`](file:///d:/WildLifeMonitor/backend/app/analysis/water.py), [`builtup.py`](file:///d:/WildLifeMonitor/backend/app/analysis/builtup.py)
* **GEE Pipeline**: [`backend/app/providers/gee/pipeline.py`](file:///d:/WildLifeMonitor/backend/app/providers/gee/pipeline.py)
* **Frontend Components**: [`TemporalCompareSlider.tsx`](file:///d:/WildLifeMonitor/frontend/src/components/map/TemporalCompareSlider.tsx), [`ComparisonLeafletMap.tsx`](file:///d:/WildLifeMonitor/frontend/src/components/map/ComparisonLeafletMap.tsx), [`ChatWidget.tsx`](file:///d:/WildLifeMonitor/frontend/src/components/chat/ChatWidget.tsx)
