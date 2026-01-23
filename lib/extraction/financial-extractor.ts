/**
 * Financial Data Extraction System
 * Uses case.dev LLM to extract structured data from OCR'd bankruptcy documents
 */

import { CaseDevClient } from '@/lib/case-dev/client';

/**
 * Monthly income record for 6-month CMI calculation per Form B 122A-2
 * Each record represents income received in a specific calendar month
 */
export interface ExtractedMonthlyIncome {
  incomeMonth: string; // YYYY-MM format (the month income was RECEIVED)
  grossAmount: number; // Gross income received that month
  netAmount: number | null; // Net income if available
  employer: string | null; // Employer/payer name
  incomeSource:
    | 'employment'      // Line 2: Wages, salary, tips, bonuses, overtime, commissions
    | 'self_employment' // Line 3: Net business/profession/farm income
    | 'rental'          // Line 4: Rent and real property income
    | 'interest'        // Line 5: Interest, dividends, royalties
    | 'pension'         // Line 6: Pension and retirement income
    | 'government'      // Line 7: State disability, unemployment, etc.
    | 'spouse'          // Line 8: Income from spouse (if not filing jointly)
    | 'alimony'         // Line 9: Alimony/maintenance received
    | 'contributions'   // Line 10: Regular contributions from others
    | 'other';          // Line 11: Other income
  description: string; // e.g., "Bi-weekly paycheck", "Monthly rental income"
  confidence: number; // 0-1 extraction confidence
}

/**
 * Result of income extraction from a document
 * Contains monthly breakdown for 6-month CMI calculation
 */
export interface IncomeExtractionResult {
  documentId: string;
  documentType: string;
  monthlyIncomes: ExtractedMonthlyIncome[];
  totalConfidence: number;
  warnings: string[]; // e.g., "Could not determine exact pay period dates"
}

// Legacy interface for backward compatibility
export interface ExtractedIncome {
  employerName: string;
  employmentType: 'full-time' | 'part-time' | 'contract' | 'self-employed';
  grossMonthlyIncome: number;
  netMonthlyIncome: number;
  payFrequency: 'weekly' | 'bi-weekly' | 'semi-monthly' | 'monthly';
  startDate: Date | null;
  source: string; // Document ID
  confidence: number;
}

export interface ExtractedDebt {
  creditorName: string;
  accountNumber: string | null;
  debtType: 'credit-card' | 'medical' | 'personal-loan' | 'auto-loan' | 'mortgage' | 'student-loan' | 'tax-debt' | 'other';
  originalAmount: number | null;
  currentBalance: number;
  monthlyPayment: number | null;
  isSecured: boolean;
  collateralDescription: string | null;
  source: string;
  confidence: number;
}

export interface ExtractedAsset {
  assetType: 'real-estate' | 'vehicle' | 'bank-account' | 'investment' | 'retirement' | 'personal-property' | 'other';
  description: string;
  estimatedValue: number;
  ownershipPercentage: number;
  isExempt: boolean | null;
  encumbrances: number;
  source: string;
  confidence: number;
}

export interface ExtractedExpenses {
  housing: number;
  utilities: number;
  food: number;
  transportation: number;
  insurance: number;
  medical: number;
  childcare: number;
  other: number;
  source: string;
  confidence: number;
}

export class FinancialDataExtractor {
  constructor(private client: CaseDevClient) {}

  /**
   * Extract income data from paystubs, W-2s, or tax returns
   */
  async extractIncome(ocrText: string, documentType: string): Promise<ExtractedIncome[]> {
    const prompt = this.buildIncomeExtractionPrompt(documentType);

    const response = await this.client.llmComplete({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: prompt,
        },
        {
          role: 'user',
          content: `Extract income information from this document:\n\n${ocrText}`,
        },
      ],
    });

    // Safely extract content from response
    const content = response?.choices?.[0]?.message?.content;
    if (!content) {
      console.warn('LLM income extraction returned unexpected response:', JSON.stringify(response));
      return [];
    }

    const jsonMatch = content.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error('Failed to extract structured income data');
    }

    const extracted = JSON.parse(jsonMatch[0]);
    return this.normalizeIncomeData(extracted);
  }

  /**
   * Extract monthly income for 6-month CMI calculation per Form B 122A-2
   *
   * This method extracts income with specific calendar months for the means test.
   * Per 11 U.S.C. § 101(10A), "current monthly income" is the average monthly income
   * received during the 6 calendar months before filing.
   *
   * @param ocrText - OCR text from the document
   * @param documentType - Type of document (paystub, w2, tax_return, 1099, etc.)
   * @param documentId - ID of the source document
   * @returns Income extraction result with monthly breakdown
   */
  async extractMonthlyIncome(
    ocrText: string,
    documentType: string,
    documentId: string
  ): Promise<IncomeExtractionResult> {
    const prompt = this.buildMonthlyIncomePrompt(documentType);

    const response = await this.client.llmComplete({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: prompt,
        },
        {
          role: 'user',
          content: `Extract monthly income information from this ${documentType} document:\n\n${ocrText}`,
        },
      ],
    });

    // Safely extract content from response
    const content = response?.choices?.[0]?.message?.content;
    if (!content) {
      console.warn('LLM monthly income extraction returned unexpected response:', JSON.stringify(response));
      return {
        documentId,
        documentType,
        monthlyIncomes: [],
        totalConfidence: 0,
        warnings: ['LLM returned unexpected response format'],
      };
    }

    const jsonMatch = content.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      return {
        documentId,
        documentType,
        monthlyIncomes: [],
        totalConfidence: 0,
        warnings: ['Failed to extract structured income data from document'],
      };
    }

    try {
      const extracted = JSON.parse(jsonMatch[0]);
      return this.normalizeMonthlyIncomeData(extracted, documentId, documentType);
    } catch (e) {
      return {
        documentId,
        documentType,
        monthlyIncomes: [],
        totalConfidence: 0,
        warnings: ['Failed to parse extracted income data'],
      };
    }
  }

  /**
   * Build prompt for monthly income extraction
   */
  private buildMonthlyIncomePrompt(documentType: string): string {
    const today = new Date();
    const currentMonth = today.toISOString().slice(0, 7); // YYYY-MM

    return `You are a bankruptcy paralegal assistant extracting income data for Chapter 7 means test compliance.

CRITICAL: For Form B 122A-2, we need income broken down by CALENDAR MONTH (the month income was RECEIVED).

Document type: ${documentType}
Current month: ${currentMonth}

Based on the document type, extract income as follows:

FOR PAYSTUBS:
- Identify the pay period end date and/or check date
- Determine which calendar month(s) the payment was received in
- If a paycheck spans two months, allocate to the month of the check date (when received)
- Extract the gross pay for each payment

FOR W-2s:
- Extract annual gross wages (Box 1)
- Divide by 12 to get monthly amount
- The income should be attributed to each month of the tax year (January through December of that year)
- Return 12 monthly records, one for each month

FOR 1099s:
- Extract total income
- If periodic (e.g., quarterly), distribute to appropriate months
- If annual, divide by 12 across all months of that tax year

FOR TAX RETURNS:
- Extract income from various schedules
- Distribute across the 12 months of the tax year

Return a JSON object with this EXACT structure:
{
  "monthlyIncomes": [
    {
      "incomeMonth": "YYYY-MM",
      "grossAmount": <number>,
      "netAmount": <number or null>,
      "employer": "<string or null>",
      "incomeSource": "employment" | "self_employment" | "rental" | "interest" | "pension" | "government" | "alimony" | "contributions" | "other",
      "description": "<brief description of income>",
      "confidence": <0-1 score>
    }
  ],
  "warnings": ["<any issues or uncertainties>"]
}

Income source mapping:
- employment: wages, salary, tips, bonuses, overtime, commissions
- self_employment: business, profession, or farm net income
- rental: rent and real property income
- interest: interest, dividends, royalties
- pension: pension and retirement income
- government: state disability, unemployment benefits
- alimony: alimony or maintenance received
- contributions: regular contributions from others (family support)
- other: any other income source

IMPORTANT:
- Use YYYY-MM format for incomeMonth (e.g., "2025-01" for January 2025)
- grossAmount must be the actual gross amount received that month
- Set confidence lower if dates are unclear or amounts are estimated
- Include ALL income found in the document
- Return ONLY the JSON object`;
  }

  /**
   * Normalize and validate extracted monthly income data
   */
  private normalizeMonthlyIncomeData(
    extracted: any,
    documentId: string,
    documentType: string
  ): IncomeExtractionResult {
    const warnings: string[] = extracted.warnings || [];

    if (!extracted.monthlyIncomes || !Array.isArray(extracted.monthlyIncomes)) {
      return {
        documentId,
        documentType,
        monthlyIncomes: [],
        totalConfidence: 0,
        warnings: [...warnings, 'No monthly income data found in extraction'],
      };
    }

    const monthlyIncomes: ExtractedMonthlyIncome[] = extracted.monthlyIncomes
      .filter((income: any) => income.incomeMonth && income.grossAmount)
      .map((income: any) => ({
        incomeMonth: this.normalizeMonth(income.incomeMonth),
        grossAmount: Math.round(parseFloat(income.grossAmount) * 100) / 100,
        netAmount: income.netAmount ? Math.round(parseFloat(income.netAmount) * 100) / 100 : null,
        employer: income.employer || null,
        incomeSource: this.normalizeIncomeSource(income.incomeSource),
        description: income.description || `Income from ${documentType}`,
        confidence: Math.min(1, Math.max(0, parseFloat(income.confidence) || 0.7)),
      }));

    // Calculate average confidence
    const totalConfidence = monthlyIncomes.length > 0
      ? monthlyIncomes.reduce((sum, inc) => sum + inc.confidence, 0) / monthlyIncomes.length
      : 0;

    return {
      documentId,
      documentType,
      monthlyIncomes,
      totalConfidence,
      warnings,
    };
  }

  /**
   * Normalize month format to YYYY-MM
   */
  private normalizeMonth(month: string): string {
    // Handle various formats: "2025-01", "01/2025", "January 2025", etc.
    if (/^\d{4}-\d{2}$/.test(month)) {
      return month;
    }

    // Try to parse and format
    const date = new Date(month + '-01');
    if (!isNaN(date.getTime())) {
      return date.toISOString().slice(0, 7);
    }

    // Default to current month if parsing fails
    return new Date().toISOString().slice(0, 7);
  }

  /**
   * Normalize income source to valid enum value
   */
  private normalizeIncomeSource(source: string): ExtractedMonthlyIncome['incomeSource'] {
    const validSources = [
      'employment', 'self_employment', 'rental', 'interest',
      'pension', 'government', 'spouse', 'alimony', 'contributions', 'other'
    ];

    const normalized = source?.toLowerCase().replace(/-/g, '_');
    if (validSources.includes(normalized)) {
      return normalized as ExtractedMonthlyIncome['incomeSource'];
    }

    // Map common variations
    if (normalized?.includes('wage') || normalized?.includes('salary')) return 'employment';
    if (normalized?.includes('business') || normalized?.includes('self')) return 'self_employment';
    if (normalized?.includes('rent')) return 'rental';
    if (normalized?.includes('dividend') || normalized?.includes('interest')) return 'interest';
    if (normalized?.includes('retire') || normalized?.includes('pension')) return 'pension';
    if (normalized?.includes('unemploy') || normalized?.includes('disability')) return 'government';
    if (normalized?.includes('alimony') || normalized?.includes('maintenance')) return 'alimony';

    return 'other';
  }

  /**
   * Extract debt information from credit reports, statements, or collection notices
   */
  async extractDebts(ocrText: string, documentType: string): Promise<ExtractedDebt[]> {
    const prompt = this.buildDebtExtractionPrompt(documentType);

    const response = await this.client.llmComplete({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: prompt,
        },
        {
          role: 'user',
          content: `Extract debt information from this document:\n\n${ocrText}`,
        },
      ],
    });

    // Safely extract content from response
    const content = response?.choices?.[0]?.message?.content;
    if (!content) {
      console.warn('LLM debt extraction returned unexpected response:', JSON.stringify(response));
      return [];
    }

    const jsonMatch = content.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error('Failed to extract structured debt data');
    }

    const extracted = JSON.parse(jsonMatch[0]);
    return this.normalizeDebtData(extracted);
  }

  /**
   * Extract asset information from bank statements, appraisals, or property records
   */
  async extractAssets(ocrText: string, documentType: string): Promise<ExtractedAsset[]> {
    const prompt = this.buildAssetExtractionPrompt(documentType);

    const response = await this.client.llmComplete({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: prompt,
        },
        {
          role: 'user',
          content: `Extract asset information from this document:\n\n${ocrText}`,
        },
      ],
    });

    // Safely extract content from response
    const content = response?.choices?.[0]?.message?.content;
    if (!content) {
      console.warn('LLM asset extraction returned unexpected response:', JSON.stringify(response));
      return [];
    }

    const jsonMatch = content.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error('Failed to extract structured asset data');
    }

    const extracted = JSON.parse(jsonMatch[0]);
    return this.normalizeAssetData(extracted);
  }

  /**
   * Extract monthly expenses from bank statements or budget documents
   */
  async extractExpenses(ocrText: string): Promise<ExtractedExpenses> {
    const prompt = `You are a bankruptcy paralegal assistant specializing in analyzing financial documents.
Extract monthly expense information from the provided document.

Return a JSON object with this exact structure:
{
  "expenses": {
    "housing": <number or 0>,
    "utilities": <number or 0>,
    "food": <number or 0>,
    "transportation": <number or 0>,
    "insurance": <number or 0>,
    "medical": <number or 0>,
    "childcare": <number or 0>,
    "other": <number or 0>
  },
  "confidence": <0-1 score>
}

Include ONLY the JSON object in your response. Calculate monthly averages if data is weekly/annual.`;

    const response = await this.client.llmComplete({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: prompt,
        },
        {
          role: 'user',
          content: `Extract expense information from this document:\n\n${ocrText}`,
        },
      ],
    });

    // Safely extract content from response
    const content = response?.choices?.[0]?.message?.content;
    if (!content) {
      console.warn('LLM expense extraction returned unexpected response:', JSON.stringify(response));
      return {
        housing: 0,
        utilities: 0,
        food: 0,
        transportation: 0,
        insurance: 0,
        medical: 0,
        childcare: 0,
        other: 0,
        source: 'llm-extraction-failed',
        confidence: 0,
      };
    }

    const jsonMatch = content.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error('Failed to extract structured expense data');
    }

    const extracted = JSON.parse(jsonMatch[0]);
    return {
      ...extracted.expenses,
      source: 'llm-extraction',
      confidence: extracted.confidence || 0.7,
    };
  }

  private buildIncomeExtractionPrompt(documentType: string): string {
    return `You are a bankruptcy paralegal assistant specializing in analyzing financial documents.
Extract income information from ${documentType} documents.

Return a JSON object with this exact structure:
{
  "incomes": [
    {
      "employerName": "<string>",
      "employmentType": "full-time" | "part-time" | "contract" | "self-employed",
      "grossMonthlyIncome": <number>,
      "netMonthlyIncome": <number>,
      "payFrequency": "weekly" | "bi-weekly" | "semi-monthly" | "monthly",
      "startDate": "<YYYY-MM-DD or null>",
      "confidence": <0-1 score>
    }
  ]
}

Important rules:
- Convert all income to MONTHLY amounts (weekly * 4.33, bi-weekly * 2.17, semi-monthly * 2)
- For W-2s, divide annual by 12
- Use gross income (before deductions) and net income (after deductions)
- Confidence should reflect OCR quality and data completeness
- Include ONLY the JSON object in your response`;
  }

  private buildDebtExtractionPrompt(documentType: string): string {
    return `You are a bankruptcy paralegal assistant specializing in analyzing financial documents.
Extract debt information from ${documentType} documents.

Return a JSON object with this exact structure:
{
  "debts": [
    {
      "creditorName": "<string>",
      "accountNumber": "<string or null>",
      "debtType": "credit-card" | "medical" | "personal-loan" | "auto-loan" | "mortgage" | "student-loan" | "tax-debt" | "other",
      "originalAmount": <number or null>,
      "currentBalance": <number>,
      "monthlyPayment": <number or null>,
      "isSecured": <boolean>,
      "collateralDescription": "<string or null>",
      "confidence": <0-1 score>
    }
  ]
}

Important rules:
- Secured debts have collateral (auto loans, mortgages)
- Credit cards and medical bills are typically unsecured
- Current balance is most important
- Include ONLY the JSON object in your response`;
  }

  private buildAssetExtractionPrompt(documentType: string): string {
    return `You are a bankruptcy paralegal assistant specializing in analyzing financial documents.
Extract asset information from ${documentType} documents.

Return a JSON object with this exact structure:
{
  "assets": [
    {
      "assetType": "real-estate" | "vehicle" | "bank-account" | "investment" | "retirement" | "personal-property" | "other",
      "description": "<string>",
      "estimatedValue": <number>,
      "ownershipPercentage": <number 0-100>,
      "isExempt": <boolean or null>,
      "encumbrances": <number (liens/loans against asset)>,
      "confidence": <0-1 score>
    }
  ]
}

Important rules:
- Bank accounts show balance as value
- Vehicles should include make, model, year in description
- Real estate should include address in description
- Ownership percentage is usually 100 for single filers, 50 for joint
- Encumbrances are loans secured by the asset
- Include ONLY the JSON object in your response`;
  }

  private normalizeIncomeData(extracted: any): ExtractedIncome[] {
    if (!extracted.incomes || !Array.isArray(extracted.incomes)) {
      return [];
    }

    return extracted.incomes.map((income: any) => ({
      employerName: income.employerName || 'Unknown',
      employmentType: income.employmentType || 'full-time',
      grossMonthlyIncome: parseFloat(income.grossMonthlyIncome) || 0,
      netMonthlyIncome: parseFloat(income.netMonthlyIncome) || 0,
      payFrequency: income.payFrequency || 'monthly',
      startDate: income.startDate ? new Date(income.startDate) : null,
      source: 'llm-extraction',
      confidence: income.confidence || 0.7,
    }));
  }

  private normalizeDebtData(extracted: any): ExtractedDebt[] {
    if (!extracted.debts || !Array.isArray(extracted.debts)) {
      return [];
    }

    return extracted.debts.map((debt: any) => ({
      creditorName: debt.creditorName || 'Unknown Creditor',
      accountNumber: debt.accountNumber || null,
      debtType: debt.debtType || 'other',
      originalAmount: debt.originalAmount ? parseFloat(debt.originalAmount) : null,
      currentBalance: parseFloat(debt.currentBalance) || 0,
      monthlyPayment: debt.monthlyPayment ? parseFloat(debt.monthlyPayment) : null,
      isSecured: debt.isSecured || false,
      collateralDescription: debt.collateralDescription || null,
      source: 'llm-extraction',
      confidence: debt.confidence || 0.7,
    }));
  }

  private normalizeAssetData(extracted: any): ExtractedAsset[] {
    if (!extracted.assets || !Array.isArray(extracted.assets)) {
      return [];
    }

    return extracted.assets.map((asset: any) => ({
      assetType: asset.assetType || 'other',
      description: asset.description || 'Unknown asset',
      estimatedValue: parseFloat(asset.estimatedValue) || 0,
      ownershipPercentage: parseFloat(asset.ownershipPercentage) || 100,
      isExempt: asset.isExempt !== undefined ? asset.isExempt : null,
      encumbrances: parseFloat(asset.encumbrances) || 0,
      source: 'llm-extraction',
      confidence: asset.confidence || 0.7,
    }));
  }
}
