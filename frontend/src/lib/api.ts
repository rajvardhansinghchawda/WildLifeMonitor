/**
 * Investigator portal API client — talks to the real FastAPI backend (/api/v1).
 *
 * No mock data and no silent fallbacks: failures surface as ApiError so pages can show
 * an honest error/empty state. Handles JWT storage and refresh-token rotation.
 */

const RAW_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api/v1';
export const API_BASE = RAW_URL.replace(/\/+$/, '').endsWith('/api/v1')
  ? RAW_URL.replace(/\/+$/, '')
  : RAW_URL.replace(/\/+$/, '').endsWith('/api')
  ? `${RAW_URL.replace(/\/+$/, '')}/v1`
  : `${RAW_URL.replace(/\/+$/, '')}/api/v1`;

// ------------------------------------------------------------------ types
export type Severity = 'low' | 'medium' | 'high' | 'critical';
export type VerificationStatus = string;

export interface Coordinates {
  lat: number;
  lon: number;
}

export interface HealthIndex {
  score: number | null;
  band: string | null;
  method_version?: string;
  components?: Record<string, unknown>;
  missing_inputs?: string[];
  [key: string]: unknown;
}

export interface AreaSummary {
  id: string;
  slug: string;
  name: string;
  designation: string | null;
  iucn_category: string | null;
  country: string | null;
  country_code: string | null;
  state: string | null;
  biome: string | null;
  area_km2: number;
  coordinates: Coordinates;
  source: string;
  statistics_computed_at: string | null;
  last_analyzed: string | null;
  latest_analysis_id: string | null;
  hotspot_count: number;
  health_index: HealthIndex | null;
  distance_km?: number | null;
  is_nearby_suggestion?: boolean | null;
  searched_place?: string | null;
}

export interface AreaDetail extends AreaSummary {
  analysis_aoi: GeoJSON.Geometry;
  analysis_aoi_km2: number;
  analysis_aoi_note: string | null;
  source_fetched_at: string | null;
  attribution: string;
}

export interface AreaStatistics {
  area_id: string;
  area_name: string;
  computed_at: string | null;
  source: string | null;
  scale_m: number | null;
  window: string | null;
  forest_cover_percent: number | null;
  water_bodies_ha: number | null;
  urban_builtup_ha: number | null;
  land_cover_distribution: Record<string, number>;
  last_cloud_free_pass: string | null;
  latest_analysis_id: string | null;
  vegetation_loss_candidate_ha: number | null;
  active_fires_count: number | null;
  health_index: HealthIndex | null;
  unavailable: string[];
}

export interface TimelinePoint {
  date: string;
  ndvi: number | null;
  baseline: number | null;
  water_cover_ha: number | null;
}

export interface Timeline {
  area_id: string;
  points: TimelinePoint[];
  computed_at: string | null;
  source: string | null;
  scale_m: number | null;
  notes: string[];
}

export interface Hotspot {
  id: string;
  analysis_id: string;
  area_id: string | null;
  area_name: string | null;
  layer_type: string;
  change_type: string;
  change_label: string;
  detected_at: string;
  affected_area_ha: number;
  mean_ndvi_change: number | null;
  valid_pixel_fraction: number | null;
  quality_label: string | null;
  severity: Severity;
  priority_score: number | null;
  priority_components: Record<string, number | null> | null;
  priority_method_version: string | null;
  status: VerificationStatus;
  record_version: number;
  method_version: string;
  sensor: string | null;
  coordinates: Coordinates;
  geometry: GeoJSON.Geometry | null;
  baseline_value: number | null;
  comparison_value: number | null;
  value_name: string | null;
  nearest_known_road_distance_m: number | null;
  nearest_known_settlement_distance_m: number | null;
  context_source: string | null;
  baseline_window: string | null;
  comparison_window: string | null;
  is_curated_demo: boolean;
  read_only: boolean;
}

export interface HotspotDetail extends Hotspot {
  verifications: Array<{
    id: string;
    actor_id: string;
    from_status: string;
    to_status: string;
    notes: string | null;
    record_version: number;
    created_at: string;
  }>;
  layer_provenance: Record<string, unknown>;
  layer_warnings: string[];
}

export interface Paged<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface AlertItem {
  id: string;
  event_id: string;
  analysis_id: string;
  area_id: string | null;
  area_name: string | null;
  title: string;
  message: string;
  severity: Severity;
  status: 'unread' | 'acknowledged' | 'dismissed';
  triggered_at: string;
  read_only: boolean;
}

export interface ReportItem {
  id: string;
  title: string;
  format: string;
  area_id: string | null;
  area_name: string | null;
  analysis_id: string | null;
  status: string;
  byte_size: number;
  event_count: number;
  created_at: string;
  error: string | null;
}

export interface AnalysisListItem {
  analysis_id: string;
  status: string;
  stage: string | null;
  area_id: string | null;
  area_name: string | null;
  layers: Array<{ layer_id: string; type: string; status: string }>;
  baseline: { start: string; end: string };
  comparison: { start: string; end: string };
  event_count: number;
  created_at: string;
  updated_at: string;
  is_curated_demo: boolean;
}

export interface ManifestArtifact {
  id: string;
  artifact_type: string;
  role: string | null;
  media_type: string;
  storage_uri: string;
  checksum: string;
  bounds: [[number, number], [number, number]] | null;
  legend: Record<string, unknown> | null;
}

export interface ManifestLayer {
  layer_id: string;
  type: string;
  status: string;
  quality_label: string | null;
  metrics: Record<string, any>;
  method_version: string;
  error_code: string | null;
  error_details: unknown;
  artifacts: ManifestArtifact[];
}

export interface ResultManifest {
  analysis_id: string;
  status: string;
  configuration_id: string;
  input_snapshot: Record<string, any>;
  layers: ManifestLayer[];
  provenance: Record<string, any>;
  warnings: Array<{ layer: string; message: string }>;
  attribution: Record<string, string>;
  event_count: number;
  events_url: string;
}

export interface LayerAsset {
  role: string;
  url: string;
  media_type: string;
  byte_size: number;
  bounds: [[number, number], [number, number]] | null;
  legend: Record<string, any> | null;
  filename: string | null;
}

export interface LayerAccess {
  analysis_id: string;
  layer_id: string;
  layer_type: string;
  read_only: boolean;
  assets: LayerAsset[];
  metrics: Record<string, any>;
}

export interface UserInfo {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  created_at: string;
  last_login_at: string | null;
  memberships: Array<{
    workspace_id: string;
    workspace_name: string;
    role: string;
    is_public: boolean;
  }>;
}

interface TokenResponse {
  access_token: string;
  refresh_token: string;
}

// ------------------------------------------------------------------ errors
export class ApiError extends Error {
  status: number;
  code: string;
  details: unknown;
  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

// ------------------------------------------------------------------ tokens
const ACCESS_KEY = 'ww_access';
const REFRESH_KEY = 'ww_refresh';

function store(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

export const tokens = {
  get access() {
    return store()?.getItem(ACCESS_KEY) ?? null;
  },
  get refresh() {
    return store()?.getItem(REFRESH_KEY) ?? null;
  },
  set(t: TokenResponse) {
    store()?.setItem(ACCESS_KEY, t.access_token);
    store()?.setItem(REFRESH_KEY, t.refresh_token);
  },
  clear() {
    store()?.removeItem(ACCESS_KEY);
    store()?.removeItem(REFRESH_KEY);
  },
};

let refreshing: Promise<boolean> | null = null;

async function refreshTokens(): Promise<boolean> {
  if (!tokens.refresh) return false;
  if (!refreshing) {
    refreshing = (async () => {
      try {
        const res = await fetch(`${API_BASE}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: tokens.refresh }),
        });
        if (!res.ok) return false;
        tokens.set((await res.json()) as TokenResponse);
        return true;
      } catch {
        return false;
      } finally {
        refreshing = null;
      }
    })();
  }
  return refreshing;
}

async function toError(res: Response): Promise<ApiError> {
  let body: any = null;
  try {
    body = await res.json();
  } catch {
    /* non-JSON body */
  }
  const err = body?.error;
  const detail = typeof body?.detail === 'string' ? body.detail : undefined;
  return new ApiError(
    res.status,
    err?.code ?? `HTTP_${res.status}`,
    err?.message ?? detail ?? res.statusText ?? 'Request failed',
    err?.details
  );
}

async function request<T>(
  path: string,
  init: RequestInit & { json?: unknown; form?: Record<string, string>; auth?: boolean } = {},
  retried = false
): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  let body: BodyInit | undefined;
  if (init.json !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(init.json);
  } else if (init.form) {
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
    body = new URLSearchParams(init.form).toString();
  }
  if (init.auth !== false && tokens.access) headers.Authorization = `Bearer ${tokens.access}`;

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method: init.method ?? 'GET',
      headers: { ...headers, ...((init.headers as Record<string, string>) ?? {}) },
      body,
    });
  } catch {
    throw new ApiError(0, 'NETWORK', 'Cannot reach the VANYORA API. Is the backend running?');
  }

  if (res.status === 401 && init.auth !== false && !retried && (await refreshTokens())) {
    return request<T>(path, init, true);
  }
  if (res.status === 401 && init.auth !== false) {
    tokens.clear();
    if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
      window.location.href = '/login';
    }
  }
  if (!res.ok) throw await toError(res);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

function qs(params: Record<string, string | number | boolean | undefined | null>): string {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') q.set(k, String(v));
  });
  const s = q.toString();
  return s ? `?${s}` : '';
}

// ------------------------------------------------------------------ endpoints
export const api = {
  auth: {
    async login(email: string, password: string): Promise<void> {
      const t = await request<TokenResponse>('/auth/token', {
        method: 'POST',
        form: { username: email, password },
        auth: false,
      });
      tokens.set(t);
    },
    async register(input: {
      email: string;
      password: string;
      full_name: string;
      workspace_name?: string;
    }): Promise<void> {
      const t = await request<TokenResponse>('/auth/register', {
        method: 'POST',
        json: input,
        auth: false,
      });
      tokens.set(t);
    },
    async logout(): Promise<void> {
      const refresh = tokens.refresh;
      try {
        if (refresh) {
          await request<void>('/auth/logout', { method: 'POST', json: { refresh_token: refresh } });
        }
      } finally {
        tokens.clear();
      }
    },
    me: () => request<UserInfo>('/auth/me'),
    updateMe: (full_name: string) =>
      request<UserInfo>('/auth/me', { method: 'PATCH', json: { full_name } }),
    changePassword: (current_password: string, new_password: string) =>
      request<void>('/auth/change-password', {
        method: 'POST',
        json: { current_password, new_password },
      }),
  },

  areas: {
    list: (p: { search?: string; country?: string; state?: string } = {}) =>
      request<{ items: AreaSummary[]; total: number }>(`/areas${qs({ ...p, limit: 200 })}`),
    get: (ref: string) => request<AreaDetail>(`/areas/${ref}`),
    boundary: (ref: string) =>
      request<GeoJSON.Feature<GeoJSON.Geometry>>(`/areas/${ref}/boundary`),
    statistics: (ref: string) => request<AreaStatistics>(`/areas/${ref}/statistics`),
    timeline: (ref: string) => request<Timeline>(`/areas/${ref}/timeline`),
    fires: (ref: string, days = 3) =>
      request<{ configured: boolean; count: number; fires: any[]; source?: string }>(
        `/areas/${ref}/fires?days=${days}`
      ),
    /** Live global search via OpenStreetMap Nominatim — searches any habitat worldwide
     *  and auto-caches its boundary in the database for future instant results. */
    searchLive: (q: string, limit = 5) =>
      request<{ items: AreaSummary[]; total: number }>(
        `/areas/search-live${qs({ q, limit })}`
      ),
  },


  hotspots: {
    list: (
      p: {
        area_id?: string;
        analysis_id?: string;
        change_type?: string;
        layer_type?: string;
        status?: string;
        severity?: string;
        min_area_ha?: number;
        sort?: 'area' | 'priority' | 'date';
        include_geometry?: boolean;
        limit?: number;
        offset?: number;
      } = {}
    ) => request<Paged<Hotspot>>(`/hotspots${qs({ limit: 200, ...p })}`),
    get: (id: string) => request<HotspotDetail>(`/hotspots/${id}`),
    verify: (
      id: string,
      body: { status: string; notes?: string; expected_record_version: number }
    ) =>
      request<unknown>(`/events/${id}/verification`, {
        method: 'PATCH',
        json: body,
      }),
  },

  alerts: {
    list: (p: { status?: string; severity?: string; area_id?: string } = {}) =>
      request<{ items: AlertItem[]; total: number; unread_count: number }>(
        `/alerts${qs({ limit: 200, ...p })}`
      ),
    setStatus: (id: string, status: AlertItem['status']) =>
      request<AlertItem>(`/alerts/${id}`, { method: 'PATCH', json: { status } }),
  },

  reports: {
    list: () => request<{ items: ReportItem[]; total: number }>('/reports'),
    create: (body: {
      format: 'csv' | 'geojson';
      area_id?: string;
      analysis_id?: string;
      title?: string;
    }) => request<ReportItem>('/reports', { method: 'POST', json: body }),
    download: (id: string) =>
      request<{ url: string; filename: string; media_type: string; expires_at: string }>(
        `/reports/${id}/download`
      ),
  },

  analyses: {
    list: (p: { area_id?: string; status?: string; mine_only?: boolean } = {}) =>
      request<Paged<AnalysisListItem>>(`/analyses${qs({ limit: 50, ...p })}`),
    submit: (body: {
      area_id?: string;
      aoi?: GeoJSON.Geometry;
      baseline: { start: string; end: string };
      comparison: { start: string; end: string };
      layers: string[];
    }) =>
      request<{ analysis_id: string; status: string }>('/analyses', {
        method: 'POST',
        json: body,
        headers: { 'Idempotency-Key': crypto.randomUUID() },
      }),
    status: (id: string) =>
      request<{ analysis_id: string; status: string; stage?: string | null; [k: string]: any }>(
        `/analyses/${id}`
      ),
    cancel: (id: string) => request<unknown>(`/analyses/${id}/cancel`, { method: 'POST' }),
    results: (id: string) => request<ResultManifest>(`/analyses/${id}/results`),
    layerAccess: (id: string, layerId: string) =>
      request<LayerAccess>(`/analyses/${id}/layers/${layerId}/access`),
  },

  capabilities: () => request<Record<string, any>>('/capabilities'),
};

export default api;
