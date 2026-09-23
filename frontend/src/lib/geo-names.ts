/**
 * Geo-Names & Spatial Reverse Geocoding Utility
 *
 * Resolves precise human-readable place names, reserve sectors, forest ranges,
 * districts, and administrative regions for geographic coordinates across the project.
 */

// Offline High-Precision Sector & Locality Registry for National Parks and Habitats
interface KnownSector {
  name: string;
  lat: number;
  lon: number;
  radiusKm: number;
  district?: string;
  state?: string;
  country?: string;
}

interface KnownHabitat {
  id: string;
  name: string;
  aliases: string[];
  centroid: { lat: number; lon: number };
  radiusKm: number;
  district: string;
  state: string;
  country: string;
  sectors: KnownSector[];
}

export const KNOWN_HABITATS: KnownHabitat[] = [
  {
    id: 'pench',
    name: 'Pench National Park & Tiger Reserve',
    aliases: ['pench', 'pench national park', 'pench tiger reserve'],
    centroid: { lat: 21.695, lon: 79.248 },
    radiusKm: 35,
    district: 'Seoni & Chhindwara',
    state: 'Madhya Pradesh',
    country: 'India',
    sectors: [
      { name: 'Kurai Sector (Buffer & Wildlife Corridor)', lat: 21.684, lon: 79.312, radiusKm: 6, district: 'Seoni', state: 'MP' },
      { name: 'Turia / Khawasa Core Range (Tiger Habitat)', lat: 21.661, lon: 79.288, radiusKm: 5, district: 'Seoni', state: 'MP' },
      { name: 'Karmajhiri Core Sanctuary Zone', lat: 21.712, lon: 79.335, radiusKm: 6, district: 'Seoni', state: 'MP' },
      { name: 'Totladoh Reservoir & Pench River Basin', lat: 21.705, lon: 79.245, radiusKm: 7, district: 'Seoni / Nagpur', state: 'MP / MH' },
      { name: 'Sillari Southern Range (Maharashtra Sector)', lat: 21.575, lon: 79.315, radiusKm: 8, district: 'Nagpur', state: 'Maharashtra' },
      { name: 'Jamblapani Forest Division', lat: 21.645, lon: 79.225, radiusKm: 6, district: 'Chhindwara', state: 'MP' },
      { name: 'Khamarpani Buffer Zone', lat: 21.785, lon: 79.215, radiusKm: 7, district: 'Chhindwara', state: 'MP' },
    ],
  },
  {
    id: 'tadoba',
    name: 'Tadoba-Andhari Tiger Reserve',
    aliases: ['tadoba', 'tadoba andhari', 'tadoba-andhari tiger reserve'],
    centroid: { lat: 20.252, lon: 79.334 },
    radiusKm: 38,
    district: 'Chandrapur',
    state: 'Maharashtra',
    country: 'India',
    sectors: [
      { name: 'Moharli Tourism & Buffer Gate Zone', lat: 20.268, lon: 79.352, radiusKm: 6, district: 'Chandrapur', state: 'Maharashtra' },
      { name: 'Tadoba Lake & Navegaon Core Sector', lat: 20.235, lon: 79.318, radiusKm: 5, district: 'Chandrapur', state: 'Maharashtra' },
      { name: 'Kolsa Wildlife Sanctuary Range', lat: 20.185, lon: 79.412, radiusKm: 7, district: 'Chandrapur', state: 'Maharashtra' },
      { name: 'Khutwanda Core Forest Sector', lat: 20.295, lon: 79.285, radiusKm: 5, district: 'Chandrapur', state: 'Maharashtra' },
      { name: 'Pangdi Buffer Corridor', lat: 20.145, lon: 79.385, radiusKm: 6, district: 'Chandrapur', state: 'Maharashtra' },
      { name: 'Erai River Catchment Zone', lat: 20.215, lon: 79.265, radiusKm: 6, district: 'Chandrapur', state: 'Maharashtra' },
    ],
  },
  {
    id: 'sundarbans',
    name: 'Sundarbans Biosphere Reserve & Tiger Reserve',
    aliases: ['sundarbans', 'sunderbans', 'sundarbans national park'],
    centroid: { lat: 21.949, lon: 88.853 },
    radiusKm: 60,
    district: 'South 24 Parganas',
    state: 'West Bengal',
    country: 'India',
    sectors: [
      { name: 'Gosaba / Sajnekhali Wildlife Sanctuary', lat: 21.962, lon: 88.874, radiusKm: 8, district: 'South 24 Parganas', state: 'West Bengal' },
      { name: 'Sudhanyakhali Delta & Mangrove Estuary', lat: 21.928, lon: 88.831, radiusKm: 7, district: 'South 24 Parganas', state: 'West Bengal' },
      { name: 'Netidhopani Core Forest Range', lat: 21.875, lon: 88.895, radiusKm: 9, district: 'South 24 Parganas', state: 'West Bengal' },
      { name: 'Pirkhali Tidal River Creek Sector', lat: 21.985, lon: 88.815, radiusKm: 6, district: 'South 24 Parganas', state: 'West Bengal' },
      { name: 'Jharkhali Buffer Island', lat: 22.015, lon: 88.705, radiusKm: 7, district: 'South 24 Parganas', state: 'West Bengal' },
    ],
  },
  {
    id: 'kaziranga',
    name: 'Kaziranga National Park',
    aliases: ['kaziranga', 'kaziranga national park'],
    centroid: { lat: 26.659, lon: 93.171 },
    radiusKm: 40,
    district: 'Golaghat & Nagaon',
    state: 'Assam',
    country: 'India',
    sectors: [
      { name: 'Kohora Central Forest Range', lat: 26.585, lon: 93.355, radiusKm: 8, district: 'Golaghat', state: 'Assam' },
      { name: 'Bagori Western Floodplain Range', lat: 26.575, lon: 93.195, radiusKm: 8, district: 'Nagaon', state: 'Assam' },
      { name: 'Agoratoli Eastern Eco-Zone', lat: 26.665, lon: 93.525, radiusKm: 9, district: 'Golaghat', state: 'Assam' },
      { name: 'Brahmaputra Riverine Corridor', lat: 26.715, lon: 93.285, radiusKm: 10, district: 'Sonitpur', state: 'Assam' },
    ],
  },
  {
    id: 'kanha',
    name: 'Kanha Tiger Reserve',
    aliases: ['kanha', 'kanha tiger reserve', 'kanha national park'],
    centroid: { lat: 22.334, lon: 80.611 },
    radiusKm: 45,
    district: 'Mandla & Balaghat',
    state: 'Madhya Pradesh',
    country: 'India',
    sectors: [
      { name: 'Kanha Core Meadow Sector', lat: 22.285, lon: 80.625, radiusKm: 7, district: 'Mandla', state: 'MP' },
      { name: 'Mukki Southern Dense Range', lat: 22.185, lon: 80.685, radiusKm: 8, district: 'Balaghat', state: 'MP' },
      { name: 'Kisli Dense Forest Zone', lat: 22.355, lon: 80.545, radiusKm: 7, district: 'Mandla', state: 'MP' },
      { name: 'Sarhi Northern Plateau Range', lat: 22.425, lon: 80.615, radiusKm: 8, district: 'Mandla', state: 'MP' },
    ],
  },
  {
    id: 'ranthambore',
    name: 'Ranthambore National Park',
    aliases: ['ranthambore', 'ranthambhore'],
    centroid: { lat: 26.017, lon: 76.502 },
    radiusKm: 35,
    district: 'Sawai Madhopur',
    state: 'Rajasthan',
    country: 'India',
    sectors: [
      { name: 'Padam Talao & Fort Core Zone', lat: 26.012, lon: 76.495, radiusKm: 5, district: 'Sawai Madhopur', state: 'Rajasthan' },
      { name: 'Rajbagh & Malik Lake Valley', lat: 26.035, lon: 76.515, radiusKm: 5, district: 'Sawai Madhopur', state: 'Rajasthan' },
      { name: 'Kachida & Kundal Buffer Range', lat: 26.075, lon: 76.445, radiusKm: 7, district: 'Sawai Madhopur', state: 'Rajasthan' },
      { name: 'Mansarovar Chambal Corridor', lat: 25.945, lon: 76.585, radiusKm: 8, district: 'Sawai Madhopur', state: 'Rajasthan' },
    ],
  },
  {
    id: 'corbett',
    name: 'Jim Corbett National Park',
    aliases: ['corbett', 'jim corbett'],
    centroid: { lat: 29.530, lon: 78.775 },
    radiusKm: 40,
    district: 'Nainital & Pauri Garhwal',
    state: 'Uttarakhand',
    country: 'India',
    sectors: [
      { name: 'Dhikala Core Grasslands Sector', lat: 29.625, lon: 78.815, radiusKm: 8, district: 'Pauri Garhwal', state: 'Uttarakhand' },
      { name: 'Bijrani Sal Forest Range', lat: 29.545, lon: 79.085, radiusKm: 6, district: 'Nainital', state: 'Uttarakhand' },
      { name: 'Jhirna Southern Buffer Zone', lat: 29.475, lon: 78.965, radiusKm: 6, district: 'Nainital', state: 'Uttarakhand' },
      { name: 'Ramganga Reservoir Catchment', lat: 29.615, lon: 78.725, radiusKm: 7, district: 'Pauri Garhwal', state: 'Uttarakhand' },
    ],
  },
  {
    id: 'bandhavgarh',
    name: 'Bandhavgarh National Park',
    aliases: ['bandhavgarh'],
    centroid: { lat: 23.702, lon: 81.028 },
    radiusKm: 32,
    district: 'Umaria',
    state: 'Madhya Pradesh',
    country: 'India',
    sectors: [
      { name: 'Tala Core Heritage Sector', lat: 23.685, lon: 81.015, radiusKm: 5, district: 'Umaria', state: 'MP' },
      { name: 'Magdhi Dense Woodland Range', lat: 23.735, lon: 81.065, radiusKm: 6, district: 'Umaria', state: 'MP' },
      { name: 'Khitauli Buffer Forest Corridor', lat: 23.645, lon: 80.975, radiusKm: 6, district: 'Umaria', state: 'MP' },
    ],
  },
  {
    id: 'gir',
    name: 'Gir National Park & Wildlife Sanctuary',
    aliases: ['gir', 'sasangir', 'sasan gir'],
    centroid: { lat: 21.124, lon: 70.824 },
    radiusKm: 45,
    district: 'Junagadh',
    state: 'Gujarat',
    country: 'India',
    sectors: [
      { name: 'Sasan Gir Core Sanctuary Zone', lat: 21.135, lon: 70.585, radiusKm: 7, district: 'Junagadh', state: 'Gujarat' },
      { name: 'Devalia Safari & Buffer Range', lat: 21.165, lon: 70.525, radiusKm: 6, district: 'Junagadh', state: 'Gujarat' },
      { name: 'Hiran River Water Basin', lat: 21.105, lon: 70.625, radiusKm: 7, district: 'Junagadh', state: 'Gujarat' },
    ],
  },
  {
    id: 'yellowstone',
    name: 'Yellowstone National Park',
    aliases: ['yellowstone'],
    centroid: { lat: 44.428, lon: -110.588 },
    radiusKm: 80,
    district: 'Park County',
    state: 'Wyoming',
    country: 'USA',
    sectors: [
      { name: 'Lamar Valley Wildlife Corridor', lat: 44.875, lon: -110.215, radiusKm: 15, state: 'Wyoming', country: 'USA' },
      { name: 'Yellowstone Lake Basin', lat: 44.455, lon: -110.365, radiusKm: 18, state: 'Wyoming', country: 'USA' },
      { name: 'Upper Geyser Basin & Old Faithful', lat: 44.462, lon: -110.828, radiusKm: 10, state: 'Wyoming', country: 'USA' },
      { name: 'Hayden Valley Bison Corridor', lat: 44.645, lon: -110.465, radiusKm: 12, state: 'Wyoming', country: 'USA' },
    ],
  },
  {
    id: 'serengeti',
    name: 'Serengeti National Park',
    aliases: ['serengeti'],
    centroid: { lat: -2.333, lon: 34.833 },
    radiusKm: 110,
    district: 'Mara Region',
    state: 'Mara',
    country: 'Tanzania',
    sectors: [
      { name: 'Seronera Central Valley', lat: -2.445, lon: 34.825, radiusKm: 25, country: 'Tanzania' },
      { name: 'Mara River Crossing Corridor', lat: -1.725, lon: 34.985, radiusKm: 20, country: 'Tanzania' },
      { name: 'Grumeti Western Migration Corridor', lat: -2.185, lon: 34.125, radiusKm: 25, country: 'Tanzania' },
    ],
  },
];

/**
 * Fast Haversine Distance in Kilometers
 */
export function haversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Cardinal Direction Calculation (e.g. North, South-East)
 */
export function getCardinalDirection(
  fromLat: number,
  fromLon: number,
  toLat: number,
  toLon: number
): string {
  const dLat = toLat - fromLat;
  const dLon = toLon - fromLon;
  const angle = (Math.atan2(dLon, dLat) * 180) / Math.PI; // -180 to 180
  const normalized = (angle + 360) % 360;

  if (normalized >= 337.5 || normalized < 22.5) return 'North';
  if (normalized >= 22.5 && normalized < 67.5) return 'NE';
  if (normalized >= 67.5 && normalized < 112.5) return 'East';
  if (normalized >= 112.5 && normalized < 157.5) return 'SE';
  if (normalized >= 157.5 && normalized < 202.5) return 'South';
  if (normalized >= 202.5 && normalized < 247.5) return 'SW';
  if (normalized >= 247.5 && normalized < 292.5) return 'West';
  return 'NW';
}

/**
 * Format coordinates nicely into directional strings, e.g. 21.6840° N, 79.3120° E
 */
export function formatCoordinates(lat: number, lon: number, digits = 4): string {
  if (typeof lat !== 'number' || typeof lon !== 'number' || isNaN(lat) || isNaN(lon)) {
    return '0.0000° N, 0.0000° E';
  }
  const latDir = lat >= 0 ? 'N' : 'S';
  const lonDir = lon >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(digits)}° ${latDir}, ${Math.abs(lon).toFixed(digits)}° ${lonDir}`;
}

export interface PlaceDetails {
  placeName: string;
  sectorName?: string;
  areaName?: string;
  district?: string;
  state?: string;
  country?: string;
  coordsFormatted: string;
  fullFormatted: string;
  distanceKm?: number;
}

/**
 * Synchronous, instant place-name resolver for coordinates.
 * Resolves to the exact reserve range, sector, district, and national park.
 */
export function getPlaceDetails(
  lat: number,
  lon: number,
  fallbackAreaName?: string | null
): PlaceDetails {
  const coordsFormatted = formatCoordinates(lat, lon);

  if (typeof lat !== 'number' || typeof lon !== 'number' || isNaN(lat) || isNaN(lon)) {
    return {
      placeName: fallbackAreaName || 'Protected Wildlife Area',
      coordsFormatted,
      fullFormatted: `${coordsFormatted} · ${fallbackAreaName || 'Protected Wildlife Area'}`,
    };
  }

  // 1. Check if fallbackAreaName matches any known habitat directly
  let matchingHabitat: KnownHabitat | undefined;
  if (fallbackAreaName) {
    const normName = fallbackAreaName.toLowerCase();
    matchingHabitat = KNOWN_HABITATS.find(
      (h) =>
        h.id === normName ||
        h.name.toLowerCase().includes(normName) ||
        normName.includes(h.name.toLowerCase()) ||
        h.aliases.some((a) => normName.includes(a) || a.includes(normName))
    );
  }

  // 2. If not found by name, find closest habitat by distance
  if (!matchingHabitat) {
    let closestHabitat: KnownHabitat | undefined;
    let minHabitatDist = Infinity;
    for (const h of KNOWN_HABITATS) {
      const d = haversineDistanceKm(lat, lon, h.centroid.lat, h.centroid.lon);
      if (d < minHabitatDist) {
        minHabitatDist = d;
        closestHabitat = h;
      }
    }
    if (closestHabitat && minHabitatDist <= closestHabitat.radiusKm) {
      matchingHabitat = closestHabitat;
    }
  }

  // 3. If within a known habitat, check sector proximity
  if (matchingHabitat) {
    let closestSector: KnownSector | undefined;
    let minSectorDist = Infinity;

    for (const sector of matchingHabitat.sectors) {
      const d = haversineDistanceKm(lat, lon, sector.lat, sector.lon);
      if (d < minSectorDist) {
        minSectorDist = d;
        closestSector = sector;
      }
    }

    // If within or close to a specific sector range
    if (closestSector && minSectorDist <= closestSector.radiusKm * 1.5) {
      const district = closestSector.district || matchingHabitat.district;
      const placeName = `${closestSector.name}, ${matchingHabitat.name} (${district})`;
      return {
        placeName,
        sectorName: closestSector.name,
        areaName: matchingHabitat.name,
        district,
        state: closestSector.state || matchingHabitat.state,
        country: matchingHabitat.country,
        coordsFormatted,
        fullFormatted: `${coordsFormatted} · ${placeName}`,
        distanceKm: minSectorDist,
      };
    }

    // If inside habitat but not near named sector, compute quadrant/cardinal relation
    const cardinal = getCardinalDirection(
      matchingHabitat.centroid.lat,
      matchingHabitat.centroid.lon,
      lat,
      lon
    );
    const distFromCenter = haversineDistanceKm(
      matchingHabitat.centroid.lat,
      matchingHabitat.centroid.lon,
      lat,
      lon
    );
    const zoneType = distFromCenter < matchingHabitat.radiusKm * 0.4 ? 'Core Sector' : 'Buffer Wildlife Range';
    const placeName = `${cardinal} ${zoneType}, ${matchingHabitat.name} (${matchingHabitat.district})`;

    return {
      placeName,
      sectorName: `${cardinal} ${zoneType}`,
      areaName: matchingHabitat.name,
      district: matchingHabitat.district,
      state: matchingHabitat.state,
      country: matchingHabitat.country,
      coordsFormatted,
      fullFormatted: `${coordsFormatted} · ${placeName}`,
      distanceKm: distFromCenter,
    };
  }

  // 4. If fallback area name is provided but wasn't in our curated habitat list
  if (fallbackAreaName) {
    const placeName = fallbackAreaName;
    return {
      placeName,
      areaName: fallbackAreaName,
      coordsFormatted,
      fullFormatted: `${coordsFormatted} · ${placeName}`,
    };
  }

  // 5. Global coordinate fallback
  const globalPlace = `Protected Sector (${lat >= 0 ? `${lat.toFixed(2)}°N` : `${(-lat).toFixed(2)}°S`}, ${lon >= 0 ? `${lon.toFixed(2)}°E` : `${(-lon).toFixed(2)}°W`})`;
  return {
    placeName: globalPlace,
    coordsFormatted,
    fullFormatted: `${coordsFormatted} · ${globalPlace}`,
  };
}

/**
 * Returns place name string for coordinates
 */
export function getPlaceName(lat: number, lon: number, fallbackAreaName?: string | null): string {
  return getPlaceDetails(lat, lon, fallbackAreaName).placeName;
}

/**
 * Returns formatted string: "21.6840° N, 79.3120° E · Kurai Sector, Pench National Park (Seoni)"
 */
export function formatCoordinatesWithPlace(
  lat: number,
  lon: number,
  fallbackAreaName?: string | null
): string {
  return getPlaceDetails(lat, lon, fallbackAreaName).fullFormatted;
}

// Client-Side Geocoding Cache for Async Lookups
const geocodeCache = new Map<string, string>();

/**
 * Asynchronously resolves place name via cached reverse geocoding if needed
 */
export async function resolvePlaceNameAsync(
  lat: number,
  lon: number,
  fallbackAreaName?: string | null
): Promise<string> {
  const local = getPlaceDetails(lat, lon, fallbackAreaName);
  // If we already resolved a high-precision sector or known habitat, return immediately
  if (local.sectorName) {
    return local.placeName;
  }

  const cacheKey = `${lat.toFixed(3)},${lon.toFixed(3)}`;
  if (geocodeCache.has(cacheKey)) {
    return geocodeCache.get(cacheKey)!;
  }

  // Check sessionStorage in browser environment
  if (typeof window !== 'undefined' && window.sessionStorage) {
    const cached = sessionStorage.getItem(`geo_${cacheKey}`);
    if (cached) {
      geocodeCache.set(cacheKey, cached);
      return cached;
    }
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=jsonv2&zoom=14`,
      {
        headers: {
          'Accept-Language': 'en',
          'User-Agent': 'CodeNiti-WildlifeMonitor/1.0',
        },
        signal: controller.signal,
      }
    );
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const addr = data.address || {};
      const locality =
        addr.suburb ||
        addr.village ||
        addr.town ||
        addr.city ||
        addr.county ||
        addr.natural ||
        addr.leisure ||
        data.name ||
        '';
      const district = addr.state_district || addr.district || addr.county || '';
      const state = addr.state || '';

      const parts = [locality, district, state].filter(Boolean);
      if (parts.length > 0) {
        const result = parts.join(', ');
        geocodeCache.set(cacheKey, result);
        if (typeof window !== 'undefined' && window.sessionStorage) {
          try {
            sessionStorage.setItem(`geo_${cacheKey}`, result);
          } catch {
            // ignore storage quota
          }
        }
        return result;
      }
    }
  } catch {
    // Network or abort error; fallback to synchronous calculation
  }

  return local.placeName;
}
