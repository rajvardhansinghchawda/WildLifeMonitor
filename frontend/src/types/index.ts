export type SeverityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'INFO';
export type ChangeType =
  | 'DEFORESTATION'
  | 'VEGETATION_LOSS'
  | 'WATER_LOSS'
  | 'ENCROACHMENT'
  | 'URBAN_EXPANSION'
  | 'BURN_SCAR'
  | 'FIRE'
  | 'CANOPY_THINNING'
  | 'OTHER';
export type AlertStatus = 'UNREAD' | 'ACKNOWLEDGED' | 'DISMISSED';
export type UserRole = 'SUPER_ADMIN' | 'PARK_RANGER' | 'RESEARCHER' | 'VIEWER';
export type IUCNStatus = 'CR' | 'EN' | 'VU' | 'NT' | 'LC' | 'DD' | 'NE';

export interface HotspotRelatedAlert {
  id: string;
  title: string;
  severity: SeverityLevel;
  timestamp: string;
}

export interface ProtectedArea {
  id: string;
  wdpa_id: string;
  name: string;
  designation: string;
  iucn_category: string;
  country: string;
  country_code: string;
  state?: string;
  protected_area_type?: string;
  area_km2: number;
  total_hectares: number;
  coordinates: {
    lat: number;
    lon: number;
  };
  forest_cover_percent: number;
  canopy_loss_year_ha: number;
  active_fires_count: number;
  threat_index: number; // 0-100
  biome: string;
  last_analyzed: string;
}

export interface ChangeEventHotspot {
  id: string;
  area_id: string;
  area_name: string;
  detected_at: string;
  area_ha: number;
  delta_ndvi: number;
  change_type: ChangeType;
  severity: SeverityLevel;
  confidence_score: number; // 0.0 - 1.0
  percentage_change?: number;
  coordinates: {
    lat: number;
    lon: number;
  };
  status: 'NEW' | 'VERIFIED' | 'FALSE_POSITIVE' | 'RESOLVED';
  sensor: string;
  location_detail?: string;
  previous_condition?: string;
  current_condition?: string;
  potential_contributing_factors?: string[];
  related_alerts?: HotspotRelatedAlert[];
}

export interface FireHotspot {
  id: string;
  area_id: string;
  area_name: string;
  lat: number;
  lon: number;
  brightness_kelvin: number;
  frp_mw: number;
  confidence: number;
  satellite: 'VIIRS' | 'MODIS';
  timestamp: string;
}

export interface WildlifeOccurrence {
  id: string;
  area_id?: string;
  species_name: string;
  scientific_name: string;
  iucn_status: IUCNStatus;
  taxon: string;
  count: number;
  observed_at: string;
  threat_distance_km: number;
  population_info?: string;
  census_source?: string;
}

export interface AlertNotification {
  id: string;
  title: string;
  message: string;
  severity: SeverityLevel;
  status: AlertStatus;
  triggered_at: string;
  area_id: string;
  area_name: string;
  hotspot_id?: string;
}

export interface ReportItem {
  id: string;
  title: string;
  format: 'GEOPDF' | 'CSV' | 'GEOPACKAGE';
  date_range: string;
  area_name: string;
  file_size_mb: number;
  status: 'READY' | 'GENERATING' | 'FAILED';
  generated_at: string;
}

export interface TimelineDataPoint {
  date: string;
  ndvi: number;
  baseline: number;
  waterCoverHa: number;
  fireIncidents: number;
  canopyLossHa: number;
}

export interface AreaStatistics {
  area_id: string;
  area_name: string;
  forest_cover_percent: number;
  canopy_loss_year_ha: number;
  water_bodies_ha: number;
  urban_builtup_ha: number;
  habitat_change_score: number;
  active_fires_count: number;
  threat_index: number;
  last_cloud_free_pass: string;
  land_cover_distribution: Record<string, number>;
  sensor_telemetry?: Record<string, any>;
}

export interface NdviDistributionBin {
  ndvi: string;
  baseline: number;
  current: number;
}

export interface ChangeDistributionBin {
  interval: string;
  label: string;
  areaHa: number;
  color: string;
  desc: string;
}

export interface ChangeAnalysisResult {
  analysis_type: string;
  area_id: string;
  area_name: string;
  start_date: string;
  end_date: string;
  area_affected_ha: number;
  vegetation_loss_ha: number;
  vegetation_gain_ha: number;
  net_change_ha: number;
  percentage_change: number;
  confidence_score: number;
  baseline_index_mean: number;
  current_index_mean: number;
  ndvi_distribution: NdviDistributionBin[];
  change_distribution: ChangeDistributionBin[];
  methodology_summary: Record<string, string>;
  computed_at: string;
}

export interface SpectralIndexResult {
  index_name: string;
  area_id?: string;
  mean: number;
  median: number;
  min: number;
  max: number;
  std: number;
  surface_area_ha: number;
  cloud_cover_percent: number;
  sensor: string;
  computed_at: string;
}

