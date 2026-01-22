/**
 * IRS Collection Financial Standards for Bankruptcy Means Test
 * These standards are used to determine allowable expenses in Chapter 7 bankruptcy
 * Data is based on 2024 IRS standards (update annually)
 */

// National Standards - same for all states
// These cover food, clothing, housekeeping supplies, personal care products, and miscellaneous
export const NATIONAL_STANDARDS = {
  // Single person
  1: {
    food: 733,
    housekeeping: 40,
    apparel: 99,
    personalCare: 44,
    miscellaneous: 149,
    total: 1065,
  },
  // Two persons
  2: {
    food: 858,
    housekeeping: 79,
    apparel: 186,
    personalCare: 68,
    miscellaneous: 265,
    total: 1456,
  },
  // Three persons
  3: {
    food: 1027,
    housekeeping: 79,
    apparel: 223,
    personalCare: 68,
    miscellaneous: 290,
    total: 1687,
  },
  // Four persons
  4: {
    food: 1209,
    housekeeping: 88,
    apparel: 284,
    personalCare: 78,
    miscellaneous: 351,
    total: 2010,
  },
  // Additional per person over 4
  additionalPerson: {
    food: 274,
    housekeeping: 0,
    apparel: 74,
    personalCare: 26,
    miscellaneous: 73,
    total: 447,
  },
};

// Health care standards (out-of-pocket costs)
export const HEALTH_CARE_STANDARDS = {
  under65: 75,
  age65OrOlder: 153,
};

// Local Standards - Housing and Utilities by state
// This is a simplified version - in production, you'd want county-level data
export const LOCAL_HOUSING_STANDARDS: Record<string, Record<number, number>> = {
  // Format: state: { householdSize: monthlyAmount }
  AL: { 1: 1200, 2: 1410, 3: 1470, 4: 1620, 5: 1690 },
  AK: { 1: 1560, 2: 1850, 3: 1920, 4: 2100, 5: 2190 },
  AZ: { 1: 1410, 2: 1670, 3: 1740, 4: 1910, 5: 1990 },
  AR: { 1: 1080, 2: 1280, 3: 1330, 4: 1460, 5: 1520 },
  CA: { 1: 2430, 2: 2860, 3: 2970, 4: 3260, 5: 3400 },
  CO: { 1: 1710, 2: 2020, 3: 2100, 4: 2310, 5: 2400 },
  CT: { 1: 1920, 2: 2260, 3: 2350, 4: 2580, 5: 2690 },
  DE: { 1: 1440, 2: 1700, 3: 1770, 4: 1940, 5: 2020 },
  DC: { 1: 2280, 2: 2690, 3: 2800, 4: 3070, 5: 3200 },
  FL: { 1: 1530, 2: 1800, 3: 1870, 4: 2060, 5: 2150 },
  GA: { 1: 1350, 2: 1590, 3: 1660, 4: 1820, 5: 1900 },
  HI: { 1: 2100, 2: 2480, 3: 2580, 4: 2830, 5: 2950 },
  ID: { 1: 1260, 2: 1490, 3: 1550, 4: 1700, 5: 1770 },
  IL: { 1: 1470, 2: 1730, 3: 1800, 4: 1980, 5: 2060 },
  IN: { 1: 1170, 2: 1380, 3: 1440, 4: 1580, 5: 1640 },
  IA: { 1: 1110, 2: 1310, 3: 1360, 4: 1500, 5: 1560 },
  KS: { 1: 1170, 2: 1380, 3: 1440, 4: 1580, 5: 1640 },
  KY: { 1: 1110, 2: 1310, 3: 1360, 4: 1500, 5: 1560 },
  LA: { 1: 1170, 2: 1380, 3: 1440, 4: 1580, 5: 1640 },
  ME: { 1: 1350, 2: 1590, 3: 1660, 4: 1820, 5: 1900 },
  MD: { 1: 1860, 2: 2200, 3: 2290, 4: 2510, 5: 2620 },
  MA: { 1: 2070, 2: 2440, 3: 2540, 4: 2790, 5: 2910 },
  MI: { 1: 1230, 2: 1450, 3: 1510, 4: 1660, 5: 1730 },
  MN: { 1: 1380, 2: 1630, 3: 1690, 4: 1860, 5: 1940 },
  MS: { 1: 1080, 2: 1280, 3: 1330, 4: 1460, 5: 1520 },
  MO: { 1: 1170, 2: 1380, 3: 1440, 4: 1580, 5: 1640 },
  MT: { 1: 1230, 2: 1450, 3: 1510, 4: 1660, 5: 1730 },
  NE: { 1: 1170, 2: 1380, 3: 1440, 4: 1580, 5: 1640 },
  NV: { 1: 1440, 2: 1700, 3: 1770, 4: 1940, 5: 2020 },
  NH: { 1: 1650, 2: 1950, 3: 2030, 4: 2230, 5: 2320 },
  NJ: { 1: 2010, 2: 2370, 3: 2470, 4: 2710, 5: 2820 },
  NM: { 1: 1200, 2: 1420, 3: 1480, 4: 1620, 5: 1690 },
  NY: { 1: 1890, 2: 2230, 3: 2320, 4: 2540, 5: 2650 },
  NC: { 1: 1290, 2: 1520, 3: 1580, 4: 1740, 5: 1810 },
  ND: { 1: 1140, 2: 1340, 3: 1400, 4: 1530, 5: 1600 },
  OH: { 1: 1200, 2: 1410, 3: 1470, 4: 1620, 5: 1690 },
  OK: { 1: 1110, 2: 1310, 3: 1360, 4: 1500, 5: 1560 },
  OR: { 1: 1590, 2: 1870, 3: 1950, 4: 2140, 5: 2230 },
  PA: { 1: 1350, 2: 1590, 3: 1660, 4: 1820, 5: 1900 },
  RI: { 1: 1620, 2: 1910, 3: 1990, 4: 2180, 5: 2270 },
  SC: { 1: 1230, 2: 1450, 3: 1510, 4: 1660, 5: 1730 },
  SD: { 1: 1140, 2: 1340, 3: 1400, 4: 1530, 5: 1600 },
  TN: { 1: 1200, 2: 1410, 3: 1470, 4: 1620, 5: 1690 },
  TX: { 1: 1380, 2: 1630, 3: 1690, 4: 1860, 5: 1940 },
  UT: { 1: 1410, 2: 1660, 3: 1730, 4: 1900, 5: 1980 },
  VT: { 1: 1500, 2: 1770, 3: 1840, 4: 2020, 5: 2100 },
  VA: { 1: 1650, 2: 1950, 3: 2030, 4: 2230, 5: 2320 },
  WA: { 1: 1770, 2: 2090, 3: 2170, 4: 2390, 5: 2490 },
  WV: { 1: 1050, 2: 1240, 3: 1290, 4: 1420, 5: 1480 },
  WI: { 1: 1260, 2: 1490, 3: 1550, 4: 1700, 5: 1770 },
  WY: { 1: 1200, 2: 1420, 3: 1480, 4: 1620, 5: 1690 },
};

// Transportation Standards
export const TRANSPORTATION_STANDARDS = {
  // Public transportation (where applicable)
  publicTransportation: 242,

  // Vehicle ownership costs (per vehicle)
  ownership: {
    oneVehicle: 588,
    twoVehicles: 1176,
  },

  // Operating costs (fuel, maintenance, insurance) - varies by region
  // Simplified to national average
  operating: {
    oneVehicle: 303,
    twoVehicles: 606,
  },
};

// State Median Income by household size (2024)
// Used to determine if debtor is above or below median income for means test
export const STATE_MEDIAN_INCOME: Record<string, number[]> = {
  // Format: state: [1-person, 2-person, 3-person, 4-person, additional per person]
  AL: [52419, 66553, 75547, 92073, 9000],
  AK: [71632, 88814, 100291, 117434, 9000],
  AZ: [55776, 71912, 81115, 99048, 9000],
  AR: [48236, 60987, 71009, 84515, 9000],
  CA: [67882, 88738, 98681, 119799, 9000],
  CO: [70892, 89835, 103014, 122012, 9000],
  CT: [74825, 96166, 115165, 139892, 9000],
  DE: [65072, 81927, 94970, 111886, 9000],
  DC: [87284, 123073, 134880, 165254, 9000],
  FL: [55829, 71122, 81086, 97582, 9000],
  GA: [57099, 72555, 85091, 101505, 9000],
  HI: [72680, 89685, 101859, 117706, 9000],
  ID: [55556, 70130, 79788, 95007, 9000],
  IL: [64058, 82254, 97287, 115715, 9000],
  IN: [55879, 71284, 83661, 99968, 9000],
  IA: [59395, 75382, 89005, 106655, 9000],
  KS: [58808, 74769, 88566, 106166, 9000],
  KY: [51014, 65276, 77109, 93255, 9000],
  LA: [49898, 64285, 74507, 92217, 9000],
  ME: [57624, 71944, 87089, 103912, 9000],
  MD: [79971, 101772, 119692, 142399, 9000],
  MA: [77378, 99580, 119712, 145892, 9000],
  MI: [57244, 72677, 87033, 103772, 9000],
  MN: [68212, 87199, 103628, 123800, 9000],
  MS: [45081, 57933, 66989, 82509, 9000],
  MO: [55724, 70916, 84140, 100621, 9000],
  MT: [57115, 70909, 83716, 100135, 9000],
  NE: [61475, 78112, 92147, 111155, 9000],
  NV: [58893, 72897, 82862, 99001, 9000],
  NH: [76082, 96283, 113837, 135584, 9000],
  NJ: [79931, 100891, 119476, 143884, 9000],
  NM: [49838, 62833, 72116, 87361, 9000],
  NY: [65323, 84006, 99262, 120172, 9000],
  NC: [54683, 69558, 82181, 98547, 9000],
  ND: [65082, 82093, 97116, 114915, 9000],
  OH: [56267, 71597, 85391, 102209, 9000],
  OK: [51752, 65515, 77167, 93052, 9000],
  OR: [62177, 78645, 91549, 109254, 9000],
  PA: [60979, 77666, 93136, 111929, 9000],
  RI: [68079, 86348, 103125, 123901, 9000],
  SC: [52787, 67153, 79207, 95507, 9000],
  SD: [58859, 74127, 87932, 105392, 9000],
  TN: [53560, 68016, 80147, 96640, 9000],
  TX: [58887, 74310, 84697, 102127, 9000],
  UT: [67341, 81632, 91611, 106835, 9000],
  VT: [62227, 78064, 93714, 113152, 9000],
  VA: [72206, 91564, 107736, 128454, 9000],
  WA: [72523, 91802, 107018, 126463, 9000],
  WV: [46711, 60134, 71035, 84929, 9000],
  WI: [60652, 77382, 92408, 110773, 9000],
  WY: [63741, 79696, 92898, 109620, 9000],
};

// Chapter 7 debt limits (as of 2024)
export const CHAPTER_7_LIMITS = {
  // For the presumption of abuse calculation
  disposableIncomeThreshold25: 8625, // 25% of priority + unsecured debt or $8,625
  disposableIncomeThreshold60: 14375, // 60 months x monthly disposable
  minimumDisposableIncome: 143.75, // Monthly threshold ($8,625 / 60)
};

// Helper functions
export function getNationalStandardTotal(householdSize: number): number {
  if (householdSize <= 0) return 0;
  if (householdSize <= 4) {
    return NATIONAL_STANDARDS[householdSize as 1 | 2 | 3 | 4].total;
  }
  // For households > 4, add per-person amount
  const baseFour = NATIONAL_STANDARDS[4].total;
  const additional = (householdSize - 4) * NATIONAL_STANDARDS.additionalPerson.total;
  return baseFour + additional;
}

export function getHousingStandard(state: string, householdSize: number): number {
  const stateStandards = LOCAL_HOUSING_STANDARDS[state.toUpperCase()];
  if (!stateStandards) {
    // Default to national average if state not found
    return 1500;
  }

  const size = Math.min(Math.max(householdSize, 1), 5);
  return stateStandards[size] || stateStandards[5];
}

export function getTransportationStandard(
  hasVehicle: boolean,
  vehicleCount: number = 1,
  usesPublicTransportation: boolean = false
): number {
  if (usesPublicTransportation && !hasVehicle) {
    return TRANSPORTATION_STANDARDS.publicTransportation;
  }

  const vehicles = Math.min(vehicleCount, 2);
  const ownershipKey = vehicles === 1 ? 'oneVehicle' : 'twoVehicles';
  const operatingKey = vehicles === 1 ? 'oneVehicle' : 'twoVehicles';

  return (
    TRANSPORTATION_STANDARDS.ownership[ownershipKey] +
    TRANSPORTATION_STANDARDS.operating[operatingKey]
  );
}

export function getStateMedianIncome(state: string, householdSize: number): number {
  const stateMedian = STATE_MEDIAN_INCOME[state.toUpperCase()];
  if (!stateMedian) {
    // Default to national average
    return 60000 + (householdSize - 1) * 15000;
  }

  if (householdSize <= 4) {
    return stateMedian[householdSize - 1] || stateMedian[0];
  }

  // For households > 4, add additional per person
  const baseFour = stateMedian[3];
  const additionalPerPerson = stateMedian[4];
  return baseFour + (householdSize - 4) * additionalPerPerson;
}

export function getHealthCareStandard(age: number, householdSize: number): number {
  // Simplified: assume one person over 65 for every 2 people in household of 4+
  const over65Count = Math.floor(householdSize / 4);
  const under65Count = householdSize - over65Count;

  if (age >= 65) {
    return HEALTH_CARE_STANDARDS.age65OrOlder * householdSize;
  }

  return (
    HEALTH_CARE_STANDARDS.under65 * under65Count +
    HEALTH_CARE_STANDARDS.age65OrOlder * over65Count
  );
}

// Calculate total allowable IRS expenses for means test
export interface MeansTestAllowances {
  nationalStandards: number;
  housingUtilities: number;
  transportation: number;
  healthCare: number;
  total: number;
}

export function calculateIRSAllowances(
  state: string,
  householdSize: number,
  hasVehicle: boolean = true,
  vehicleCount: number = 1,
  primaryAge: number = 40
): MeansTestAllowances {
  const nationalStandards = getNationalStandardTotal(householdSize);
  const housingUtilities = getHousingStandard(state, householdSize);
  const transportation = getTransportationStandard(hasVehicle, vehicleCount);
  const healthCare = getHealthCareStandard(primaryAge, householdSize);

  return {
    nationalStandards,
    housingUtilities,
    transportation,
    healthCare,
    total: nationalStandards + housingUtilities + transportation + healthCare,
  };
}

// Determine if debtor passes the means test
export interface MeansTestResult {
  passes: boolean;
  annualIncome: number;
  medianIncome: number;
  isAboveMedian: boolean;
  monthlyDisposableIncome?: number;
  sixtyMonthDisposable?: number;
  presumptionOfAbuse: boolean;
  reason: string;
}

export function calculateMeansTest(
  state: string,
  householdSize: number,
  monthlyGrossIncome: number,
  monthlyExpenses: number,
  totalUnsecuredDebt: number,
  hasVehicle: boolean = true,
  vehicleCount: number = 1,
  primaryAge: number = 40
): MeansTestResult {
  const annualIncome = monthlyGrossIncome * 12;
  const medianIncome = getStateMedianIncome(state, householdSize);
  const isAboveMedian = annualIncome > medianIncome;

  // If below median, automatically passes
  if (!isAboveMedian) {
    return {
      passes: true,
      annualIncome,
      medianIncome,
      isAboveMedian: false,
      presumptionOfAbuse: false,
      reason: 'Income is below state median - qualifies for Chapter 7',
    };
  }

  // Above median - need to calculate disposable income
  const irsAllowances = calculateIRSAllowances(
    state,
    householdSize,
    hasVehicle,
    vehicleCount,
    primaryAge
  );

  // Use the greater of actual expenses or IRS standards
  const allowableExpenses = Math.max(monthlyExpenses, irsAllowances.total);
  const monthlyDisposableIncome = monthlyGrossIncome - allowableExpenses;
  const sixtyMonthDisposable = monthlyDisposableIncome * 60;

  // Determine presumption of abuse
  // Presumption arises if:
  // 1. Monthly disposable income >= $14,375/60 (~$239.58), OR
  // 2. Monthly disposable income can pay 25% of unsecured debt over 60 months
  const minimumThreshold = CHAPTER_7_LIMITS.disposableIncomeThreshold60 / 60;
  const twentyFivePercentDebt = (totalUnsecuredDebt * 0.25) / 60;

  const presumptionOfAbuse =
    monthlyDisposableIncome >= minimumThreshold ||
    (monthlyDisposableIncome > 0 && monthlyDisposableIncome >= twentyFivePercentDebt);

  if (!presumptionOfAbuse) {
    return {
      passes: true,
      annualIncome,
      medianIncome,
      isAboveMedian: true,
      monthlyDisposableIncome,
      sixtyMonthDisposable,
      presumptionOfAbuse: false,
      reason: 'Above median income but disposable income is below abuse threshold',
    };
  }

  return {
    passes: false,
    annualIncome,
    medianIncome,
    isAboveMedian: true,
    monthlyDisposableIncome,
    sixtyMonthDisposable,
    presumptionOfAbuse: true,
    reason: `Presumption of abuse - consider Chapter 13 (disposable income: $${monthlyDisposableIncome.toFixed(2)}/mo)`,
  };
}
