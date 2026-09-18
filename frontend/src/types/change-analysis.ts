export type AnalysisType =
  | 'vegetation_ndvi'
  | 'water_ndwi'
  | 'builtup_ndbi'
  | 'land_cover'
  | 'fire_activity';

export interface AnalysisTypeOption {
  id: AnalysisType;
  label: string;
  shortLabel: string;
  formula: string;
  unit: string;
  description: string;
}

export interface ChangeAnalysisStats {
  areaAffectedHa: number;
  lossAreaHa: number;
  gainAreaHa: number;
  netChangeHa: number;
  percentageChange: number;
  confidenceScore: number;
  baselineIndexMean: number;
  currentIndexMean: number;
  cloudCoverPercent: number;
}

export interface NdviDistributionPoint {
  ndviBin: string; // e.g. "0.0", "0.2", "0.4", "0.6", "0.8"
  baselineDensity: number;
  currentDensity: number;
}

export interface ChangeDistributionBin {
  bin: string; // e.g. "<-0.4 (Severe Loss)", "-0.4 to -0.2", "-0.2 to +0.2", "+0.2 to +0.4", ">+0.4 (High Gain)"
  areaHa: number;
  color: string;
  type: 'loss' | 'stable' | 'gain';
}
