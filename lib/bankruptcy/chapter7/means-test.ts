/**
 * Chapter 7 Means Test Calculation
 * Determines eligibility for Chapter 7 bankruptcy based on income and expenses
 */

import {
  NATIONAL_STANDARDS,
  HEALTH_CARE_STANDARDS,
  LOCAL_HOUSING_STANDARDS,
  TRANSPORTATION_STANDARDS,
  STATE_MEDIAN_INCOME,
  CHAPTER_7_LIMITS,
} from './standards';

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
