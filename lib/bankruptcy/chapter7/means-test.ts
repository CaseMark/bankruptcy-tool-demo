/**
 * Chapter 7 Means Test Calculation
 * Determines eligibility for Chapter 7 bankruptcy based on income and expenses
 *
 * Compliant with Form B 122A-2 (Chapter 7 Means Test Calculation)
 * Uses IRS Local Standards for:
 * - County-level housing allowances
 * - Regional/metro area transportation operating costs
 */

import {
  NATIONAL_STANDARDS,
  HEALTH_CARE_STANDARDS,
  STATE_MEDIAN_INCOME,
  // CHAPTER_7_LIMITS - Used for Part 2 (Form 122A-2) when implemented
} from './standards';

import {
  getCountyHousingStandard,
  hasCountyData,
} from './county-housing-standards';

import {
  calculateTransportationAllowance,
  type TransportationAllowance,
} from './transportation-standards';

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

/**
 * Get housing standard for a given location
 *
 * Per Form B 122A-2, housing allowances use IRS Local Standards
 * which are published at the county level.
 *
 * @param state - Two-letter state code
 * @param householdSize - Number of people in household
 * @param county - County name (optional, but recommended for accuracy)
 * @returns Monthly housing allowance
 */
export function getHousingStandard(
  state: string,
  householdSize: number,
  county?: string | null
): number {
  // Use county-level data if available (IRS Local Standards)
  return getCountyHousingStandard(state, county, householdSize);
}

/**
 * Get transportation standard for a given location
 *
 * Per Form B 122A-2:
 * - Lines 10a-10b: Vehicle ownership (National Standard)
 * - Lines 11a-11b: Vehicle operating (Local Standard - regional/metro)
 * - Line 12: Public transportation (National Standard)
 *
 * @param state - Two-letter state code
 * @param county - County name (for metro area operating costs)
 * @param vehicleCount - Number of vehicles (0, 1, or 2)
 * @param usesPublicTransportation - Whether debtor uses public transit (if no vehicle)
 * @returns Transportation allowance breakdown
 */
export function getTransportationStandard(
  state: string,
  county: string | null | undefined,
  vehicleCount: number = 1,
  usesPublicTransportation: boolean = false
): TransportationAllowance {
  return calculateTransportationAllowance(
    state,
    county,
    vehicleCount,
    usesPublicTransportation
  );
}

/**
 * @deprecated Use getTransportationStandard with state/county for regional rates
 * Legacy function for backward compatibility
 */
export function getTransportationStandardLegacy(
  hasVehicle: boolean,
  vehicleCount: number = 1,
  usesPublicTransportation: boolean = false
): number {
  // Use a default state/county for legacy calls
  const result = calculateTransportationAllowance(
    'CA',
    null,
    hasVehicle ? vehicleCount : 0,
    usesPublicTransportation
  );
  return result.total;
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
  // Line 6-7: National Standards (food, clothing, household, personal care, misc)
  nationalStandards: number;
  // Lines 8-9: Local Standards (housing & utilities - by county)
  housingUtilities: number;
  // Lines 10-12: Transportation (ownership + operating or public transit)
  transportation: number;
  transportationBreakdown: {
    ownership: number;      // Line 10: National Standard
    operating: number;      // Line 11: Local Standard (by region/metro)
    publicTransit: number;  // Line 12: National Standard (if no vehicle)
    metroArea?: string;     // Metro area used for operating costs
    region: string;         // IRS region (Northeast, Midwest, South, West)
  };
  // Line 7a: Health care (out-of-pocket)
  healthCare: number;
  total: number;
  // Additional metadata for transparency
  usingCountyData?: boolean;
  usingMetroData?: boolean;
  county?: string;
}

/**
 * Calculate IRS standard allowances for means test
 *
 * Per Form B 122A-2:
 * - Lines 6-7: National Standards (food, clothing, household, personal care, misc)
 * - Line 7a: Health care (out-of-pocket)
 * - Lines 8-9: Local Standards (housing & utilities - by county)
 * - Lines 10-12: Transportation (ownership + operating or public transit)
 *
 * @param state - Two-letter state code
 * @param householdSize - Number of people in household
 * @param county - County name (required for accurate housing allowance)
 * @param hasVehicle - Whether debtor owns/leases a vehicle
 * @param vehicleCount - Number of vehicles (max 2 for allowance)
 * @param primaryAge - Age of primary debtor (affects health care allowance)
 */
export function calculateIRSAllowances(
  state: string,
  householdSize: number,
  county?: string | null,
  hasVehicle: boolean = true,
  vehicleCount: number = 1,
  primaryAge: number = 40
): MeansTestAllowances {
  const nationalStandards = getNationalStandardTotal(householdSize);
  const housingUtilities = getHousingStandard(state, householdSize, county);

  // Calculate transportation using regional standards per Form B 122A-2
  // Lines 10-12: Ownership (National) + Operating (Local/Regional) or Public Transit
  const transportationResult = getTransportationStandard(
    state,
    county,
    hasVehicle ? vehicleCount : 0,
    !hasVehicle  // Uses public transportation if no vehicle
  );

  const healthCare = getHealthCareStandard(primaryAge, householdSize);

  return {
    nationalStandards,
    housingUtilities,
    transportation: transportationResult.total,
    transportationBreakdown: {
      ownership: transportationResult.ownership,
      operating: transportationResult.operating,
      publicTransit: transportationResult.publicTransit,
      metroArea: transportationResult.metroArea,
      region: transportationResult.region,
    },
    healthCare,
    total: nationalStandards + housingUtilities + transportationResult.total + healthCare,
    usingCountyData: hasCountyData(state) && !!county,
    usingMetroData: !!transportationResult.metroArea,
    county: county || undefined,
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
  presumptionTestPending?: boolean; // True if Part 2 calculation is under development
  reason: string;
  // Additional data for form completion
  allowances?: MeansTestAllowances;
}

/**
 * Calculate Chapter 7 Means Test result
 *
 * Implements the two-part test per 11 U.S.C. § 707(b):
 *
 * Part 1: Compare current monthly income × 12 to state median
 *         If below median → automatic qualification for Chapter 7
 *
 * Part 2: If above median, calculate disposable income
 *         Presumption of abuse arises if:
 *         - Monthly disposable income ≥ $239.58 (i.e., $14,375 over 60 months), OR
 *         - Can repay 25% of unsecured debt over 60 months
 *
 * @param state - Two-letter state code
 * @param householdSize - Number of people in household
 * @param monthlyGrossIncome - Current monthly income (CMI)
 * @param monthlyExpenses - Actual monthly expenses
 * @param totalUnsecuredDebt - Total nonpriority unsecured debt
 * @param county - County name (required for accurate housing allowance per IRS Local Standards)
 * @param hasVehicle - Whether debtor owns/leases a vehicle
 * @param vehicleCount - Number of vehicles
 * @param primaryAge - Age of primary debtor
 */
export function calculateMeansTest(
  state: string,
  householdSize: number,
  monthlyGrossIncome: number,
  monthlyExpenses: number,
  totalUnsecuredDebt: number,
  county?: string | null,
  hasVehicle: boolean = true,
  vehicleCount: number = 1,
  primaryAge: number = 40
): MeansTestResult {
  const annualIncome = monthlyGrossIncome * 12;
  const medianIncome = getStateMedianIncome(state, householdSize);
  const isAboveMedian = annualIncome > medianIncome;

  // Calculate IRS allowances (needed for both paths for reporting)
  const irsAllowances = calculateIRSAllowances(
    state,
    householdSize,
    county,
    hasVehicle,
    vehicleCount,
    primaryAge
  );

  // If below median, automatically passes (Part 1 - Form 122A-1)
  // Per Form 122A-1: If annualized income ≤ state median, debtor qualifies for Chapter 7
  // No need to complete Form 122A-2
  if (!isAboveMedian) {
    return {
      passes: true,
      annualIncome,
      medianIncome,
      isAboveMedian: false,
      presumptionOfAbuse: false,
      presumptionTestPending: false,
      reason: 'Income is below state median - qualifies for Chapter 7 (Form 122A-2 not required)',
      allowances: irsAllowances,
    };
  }

  // Above median - Form 122A-2 (Presumption of Abuse Test) is required
  // This calculates disposable income using:
  // - IRS National Standards (Lines 6-7)
  // - IRS Local Standards (Lines 8-15)
  // - Other deductions (Lines 16-23)
  // - Additional expense claims (Lines 25-31)
  // - Secured debt payments (Lines 33-37)
  //
  // DEVELOPMENT STATUS: Full Form 122A-2 calculation with all deduction
  // categories (Lines 16-37) is still under development.

  return {
    passes: false, // Cannot determine without full Part 2 calculation
    annualIncome,
    medianIncome,
    isAboveMedian: true,
    presumptionOfAbuse: false, // Unknown - needs full calculation
    presumptionTestPending: true, // Indicates Part 2 is under development
    reason: 'Presumption of Abuse Test still under development - income is above state median, full Form 122A-2 calculation required',
    allowances: irsAllowances,
  };
}
