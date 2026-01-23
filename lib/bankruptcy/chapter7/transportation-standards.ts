/**
 * IRS Transportation Standards for Chapter 7 Means Test
 *
 * Data Source: IRS Collection Financial Standards (2025)
 * https://www.irs.gov/businesses/small-businesses-self-employed/local-standards-transportation
 *
 * Per Form B 122A-2 (Chapter 7 Means Test Calculation):
 * - Lines 10a-10b: Vehicle ownership costs (National Standards)
 * - Lines 11a-11b: Vehicle operating costs (Local Standards by region/metro area)
 * - Line 12: Public transportation (National Standard, if no vehicle)
 *
 * Operating costs are based on:
 * 1. Specific metropolitan areas (most accurate)
 * 2. Regional baseline (if county not in a metro area)
 */

// ============================================================================
// NATIONAL STANDARDS (same nationwide)
// ============================================================================

/**
 * Vehicle Ownership Costs - National Standard
 * Covers: lease or purchase payments
 */
export const VEHICLE_OWNERSHIP = {
  oneVehicle: 662,
  twoVehicles: 1324,
} as const;

/**
 * Public Transportation - National Standard
 * Used when debtor does not own/lease a vehicle
 */
export const PUBLIC_TRANSPORTATION = 244;

// ============================================================================
// REGIONAL BASELINE OPERATING COSTS
// ============================================================================

/**
 * Regional baseline operating costs for counties NOT in a specific metro area
 * Covers: fuel, maintenance, insurance, registration
 */
export const REGIONAL_BASELINE = {
  Northeast: { oneCar: 302, twoCars: 604 },
  Midwest: { oneCar: 259, twoCars: 518 },
  South: { oneCar: 281, twoCars: 562 },
  West: { oneCar: 297, twoCars: 594 },
} as const;

export type Region = keyof typeof REGIONAL_BASELINE;

// ============================================================================
// METRO AREA OPERATING COSTS
// ============================================================================

interface MetroArea {
  name: string;
  oneCar: number;
  twoCars: number;
  region: Region;
}

export const METRO_AREAS: Record<string, MetroArea> = {
  // Northeast
  BOSTON: { name: 'Boston', oneCar: 338, twoCars: 676, region: 'Northeast' },
  NEW_YORK: { name: 'New York', oneCar: 401, twoCars: 802, region: 'Northeast' },
  PHILADELPHIA: { name: 'Philadelphia', oneCar: 300, twoCars: 600, region: 'Northeast' },

  // Midwest
  CHICAGO: { name: 'Chicago', oneCar: 296, twoCars: 592, region: 'Midwest' },
  CLEVELAND: { name: 'Cleveland', oneCar: 259, twoCars: 518, region: 'Midwest' },
  DETROIT: { name: 'Detroit', oneCar: 365, twoCars: 730, region: 'Midwest' },
  MINNEAPOLIS: { name: 'Minneapolis-St. Paul', oneCar: 284, twoCars: 568, region: 'Midwest' },
  ST_LOUIS: { name: 'St. Louis', oneCar: 232, twoCars: 464, region: 'Midwest' },

  // South
  ATLANTA: { name: 'Atlanta', oneCar: 320, twoCars: 640, region: 'South' },
  BALTIMORE: { name: 'Baltimore', oneCar: 306, twoCars: 612, region: 'South' },
  DALLAS: { name: 'Dallas-Ft. Worth', oneCar: 320, twoCars: 640, region: 'South' },
  HOUSTON: { name: 'Houston', oneCar: 359, twoCars: 718, region: 'South' },
  MIAMI: { name: 'Miami', oneCar: 400, twoCars: 800, region: 'South' },
  TAMPA: { name: 'Tampa', oneCar: 335, twoCars: 670, region: 'South' },
  WASHINGTON_DC: { name: 'Washington, D.C.', oneCar: 295, twoCars: 590, region: 'South' },

  // West
  ANCHORAGE: { name: 'Anchorage', oneCar: 219, twoCars: 438, region: 'West' },
  DENVER: { name: 'Denver', oneCar: 337, twoCars: 674, region: 'West' },
  HONOLULU: { name: 'Honolulu', oneCar: 252, twoCars: 504, region: 'West' },
  LOS_ANGELES: { name: 'Los Angeles', oneCar: 353, twoCars: 706, region: 'West' },
  PHOENIX: { name: 'Phoenix', oneCar: 358, twoCars: 716, region: 'West' },
  SAN_DIEGO: { name: 'San Diego', oneCar: 335, twoCars: 670, region: 'West' },
  SAN_FRANCISCO: { name: 'San Francisco', oneCar: 362, twoCars: 724, region: 'West' },
  SEATTLE: { name: 'Seattle', oneCar: 270, twoCars: 540, region: 'West' },
} as const;

// ============================================================================
// COUNTY TO METRO AREA MAPPING
// ============================================================================

/**
 * Maps STATE -> COUNTY -> METRO_AREA_KEY
 * Counties not in this map use regional baseline
 */
export const COUNTY_TO_METRO: Record<string, Record<string, string>> = {
  // Massachusetts - Boston Metro
  MA: {
    ESSEX: 'BOSTON',
    MIDDLESEX: 'BOSTON',
    NORFOLK: 'BOSTON',
    PLYMOUTH: 'BOSTON',
    SUFFOLK: 'BOSTON',
  },

  // New Hampshire - Boston Metro
  NH: {
    ROCKINGHAM: 'BOSTON',
    STRAFFORD: 'BOSTON',
  },

  // New York State
  NY: {
    BRONX: 'NEW_YORK',
    KINGS: 'NEW_YORK',
    NASSAU: 'NEW_YORK',
    'NEW YORK': 'NEW_YORK',
    PUTNAM: 'NEW_YORK',
    QUEENS: 'NEW_YORK',
    RICHMOND: 'NEW_YORK',
    ROCKLAND: 'NEW_YORK',
    SUFFOLK: 'NEW_YORK',
    WESTCHESTER: 'NEW_YORK',
  },

  // New Jersey
  NJ: {
    // New York Metro
    BERGEN: 'NEW_YORK',
    ESSEX: 'NEW_YORK',
    HUDSON: 'NEW_YORK',
    HUNTERDON: 'NEW_YORK',
    MIDDLESEX: 'NEW_YORK',
    MONMOUTH: 'NEW_YORK',
    MORRIS: 'NEW_YORK',
    OCEAN: 'NEW_YORK',
    PASSAIC: 'NEW_YORK',
    SOMERSET: 'NEW_YORK',
    SUSSEX: 'NEW_YORK',
    UNION: 'NEW_YORK',
    // Philadelphia Metro
    BURLINGTON: 'PHILADELPHIA',
    CAMDEN: 'PHILADELPHIA',
    GLOUCESTER: 'PHILADELPHIA',
    SALEM: 'PHILADELPHIA',
  },

  // Pennsylvania - Philadelphia Metro
  PA: {
    BUCKS: 'PHILADELPHIA',
    CHESTER: 'PHILADELPHIA',
    DELAWARE: 'PHILADELPHIA',
    MONTGOMERY: 'PHILADELPHIA',
    PHILADELPHIA: 'PHILADELPHIA',
  },

  // Delaware - Philadelphia Metro
  DE: {
    'NEW CASTLE': 'PHILADELPHIA',
  },

  // Maryland
  MD: {
    // Philadelphia Metro
    CECIL: 'PHILADELPHIA',
    // Baltimore Metro
    'ANNE ARUNDEL': 'BALTIMORE',
    BALTIMORE: 'BALTIMORE',
    'BALTIMORE CITY': 'BALTIMORE',
    CARROLL: 'BALTIMORE',
    HARFORD: 'BALTIMORE',
    HOWARD: 'BALTIMORE',
    "QUEEN ANNE'S": 'BALTIMORE',
    // Washington DC Metro
    CHARLES: 'WASHINGTON_DC',
    FREDERICK: 'WASHINGTON_DC',
    MONTGOMERY: 'WASHINGTON_DC',
    'PRINCE GEORGE': 'WASHINGTON_DC',
    "PRINCE GEORGE'S": 'WASHINGTON_DC',
  },

  // District of Columbia
  DC: {
    DISTRICT: 'WASHINGTON_DC',
    'DISTRICT OF COLUMBIA': 'WASHINGTON_DC',
    WASHINGTON: 'WASHINGTON_DC',
  },

  // Virginia - Washington DC Metro
  VA: {
    ARLINGTON: 'WASHINGTON_DC',
    CLARKE: 'WASHINGTON_DC',
    CULPEPER: 'WASHINGTON_DC',
    FAIRFAX: 'WASHINGTON_DC',
    'FAIRFAX COUNTY': 'WASHINGTON_DC',
    FAUQUIER: 'WASHINGTON_DC',
    LOUDOUN: 'WASHINGTON_DC',
    'PRINCE WILLIAM': 'WASHINGTON_DC',
    RAPPAHANNOCK: 'WASHINGTON_DC',
    SPOTSYLVANIA: 'WASHINGTON_DC',
    STAFFORD: 'WASHINGTON_DC',
    WARREN: 'WASHINGTON_DC',
    ALEXANDRIA: 'WASHINGTON_DC',
    'FALLS CHURCH': 'WASHINGTON_DC',
    FREDERICKSBURG: 'WASHINGTON_DC',
    MANASSAS: 'WASHINGTON_DC',
    'MANASSAS PARK': 'WASHINGTON_DC',
  },

  // West Virginia - Washington DC Metro
  WV: {
    JEFFERSON: 'WASHINGTON_DC',
  },

  // Illinois
  IL: {
    // Chicago Metro
    COOK: 'CHICAGO',
    DEKALB: 'CHICAGO',
    DUPAGE: 'CHICAGO',
    GRUNDY: 'CHICAGO',
    KANE: 'CHICAGO',
    KENDALL: 'CHICAGO',
    LAKE: 'CHICAGO',
    MCHENRY: 'CHICAGO',
    WILL: 'CHICAGO',
    // St. Louis Metro
    BOND: 'ST_LOUIS',
    CALHOUN: 'ST_LOUIS',
    CLINTON: 'ST_LOUIS',
    JERSEY: 'ST_LOUIS',
    MACOUPIN: 'ST_LOUIS',
    MADISON: 'ST_LOUIS',
    MONROE: 'ST_LOUIS',
    'ST. CLAIR': 'ST_LOUIS',
    'ST CLAIR': 'ST_LOUIS',
  },

  // Indiana - Chicago Metro
  IN: {
    JASPER: 'CHICAGO',
    LAKE: 'CHICAGO',
    NEWTON: 'CHICAGO',
    PORTER: 'CHICAGO',
  },

  // Ohio - Cleveland Metro
  OH: {
    ASHTABULA: 'CLEVELAND',
    CUYAHOGA: 'CLEVELAND',
    GEAUGA: 'CLEVELAND',
    LAKE: 'CLEVELAND',
    LORAIN: 'CLEVELAND',
    MEDINA: 'CLEVELAND',
  },

  // Michigan - Detroit Metro
  MI: {
    LAPEER: 'DETROIT',
    LIVINGSTON: 'DETROIT',
    MACOMB: 'DETROIT',
    OAKLAND: 'DETROIT',
    'ST. CLAIR': 'DETROIT',
    'ST CLAIR': 'DETROIT',
    WAYNE: 'DETROIT',
  },

  // Minnesota - Minneapolis Metro
  MN: {
    ANOKA: 'MINNEAPOLIS',
    CARVER: 'MINNEAPOLIS',
    CHISAGO: 'MINNEAPOLIS',
    DAKOTA: 'MINNEAPOLIS',
    HENNEPIN: 'MINNEAPOLIS',
    ISANTI: 'MINNEAPOLIS',
    'LE SUEUR': 'MINNEAPOLIS',
    'MILLE LACS': 'MINNEAPOLIS',
    RAMSEY: 'MINNEAPOLIS',
    SCOTT: 'MINNEAPOLIS',
    SHERBURNE: 'MINNEAPOLIS',
    WASHINGTON: 'MINNEAPOLIS',
    WRIGHT: 'MINNEAPOLIS',
  },

  // Wisconsin - Minneapolis Metro
  WI: {
    PIERCE: 'MINNEAPOLIS',
    'ST. CROIX': 'MINNEAPOLIS',
    'ST CROIX': 'MINNEAPOLIS',
  },

  // Missouri - St. Louis Metro
  MO: {
    FRANKLIN: 'ST_LOUIS',
    JEFFERSON: 'ST_LOUIS',
    LINCOLN: 'ST_LOUIS',
    'ST. CHARLES': 'ST_LOUIS',
    'ST CHARLES': 'ST_LOUIS',
    'ST. LOUIS': 'ST_LOUIS',
    'ST LOUIS': 'ST_LOUIS',
    'ST. LOUIS CITY': 'ST_LOUIS',
    'ST LOUIS CITY': 'ST_LOUIS',
    WARREN: 'ST_LOUIS',
    CRAWFORD: 'ST_LOUIS',
  },

  // Georgia - Atlanta Metro
  GA: {
    BARROW: 'ATLANTA',
    BARTOW: 'ATLANTA',
    BUTTS: 'ATLANTA',
    CARROLL: 'ATLANTA',
    CHEROKEE: 'ATLANTA',
    CLAYTON: 'ATLANTA',
    COBB: 'ATLANTA',
    COWETA: 'ATLANTA',
    DAWSON: 'ATLANTA',
    DEKALB: 'ATLANTA',
    DOUGLAS: 'ATLANTA',
    FAYETTE: 'ATLANTA',
    FORSYTH: 'ATLANTA',
    FULTON: 'ATLANTA',
    GWINNETT: 'ATLANTA',
    HARALSON: 'ATLANTA',
    HEARD: 'ATLANTA',
    HENRY: 'ATLANTA',
    JASPER: 'ATLANTA',
    LUMPKIN: 'ATLANTA',
    MERIWETHER: 'ATLANTA',
    MORGAN: 'ATLANTA',
    NEWTON: 'ATLANTA',
    PAULDING: 'ATLANTA',
    PICKENS: 'ATLANTA',
    PIKE: 'ATLANTA',
    ROCKDALE: 'ATLANTA',
    SPALDING: 'ATLANTA',
    WALTON: 'ATLANTA',
  },

  // Texas
  TX: {
    // Dallas-Ft. Worth Metro
    COLLIN: 'DALLAS',
    DALLAS: 'DALLAS',
    DENTON: 'DALLAS',
    ELLIS: 'DALLAS',
    HUNT: 'DALLAS',
    JOHNSON: 'DALLAS',
    KAUFMAN: 'DALLAS',
    PARKER: 'DALLAS',
    ROCKWALL: 'DALLAS',
    TARRANT: 'DALLAS',
    WISE: 'DALLAS',
    // Houston Metro
    AUSTIN: 'HOUSTON',
    BRAZORIA: 'HOUSTON',
    CHAMBERS: 'HOUSTON',
    'FORT BEND': 'HOUSTON',
    GALVESTON: 'HOUSTON',
    HARRIS: 'HOUSTON',
    LIBERTY: 'HOUSTON',
    MONTGOMERY: 'HOUSTON',
    'SAN JACINTO': 'HOUSTON',
    WALLER: 'HOUSTON',
  },

  // Florida
  FL: {
    // Miami Metro
    BROWARD: 'MIAMI',
    'MIAMI-DADE': 'MIAMI',
    'PALM BEACH': 'MIAMI',
    // Tampa Metro
    HERNANDO: 'TAMPA',
    HILLSBOROUGH: 'TAMPA',
    PASCO: 'TAMPA',
    PINELLAS: 'TAMPA',
  },

  // Alaska - Anchorage Metro
  AK: {
    ANCHORAGE: 'ANCHORAGE',
    'MATANUSKA-SUSITNA': 'ANCHORAGE',
  },

  // Colorado - Denver Metro
  CO: {
    ADAMS: 'DENVER',
    ARAPAHOE: 'DENVER',
    BROOMFIELD: 'DENVER',
    'CLEAR CREEK': 'DENVER',
    DENVER: 'DENVER',
    DOUGLAS: 'DENVER',
    ELBERT: 'DENVER',
    GILPIN: 'DENVER',
    JEFFERSON: 'DENVER',
    PARK: 'DENVER',
  },

  // Hawaii - Honolulu Metro
  HI: {
    HONOLULU: 'HONOLULU',
  },

  // California
  CA: {
    // Los Angeles Metro
    'LOS ANGELES': 'LOS_ANGELES',
    ORANGE: 'LOS_ANGELES',
    // San Diego Metro
    'SAN DIEGO': 'SAN_DIEGO',
    // San Francisco Metro
    ALAMEDA: 'SAN_FRANCISCO',
    'CONTRA COSTA': 'SAN_FRANCISCO',
    MARIN: 'SAN_FRANCISCO',
    'SAN FRANCISCO': 'SAN_FRANCISCO',
    'SAN MATEO': 'SAN_FRANCISCO',
  },

  // Arizona - Phoenix Metro
  AZ: {
    MARICOPA: 'PHOENIX',
    PINAL: 'PHOENIX',
  },

  // Washington - Seattle Metro
  WA: {
    KING: 'SEATTLE',
    PIERCE: 'SEATTLE',
    SNOHOMISH: 'SEATTLE',
  },
};

// ============================================================================
// STATE TO REGION MAPPING
// ============================================================================

/**
 * Maps states to their IRS region for baseline operating costs
 */
export const STATE_TO_REGION: Record<string, Region> = {
  // Northeast
  CT: 'Northeast', ME: 'Northeast', MA: 'Northeast', NH: 'Northeast',
  NJ: 'Northeast', NY: 'Northeast', PA: 'Northeast', RI: 'Northeast',
  VT: 'Northeast',

  // Midwest
  IL: 'Midwest', IN: 'Midwest', IA: 'Midwest', KS: 'Midwest',
  MI: 'Midwest', MN: 'Midwest', MO: 'Midwest', NE: 'Midwest',
  ND: 'Midwest', OH: 'Midwest', SD: 'Midwest', WI: 'Midwest',

  // South
  AL: 'South', AR: 'South', DE: 'South', DC: 'South', FL: 'South',
  GA: 'South', KY: 'South', LA: 'South', MD: 'South', MS: 'South',
  NC: 'South', OK: 'South', SC: 'South', TN: 'South', TX: 'South',
  VA: 'South', WV: 'South',

  // West
  AK: 'West', AZ: 'West', CA: 'West', CO: 'West', HI: 'West',
  ID: 'West', MT: 'West', NV: 'West', NM: 'West', OR: 'West',
  UT: 'West', WA: 'West', WY: 'West',
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export interface TransportationAllowance {
  ownership: number;
  operating: number;
  publicTransit: number;
  total: number;
  // Metadata for transparency
  metroArea?: string;
  region: Region;
  usingMetroData: boolean;
}

/**
 * Get operating costs for a specific location
 *
 * @param state - Two-letter state code
 * @param county - County name (for metro area lookup)
 * @param vehicleCount - Number of vehicles (1 or 2)
 * @returns Operating cost allowance
 */
export function getOperatingCosts(
  state: string,
  county: string | null | undefined,
  vehicleCount: number
): { cost: number; metroArea?: string; region: Region; usingMetroData: boolean } {
  const normalizedState = state.toUpperCase();
  const normalizedCounty = county?.toUpperCase().replace(' COUNTY', '').trim();
  const vehicles = Math.min(Math.max(vehicleCount, 0), 2);

  // Get region for this state
  const region = STATE_TO_REGION[normalizedState] || 'South';

  // Try to find metro area for this county
  if (normalizedCounty) {
    const stateCounties = COUNTY_TO_METRO[normalizedState];
    if (stateCounties) {
      const metroKey = stateCounties[normalizedCounty];
      if (metroKey && METRO_AREAS[metroKey]) {
        const metro = METRO_AREAS[metroKey];
        return {
          cost: vehicles === 2 ? metro.twoCars : (vehicles === 1 ? metro.oneCar : 0),
          metroArea: metro.name,
          region: metro.region,
          usingMetroData: true,
        };
      }
    }
  }

  // Fall back to regional baseline
  const baseline = REGIONAL_BASELINE[region];
  return {
    cost: vehicles === 2 ? baseline.twoCars : (vehicles === 1 ? baseline.oneCar : 0),
    region,
    usingMetroData: false,
  };
}

/**
 * Get ownership costs (national standard)
 *
 * @param vehicleCount - Number of vehicles (0, 1, or 2)
 * @returns Ownership cost allowance
 */
export function getOwnershipCosts(vehicleCount: number): number {
  const vehicles = Math.min(Math.max(vehicleCount, 0), 2);
  if (vehicles === 0) return 0;
  return vehicles === 1 ? VEHICLE_OWNERSHIP.oneVehicle : VEHICLE_OWNERSHIP.twoVehicles;
}

/**
 * Calculate complete transportation allowance per Form B 122A-2
 *
 * @param state - Two-letter state code
 * @param county - County name (for regional operating costs)
 * @param vehicleCount - Number of vehicles owned/leased
 * @param usesPublicTransit - Whether debtor uses public transportation (only if no vehicle)
 * @returns Complete transportation allowance breakdown
 */
export function calculateTransportationAllowance(
  state: string,
  county: string | null | undefined,
  vehicleCount: number,
  usesPublicTransit: boolean = false
): TransportationAllowance {
  const vehicles = Math.min(Math.max(vehicleCount, 0), 2);
  const region = STATE_TO_REGION[state.toUpperCase()] || 'South';

  // If no vehicles and uses public transit
  if (vehicles === 0 && usesPublicTransit) {
    return {
      ownership: 0,
      operating: 0,
      publicTransit: PUBLIC_TRANSPORTATION,
      total: PUBLIC_TRANSPORTATION,
      region,
      usingMetroData: false,
    };
  }

  // If no vehicles and no public transit
  if (vehicles === 0) {
    return {
      ownership: 0,
      operating: 0,
      publicTransit: 0,
      total: 0,
      region,
      usingMetroData: false,
    };
  }

  // Has vehicle(s) - calculate ownership + operating
  const ownership = getOwnershipCosts(vehicles);
  const operatingResult = getOperatingCosts(state, county, vehicles);

  return {
    ownership,
    operating: operatingResult.cost,
    publicTransit: 0,
    total: ownership + operatingResult.cost,
    metroArea: operatingResult.metroArea,
    region: operatingResult.region,
    usingMetroData: operatingResult.usingMetroData,
  };
}

/**
 * Check if a county is in a recognized metro area
 */
export function isInMetroArea(state: string, county: string): boolean {
  const normalizedState = state.toUpperCase();
  const normalizedCounty = county.toUpperCase().replace(' COUNTY', '').trim();

  const stateCounties = COUNTY_TO_METRO[normalizedState];
  if (!stateCounties) return false;

  return normalizedCounty in stateCounties;
}

/**
 * Get metro area name for a county (if any)
 */
export function getMetroAreaForCounty(state: string, county: string): string | null {
  const normalizedState = state.toUpperCase();
  const normalizedCounty = county.toUpperCase().replace(' COUNTY', '').trim();

  const stateCounties = COUNTY_TO_METRO[normalizedState];
  if (!stateCounties) return null;

  const metroKey = stateCounties[normalizedCounty];
  if (!metroKey) return null;

  return METRO_AREAS[metroKey]?.name || null;
}
