/**
 * Wildlife Watch — Public Demonstration API Client
 *
 * Dedicated typed client for unauthenticated public demonstration endpoints.
 * ZERO mock data fallback: all responses are strictly fetched from FastAPI + PostGIS.
 */

const RAW_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api/v1';
export const PUBLIC_API_BASE = RAW_URL.endsWith('/api/v1')
  ? RAW_URL
  : RAW_URL.endsWith('/api')
  ? `${RAW_URL}/v1`
  : `${RAW_URL}/api/v1`;

export interface DataSourceAttribution {
  name: string;
  provider: string;
  resolution: string;
  bands?: string[];
  status: string;
  attribution: string;
}

export interface PublicOverview {
  system_status: string;
  deployment: string;
  version: string;
  engine: string;
  demonstration_mode: boolean;
  is_curated_demo: boolean;
  disclaimer: string;
  enabled_methods: string[];
  monitored_reserves_count: number;
  total_monitored_area_km2: number;
  curated_analyses_count: number;
  total_detected_events_count: number;
  data_sources: DataSourceAttribution[];
}

export interface PublicDemonstrationItem {
  id: string;
  area_id: string;
  area_slug: string;
  area_name: string;
  designation: string;
  country: string;
  state?: string;
  area_km2: number;
  centroid: {
    lat: number;
    lon: number;
  };
  boundary: any; // GeoJSON geometry
  baseline_period: {
    start: string;
    end: string;
  };
  comparison_period: {
    start: string;
    end: string;
  };
  status: string;
  vegetation_loss_ha: number;
  water_change_ha: number;
  event_count: number;
  is_curated_demo: boolean;
  read_only: boolean;
  created_at: string;
  disclaimer: string;
}

export interface PublicDemonstrationsResponse {
  items: PublicDemonstrationItem[];
  total: number;
  is_curated_demo: boolean;
  demonstration_notice: string;
}

export interface PriorityComponents {
  magnitude?: number;
  sensitivity?: number;
  context?: number;
}

export interface PublicChangeEvent {
  id: string;
  analysis_id: string;
  change_type: string;
  change_label: string;
  affected_area_ha: number;
  mean_ndvi_change?: number | null;
  valid_pixel_fraction: number;
  priority_score?: number | null;
  priority_band: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN';
  priority_components: PriorityComponents;
  status: string;
  generalized_coordinates: {
    lat: number;
    lon: number;
  };
  generalized_geometry: any;
  nearest_known_road_distance_m?: number | null;
  nearest_known_settlement_distance_m?: number | null;
  context_source: string;
  method_version: string;
  is_curated_demo: boolean;
  read_only: boolean;
  security_notice: string;
}

export interface PublicEventsResponse {
  items: PublicChangeEvent[];
  total: number;
  is_curated_demo: boolean;
  disclaimer: string;
}

/**
 * Fetch public overview metadata
 */
export async function getPublicOverview(): Promise<PublicOverview> {
  const res = await fetch(`${PUBLIC_API_BASE}/public/overview`, {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`Failed to load system overview: HTTP ${res.status}`);
  }
  return res.json();
}

/**
 * Fetch curated demonstrations list
 */
export async function getPublicDemonstrations(): Promise<PublicDemonstrationsResponse> {
  const res = await fetch(`${PUBLIC_API_BASE}/public/demonstrations`, {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`Failed to load curated demonstrations: HTTP ${res.status}`);
  }
  return res.json();
}

/**
 * Fetch events for a specific demonstration with generalized wildlife coordinates
 */
export async function getPublicDemonstrationEvents(
  demoId: string,
  filter?: { changeType?: string; severity?: string }
): Promise<PublicEventsResponse> {
  const params = new URLSearchParams();
  if (filter?.changeType) params.append('change_type', filter.changeType);
  if (filter?.severity) params.append('severity', filter.severity);

  const url = `${PUBLIC_API_BASE}/public/demonstrations/${demoId}/events${
    params.toString() ? `?${params.toString()}` : ''
  }`;
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`Failed to load demonstration events: HTTP ${res.status}`);
  }
  return res.json();
}
