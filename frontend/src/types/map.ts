import { ChangeEventHotspot, SeverityLevel } from './index';

export type MapLayerId =
  | 'satellite_imagery'
  | 'protected_area_boundary'
  | 'forest_cover'
  | 'vegetation_loss'
  | 'vegetation_gain'
  | 'water_bodies'
  | 'water_loss'
  | 'urban_expansion'
  | 'fire_hotspots'
  | 'roads'
  | 'osm_features';

export type LayerCategory =
  | 'BASE_IMAGERY'
  | 'BIOSPHERE'
  | 'HYDROLOGY'
  | 'INFRASTRUCTURE'
  | 'THERMAL';

export interface MapLayerConfig {
  id: MapLayerId;
  name: string;
  category: LayerCategory;
  description: string;
  color: string;
  defaultVisible: boolean;
  defaultOpacity: number; // 0 to 100
  badge?: string;
}

export type MapMode = 'standard' | 'compare' | 'terrain3d';

export interface HotspotDetail extends ChangeEventHotspot {
  affected_area_ha: number;
  percentage_change: number;
}
