/**
 * VANYORA — Admin & Telemetry API Client
 *
 * Provides strongly-typed client access to cluster telemetry, RBAC membership management,
 * workspace scientific parameters, and security audit logs.
 */

import { PUBLIC_API_BASE } from './public-api';

const DEFAULT_AUTH_HEADER = {
  Authorization: 'Bearer dev-user:admin-01',
  'X-Workspace-ID': '00000000-0000-0000-0000-000000000001',
};

export interface AdminKPIs {
  active_nodes: number;
  total_analyses_all_time: number;
  jobs_processed_24h: number;
  avg_execution_latency_ms: number;
  p95_execution_latency_ms: number;
  storage_used_mb: number;
  redis_cache_hit_rate: number;
  eecu_budget_percent: number;
}

export interface HourlyTelemetryPoint {
  hour: string;
  throughput: number;
  p50_ms: number;
  p95_ms: number;
}

export interface StatusDistributionItem {
  name: string;
  value: number;
  color: string;
}

export interface MethodComputeItem {
  method: string;
  compute_seconds: number;
  jobs_processed: number;
  avg_latency_ms: number;
  color: string;
}

export interface ServiceHeartbeat {
  name: string;
  role: string;
  status: string;
  latency_ms: number;
}

export interface AdminTelemetryResponse {
  kpis: AdminKPIs;
  throughput_latency_series: HourlyTelemetryPoint[];
  status_distribution: StatusDistributionItem[];
  method_compute_breakdown: MethodComputeItem[];
  service_heartbeats: ServiceHeartbeat[];
}

export interface MemberItem {
  membership_id: string;
  user_id: string;
  full_name: string;
  email: string;
  role: 'admin' | 'analyst' | 'viewer';
  is_active: boolean;
  last_login_at: string;
}

export interface RoleDistributionItem {
  role: string;
  count: number;
  color: string;
}

export interface AdminMembersResponse {
  items: MemberItem[];
  total: number;
  role_distribution: RoleDistributionItem[];
}

export interface ScientificWeights {
  magnitude: number;
  sensitivity: number;
  context: number;
}

export interface AdminSettingsResponse {
  workspace_id: string;
  workspace_name: string;
  scientific_weights: ScientificWeights;
  context_buffer_km: number;
  max_cloud_cover_percent: number;
  ndvi_loss_threshold: number;
  limits: {
    max_aoi_km2: number;
    max_vertices: number;
    max_window_days: number;
    max_active_jobs_per_workspace: number;
  };
  feature_flags: {
    gfw_enabled: boolean;
    firms_enabled: boolean;
    scientific_cache_enabled: boolean;
    idempotency_enforced: boolean;
  };
}

export interface AuditLogItem {
  id: string;
  actor_id: string;
  action: string;
  target_type: string;
  target_id: string;
  payload: any;
  timestamp: string;
}

export interface AdminAuditLogsResponse {
  items: AuditLogItem[];
  total: number;
}

/**
 * Fetch real-time cluster telemetry, p50/p95 latency, and compute metrics
 */
export async function getAdminTelemetry(): Promise<AdminTelemetryResponse> {
  const res = await fetch(`${PUBLIC_API_BASE}/admin/telemetry`, {
    headers: { ...DEFAULT_AUTH_HEADER, Accept: 'application/json' },
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`Failed to load admin telemetry: HTTP ${res.status}`);
  }
  return res.json();
}

/**
 * Fetch workspace membership roster and role distribution
 */
export async function getAdminMembers(): Promise<AdminMembersResponse> {
  const res = await fetch(`${PUBLIC_API_BASE}/admin/members`, {
    headers: { ...DEFAULT_AUTH_HEADER, Accept: 'application/json' },
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`Failed to load members: HTTP ${res.status}`);
  }
  return res.json();
}

/**
 * Update member role or active state
 */
export async function updateMemberRole(
  userId: string,
  updates: { role?: string; is_active?: boolean }
): Promise<{ message: string; role: string }> {
  const res = await fetch(`${PUBLIC_API_BASE}/admin/members/${userId}`, {
    method: 'PATCH',
    headers: {
      ...DEFAULT_AUTH_HEADER,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(updates),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to update member: HTTP ${res.status}`);
  }
  return res.json();
}

/**
 * Fetch workspace configuration and limits
 */
export async function getAdminSettings(): Promise<AdminSettingsResponse> {
  const res = await fetch(`${PUBLIC_API_BASE}/admin/settings`, {
    headers: { ...DEFAULT_AUTH_HEADER, Accept: 'application/json' },
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`Failed to load settings: HTTP ${res.status}`);
  }
  return res.json();
}

/**
 * Update workspace scientific parameters
 */
export async function updateAdminSettings(settingsData: {
  magnitude_weight: number;
  sensitivity_weight: number;
  context_weight: number;
  context_buffer_km: number;
  max_cloud_cover_percent: number;
  ndvi_loss_threshold: number;
}): Promise<any> {
  const res = await fetch(`${PUBLIC_API_BASE}/admin/settings`, {
    method: 'PUT',
    headers: {
      ...DEFAULT_AUTH_HEADER,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(settingsData),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to update settings: HTTP ${res.status}`);
  }
  return res.json();
}

/**
 * Fetch workspace audit logs
 */
export async function getAdminAuditLogs(limit = 25): Promise<AdminAuditLogsResponse> {
  const res = await fetch(`${PUBLIC_API_BASE}/admin/audit-logs?limit=${limit}`, {
    headers: { ...DEFAULT_AUTH_HEADER, Accept: 'application/json' },
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`Failed to load audit logs: HTTP ${res.status}`);
  }
  return res.json();
}
