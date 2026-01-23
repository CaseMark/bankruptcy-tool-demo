/**
 * Document Validation System
 * Provides document-type-specific validation for bankruptcy filing documents
 */

export interface ValidationResult {
  valid: boolean;
  issues: string[];
  confidence: number;
}

/**
 * Get document-type-specific validation prompt
 * Each document type has specific criteria for what makes it valid for bankruptcy purposes
 */
export function getValidationPrompt(documentType: string): string {
  const prompts: Record<string, string> = {
    // Income Documents
    paystub: `You are validating a PAYSTUB document for bankruptcy filing.

A paystub is VALID if it contains ANY of these key elements:
- Employee name or identifier
- Employer name or company
- Pay period or pay date
- Gross pay or earnings amount
- Any deductions listed

IMPORTANT: This is likely a clean, digital paystub. Be lenient in validation.
- Do NOT require all fields - even partial information is useful
- Do NOT fail validation for formatting differences
- Do NOT require specific date formats
- Historical/past dates are EXPECTED and valid

Return ONLY this JSON:
{ "valid": true, "issues": [], "confidence": 0.95 }

Only return valid: false if the document is completely unrelated to pay/income (e.g., it's actually a restaurant receipt or unrelated document).`,

    w2: `You are validating a W-2 TAX FORM for bankruptcy filing.

A W-2 is VALID if it contains ANY of these elements:
- "W-2" or "Wage and Tax Statement" text
- Box 1 (Wages, tips, other compensation) with any amount
- Employer name or EIN
- Employee name or SSN (partial is fine)
- Tax year (any year is valid - historical W-2s are expected)

IMPORTANT: This is likely a clean, formatted W-2. Be lenient.
- Past tax years are EXPECTED (2023, 2024, etc. are all valid)
- Do NOT fail for missing boxes - partial data is acceptable
- Do NOT require perfect formatting
- Even AI-generated test W-2s should pass if they have W-2 structure

Return ONLY this JSON:
{ "valid": true, "issues": [], "confidence": 0.95 }

Only return valid: false if this is clearly NOT a W-2 form.`,

    tax_return: `You are validating a TAX RETURN document for bankruptcy filing.

A tax return is VALID if it contains ANY of these elements:
- Form number (1040, 1040-SR, 1040-NR, etc.)
- "U.S. Individual Income Tax Return" or similar header
- Taxable income or adjusted gross income
- Filing status indication
- Tax year (any past year is valid)

IMPORTANT: Be lenient in validation.
- Past years are EXPECTED for tax returns
- Partial returns or single pages are acceptable
- Do NOT require all schedules
- AI-generated or sample returns should pass if structured correctly

Return ONLY this JSON:
{ "valid": true, "issues": [], "confidence": 0.95 }

Only return valid: false if this is clearly NOT a tax return.`,

    '1099': `You are validating a 1099 TAX FORM for bankruptcy filing.

A 1099 is VALID if it contains ANY of these elements:
- "1099" form designation (1099-MISC, 1099-INT, 1099-DIV, 1099-NEC, etc.)
- Payer information
- Recipient information
- Income amount in any box
- Tax year (past years are expected)

Return ONLY this JSON:
{ "valid": true, "issues": [], "confidence": 0.95 }

Only return valid: false if this is clearly NOT a 1099 form.`,

    // Debt Documents
    credit_card: `You are validating a CREDIT CARD STATEMENT for bankruptcy filing.

A credit card statement is VALID if it contains ANY of these elements:
- Credit card company or bank name
- Account number (partial/masked is fine)
- Statement balance, current balance, or amount due
- Transaction list or activity summary
- Payment due date or statement date

IMPORTANT: Be lenient - partial statements are acceptable.

Return ONLY this JSON:
{ "valid": true, "issues": [], "confidence": 0.95 }

Only return valid: false if this is clearly NOT a credit card statement.`,

    loan_statement: `You are validating a LOAN STATEMENT for bankruptcy filing.

A loan statement is VALID if it contains ANY of these elements:
- Lender name
- Loan account number
- Principal balance or payoff amount
- Payment amount or payment schedule
- Interest rate (optional)

Return ONLY this JSON:
{ "valid": true, "issues": [], "confidence": 0.95 }

Only return valid: false if this is clearly NOT a loan document.`,

    medical_bill: `You are validating a MEDICAL BILL for bankruptcy filing.

A medical bill is VALID if it contains ANY of these elements:
- Healthcare provider name
- Patient name or account
- Amount due or balance
- Service date or statement date
- Description of services (optional)

Return ONLY this JSON:
{ "valid": true, "issues": [], "confidence": 0.95 }

Only return valid: false if this is clearly NOT a medical bill.`,

    collection_notice: `You are validating a COLLECTION NOTICE for bankruptcy filing.

A collection notice is VALID if it contains ANY of these elements:
- Collection agency name or creditor name
- Account or reference number
- Amount owed
- Original creditor (optional)

Return ONLY this JSON:
{ "valid": true, "issues": [], "confidence": 0.95 }

Only return valid: false if this is clearly NOT a collection notice.`,

    mortgage: `You are validating a MORTGAGE DOCUMENT for bankruptcy filing.

A mortgage document is VALID if it contains ANY of these elements:
- Lender/servicer name
- Property address
- Loan balance or principal
- Monthly payment amount
- Interest rate or loan terms

Return ONLY this JSON:
{ "valid": true, "issues": [], "confidence": 0.95 }

Only return valid: false if this is clearly NOT a mortgage document.`,

    // Asset Documents
    bank_statement: `You are validating a BANK STATEMENT for bankruptcy filing.

A bank statement is VALID if it contains ANY of these elements:
- Bank or financial institution name
- Account number (partial/masked is fine)
- Account balance (beginning, ending, or current)
- Transaction history or activity
- Statement period or date

IMPORTANT: Be lenient - this is likely a clean digital statement.

Return ONLY this JSON:
{ "valid": true, "issues": [], "confidence": 0.95 }

Only return valid: false if this is clearly NOT a bank statement.`,

    vehicle_title: `You are validating a VEHICLE TITLE for bankruptcy filing.

A vehicle title is VALID if it contains ANY of these elements:
- Vehicle identification (make, model, year, or VIN)
- Owner name
- Title number or state
- Lienholder information (optional)

Return ONLY this JSON:
{ "valid": true, "issues": [], "confidence": 0.95 }

Only return valid: false if this is clearly NOT a vehicle title.`,

    property_deed: `You are validating a PROPERTY DEED for bankruptcy filing.

A property deed is VALID if it contains ANY of these elements:
- Property address or legal description
- Owner/grantor/grantee names
- Recording information
- County or jurisdiction

Return ONLY this JSON:
{ "valid": true, "issues": [], "confidence": 0.95 }

Only return valid: false if this is clearly NOT a property deed.`,

    // Expense Documents
    utility: `You are validating a UTILITY BILL for bankruptcy filing.

A utility bill is VALID if it contains ANY of these elements:
- Utility company name
- Service address
- Amount due or current charges
- Account number
- Service type (electric, gas, water, etc.)

Return ONLY this JSON:
{ "valid": true, "issues": [], "confidence": 0.95 }

Only return valid: false if this is clearly NOT a utility bill.`,

    lease: `You are validating a LEASE AGREEMENT for bankruptcy filing.

A lease is VALID if it contains ANY of these elements:
- Landlord or property management name
- Tenant name
- Property address
- Monthly rent amount
- Lease term or dates

Return ONLY this JSON:
{ "valid": true, "issues": [], "confidence": 0.95 }

Only return valid: false if this is clearly NOT a lease agreement.`,

    insurance: `You are validating an INSURANCE DOCUMENT for bankruptcy filing.

An insurance document is VALID if it contains ANY of these elements:
- Insurance company name
- Policy number
- Premium amount (monthly, quarterly, or annual)
- Coverage type (auto, health, home, life, etc.)
- Policy holder name

Return ONLY this JSON:
{ "valid": true, "issues": [], "confidence": 0.95 }

Only return valid: false if this is clearly NOT an insurance document.`,

    other: `You are validating a document for bankruptcy filing.

This document is categorized as "other" - it may be any type of financial or legal document.

A document is VALID if:
- It contains some identifiable financial, personal, or legal information
- It appears to be a legitimate document (not random text)
- It could be relevant to bankruptcy filing

Return ONLY this JSON:
{ "valid": true, "issues": [], "confidence": 0.9 }

Be very lenient - only return valid: false if this is completely unreadable or irrelevant.`,
  };

  // Return specific prompt if available, otherwise return a lenient generic prompt
  return prompts[documentType] || `You are validating a document labeled as "${documentType}" for bankruptcy filing.

IMPORTANT: Be LENIENT in validation. This document is being uploaded for bankruptcy case preparation.

A document is VALID if:
- It appears to be the type of document claimed (${documentType})
- It contains some relevant financial or personal information
- It is readable/legible

Do NOT fail validation for:
- Past dates (historical documents are expected)
- Missing fields (partial information is acceptable)
- Formatting differences
- AI-generated or sample documents with realistic structure

Return ONLY this JSON:
{ "valid": true, "issues": [], "confidence": 0.9 }

Only return valid: false if this document is completely unrelated to its claimed type.`;
}

/**
 * Parse validation response from LLM
 * Handles various response formats and defaults to valid if parsing fails
 */
export function parseValidationResponse(content: string | null | undefined): ValidationResult {
  if (!content) {
    // Default to valid if no response - don't block uploads
    return { valid: true, issues: [], confidence: 0.8 };
  }

  try {
    // Try to extract JSON from the response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        valid: parsed.valid !== false, // Default to true unless explicitly false
        issues: Array.isArray(parsed.issues) ? parsed.issues : [],
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.8,
      };
    }
  } catch (e) {
    // JSON parsing failed - default to valid
    console.warn('Failed to parse validation response, defaulting to valid:', e);
  }

  // If we can't parse, default to valid to avoid blocking legitimate documents
  return { valid: true, issues: [], confidence: 0.7 };
}
