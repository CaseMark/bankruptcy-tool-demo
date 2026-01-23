/**
 * IRS Collection Financial Standards for Chapter 7 Bankruptcy Means Test
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

// State Median Income by household size
// Source: U.S. Trustee Program - Census Bureau Median Family Income
// https://www.justice.gov/ust/eo/bapcpa/20251101/bci_data/median_income_table.htm
// Effective: November 1, 2025
export const STATE_MEDIAN_INCOME: Record<string, number[]> = {
  // Format: state: [1-person, 2-person, 3-person, 4-person, additional per person]
  AL: [62672, 75465, 90321, 104003, 11100],
  AK: [83617, 109662, 109662, 138492, 11100],
  AZ: [72039, 86745, 102274, 118067, 11100],
  AR: [56923, 71742, 80218, 94566, 11100],
  CA: [77221, 100161, 113553, 135505, 11100],
  CO: [85685, 106690, 127495, 149566, 11100],
  CT: [82141, 103501, 131022, 155834, 11100],
  DE: [67733, 92445, 108420, 128854, 11100],
  DC: [83202, 157259, 157259, 162327, 11100],
  FL: [68085, 84305, 95039, 111819, 11100],
  GA: [66722, 82787, 98877, 120315, 11100],
  HI: [83068, 103479, 120289, 138536, 11100],
  ID: [71531, 83951, 95859, 116594, 11100],
  IL: [71304, 91526, 110712, 134366, 11100],
  IN: [62808, 79884, 93175, 112691, 11100],
  IA: [65883, 86523, 101463, 122826, 11100],
  KS: [67423, 85199, 101189, 122741, 11100],
  KY: [60071, 71998, 83027, 106637, 11100],
  LA: [57923, 70493, 82433, 100971, 11100],
  ME: [73946, 88126, 104083, 128204, 11100],
  MD: [84699, 111673, 132464, 161913, 11100],
  MA: [85941, 109818, 135837, 173947, 11100],
  MI: [65625, 81293, 100797, 119856, 11100],
  MN: [75704, 95807, 123244, 146039, 11100],
  MS: [52594, 68525, 80722, 94965, 11100],
  MO: [63306, 79971, 97658, 115491, 11100],
  MT: [69482, 89107, 100637, 118578, 11100],
  NE: [65206, 88402, 100754, 121867, 11100],
  NV: [70370, 85660, 99032, 111184, 11100],
  NH: [85049, 106521, 137902, 151224, 11100],
  NJ: [84938, 104136, 133620, 163817, 11100],
  NM: [64537, 77534, 85784, 96074, 11100],
  NY: [71393, 90520, 112616, 135475, 11100],
  NC: [65396, 82221, 98932, 113744, 11100],
  ND: [71663, 93882, 103951, 134284, 11100],
  OH: [64541, 81578, 99876, 120531, 11100],
  OK: [59611, 75229, 84618, 99188, 11100],
  OR: [77061, 91268, 113736, 136434, 11100],
  PA: [70378, 85290, 107327, 132379, 11100],
  RI: [75662, 96205, 116357, 133954, 11100],
  SC: [63146, 81614, 93219, 113332, 11100],
  SD: [67416, 87506, 98297, 127386, 11100],
  TN: [62339, 80722, 95011, 106775, 11100],
  TX: [65123, 84491, 96728, 114938, 11100],
  UT: [85644, 93302, 109860, 128363, 11100],
  VT: [70603, 94477, 111150, 134056, 11100],
  VA: [76479, 98577, 120001, 141113, 11100],
  WA: [86314, 104354, 128360, 152553, 11100],
  WV: [62270, 66833, 89690, 91270, 11100],
  WI: [69343, 87938, 105734, 129964, 11100],
  WY: [69906, 89156, 95951, 107469, 11100],
};

// Chapter 7 Presumption of Abuse Thresholds (per Form B 122A-2, Line 40)
// * Subject to adjustment on 4/01/25, and every 3 years after that
export const CHAPTER_7_LIMITS = {
  // 60-month disposable income thresholds (Line 39d comparison)
  // Below this: NO presumption of abuse (Line 40, box 1)
  lowerThreshold60: 9075, // $9,075
  // Above this: Presumption of abuse EXISTS (Line 40, box 2)
  upperThreshold60: 15150, // $15,150
  // Monthly equivalents
  lowerThresholdMonthly: 151.25, // $9,075 / 60
  upperThresholdMonthly: 252.50, // $15,150 / 60
  // Next adjustment date
  nextAdjustmentDate: '2025-04-01',
};
