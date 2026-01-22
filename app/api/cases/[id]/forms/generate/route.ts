import { NextRequest, NextResponse } from 'next/server';
import postgres from 'postgres';
import { mapAllForms, FormData } from '@/lib/bankruptcy/form-mapper';
import { generateAllForms, GeneratedForm } from '@/lib/bankruptcy/pdf-generator';

// Helper to calculate monthly income from pay period
function calculateMonthlyIncome(grossPay: number | null, payPeriod: string | null): number {
  if (!grossPay) return 0;
  switch (payPeriod) {
    case 'weekly': return grossPay * 4.33;
    case 'biweekly': return grossPay * 2.17;
    case 'annual': return grossPay / 12;
    case 'monthly':
    default: return grossPay;
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: caseId } = await params;
  const connectionString = request.nextUrl.searchParams.get('connectionString');

  if (!connectionString) {
    return NextResponse.json({ error: 'Connection string is required' }, { status: 400 });
  }

  const sql = postgres(connectionString);

  try {
    // Fetch case data
    const caseResult = await sql`
      SELECT id, client_name, case_number, case_type, status, created_at, state, household_size, filing_date
      FROM bankruptcy_cases
      WHERE id = ${caseId}
    `;

    if (caseResult.length === 0) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    const caseData = caseResult[0];

    // Fetch income records
    const incomeRecords = await sql`
      SELECT id, employer, occupation, gross_pay, net_pay, pay_period, income_source, ytd_gross
      FROM income WHERE case_id = ${caseId}
    `;

    // Fetch expense records
    const expenseRecords = await sql`
      SELECT id, category, description, monthly_amount
      FROM expenses WHERE case_id = ${caseId}
    `;

    // Fetch asset records
    const assetRecords = await sql`
      SELECT id, asset_type, description, current_value, address, make, model, year, vin,
             institution, account_number_last4, ownership_percentage
      FROM assets WHERE case_id = ${caseId}
    `;

    // Fetch debt records
    const debtRecords = await sql`
      SELECT id, creditor_name, creditor_address, account_last4, balance, monthly_payment,
             interest_rate, debt_type, secured, priority, collateral, collateral_value
      FROM debts WHERE case_id = ${caseId}
    `;

    // Calculate means test data
    const monthlyGrossIncome = incomeRecords.reduce(
      (sum, r) => sum + calculateMonthlyIncome(Number(r.gross_pay), r.pay_period),
      0
    );

    const totalUnsecuredDebt = debtRecords
      .filter(d => !d.secured)
      .reduce((sum, d) => sum + Number(d.balance), 0);

    // Get state median income (simplified)
    const { getStateMedianIncome } = await import('@/lib/bankruptcy/chapter7');
    const state = caseData.state || 'CA';
    const householdSize = caseData.household_size || 1;
    const medianIncome = getStateMedianIncome(state, householdSize);
    const annualIncome = monthlyGrossIncome * 12;
    const isAboveMedian = annualIncome > medianIncome;

    // Prepare form data
    const formData: FormData = {
      caseData: {
        id: caseData.id,
        clientName: caseData.client_name,
        caseNumber: caseData.case_number,
        caseType: caseData.case_type,
        status: caseData.status,
        createdAt: caseData.created_at,
        state: caseData.state,
        householdSize: caseData.household_size,
        filingDate: caseData.filing_date,
      },
      income: incomeRecords.map(r => ({
        id: r.id,
        employer: r.employer,
        occupation: r.occupation,
        grossPay: Number(r.gross_pay),
        netPay: Number(r.net_pay),
        payPeriod: r.pay_period,
        incomeSource: r.income_source,
        ytdGross: Number(r.ytd_gross),
      })),
      expenses: expenseRecords.map(e => ({
        id: e.id,
        category: e.category,
        description: e.description,
        monthlyAmount: Number(e.monthly_amount),
      })),
      assets: assetRecords.map(a => ({
        id: a.id,
        assetType: a.asset_type,
        description: a.description,
        currentValue: Number(a.current_value),
        address: a.address,
        make: a.make,
        model: a.model,
        year: a.year,
        vin: a.vin,
        institution: a.institution,
        accountNumberLast4: a.account_number_last4,
        ownershipPercentage: Number(a.ownership_percentage),
      })),
      debts: debtRecords.map(d => ({
        id: d.id,
        creditorName: d.creditor_name,
        creditorAddress: d.creditor_address,
        accountLast4: d.account_last4,
        balance: Number(d.balance),
        monthlyPayment: Number(d.monthly_payment),
        interestRate: Number(d.interest_rate),
        debtType: d.debt_type,
        secured: d.secured,
        priority: d.priority,
        collateral: d.collateral,
        collateralValue: Number(d.collateral_value),
      })),
      meansTest: {
        passes: !isAboveMedian,
        annualIncome,
        medianIncome,
        isAboveMedian,
        monthlyDisposableIncome: 0,
        presumptionOfAbuse: false,
      },
    };

    // Map data to form structures
    const allFormsData = mapAllForms(formData);

    // Generate PDFs
    const generatedForms = generateAllForms(allFormsData);

    // Convert blobs to base64 for response
    const formsWithBase64 = await Promise.all(
      generatedForms.map(async (form) => {
        const buffer = await form.blob.arrayBuffer();
        const base64 = Buffer.from(buffer).toString('base64');
        return {
          formId: form.formId,
          formName: form.formName,
          filename: form.filename,
          base64,
          size: form.blob.size,
        };
      })
    );

    return NextResponse.json({
      success: true,
      caseId,
      generatedAt: new Date().toISOString(),
      forms: formsWithBase64,
    });
  } catch (error) {
    console.error('Error generating forms:', error);
    return NextResponse.json(
      { error: 'Failed to generate forms' },
      { status: 500 }
    );
  } finally {
    await sql.end();
  }
}
