import { NextRequest, NextResponse } from 'next/server';
import postgres from 'postgres';

/**
 * Income Records API
 *
 * Manages income records for 6-month CMI calculation per Form B 122A-2.
 * Income is tracked by calendar month (YYYY-MM) to calculate the average
 * monthly income received during the 6 months before filing.
 */

// Income source types per Form B 122A-2
type IncomeSource =
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

interface IncomeRecord {
  id: string;
  caseId: string;
  documentId: string | null;
  incomeMonth: string; // YYYY-MM
  employer: string | null;
  grossAmount: number;
  netAmount: number | null;
  incomeSource: IncomeSource;
  description: string | null;
  confidence: number | null;
  extractedAt: string | null;
  createdAt: string;
}

interface MonthlyIncomeSummary {
  month: string;
  totalGross: number;
  totalNet: number | null;
  sources: {
    source: IncomeSource;
    amount: number;
  }[];
}

interface CMICalculation {
  monthlyIncomes: MonthlyIncomeSummary[];
  sixMonthTotal: number;
  currentMonthlyIncome: number; // CMI = 6-month total / 6
  monthsCovered: number;
  isComplete: boolean; // True if all 6 months have income data
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const connectionString = request.nextUrl.searchParams.get('connectionString');
    const calculateCMI = request.nextUrl.searchParams.get('calculateCMI') === 'true';

    if (!connectionString) {
      return NextResponse.json(
        { error: 'Database not initialized' },
        { status: 400 }
      );
    }

    const sql = postgres(connectionString);

    try {
      // Ensure table exists with new schema
      await sql`
        CREATE TABLE IF NOT EXISTS income_records (
          id TEXT PRIMARY KEY,
          case_id TEXT NOT NULL,
          document_id TEXT,
          income_month TEXT NOT NULL,
          employer TEXT,
          gross_amount DECIMAL(10, 2) NOT NULL,
          net_amount DECIMAL(10, 2),
          income_source TEXT NOT NULL DEFAULT 'employment',
          description TEXT,
          confidence DECIMAL(3, 2),
          extracted_at TIMESTAMP,
          created_at TIMESTAMP NOT NULL DEFAULT NOW()
        )
      `;

      // Create index on income_month if not exists
      await sql`
        CREATE INDEX IF NOT EXISTS income_records_month_idx ON income_records (income_month)
      `;

      const records = await sql`
        SELECT
          id,
          case_id as "caseId",
          document_id as "documentId",
          income_month as "incomeMonth",
          employer,
          gross_amount as "grossAmount",
          net_amount as "netAmount",
          income_source as "incomeSource",
          description,
          confidence,
          extracted_at as "extractedAt",
          created_at as "createdAt"
        FROM income_records
        WHERE case_id = ${id}
        ORDER BY income_month DESC, created_at DESC
      `;

      // If CMI calculation requested, compute 6-month average
      if (calculateCMI) {
        const cmiResult = calculateCurrentMonthlyIncome(records as unknown as IncomeRecord[]);
        return NextResponse.json({
          incomeRecords: records,
          cmi: cmiResult,
        });
      }

      return NextResponse.json({ incomeRecords: records });
    } finally {
      await sql.end();
    }
  } catch (error: any) {
    console.error('Error fetching income records:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch income records' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const connectionString = request.nextUrl.searchParams.get('connectionString');
    const body = await request.json();

    if (!connectionString) {
      return NextResponse.json(
        { error: 'Database not initialized' },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!body.incomeMonth) {
      return NextResponse.json(
        { error: 'incomeMonth is required (format: YYYY-MM)' },
        { status: 400 }
      );
    }

    if (!body.grossAmount || isNaN(parseFloat(body.grossAmount))) {
      return NextResponse.json(
        { error: 'grossAmount is required and must be a number' },
        { status: 400 }
      );
    }

    const sql = postgres(connectionString);

    try {
      // Ensure table exists with new schema
      await sql`
        CREATE TABLE IF NOT EXISTS income_records (
          id TEXT PRIMARY KEY,
          case_id TEXT NOT NULL,
          document_id TEXT,
          income_month TEXT NOT NULL,
          employer TEXT,
          gross_amount DECIMAL(10, 2) NOT NULL,
          net_amount DECIMAL(10, 2),
          income_source TEXT NOT NULL DEFAULT 'employment',
          description TEXT,
          confidence DECIMAL(3, 2),
          extracted_at TIMESTAMP,
          created_at TIMESTAMP NOT NULL DEFAULT NOW()
        )
      `;

      // Generate ID
      const recordId = `inc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      const result = await sql`
        INSERT INTO income_records (
          id, case_id, document_id, income_month,
          employer, gross_amount, net_amount,
          income_source, description, confidence, created_at
        ) VALUES (
          ${recordId},
          ${id},
          ${body.documentId || null},
          ${body.incomeMonth},
          ${body.employer || null},
          ${parseFloat(body.grossAmount)},
          ${body.netAmount ? parseFloat(body.netAmount) : null},
          ${body.incomeSource || 'employment'},
          ${body.description || null},
          ${body.confidence ? parseFloat(body.confidence) : null},
          NOW()
        )
        RETURNING
          id,
          case_id as "caseId",
          document_id as "documentId",
          income_month as "incomeMonth",
          employer,
          gross_amount as "grossAmount",
          net_amount as "netAmount",
          income_source as "incomeSource",
          description,
          confidence,
          extracted_at as "extractedAt",
          created_at as "createdAt"
      `;

      return NextResponse.json({ incomeRecord: result[0] });
    } finally {
      await sql.end();
    }
  } catch (error: any) {
    console.error('Error creating income record:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create income record' },
      { status: 500 }
    );
  }
}

/**
 * Calculate Current Monthly Income (CMI) per Form B 122A-2
 *
 * CMI = Total income received during 6 full calendar months before filing / 6
 *
 * Per 11 U.S.C. § 101(10A), this includes all income from any source
 * received during the 6-month period, divided by 6.
 */
function calculateCurrentMonthlyIncome(records: IncomeRecord[]): CMICalculation {
  // Get the 6 most recent months from the data
  const monthlyTotals = new Map<string, MonthlyIncomeSummary>();

  for (const record of records) {
    const month = record.incomeMonth;
    if (!monthlyTotals.has(month)) {
      monthlyTotals.set(month, {
        month,
        totalGross: 0,
        totalNet: 0,
        sources: [],
      });
    }

    const summary = monthlyTotals.get(month)!;
    const grossAmount = Number(record.grossAmount) || 0;
    const netAmount = record.netAmount ? Number(record.netAmount) : null;

    summary.totalGross += grossAmount;
    if (netAmount !== null) {
      summary.totalNet = (summary.totalNet || 0) + netAmount;
    }

    // Track income by source
    const existingSource = summary.sources.find(s => s.source === record.incomeSource);
    if (existingSource) {
      existingSource.amount += grossAmount;
    } else {
      summary.sources.push({
        source: record.incomeSource as IncomeSource,
        amount: grossAmount,
      });
    }
  }

  // Sort months descending and take the 6 most recent
  const sortedMonths = Array.from(monthlyTotals.values())
    .sort((a, b) => b.month.localeCompare(a.month))
    .slice(0, 6);

  // Calculate totals
  const sixMonthTotal = sortedMonths.reduce((sum, m) => sum + m.totalGross, 0);
  const monthsCovered = sortedMonths.length;

  // CMI is always divided by 6, even if fewer months have data
  // This is per Form B 122A-2 instructions
  const currentMonthlyIncome = sixMonthTotal / 6;

  return {
    monthlyIncomes: sortedMonths,
    sixMonthTotal,
    currentMonthlyIncome: Math.round(currentMonthlyIncome * 100) / 100,
    monthsCovered,
    isComplete: monthsCovered >= 6,
  };
}
