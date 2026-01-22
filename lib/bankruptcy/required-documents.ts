/**
 * Required Documents for Bankruptcy Filing
 *
 * These documents are typically required for Chapter 7 bankruptcy filing.
 * The list is used to track document completion and prompt users for uploads.
 */

export interface RequiredDocument {
  type: string;
  name: string;
  description: string;
  required: boolean;
  category: 'income' | 'identity' | 'financial' | 'debt' | 'asset';
}

export const CHAPTER_7_REQUIRED_DOCUMENTS: RequiredDocument[] = [
  // Income Documents
  {
    type: 'paystub',
    name: 'Pay Stubs',
    description: 'Last 60 days of pay stubs from all employers',
    required: true,
    category: 'income',
  },
  {
    type: 'tax_return',
    name: 'Tax Returns',
    description: 'Federal tax returns for the last 2 years',
    required: true,
    category: 'income',
  },
  {
    type: 'w2',
    name: 'W-2 Forms',
    description: 'W-2 forms from the last 2 years',
    required: true,
    category: 'income',
  },
  // Financial Documents
  {
    type: 'bank_statement',
    name: 'Bank Statements',
    description: 'Last 6 months of statements for all bank accounts',
    required: true,
    category: 'financial',
  },
  // Debt Documents
  {
    type: 'credit_card',
    name: 'Credit Card Statements',
    description: 'Most recent statements for all credit cards',
    required: true,
    category: 'debt',
  },
  {
    type: 'loan_statement',
    name: 'Loan Statements',
    description: 'Statements for any personal, auto, or other loans',
    required: false,
    category: 'debt',
  },
  {
    type: 'medical_bill',
    name: 'Medical Bills',
    description: 'Any outstanding medical bills',
    required: false,
    category: 'debt',
  },
  {
    type: 'collection_notice',
    name: 'Collection Notices',
    description: 'Letters from collection agencies',
    required: false,
    category: 'debt',
  },
  // Asset Documents
  {
    type: 'vehicle_title',
    name: 'Vehicle Titles',
    description: 'Titles for any vehicles owned',
    required: false,
    category: 'asset',
  },
  {
    type: 'property_deed',
    name: 'Property Deeds',
    description: 'Deeds for any real estate owned',
    required: false,
    category: 'asset',
  },
  {
    type: 'mortgage',
    name: 'Mortgage Statements',
    description: 'Most recent mortgage statement',
    required: false,
    category: 'asset',
  },
  {
    type: 'lease',
    name: 'Lease Agreement',
    description: 'Current rental/lease agreement',
    required: false,
    category: 'financial',
  },
  // Utility Documents
  {
    type: 'utility',
    name: 'Utility Bills',
    description: 'Recent utility bills (electric, gas, water)',
    required: false,
    category: 'financial',
  },
];

// Get only the required documents
export const getRequiredDocuments = () =>
  CHAPTER_7_REQUIRED_DOCUMENTS.filter(doc => doc.required);

// Get documents by category
export const getDocumentsByCategory = (category: RequiredDocument['category']) =>
  CHAPTER_7_REQUIRED_DOCUMENTS.filter(doc => doc.category === category);

// Check which required documents are missing
export const getMissingDocuments = (uploadedTypes: string[]): RequiredDocument[] => {
  const requiredDocs = getRequiredDocuments();
  return requiredDocs.filter(doc => !uploadedTypes.includes(doc.type));
};

// Calculate completion percentage
export const getDocumentCompletionPercentage = (uploadedTypes: string[]): number => {
  const requiredDocs = getRequiredDocuments();
  const uploaded = requiredDocs.filter(doc => uploadedTypes.includes(doc.type));
  return Math.round((uploaded.length / requiredDocs.length) * 100);
};
