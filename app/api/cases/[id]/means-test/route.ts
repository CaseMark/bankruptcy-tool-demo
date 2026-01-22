import { NextRequest, NextResponse } from 'next/server';
import postgres from 'postgres';
import {
  calculateMeansTest,
  calculateIRSAllowances,
  getStateMedianIncome,
  type MeansTestResult,
  type MeansTestAllowances,
} from '@/lib/bankruptcy/chapter7';

interface MeansTestResponse {
  caseId: string;
  calculatedAt: string;
  inputs: {
    state: string;
    householdSize: number;
    monthlyGrossIncome: number;
    monthlyExpenses: number;
    totalUnsecuredDebt: number;
    totalSecuredDebt: number;
    hasVehicle: boolean;
    vehicleCount: number;
  };
  irsAllowances: MeansTestAllowances;
  result: MeansTestResult;
}

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

export async function GET(
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
      SELECT id, client_name, case_type, status, monthly_income, monthly_expenses,
             total_assets, total_debt, household_size, state
      FROM bankruptcy_cases
      WHERE id = ${caseId}
    `;

    if (caseResult.length === 0) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    const caseData = caseResult[0];

    // Fetch income records
    const incomeRecords = await sql`
      SELECT gross_pay, pay_period FROM income WHERE case_id = ${caseId}
    `;

    // Fetch expense records
    const expenseRecords = await sql`
      SELECT monthly_amount FROM expenses WHERE case_id = ${caseId}
    `;

    // Fetch debt records
    const debtRecords = await sql`
      SELECT balance, secured, monthly_payment FROM debts WHERE case_id = ${caseId}
    `;

    // Fetch asset records (to check for vehicles)
    const assetRecords = await sql`
      SELECT asset_type FROM assets WHERE case_id = ${caseId}
    `;

    // Calculate totals from actual data
    const monthlyGrossIncome = incomeRecords.reduce(
      (sum, r) => sum + calculateMonthlyIncome(Number(r.gross_pay), r.pay_period),
      0
    );

    const monthlyExpenses = expenseRecords.reduce(
      (sum, e) => sum + Number(e.monthly_amount),
      0
    );

    const totalSecuredDebt = debtRecords
      .filter(d => d.secured)
      .reduce((sum, d) => sum + Number(d.balance), 0);

    const totalUnsecuredDebt = debtRecords
      .filter(d => !d.secured)
      .reduce((sum, d) => sum + Number(d.balance), 0);

    // Check for vehicles
    const vehicleCount = assetRecords.filter(a => a.asset_type === 'vehicle').length;
    const hasVehicle = vehicleCount > 0;

    // Get state and household size from case
    const state = caseData.state || 'CA';
    const householdSize = caseData.household_size || 1;

    // Calculate IRS allowances
    const irsAllowances = calculateIRSAllowances(
      state,
      householdSize,
      hasVehicle,
      vehicleCount || 1,
      40 // Default age
    );

    // Calculate means test result
    const result = calculateMeansTest(
      state,
      householdSize,
      monthlyGrossIncome,
      monthlyExpenses,
      totalUnsecuredDebt,
      hasVehicle,
      vehicleCount || 1,
      40
    );

    const response: MeansTestResponse = {
      caseId,
      calculatedAt: new Date().toISOString(),
      inputs: {
        state,
        householdSize,
        monthlyGrossIncome,
        monthlyExpenses,
        totalUnsecuredDebt,
        totalSecuredDebt,
        hasVehicle,
        vehicleCount: vehicleCount || 0,
      },
      irsAllowances,
      result,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error calculating means test:', error);
    return NextResponse.json(
      { error: 'Failed to calculate means test' },
      { status: 500 }
    );
  } finally {
    await sql.end();
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
      SELECT id, client_name, case_type, status, monthly_income, monthly_expenses,
             total_assets, total_debt, household_size, state
      FROM bankruptcy_cases
      WHERE id = ${caseId}
    `;

    if (caseResult.length === 0) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    const caseData = caseResult[0];

    // Fetch income records
    const incomeRecords = await sql`
      SELECT gross_pay, pay_period FROM income WHERE case_id = ${caseId}
    `;

    // Fetch expense records
    const expenseRecords = await sql`
      SELECT monthly_amount FROM expenses WHERE case_id = ${caseId}
    `;

    // Fetch debt records
    const debtRecords = await sql`
      SELECT balance, secured, monthly_payment FROM debts WHERE case_id = ${caseId}
    `;

    // Fetch asset records (to check for vehicles)
    const assetRecords = await sql`
      SELECT asset_type FROM assets WHERE case_id = ${caseId}
    `;

    // Calculate totals from actual data
    const monthlyGrossIncome = incomeRecords.reduce(
      (sum, r) => sum + calculateMonthlyIncome(Number(r.gross_pay), r.pay_period),
      0
    );

    const monthlyExpenses = expenseRecords.reduce(
      (sum, e) => sum + Number(e.monthly_amount),
      0
    );

    const totalSecuredDebt = debtRecords
      .filter(d => d.secured)
      .reduce((sum, d) => sum + Number(d.balance), 0);

    const totalUnsecuredDebt = debtRecords
      .filter(d => !d.secured)
      .reduce((sum, d) => sum + Number(d.balance), 0);

    const totalDebt = totalSecuredDebt + totalUnsecuredDebt;

    // Calculate total assets
    const totalAssets = await sql`
      SELECT COALESCE(SUM(current_value), 0) as total FROM assets WHERE case_id = ${caseId}
    `;

    // Check for vehicles
    const vehicleCount = assetRecords.filter(a => a.asset_type === 'vehicle').length;
    const hasVehicle = vehicleCount > 0;

    // Get state and household size from case
    const state = caseData.state || 'CA';
    const householdSize = caseData.household_size || 1;

    // Calculate IRS allowances
    const irsAllowances = calculateIRSAllowances(
      state,
      householdSize,
      hasVehicle,
      vehicleCount || 1,
      40
    );

    // Calculate means test result
    const result = calculateMeansTest(
      state,
      householdSize,
      monthlyGrossIncome,
      monthlyExpenses,
      totalUnsecuredDebt,
      hasVehicle,
      vehicleCount || 1,
      40
    );

    // Update case with calculated totals
    await sql`
      UPDATE bankruptcy_cases
      SET
        monthly_income = ${monthlyGrossIncome},
        monthly_expenses = ${monthlyExpenses},
        total_debt = ${totalDebt},
        total_assets = ${Number(totalAssets[0].total)},
        updated_at = NOW()
      WHERE id = ${caseId}
    `;

    const response: MeansTestResponse = {
      caseId,
      calculatedAt: new Date().toISOString(),
      inputs: {
        state,
        householdSize,
        monthlyGrossIncome,
        monthlyExpenses,
        totalUnsecuredDebt,
        totalSecuredDebt,
        hasVehicle,
        vehicleCount: vehicleCount || 0,
      },
      irsAllowances,
      result,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error calculating means test:', error);
    return NextResponse.json(
      { error: 'Failed to calculate means test' },
      { status: 500 }
    );
  } finally {
    await sql.end();
  }
}
