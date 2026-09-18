/**
 * Wildlife Watch - Central Assets Registry
 *
 * Unified asset catalog for all images, satellite composites, wildlife portraits,
 * reserve photography, cartographic overlays, and video telemetry feeds.
 *
 * Location: frontend/src/assets.ts
 * Import alias: import { ASSETS, IMAGES, VIDEOS, getAreaImage, getSpeciesImage } from '@/assets';
 */

// ============================================================================
// TypeScript Interfaces
// ============================================================================

export type ImageCategory =
  | 'branding'
  | 'reserves'
  | 'wildlife'
  | 'satellite'
  | 'hotspots'
  | 'ui';

export type VideoCategory =
  | 'drone_patrol'
  | 'satellite_timelapse'
  | 'camera_trap'
  | 'operational_briefing';

export interface ImageAsset {
  id: string;
  title: string;
  description: string;
  category: ImageCategory;
  url: string;
  thumbnailUrl: string;
  alt: string;
  width?: number;
  height?: number;
  aspectRatio?: string;
  attribution?: string;
  tags?: string[];
  metadata?: Record<string, string | number | boolean>;
}

export interface VideoAsset {
  id: string;
  title: string;
  description: string;
  category: VideoCategory;
  url: string;
  posterUrl: string;
  durationSeconds: number;
  format: 'mp4' | 'webm';
  resolution: string;
  fps?: number;
  attribution?: string;
  tags?: string[];
  metadata?: Record<string, string | number | boolean>;
}

// ============================================================================
// SVG Utility Generators (Instant offline rendering & high-tech GIS backdrops)
// ============================================================================

/**
 * Generates an SVG Data URI for an emerald tactical GIS grid overlay
 */
export function createGisGridSvg(
  strokeColor: string = 'rgba(16, 185, 129, 0.15)',
  size: number = 40
): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><defs><pattern id="grid" width="${size}" height="${size}" patternUnits="userSpaceOnUse"><path d="M ${size} 0 L 0 0 0 ${size}" fill="none" stroke="${strokeColor}" stroke-width="1"/></pattern></defs><rect width="100%" height="100%" fill="url(#grid)"/></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Generates an SVG Data URI for a tactical radar sweep reticle
 */
export function createRadarReticleSvg(): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400"><circle cx="200" cy="200" r="180" fill="none" stroke="rgba(16,185,129,0.2)" stroke-width="1.5"/><circle cx="200" cy="200" r="120" fill="none" stroke="rgba(16,185,129,0.15)" stroke-width="1"/><circle cx="200" cy="200" r="60" fill="none" stroke="rgba(16,185,129,0.25)" stroke-width="1"/><line x1="20" y1="200" x2="380" y2="200" stroke="rgba(16,185,129,0.2)" stroke-dasharray="4,4"/><line x1="200" y1="20" x2="200" y2="380" stroke="rgba(16,185,129,0.2)" stroke-dasharray="4,4"/><circle cx="200" cy="200" r="4" fill="rgba(52,211,153,0.8)"/></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Generates an SVG Data URI placeholder with dark GIS styling
 */
export function getPlaceholderImage(
  width: number = 800,
  height: number = 450,
  title: string = 'WILDLIFE WATCH TELEMETRY',
  subtitle: string = 'SENTINEL-2 / SATELLITE ASSET'
): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="#070b10"/><rect x="2" y="2" width="${width - 4}" height="${height - 4}" fill="none" stroke="rgba(16,185,129,0.25)" stroke-width="1.5"/><line x1="0" y1="0" x2="${width}" y2="${height}" stroke="rgba(30,41,59,0.3)" stroke-width="1"/><line x1="0" y1="${height}" x2="${width}" y2="0" stroke="rgba(30,41,59,0.3)" stroke-width="1"/><text x="50%" y="46%" dominant-baseline="middle" text-anchor="middle" fill="#34d399" font-family="monospace" font-size="14" font-weight="bold" letter-spacing="2">${title}</text><text x="50%" y="56%" dominant-baseline="middle" text-anchor="middle" fill="#64748b" font-family="monospace" font-size="11" letter-spacing="1">${subtitle}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// ============================================================================
// IMAGE ASSETS CATALOG
// ============================================================================

export const IMAGES = {
  // --------------------------------------------------------------------------
  // Branding & UI Assets
  // --------------------------------------------------------------------------
  branding: {
    logo: {
      id: 'brand-logo',
      title: 'Wildlife Watch Primary Emblem',
      description: 'Tactical geo-intelligence platform insignia featuring forest canopy and satellite orbital vector',
      category: 'branding' as const,
      url: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=400&q=80',
      thumbnailUrl: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=120&q=80',
      alt: 'Wildlife Watch Emblem',
      width: 400,
      height: 400,
      attribution: 'Wildlife Watch Geo-Intelligence Lab',
      tags: ['brand', 'logo', 'insignia'],
    },
    homepageHeroBg: {
      id: 'brand-homepage-hero-bg',
      title: 'Royal Bengal Tiger Primary Habitat Background',
      description: 'Cinematic royal Bengal tiger in lush tropical forest foliage serving as primary home page backdrop',
      category: 'branding' as const,
      url: '/Homepage-bg1.png',
      thumbnailUrl: '/Homepage-bg1.png',
      alt: 'Royal Bengal Tiger Habitat Background',
      width: 1920,
      height: 1080,
      aspectRatio: '16:9',
      attribution: 'Wildlife Watch Conservation Media',
      tags: ['hero', 'homepage', 'tiger', 'bengal-tiger', 'habitat'],
    },
    rangerInsignia: {
      id: 'brand-ranger-insignia',
      title: 'Protected Area Enforcement Clearance Badge',
      description: 'Digital authentication badge for wildlife rangers and field patrol commanders',
      category: 'branding' as const,
      url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=600&q=80',
      thumbnailUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=150&q=80',
      alt: 'Ranger Enforcement Clearance Badge',
      width: 600,
      height: 600,
      tags: ['badge', 'ranger', 'credentials'],
    },
  },

  // --------------------------------------------------------------------------
  // Protected Reserves & National Parks (High-Res Habitat Landscapes)
  // --------------------------------------------------------------------------
  reserves: {
    kanha: {
      id: 'area-kanha',
      title: 'Kanha National Park & Tiger Reserve',
      description: 'Vast sal and bamboo forest meadows of the Maikal range, Madhya Pradesh, India',
      category: 'reserves' as const,
      url: 'https://images.unsplash.com/photo-1516426122078-c23e76319801?auto=format&fit=crop&w=1200&q=80',
      thumbnailUrl: 'https://images.unsplash.com/photo-1516426122078-c23e76319801?auto=format&fit=crop&w=360&q=80',
      alt: 'Kanha National Park Sal Forest Landscape',
      width: 1200,
      height: 800,
      aspectRatio: '3:2',
      attribution: 'Wildlife Conservation Photographic Registry',
      tags: ['kanha', 'india', 'tiger-reserve', 'sal-forest'],
      metadata: {
        country: 'India',
        state: 'Madhya Pradesh',
        biome: 'Central Deccan Moist Deciduous Forest',
        coordinates: '22.3345° N, 80.6115° E',
      },
    },
    bandhavgarh: {
      id: 'area-bandhavgarh',
      title: 'Bandhavgarh National Park',
      description: 'Vindhyan sandstone hills, ancient fortress cliffs, and dense mixed bamboo jungle',
      category: 'reserves' as const,
      url: 'https://images.unsplash.com/photo-1615859133861-dfc3f17f5a0c?auto=format&fit=crop&w=1200&q=80',
      thumbnailUrl: 'https://images.unsplash.com/photo-1615859133861-dfc3f17f5a0c?auto=format&fit=crop&w=360&q=80',
      alt: 'Bandhavgarh Forest Ridge and Plateau',
      width: 1200,
      height: 800,
      aspectRatio: '3:2',
      attribution: 'Vindhyan Ecological Survey',
      tags: ['bandhavgarh', 'india', 'tiger-reserve', 'bamboo-woodland'],
      metadata: {
        country: 'India',
        state: 'Madhya Pradesh',
        biome: 'Vindhyan Dry Deciduous & Bamboo Mixed Forest',
        coordinates: '23.7042° N, 80.9995° E',
      },
    },
    satpura: {
      id: 'area-satpura',
      title: 'Satpura Tiger Reserve & Pachmarhi Biosphere',
      description: 'Rugged sandstone peaks, deep water-carved gorges, and pristine teak forest wilderness',
      category: 'reserves' as const,
      url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
      thumbnailUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=360&q=80',
      alt: 'Satpura Tiger Reserve Gorges and Denwa Reservoir',
      width: 1200,
      height: 800,
      aspectRatio: '3:2',
      attribution: 'Satpura Ecosystem Survey',
      tags: ['satpura', 'india', 'pachmarhi', 'teak-forest'],
      metadata: {
        country: 'India',
        state: 'Madhya Pradesh',
        biome: 'Central Highlands Dry & Moist Deciduous Teak',
        coordinates: '22.4500° N, 78.3833° E',
      },
    },
    kaziranga: {
      id: 'area-kaziranga',
      title: 'Kaziranga National Park',
      description: 'Brahmaputra alluvial floodplains, dense tall elephant grass, and seasonal oxbow wetlands',
      category: 'reserves' as const,
      url: 'https://images.unsplash.com/photo-1575550959106-5a7defe28b56?auto=format&fit=crop&w=1200&q=80',
      thumbnailUrl: 'https://images.unsplash.com/photo-1575550959106-5a7defe28b56?auto=format&fit=crop&w=360&q=80',
      alt: 'Kaziranga Alluvial Wetland and Grasslands',
      width: 1200,
      height: 800,
      aspectRatio: '3:2',
      attribution: 'Assam Wildlife Trust',
      tags: ['kaziranga', 'india', 'rhino-sanctuary', 'floodplain'],
      metadata: {
        country: 'India',
        state: 'Assam',
        biome: 'Brahmaputra Valley Semi-Evergreen & Floodplain',
        coordinates: '26.5775° N, 93.1711° E',
      },
    },
    serengeti: {
      id: 'area-serengeti',
      title: 'Serengeti National Park',
      description: 'Endless acacia savannas and historic migratory ungulate transit corridors in northern Tanzania',
      category: 'reserves' as const,
      url: 'https://images.unsplash.com/photo-1516426122078-c23e76319801?auto=format&fit=crop&w=1200&q=80',
      thumbnailUrl: 'https://images.unsplash.com/photo-1516426122078-c23e76319801?auto=format&fit=crop&w=360&q=80',
      alt: 'Serengeti Savanna Plains',
      width: 1200,
      height: 800,
      aspectRatio: '3:2',
      attribution: 'East African Protected Areas Survey',
      tags: ['serengeti', 'tanzania', 'savanna', 'migration'],
      metadata: {
        country: 'Tanzania',
        state: 'Mara & Simiyu Regions',
        biome: 'Tropical & Subtropical Grasslands, Savannas',
        coordinates: '2.3333° S, 34.8333° E',
      },
    },
    yasuni: {
      id: 'area-yasuni',
      title: 'Yasuní National Park & Biosphere',
      description: 'Primary equatorial Amazonian lowland rainforest canopy along the Napo and Tiputini riverways',
      category: 'reserves' as const,
      url: 'https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?auto=format&fit=crop&w=1200&q=80',
      thumbnailUrl: 'https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?auto=format&fit=crop&w=360&q=80',
      alt: 'Yasuní Amazon Rainforest Canopy',
      width: 1200,
      height: 800,
      aspectRatio: '3:2',
      attribution: 'Amazonian Biodiversity Repository',
      tags: ['yasuni', 'ecuador', 'amazon', 'rainforest'],
      metadata: {
        country: 'Ecuador',
        state: 'Orellana & Pastaza',
        biome: 'Dense Evergreen Lowland Tropical Rainforest',
        coordinates: '0.9850° S, 76.0120° W',
      },
    },
    mamiraua: {
      id: 'area-mamiraua',
      title: 'Mamirauá Sustainable Development Reserve',
      description: 'Seasonally flooded Amazonian várzea wetlands, blackwater igapó corridors, and aquatic forest',
      category: 'reserves' as const,
      url: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1200&q=80',
      thumbnailUrl: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=360&q=80',
      alt: 'Mamirauá Flooded Várzea Forest',
      width: 1200,
      height: 800,
      aspectRatio: '3:2',
      attribution: 'Solimões Aquatic Biodiversity Program',
      tags: ['mamiraua', 'brazil', 'varzea', 'wetland'],
      metadata: {
        country: 'Brazil',
        state: 'Amazonas',
        biome: 'Seasonally Flooded Várzea Riverine Biome',
        coordinates: '2.2610° S, 65.2280° W',
      },
    },
    virunga: {
      id: 'area-virunga',
      title: 'Virunga National Park',
      description: 'Albertine Rift montane cloud forests, bamboo bamboo zones, and volcanic slopes of Mikeno',
      category: 'reserves' as const,
      url: 'https://images.unsplash.com/photo-1534567153574-2b12153a87f0?auto=format&fit=crop&w=1200&q=80',
      thumbnailUrl: 'https://images.unsplash.com/photo-1534567153574-2b12153a87f0?auto=format&fit=crop&w=360&q=80',
      alt: 'Virunga Montane Cloud Forest and Volcanoes',
      width: 1200,
      height: 800,
      aspectRatio: '3:2',
      attribution: 'Virunga Foundation Archive',
      tags: ['virunga', 'drc', 'montane-forest', 'gorilla-habitat'],
      metadata: {
        country: 'DR Congo',
        state: 'North Kivu',
        biome: 'Montane Tropical Rainforest & Afro-Alpine',
        coordinates: '0.0820° S, 29.4910° E',
      },
    },
  },

  // --------------------------------------------------------------------------
  // Wildlife Species Photography (Key Indicators & Endangered Fauna)
  // --------------------------------------------------------------------------
  wildlife: {
    bengalTiger: {
      id: 'species-bengal-tiger',
      title: 'Royal Bengal Tiger (Panthera tigris tigris)',
      description: 'Apex predator and indicator species in Kanha, Bandhavgarh, and Kaziranga tiger landscapes',
      category: 'wildlife' as const,
      url: 'https://images.unsplash.com/photo-1561731216-c3a4d99437d5?auto=format&fit=crop&w=800&q=80',
      thumbnailUrl: 'https://images.unsplash.com/photo-1561731216-c3a4d99437d5?auto=format&fit=crop&w=240&q=80',
      alt: 'Royal Bengal Tiger in Forest Habitat',
      width: 800,
      height: 600,
      aspectRatio: '4:3',
      attribution: 'National Tiger Conservation Authority (NTCA)',
      tags: ['tiger', 'panthera-tigris', 'endangered', 'apex-predator'],
      metadata: { iucn: 'EN', habitat: 'Deciduous & Alluvial Forest' },
    },
    indianLeopard: {
      id: 'species-indian-leopard',
      title: 'Indian Leopard (Panthera pardus fusca)',
      description: 'Highly adaptable solitary feline thriving across rocky outcrops, buffer forests, and ridges',
      category: 'wildlife' as const,
      url: 'https://images.unsplash.com/photo-1456926631375-92c8ce872def?auto=format&fit=crop&w=800&q=80',
      thumbnailUrl: 'https://images.unsplash.com/photo-1456926631375-92c8ce872def?auto=format&fit=crop&w=240&q=80',
      alt: 'Indian Leopard on Tree Branch',
      width: 800,
      height: 600,
      aspectRatio: '4:3',
      attribution: 'Central Indian Feline Study',
      tags: ['leopard', 'panthera-pardus', 'vulnerable'],
      metadata: { iucn: 'VU', habitat: 'Rocky Escarpments & Mixed Jungle' },
    },
    barasingha: {
      id: 'species-barasingha',
      title: 'Hard-Ground Barasingha (Rucervus duvaucelii branderi)',
      description: 'Sub-species endemic to Kanha National Park rescued from the brink of extinction',
      category: 'wildlife' as const,
      url: 'https://images.unsplash.com/photo-1484406566174-9da000fda645?auto=format&fit=crop&w=800&q=80',
      thumbnailUrl: 'https://images.unsplash.com/photo-1484406566174-9da000fda645?auto=format&fit=crop&w=240&q=80',
      alt: 'Barasingha Swamp Deer in Meadow',
      width: 800,
      height: 600,
      aspectRatio: '4:3',
      attribution: 'Kanha Barasingha Recovery Program',
      tags: ['barasingha', 'swamp-deer', 'kanha', 'vulnerable'],
      metadata: { iucn: 'VU', habitat: 'Open Grassland Plateaus' },
    },
    indianRhino: {
      id: 'species-indian-rhino',
      title: 'Greater One-Horned Rhinoceros (Rhinoceros unicornis)',
      description: 'Keystone herbivore thriving in the marshlands and tall grasslands of Kaziranga',
      category: 'wildlife' as const,
      url: 'https://images.unsplash.com/photo-1575550959106-5a7defe28b56?auto=format&fit=crop&w=800&q=80',
      thumbnailUrl: 'https://images.unsplash.com/photo-1575550959106-5a7defe28b56?auto=format&fit=crop&w=240&q=80',
      alt: 'Greater One-Horned Rhinoceros in Wetland',
      width: 800,
      height: 600,
      aspectRatio: '4:3',
      attribution: 'Kaziranga Rhino Conservation Project',
      tags: ['rhino', 'kaziranga', 'herbivore', 'vulnerable'],
      metadata: { iucn: 'VU', habitat: 'Alluvial Grasslands & Marshes' },
    },
    asianElephant: {
      id: 'species-asian-elephant',
      title: 'Asian Elephant (Elephas maximus)',
      description: 'Landscape architect relying on contiguous forest corridors between Kaziranga and Karbi Anglong',
      category: 'wildlife' as const,
      url: 'https://images.unsplash.com/photo-1557050543-4d5f4e07ef46?auto=format&fit=crop&w=800&q=80',
      thumbnailUrl: 'https://images.unsplash.com/photo-1557050543-4d5f4e07ef46?auto=format&fit=crop&w=240&q=80',
      alt: 'Asian Elephant Herd in Forest Corridor',
      width: 800,
      height: 600,
      aspectRatio: '4:3',
      attribution: 'Elephant Corridor Ecology Network',
      tags: ['elephant', 'elephas-maximus', 'endangered', 'corridor'],
      metadata: { iucn: 'EN', habitat: 'Dense Canopy & Riparian Zones' },
    },
    slothBear: {
      id: 'species-sloth-bear',
      title: 'Indian Sloth Bear (Melursus ursinus)',
      description: 'Insectivorous forest bear inhabiting rocky ravines and termite-rich deciduous tracts in Satpura',
      category: 'wildlife' as const,
      url: 'https://images.unsplash.com/photo-1589656966895-2f33e7653819?auto=format&fit=crop&w=800&q=80',
      thumbnailUrl: 'https://images.unsplash.com/photo-1589656966895-2f33e7653819?auto=format&fit=crop&w=240&q=80',
      alt: 'Sloth Bear in Satpura Wilderness',
      width: 800,
      height: 600,
      aspectRatio: '4:3',
      attribution: 'Satpura Bear Survey',
      tags: ['sloth-bear', 'melursus-ursinus', 'vulnerable'],
      metadata: { iucn: 'VU', habitat: 'Sandstone Ravines & Termite Mounds' },
    },
    dhole: {
      id: 'species-dhole',
      title: 'Asiatic Wild Dog / Dhole (Cuon alpinus)',
      description: 'Endangered pack hunter requiring large unfragmented forest ranges across central India',
      category: 'wildlife' as const,
      url: 'https://images.unsplash.com/photo-1546182990-dffeafbe841d?auto=format&fit=crop&w=800&q=80',
      thumbnailUrl: 'https://images.unsplash.com/photo-1546182990-dffeafbe841d?auto=format&fit=crop&w=240&q=80',
      alt: 'Asiatic Wild Dog Pack',
      width: 800,
      height: 600,
      aspectRatio: '4:3',
      attribution: 'Canid Specialist Group',
      tags: ['dhole', 'cuon-alpinus', 'endangered', 'pack-hunter'],
      metadata: { iucn: 'EN', habitat: 'Unbroken Forest Tracts' },
    },
    mountainGorilla: {
      id: 'species-mountain-gorilla',
      title: 'Mountain Gorilla (Gorilla beringei beringei)',
      description: 'Critically monitored great ape inhabiting the Albertine Rift volcanic slopes in Virunga',
      category: 'wildlife' as const,
      url: 'https://images.unsplash.com/photo-1534567153574-2b12153a87f0?auto=format&fit=crop&w=800&q=80',
      thumbnailUrl: 'https://images.unsplash.com/photo-1534567153574-2b12153a87f0?auto=format&fit=crop&w=240&q=80',
      alt: 'Mountain Gorilla in Montane Forest',
      width: 800,
      height: 600,
      aspectRatio: '4:3',
      attribution: 'Greater Virunga Transboundary Collaboration',
      tags: ['gorilla', 'virunga', 'endangered', 'primate'],
      metadata: { iucn: 'EN', habitat: 'Montane Cloud Forest' },
    },
    amazonJaguar: {
      id: 'species-amazon-jaguar',
      title: 'Amazonian Jaguar (Panthera onca)',
      description: 'Solitary apex feline traversing the terra firme and flooded várzea forests of Yasuní and Mamirauá',
      category: 'wildlife' as const,
      url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=800&q=80',
      thumbnailUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=240&q=80',
      alt: 'Jaguar in Lowland Rainforest',
      width: 800,
      height: 600,
      aspectRatio: '4:3',
      attribution: 'WCS Amazon Camera Trap Network',
      tags: ['jaguar', 'panthera-onca', 'near-threatened'],
      metadata: { iucn: 'NT', habitat: 'Lowland Primary Rainforest' },
    },
  },

  // --------------------------------------------------------------------------
  // Satellite Imagery & Multi-Spectral Remote Sensing Products
  // --------------------------------------------------------------------------
  satellite: {
    sentinel2TrueColor: {
      id: 'sat-sentinel2-true-color',
      title: 'Sentinel-2 Level-2A Natural Color Composite (TCI)',
      description: 'Red, Green, Blue bands (B4, B3, B2) calibrated to bottom-of-atmosphere surface reflectance at 10m',
      category: 'satellite' as const,
      url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80',
      thumbnailUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=360&q=80',
      alt: 'Sentinel-2 Natural Color Surface Reflectance',
      width: 1200,
      height: 800,
      attribution: 'European Space Agency (ESA) Copernicus Sentinel-2',
      tags: ['sentinel-2', 'natural-color', 'optical', '10m'],
      metadata: { sensor: 'MSI', bands: 'B4-B3-B2', resolution: '10m' },
    },
    sentinel2FalseColorCir: {
      id: 'sat-sentinel2-false-color-cir',
      title: 'Color Infrared Vegetation Composite (CIR)',
      description: 'Near-infrared, Red, Green (B8, B4, B3) highlighting photosynthetically active chlorophyll absorption',
      category: 'satellite' as const,
      url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80',
      thumbnailUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=360&q=80',
      alt: 'False Color Infrared Vegetation Composite',
      width: 1200,
      height: 800,
      attribution: 'Copernicus Open Access Hub',
      tags: ['false-color', 'infrared', 'vegetation', 'cir'],
      metadata: { sensor: 'MSI', bands: 'B8-B4-B3', resolution: '10m' },
    },
    ndviComposite: {
      id: 'sat-ndvi-composite',
      title: 'Normalized Difference Vegetation Index (NDVI)',
      description: 'Continuous spectral vegetation index (B8-B4)/(B8+B4) with standard 5-step green/amber color palette',
      category: 'satellite' as const,
      url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1200&q=80',
      thumbnailUrl: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=360&q=80',
      alt: 'NDVI Vegetation Density Map Layer',
      width: 1200,
      height: 800,
      attribution: 'Google Earth Engine & Copernicus Sentinel-2',
      tags: ['ndvi', 'canopy-density', 'spectral-index'],
      metadata: { formula: '(B8 - B4) / (B8 + B4)', range: '-1.0 to +1.0' },
    },
    ndwiComposite: {
      id: 'sat-ndwi-composite',
      title: 'Normalized Difference Water Index (NDWI)',
      description: 'McFeeters water delineation index (B3-B8)/(B3+B8) distinguishing aquatic bodies from dry land',
      category: 'satellite' as const,
      url: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80',
      thumbnailUrl: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=360&q=80',
      alt: 'NDWI Water Index Hydro-Delineation Layer',
      width: 1200,
      height: 800,
      attribution: 'Copernicus Sentinel-2 Aquatic Monitoring',
      tags: ['ndwi', 'water-bodies', 'hydrology'],
      metadata: { formula: '(B3 - B8) / (B3 + B8)', range: '-1.0 to +1.0' },
    },
    ndbiComposite: {
      id: 'sat-ndbi-composite',
      title: 'Normalized Difference Built-Up Index (NDBI)',
      description: 'SWIR built-up and bare soil index (B11-B8)/(B11+B8) identifying road intrusions and settlement edges',
      category: 'satellite' as const,
      url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80',
      thumbnailUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=360&q=80',
      alt: 'NDBI Built-Up and Clearing Detection Layer',
      width: 1200,
      height: 800,
      attribution: 'Sentinel-2 Urban & Infrastructure Mask',
      tags: ['ndbi', 'built-up', 'encroachment', 'roads'],
      metadata: { formula: '(B11 - B8) / (B11 + B8)', range: '-1.0 to +1.0' },
    },
    bitemporalDivergence: {
      id: 'sat-bitemporal-divergence',
      title: 'Bi-Temporal Change Detection Divergence Map',
      description: 'Tri-color delta raster: Crimson red (severe canopy loss), Charcoal grey (stable), Emerald green (gain)',
      category: 'satellite' as const,
      url: 'https://images.unsplash.com/photo-1473448912268-2022ce9509d8?auto=format&fit=crop&w=1200&q=80',
      thumbnailUrl: 'https://images.unsplash.com/photo-1473448912268-2022ce9509d8?auto=format&fit=crop&w=360&q=80',
      alt: 'Bi-Temporal Diverging Change Detection Surface',
      width: 1200,
      height: 800,
      attribution: 'Wildlife Watch Bi-Temporal Difference Pipeline',
      tags: ['change-detection', 'delta-ndvi', 'divergence'],
      metadata: { deltaThreshold: '±0.10 NDVI', epochs: 'T0 Baseline vs T1 Target' },
    },
    sarRadarBackscatter: {
      id: 'sat-sar-radar-backscatter',
      title: 'Sentinel-1 C-Band Synthetic Aperture Radar (SAR)',
      description: 'Cloud-penetrating all-weather radar backscatter (VV/VH polarization) for flood & terrain structure',
      category: 'satellite' as const,
      url: 'https://images.unsplash.com/photo-1541185933-ef5d8ed016c2?auto=format&fit=crop&w=1200&q=80',
      thumbnailUrl: 'https://images.unsplash.com/photo-1541185933-ef5d8ed016c2?auto=format&fit=crop&w=360&q=80',
      alt: 'Sentinel-1 SAR Radar Backscatter Imagery',
      width: 1200,
      height: 800,
      attribution: 'ESA Copernicus Sentinel-1 SAR',
      tags: ['sar', 'radar', 'all-weather', 'sentinel-1'],
      metadata: { polarization: 'VV + VH', frequency: 'C-Band 5.405 GHz' },
    },
  },

  // --------------------------------------------------------------------------
  // Incident & Disturbance Hotspot Imagery (Field Evidence & Textures)
  // --------------------------------------------------------------------------
  hotspots: {
    canopyLoss: {
      id: 'hotspot-canopy-loss',
      title: 'Canopy Loss & Timber Extraction Perforation',
      description: 'Aerial telemetry texture depicting rapid clearings and unpermitted logging roads in dense canopy',
      category: 'hotspots' as const,
      url: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=1000&q=80',
      thumbnailUrl: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=300&q=80',
      alt: 'Canopy Loss and Forest Degradation Hotspot',
      width: 1000,
      height: 667,
      tags: ['logging', 'deforestation', 'canopy-loss', 'hotspot'],
    },
    fireHotspot: {
      id: 'hotspot-fire-active',
      title: 'Active Wildfire & Thermal Anomaly Scorch',
      description: 'Infrared satellite detection of high-temperature fire front and subsequent ground scorch scars',
      category: 'hotspots' as const,
      url: 'https://images.unsplash.com/photo-1493246507139-91e8fad9978e?auto=format&fit=crop&w=1000&q=80',
      thumbnailUrl: 'https://images.unsplash.com/photo-1493246507139-91e8fad9978e?auto=format&fit=crop&w=300&q=80',
      alt: 'Active Fire Hotspot and Thermal Radiative Power',
      width: 1000,
      height: 667,
      tags: ['wildfire', 'firms', 'thermal-anomaly', 'fire'],
    },
    waterStress: {
      id: 'hotspot-water-stress',
      title: 'Wetland Desiccation & Riverbed Recession',
      description: 'Seasonal drying and evaporative loss exposing bare sediment across protected wetland sanctuaries',
      category: 'hotspots' as const,
      url: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=1000&q=80',
      thumbnailUrl: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=300&q=80',
      alt: 'Wetland Desiccation and Water Loss Hotspot',
      width: 1000,
      height: 667,
      tags: ['water-loss', 'drought', 'wetland', 'desiccation'],
    },
    encroachment: {
      id: 'hotspot-encroachment',
      title: 'Agricultural Border Encroachment & Settlements',
      description: 'Human settlement expansion and cattle grazing expansion pressing against national park boundaries',
      category: 'hotspots' as const,
      url: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1000&q=80',
      thumbnailUrl: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=300&q=80',
      alt: 'Buffer Zone Agricultural Encroachment',
      width: 1000,
      height: 667,
      tags: ['encroachment', 'agriculture', 'buffer-zone', 'boundary'],
    },
  },

  // --------------------------------------------------------------------------
  // Cartographic Textures & UI Graphic Overlays
  // --------------------------------------------------------------------------
  ui: {
    gisGridPattern: {
      id: 'ui-gis-grid-pattern',
      title: 'Tactical GIS Coordinate Grid',
      description: 'SVG coordinate overlay for tactical dark GIS maps',
      category: 'ui' as const,
      url: createGisGridSvg(),
      thumbnailUrl: createGisGridSvg(),
      alt: 'GIS Coordinate Grid Overlay',
      tags: ['grid', 'gis', 'vector', 'overlay'],
    },
    radarReticle: {
      id: 'ui-radar-reticle',
      title: 'Targeting Radar Reticle',
      description: 'Concentric distance rings and bearing lines for spatial focus',
      category: 'ui' as const,
      url: createRadarReticleSvg(),
      thumbnailUrl: createRadarReticleSvg(),
      alt: 'Tactical Radar Reticle',
      tags: ['radar', 'reticle', 'tactical'],
    },
  },
} as const;

// ============================================================================
// VIDEO ASSETS CATALOG (Telemetry Loops, Drone Passes, Camera Traps)
// ============================================================================

export const VIDEOS = {
  // --------------------------------------------------------------------------
  // Drone Surveillance & Aerial Reconnaissance Passes
  // --------------------------------------------------------------------------
  dronePatrol: {
    canopyFlyover: {
      id: 'video-drone-canopy-flyover',
      title: 'Ranger Drone Aerial Canopy Patrol',
      description: 'Autonomous low-altitude aerial drone sweep traversing dense sal and teak forest canopy',
      category: 'drone_patrol' as const,
      url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      posterUrl: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1280&q=80',
      durationSeconds: 15,
      format: 'mp4' as const,
      resolution: '1080p',
      fps: 30,
      attribution: 'Wildlife Watch Airborne Telemetry Unit',
      tags: ['drone', 'patrol', 'canopy', 'aerial', 'surveillance'],
      metadata: { altitudeMeters: 120, sensor: 'RGB 4K Optical Gimbal' },
    },
    thermalPerimeterScan: {
      id: 'video-drone-thermal-scan',
      title: 'Night Thermal Infrared Perimeter Patrol',
      description: 'Long-wave infrared thermal drone sweep detecting heat anomalies along reserve boundaries',
      category: 'drone_patrol' as const,
      url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
      posterUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1280&q=80',
      durationSeconds: 15,
      format: 'mp4' as const,
      resolution: '1080p',
      fps: 30,
      attribution: 'National Park Anti-Poaching Night Squadron',
      tags: ['thermal', 'infrared', 'night-patrol', 'anti-poaching'],
      metadata: { sensor: 'FLIR Boson 640 LWIR', spectralRange: '7.5 - 13.5 µm' },
    },
    riverCorridorSweep: {
      id: 'video-drone-river-corridor',
      title: 'Riparian Wildlife Corridor Reconnaissance',
      description: 'Aerial transit tracing the riverbanks and sandbars of critical drinking corridors',
      category: 'drone_patrol' as const,
      url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
      posterUrl: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1280&q=80',
      durationSeconds: 12,
      format: 'mp4' as const,
      resolution: '1080p',
      fps: 30,
      attribution: 'Assam & Brahmaputra Basin Aerial Division',
      tags: ['river', 'corridor', 'riparian', 'reconnaissance'],
    },
  },

  // --------------------------------------------------------------------------
  // Satellite Orbital Time-Lapse (Multi-Epoch Greening & Disturbance)
  // --------------------------------------------------------------------------
  satelliteTimelapse: {
    seasonalGreeningCentralIndia: {
      id: 'video-timelapse-seasonal-greening',
      title: 'Central Indian Highlands 12-Month Phenological Greening',
      description: 'Sentinel-2 MSI multi-temporal time-lapse showing monsoon greening and dry season dormancy',
      category: 'satellite_timelapse' as const,
      url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4',
      posterUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1280&q=80',
      durationSeconds: 20,
      format: 'mp4' as const,
      resolution: '1080p',
      fps: 24,
      attribution: 'ESA Copernicus Sentinel-2 Multi-Temporal Mosaic',
      tags: ['timelapse', 'sentinel-2', 'phenology', 'greening', 'satellite'],
      metadata: { interval: '5-day revisit cadence', composite: 'Median Cloud-Masked TCI' },
    },
    deforestationRegressionAmazon: {
      id: 'video-timelapse-deforestation-regression',
      title: 'Rainforest Canopy Perforation Multi-Year Sequence',
      description: 'Longitudinal optical time-lapse tracking access road construction and localized edge fragmentation',
      category: 'satellite_timelapse' as const,
      url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WhatCarCanYouGetForAGrand.mp4',
      posterUrl: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=1280&q=80',
      durationSeconds: 15,
      format: 'mp4' as const,
      resolution: '1080p',
      fps: 24,
      attribution: 'Landsat / Sentinel Tropical Rainforest Observatory',
      tags: ['timelapse', 'canopy-loss', 'deforestation', 'amazon'],
    },
  },

  // --------------------------------------------------------------------------
  // Wildlife Camera Trap Feeds & Motion Sensors
  // --------------------------------------------------------------------------
  cameraTrap: {
    bengalTigerWaterhole: {
      id: 'video-cameratrap-tiger-waterhole',
      title: 'Camera Trap: Bengal Tiger at Forest Waterhole',
      description: 'Nocturnal passive infrared motion-triggered video of a male Bengal tiger in Kanha core range',
      category: 'camera_trap' as const,
      url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
      posterUrl: 'https://images.unsplash.com/photo-1561731216-c3a4d99437d5?auto=format&fit=crop&w=1280&q=80',
      durationSeconds: 30,
      format: 'mp4' as const,
      resolution: '1080p',
      fps: 30,
      attribution: 'Kanha Wildlife Monitoring Camera Trap Grid',
      tags: ['cameratrap', 'tiger', 'waterhole', 'wildlife', 'nocturnal'],
      metadata: { trigger: 'PIR Sensor', location: 'Waterpoint Station K-14' },
    },
    elephantHerdMigration: {
      id: 'video-cameratrap-elephant-passage',
      title: 'Camera Trap: Elephant Herd Corridor Transit',
      description: 'Motion sensor recording of Asian elephant matriarch and calves crossing designated wildlife underpass',
      category: 'camera_trap' as const,
      url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      posterUrl: 'https://images.unsplash.com/photo-1557050543-4d5f4e07ef46?auto=format&fit=crop&w=1280&q=80',
      durationSeconds: 30,
      format: 'mp4' as const,
      resolution: '1080p',
      fps: 30,
      attribution: 'Kaziranga-Karbi Anglong Eco-Corridor Cameras',
      tags: ['cameratrap', 'elephant', 'migration', 'corridor'],
      metadata: { trigger: 'PIR Sensor', location: 'Underpass Corridor #3' },
    },
  },

  // --------------------------------------------------------------------------
  // Operational Briefings & Mission Demonstrations
  // --------------------------------------------------------------------------
  operational: {
    platformOverviewBriefing: {
      id: 'video-op-platform-overview',
      title: 'Wildlife Watch Geo-Intelligence System Architecture',
      description: 'Operational briefing demonstrating multi-spectral indices, Earth Engine integration, and ranger alert dispatch',
      category: 'operational_briefing' as const,
      url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
      posterUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1280&q=80',
      durationSeconds: 45,
      format: 'mp4' as const,
      resolution: '1080p',
      fps: 24,
      attribution: 'Wildlife Watch System Briefing',
      tags: ['briefing', 'operational', 'gis', 'tutorial'],
    },
  },
} as const;

// ============================================================================
// CONVENIENCE LOOKUP UTILITIES & RESOLVERS
// ============================================================================

/**
 * Returns all image assets as a flattened array
 */
export function getAllImages(): ImageAsset[] {
  const list: ImageAsset[] = [];
  Object.values(IMAGES).forEach((group) => {
    Object.values(group).forEach((asset) => {
      list.push(asset as ImageAsset);
    });
  });
  return list;
}

/**
 * Returns all video assets as a flattened array
 */
export function getAllVideos(): VideoAsset[] {
  const list: VideoAsset[] = [];
  Object.values(VIDEOS).forEach((group) => {
    Object.values(group).forEach((asset) => {
      list.push(asset as VideoAsset);
    });
  });
  return list;
}

/**
 * Retrieves image asset by protected area identifier (e.g. 'area-kanha', 'area-1', 'kanha')
 */
export function getAreaImage(areaIdOrSlug: string): ImageAsset {
  const id = areaIdOrSlug.toLowerCase();
  if (id.includes('kanha')) return IMAGES.reserves.kanha;
  if (id.includes('bandhavgarh')) return IMAGES.reserves.bandhavgarh;
  if (id.includes('satpura')) return IMAGES.reserves.satpura;
  if (id.includes('kaziranga') || id === 'area-2') return IMAGES.reserves.kaziranga;
  if (id.includes('serengeti') || id === 'area-1') return IMAGES.reserves.serengeti;
  if (id.includes('yasuni') || id === 'area-3') return IMAGES.reserves.yasuni;
  if (id.includes('mamiraua') || id === 'area-4') return IMAGES.reserves.mamiraua;
  if (id.includes('virunga') || id === 'area-5') return IMAGES.reserves.virunga;
  return IMAGES.reserves.kanha;
}

/**
 * Retrieves image asset for a wildlife species by common name or scientific name
 */
export function getSpeciesImage(speciesQuery: string): ImageAsset {
  const query = speciesQuery.toLowerCase();
  if (query.includes('tiger') || query.includes('tigris')) return IMAGES.wildlife.bengalTiger;
  if (query.includes('leopard') || query.includes('pardus')) return IMAGES.wildlife.indianLeopard;
  if (query.includes('barasingha') || query.includes('swamp deer') || query.includes('duvaucelii'))
    return IMAGES.wildlife.barasingha;
  if (query.includes('rhino') || query.includes('unicornis')) return IMAGES.wildlife.indianRhino;
  if (query.includes('elephant') || query.includes('elephas') || query.includes('loxodonta'))
    return IMAGES.wildlife.asianElephant;
  if (query.includes('bear') || query.includes('melursus')) return IMAGES.wildlife.slothBear;
  if (query.includes('dhole') || query.includes('wild dog') || query.includes('cuon'))
    return IMAGES.wildlife.dhole;
  if (query.includes('gorilla') || query.includes('beringei')) return IMAGES.wildlife.mountainGorilla;
  if (query.includes('jaguar') || query.includes('onca')) return IMAGES.wildlife.amazonJaguar;
  return IMAGES.wildlife.bengalTiger;
}

/**
 * Retrieves satellite product composite image asset
 */
export function getSatelliteImage(
  product: 'true_color' | 'false_color' | 'ndvi' | 'ndwi' | 'ndbi' | 'change' | 'sar' | string
): ImageAsset {
  switch (product.toLowerCase()) {
    case 'false_color':
    case 'cir':
      return IMAGES.satellite.sentinel2FalseColorCir;
    case 'ndvi':
      return IMAGES.satellite.ndviComposite;
    case 'ndwi':
      return IMAGES.satellite.ndwiComposite;
    case 'ndbi':
      return IMAGES.satellite.ndbiComposite;
    case 'change':
    case 'divergence':
      return IMAGES.satellite.bitemporalDivergence;
    case 'sar':
    case 'radar':
      return IMAGES.satellite.sarRadarBackscatter;
    case 'true_color':
    default:
      return IMAGES.satellite.sentinel2TrueColor;
  }
}

/**
 * Retrieves disturbance hotspot image asset based on change type
 */
export function getHotspotImage(
  changeType: 'VEGETATION_LOSS' | 'WATER_LOSS' | 'FIRE' | 'ENCROACHMENT' | 'ROAD' | string
): ImageAsset {
  switch (changeType.toUpperCase()) {
    case 'FIRE':
      return IMAGES.hotspots.fireHotspot;
    case 'WATER_LOSS':
      return IMAGES.hotspots.waterStress;
    case 'ENCROACHMENT':
      return IMAGES.hotspots.encroachment;
    case 'VEGETATION_LOSS':
    default:
      return IMAGES.hotspots.canopyLoss;
  }
}

/**
 * Retrieves video asset by ID
 */
export function getVideoById(videoId: string): VideoAsset | undefined {
  return getAllVideos().find((v) => v.id === videoId);
}

/**
 * Retrieves video assets by category
 */
export function getVideosByCategory(category: VideoCategory): VideoAsset[] {
  return getAllVideos().filter((v) => v.category === category);
}

/**
 * Retrieves image assets by category
 */
export function getImagesByCategory(category: ImageCategory): ImageAsset[] {
  return getAllImages().filter((img) => img.category === category);
}

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export const ASSETS = {
  images: IMAGES,
  videos: VIDEOS,
  getAreaImage,
  getSpeciesImage,
  getSatelliteImage,
  getHotspotImage,
  getVideoById,
  getVideosByCategory,
  getImagesByCategory,
  getAllImages,
  getAllVideos,
  createGisGridSvg,
  createRadarReticleSvg,
  getPlaceholderImage,
};

export default ASSETS;
