/**
 * Form Data Mapper for Bankruptcy Forms
 * Maps case data to official bankruptcy form field structures
 */

// Case data types
interface CaseData {
  id: string;
  clientName: string;
  caseNumber: string | null;
  caseType: string;
  status: string;
  createdAt: string;
  state: string | null;
  householdSize: number | null;
  filingDate: string | null;
}

interface DebtorInfo {
  firstName: string;
  lastName: string;
  middleName?: string;
  suffix?: string;
  ssn?: string;
  dateOfBirth?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    zip: string;
    county: string;
  };
  phone?: string;
  email?: string;
  previousAddresses?: Array<{
    street: string;
    city: string;
    state: string;
    zip: string;
    fromDate: string;
    toDate: string;
  }>;
  aliases?: string[];
  maritalStatus?: 'single' | 'married' | 'divorced' | 'widowed' | 'separated';
  spouseName?: string;
}

interface IncomeRecord {
  id: string;
  employer: string | null;
  occupation: string | null;
  grossPay: number | null;
  netPay: number | null;
  payPeriod: string | null;
  incomeSource: string | null;
  ytdGross: number | null;
}

interface ExpenseRecord {
  id: string;
  category: string;
  description: string | null;
  monthlyAmount: number;
}

interface AssetRecord {
  id: string;
  assetType: string;
  description: string;
  currentValue: number;
  address: string | null;
  make: string | null;
  model: string | null;
  year: number | null;
  vin: string | null;
  institution: string | null;
  accountNumberLast4: string | null;
  ownershipPercentage: number;
}

interface DebtRecord {
  id: string;
  creditorName: string;
  creditorAddress: string | null;
  accountLast4: string | null;
  balance: number;
  monthlyPayment: number | null;
  interestRate: number | null;
  debtType: string;
  secured: boolean;
  priority: boolean;
  collateral: string | null;
  collateralValue: number | null;
}

interface MeansTestResult {
  passes: boolean;
  annualIncome: number;
  medianIncome: number;
  isAboveMedian: boolean;
  monthlyDisposableIncome?: number;
  presumptionOfAbuse: boolean;
}

export interface FormData {
  caseData: CaseData;
  debtorInfo?: DebtorInfo;
  income: IncomeRecord[];
  expenses: ExpenseRecord[];
  assets: AssetRecord[];
  debts: DebtRecord[];
  meansTest?: MeansTestResult;
}

// Helper function to calculate monthly income
function calculateMonthlyAmount(amount: number | null, period: string | null): number {
  if (!amount) return 0;
  switch (period) {
    case 'weekly': return amount * 4.33;
    case 'biweekly': return amount * 2.17;
    case 'annual': return amount / 12;
    case 'monthly':
    default: return amount;
  }
}

// Form 101: Voluntary Petition for Individuals Filing for Bankruptcy
export interface Form101Data {
  formName: string;
  courtDistrict: string;
  debtorName: string;
  spouseName?: string;
  ssn: string;
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
    county: string;
  };
  chapter: '7' | '11' | '12' | '13';
  filingType: 'individual' | 'joint';
  hasAttorney: boolean;
  previousFilings: Array<{
    district: string;
    caseNumber: string;
    date: string;
  }>;
  isPendingCase: boolean;
  estimatedCreditors: string;
  estimatedAssets: string;
  estimatedLiabilities: string;
  estimatedIncome: string;
}

export function mapToForm101(data: FormData): Form101Data {
  const totalAssets = data.assets.reduce((sum, a) => sum + Number(a.currentValue), 0);
  const totalDebt = data.debts.reduce((sum, d) => sum + Number(d.balance), 0);
  const monthlyIncome = data.income.reduce(
    (sum, i) => sum + calculateMonthlyAmount(i.grossPay, i.payPeriod), 0
  );

  const getEstimateRange = (amount: number): string => {
    if (amount <= 50000) return '$0 - $50,000';
    if (amount <= 100000) return '$50,001 - $100,000';
    if (amount <= 500000) return '$100,001 - $500,000';
    if (amount <= 1000000) return '$500,001 - $1,000,000';
    if (amount <= 10000000) return '$1,000,001 - $10,000,000';
    return 'More than $10,000,000';
  };

  const getCreditorRange = (debts: DebtRecord[]): string => {
    const count = debts.length;
    if (count <= 49) return '1-49';
    if (count <= 99) return '50-99';
    if (count <= 199) return '100-199';
    if (count <= 999) return '200-999';
    return '1,000 or more';
  };

  // Parse name from clientName
  const nameParts = data.caseData.clientName.split(' ');
  const firstName = nameParts[0] || '';
  const lastName = nameParts[nameParts.length - 1] || '';

  return {
    formName: 'Form 101 - Voluntary Petition for Individuals Filing for Bankruptcy',
    courtDistrict: `${data.caseData.state || 'Unknown'} District`,
    debtorName: data.caseData.clientName,
    spouseName: data.debtorInfo?.spouseName,
    ssn: data.debtorInfo?.ssn || 'XXX-XX-XXXX',
    address: data.debtorInfo?.address || {
      street: '',
      city: '',
      state: data.caseData.state || '',
      zip: '',
      county: '',
    },
    chapter: data.caseData.caseType === 'chapter7' ? '7' : '13',
    filingType: 'individual',
    hasAttorney: true,
    previousFilings: [],
    isPendingCase: false,
    estimatedCreditors: getCreditorRange(data.debts),
    estimatedAssets: getEstimateRange(totalAssets),
    estimatedLiabilities: getEstimateRange(totalDebt),
    estimatedIncome: getEstimateRange(monthlyIncome * 12),
  };
}

// Form 106I: Schedule I - Your Income
export interface Form106IData {
  formName: string;
  debtorName: string;
  caseNumber: string;
  incomeSources: Array<{
    employer: string;
    occupation: string;
    address: string;
    startDate: string;
    monthlyGross: number;
    payrollDeductions: {
      taxes: number;
      socialSecurity: number;
      insurance: number;
      retirement: number;
      other: number;
    };
    monthlyNet: number;
  }>;
  otherIncome: Array<{
    source: string;
    amount: number;
  }>;
  spouseIncome?: {
    employer: string;
    monthlyNet: number;
  };
  totalMonthlyIncome: number;
}

export function mapToForm106I(data: FormData): Form106IData {
  const incomeSources = data.income
    .filter(i => i.incomeSource === 'employment' || i.incomeSource === 'business')
    .map(i => ({
      employer: i.employer || 'Unknown Employer',
      occupation: i.occupation || 'Unknown',
      address: '',
      startDate: '',
      monthlyGross: calculateMonthlyAmount(i.grossPay, i.payPeriod),
      payrollDeductions: {
        taxes: 0,
        socialSecurity: 0,
        insurance: 0,
        retirement: 0,
        other: 0,
      },
      monthlyNet: calculateMonthlyAmount(i.netPay, i.payPeriod),
    }));

  const otherIncome = data.income
    .filter(i => i.incomeSource !== 'employment' && i.incomeSource !== 'business')
    .map(i => ({
      source: i.incomeSource || 'Other',
      amount: calculateMonthlyAmount(i.grossPay, i.payPeriod),
    }));

  const totalMonthlyIncome = data.income.reduce(
    (sum, i) => sum + calculateMonthlyAmount(i.netPay || i.grossPay, i.payPeriod), 0
  );

  return {
    formName: 'Form 106I - Schedule I: Your Income',
    debtorName: data.caseData.clientName,
    caseNumber: data.caseData.caseNumber || '',
    incomeSources,
    otherIncome,
    totalMonthlyIncome,
  };
}

// Form 106J: Schedule J - Your Expenses
export interface Form106JData {
  formName: string;
  debtorName: string;
  caseNumber: string;
  expenses: {
    rent: number;
    homeOwnerInsurance: number;
    propertyTaxes: number;
    utilities: number;
    food: number;
    clothing: number;
    transportation: number;
    medical: number;
    childcare: number;
    education: number;
    entertainment: number;
    taxes: number;
    insurance: number;
    debtPayments: number;
    other: number;
  };
  totalExpenses: number;
  monthlyNetIncome: number;
}

export function mapToForm106J(data: FormData): Form106JData {
  const expensesByCategory: Record<string, number> = {};

  data.expenses.forEach(e => {
    expensesByCategory[e.category] = (expensesByCategory[e.category] || 0) + Number(e.monthlyAmount);
  });

  const expenses = {
    rent: expensesByCategory['housing'] || 0,
    homeOwnerInsurance: 0,
    propertyTaxes: 0,
    utilities: expensesByCategory['utilities'] || 0,
    food: expensesByCategory['food'] || 0,
    clothing: expensesByCategory['clothing'] || 0,
    transportation: expensesByCategory['transportation'] || 0,
    medical: expensesByCategory['medical'] || 0,
    childcare: expensesByCategory['childcare'] || 0,
    education: expensesByCategory['education'] || 0,
    entertainment: expensesByCategory['entertainment'] || 0,
    taxes: expensesByCategory['taxes'] || 0,
    insurance: expensesByCategory['insurance'] || 0,
    debtPayments: expensesByCategory['debt_payments'] || 0,
    other: expensesByCategory['other'] || 0,
  };

  const totalExpenses = Object.values(expenses).reduce((a, b) => a + b, 0);

  const monthlyNetIncome = data.income.reduce(
    (sum, i) => sum + calculateMonthlyAmount(i.netPay || i.grossPay, i.payPeriod), 0
  );

  return {
    formName: 'Form 106J - Schedule J: Your Expenses',
    debtorName: data.caseData.clientName,
    caseNumber: data.caseData.caseNumber || '',
    expenses,
    totalExpenses,
    monthlyNetIncome: monthlyNetIncome - totalExpenses,
  };
}

// Form 106A/B: Schedule A/B - Property
export interface Form106ABData {
  formName: string;
  debtorName: string;
  caseNumber: string;
  realProperty: Array<{
    description: string;
    address: string;
    currentValue: number;
    ownershipPercentage: number;
    secured: boolean;
  }>;
  personalProperty: {
    vehicles: Array<{
      description: string;
      year: number | null;
      make: string;
      model: string;
      vin: string;
      currentValue: number;
    }>;
    bankAccounts: Array<{
      institution: string;
      accountType: string;
      lastFour: string;
      currentValue: number;
    }>;
    householdGoods: Array<{
      description: string;
      currentValue: number;
    }>;
    other: Array<{
      description: string;
      currentValue: number;
    }>;
  };
  totalRealProperty: number;
  totalPersonalProperty: number;
  totalAssets: number;
}

export function mapToForm106AB(data: FormData): Form106ABData {
  const realProperty = data.assets
    .filter(a => a.assetType === 'real_estate')
    .map(a => ({
      description: a.description,
      address: a.address || '',
      currentValue: Number(a.currentValue),
      ownershipPercentage: a.ownershipPercentage,
      secured: data.debts.some(d => d.collateral?.toLowerCase().includes('real') || d.debtType === 'mortgage'),
    }));

  const vehicles = data.assets
    .filter(a => a.assetType === 'vehicle')
    .map(a => ({
      description: a.description,
      year: a.year,
      make: a.make || '',
      model: a.model || '',
      vin: a.vin || '',
      currentValue: Number(a.currentValue),
    }));

  const bankAccounts = data.assets
    .filter(a => a.assetType === 'bank_account' || a.assetType === 'retirement')
    .map(a => ({
      institution: a.institution || '',
      accountType: a.assetType === 'retirement' ? 'Retirement' : 'Checking/Savings',
      lastFour: a.accountNumberLast4 || '',
      currentValue: Number(a.currentValue),
    }));

  const householdGoods = data.assets
    .filter(a => a.assetType === 'household_goods')
    .map(a => ({
      description: a.description,
      currentValue: Number(a.currentValue),
    }));

  const other = data.assets
    .filter(a => !['real_estate', 'vehicle', 'bank_account', 'retirement', 'household_goods'].includes(a.assetType))
    .map(a => ({
      description: a.description,
      currentValue: Number(a.currentValue),
    }));

  const totalRealProperty = realProperty.reduce((sum, p) => sum + p.currentValue, 0);
  const totalPersonalProperty = [
    ...vehicles.map(v => v.currentValue),
    ...bankAccounts.map(b => b.currentValue),
    ...householdGoods.map(h => h.currentValue),
    ...other.map(o => o.currentValue),
  ].reduce((a, b) => a + b, 0);

  return {
    formName: 'Form 106A/B - Schedule A/B: Property',
    debtorName: data.caseData.clientName,
    caseNumber: data.caseData.caseNumber || '',
    realProperty,
    personalProperty: {
      vehicles,
      bankAccounts,
      householdGoods,
      other,
    },
    totalRealProperty,
    totalPersonalProperty,
    totalAssets: totalRealProperty + totalPersonalProperty,
  };
}

// Form 106D: Schedule D - Secured Claims
export interface Form106DData {
  formName: string;
  debtorName: string;
  caseNumber: string;
  securedClaims: Array<{
    creditorName: string;
    creditorAddress: string;
    accountNumber: string;
    dateIncurred: string;
    collateral: string;
    collateralValue: number;
    isContingent: boolean;
    isUnliquidated: boolean;
    isDisputed: boolean;
    amountOfClaim: number;
    unsecuredPortion: number;
  }>;
  totalSecuredClaims: number;
}

export function mapToForm106D(data: FormData): Form106DData {
  const securedDebts = data.debts.filter(d => d.secured);

  const securedClaims = securedDebts.map(d => ({
    creditorName: d.creditorName,
    creditorAddress: d.creditorAddress || '',
    accountNumber: d.accountLast4 ? `****${d.accountLast4}` : '',
    dateIncurred: '',
    collateral: d.collateral || '',
    collateralValue: Number(d.collateralValue) || 0,
    isContingent: false,
    isUnliquidated: false,
    isDisputed: false,
    amountOfClaim: Number(d.balance),
    unsecuredPortion: Math.max(0, Number(d.balance) - (Number(d.collateralValue) || 0)),
  }));

  return {
    formName: 'Form 106D - Schedule D: Creditors Who Have Claims Secured by Property',
    debtorName: data.caseData.clientName,
    caseNumber: data.caseData.caseNumber || '',
    securedClaims,
    totalSecuredClaims: securedClaims.reduce((sum, c) => sum + c.amountOfClaim, 0),
  };
}

// Form 106E/F: Schedule E/F - Unsecured Claims
export interface Form106EFData {
  formName: string;
  debtorName: string;
  caseNumber: string;
  priorityClaims: Array<{
    creditorName: string;
    creditorAddress: string;
    accountNumber: string;
    dateIncurred: string;
    priorityType: string;
    isContingent: boolean;
    isUnliquidated: boolean;
    isDisputed: boolean;
    amountOfClaim: number;
  }>;
  nonPriorityClaims: Array<{
    creditorName: string;
    creditorAddress: string;
    accountNumber: string;
    dateIncurred: string;
    claimType: string;
    isContingent: boolean;
    isUnliquidated: boolean;
    isDisputed: boolean;
    amountOfClaim: number;
  }>;
  totalPriorityClaims: number;
  totalNonPriorityClaims: number;
}

export function mapToForm106EF(data: FormData): Form106EFData {
  const unsecuredDebts = data.debts.filter(d => !d.secured);
  const priorityDebts = unsecuredDebts.filter(d => d.priority);
  const nonPriorityDebts = unsecuredDebts.filter(d => !d.priority);

  const priorityClaims = priorityDebts.map(d => ({
    creditorName: d.creditorName,
    creditorAddress: d.creditorAddress || '',
    accountNumber: d.accountLast4 ? `****${d.accountLast4}` : '',
    dateIncurred: '',
    priorityType: d.debtType === 'tax' ? 'Taxes' : d.debtType === 'child_support' ? 'Domestic Support' : 'Other',
    isContingent: false,
    isUnliquidated: false,
    isDisputed: false,
    amountOfClaim: Number(d.balance),
  }));

  const nonPriorityClaims = nonPriorityDebts.map(d => ({
    creditorName: d.creditorName,
    creditorAddress: d.creditorAddress || '',
    accountNumber: d.accountLast4 ? `****${d.accountLast4}` : '',
    dateIncurred: '',
    claimType: d.debtType.replace(/_/g, ' '),
    isContingent: false,
    isUnliquidated: false,
    isDisputed: false,
    amountOfClaim: Number(d.balance),
  }));

  return {
    formName: 'Form 106E/F - Schedule E/F: Creditors Who Have Unsecured Claims',
    debtorName: data.caseData.clientName,
    caseNumber: data.caseData.caseNumber || '',
    priorityClaims,
    nonPriorityClaims,
    totalPriorityClaims: priorityClaims.reduce((sum, c) => sum + c.amountOfClaim, 0),
    totalNonPriorityClaims: nonPriorityClaims.reduce((sum, c) => sum + c.amountOfClaim, 0),
  };
}

// Form 122A-1/2: Chapter 7 Means Test
export interface Form122AData {
  formName: string;
  debtorName: string;
  caseNumber: string;
  averageMonthlyIncome: number;
  annualizedIncome: number;
  stateMedianIncome: number;
  isAboveMedian: boolean;
  allowedDeductions: {
    nationalStandards: number;
    localStandards: number;
    otherExpenses: number;
    securedDebtPayments: number;
    priorityDebtPayments: number;
  };
  monthlyDisposableIncome: number;
  sixtyMonthDisposable: number;
  passesTest: boolean;
  presumptionOfAbuse: boolean;
}

export function mapToForm122A(data: FormData): Form122AData {
  const monthlyIncome = data.income.reduce(
    (sum, i) => sum + calculateMonthlyAmount(i.grossPay, i.payPeriod), 0
  );

  return {
    formName: 'Form 122A-1/2 - Chapter 7 Means Test Calculation',
    debtorName: data.caseData.clientName,
    caseNumber: data.caseData.caseNumber || '',
    averageMonthlyIncome: monthlyIncome,
    annualizedIncome: data.meansTest?.annualIncome || monthlyIncome * 12,
    stateMedianIncome: data.meansTest?.medianIncome || 0,
    isAboveMedian: data.meansTest?.isAboveMedian || false,
    allowedDeductions: {
      nationalStandards: 0,
      localStandards: 0,
      otherExpenses: 0,
      securedDebtPayments: data.debts.filter(d => d.secured).reduce((sum, d) => sum + Number(d.monthlyPayment || 0), 0),
      priorityDebtPayments: data.debts.filter(d => d.priority).reduce((sum, d) => sum + Number(d.monthlyPayment || 0), 0),
    },
    monthlyDisposableIncome: data.meansTest?.monthlyDisposableIncome || 0,
    sixtyMonthDisposable: (data.meansTest?.monthlyDisposableIncome || 0) * 60,
    passesTest: data.meansTest?.passes || true,
    presumptionOfAbuse: data.meansTest?.presumptionOfAbuse || false,
  };
}

// Map all forms at once
export interface AllFormsData {
  form101: Form101Data;
  form106I: Form106IData;
  form106J: Form106JData;
  form106AB: Form106ABData;
  form106D: Form106DData;
  form106EF: Form106EFData;
  form122A: Form122AData;
}

export function mapAllForms(data: FormData): AllFormsData {
  return {
    form101: mapToForm101(data),
    form106I: mapToForm106I(data),
    form106J: mapToForm106J(data),
    form106AB: mapToForm106AB(data),
    form106D: mapToForm106D(data),
    form106EF: mapToForm106EF(data),
    form122A: mapToForm122A(data),
  };
}
