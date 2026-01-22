import { NextRequest, NextResponse } from 'next/server';
import postgres from 'postgres';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const connectionString = request.nextUrl.searchParams.get('connectionString');

    if (!connectionString) {
      return NextResponse.json(
        { error: 'Database not initialized' },
        { status: 400 }
      );
    }

    const sql = postgres(connectionString);

    try {
      // Ensure table exists
      await sql`
        CREATE TABLE IF NOT EXISTS debts (
          id TEXT PRIMARY KEY,
          case_id TEXT NOT NULL,
          creditor_name TEXT NOT NULL,
          creditor_address TEXT,
          account_number TEXT,
          account_last4 TEXT,
          balance DECIMAL(10, 2) NOT NULL,
          monthly_payment DECIMAL(10, 2),
          interest_rate DECIMAL(5, 2),
          debt_type TEXT NOT NULL,
          secured BOOLEAN DEFAULT false,
          priority BOOLEAN DEFAULT false,
          collateral TEXT,
          collateral_value DECIMAL(10, 2),
          date_incurred DATE,
          created_at TIMESTAMP NOT NULL DEFAULT NOW()
        )
      `;

      const records = await sql`
        SELECT
          id,
          case_id as "caseId",
          creditor_name as "creditorName",
          creditor_address as "creditorAddress",
          account_number as "accountNumber",
          account_last4 as "accountLast4",
          balance,
          monthly_payment as "monthlyPayment",
          interest_rate as "interestRate",
          debt_type as "debtType",
          secured,
          priority,
          collateral,
          collateral_value as "collateralValue",
          date_incurred as "dateIncurred",
          created_at as "createdAt"
        FROM debts
        WHERE case_id = ${id}
        ORDER BY balance DESC
      `;

      return NextResponse.json({ debts: records });
    } finally {
      await sql.end();
    }
  } catch (error: any) {
    console.error('Error fetching debts:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch debts' },
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

    if (!body.creditorName || !body.balance || !body.debtType) {
      return NextResponse.json(
        { error: 'Creditor name, balance, and debt type are required' },
        { status: 400 }
      );
    }

    const sql = postgres(connectionString);

    try {
      // Ensure table exists
      await sql`
        CREATE TABLE IF NOT EXISTS debts (
          id TEXT PRIMARY KEY,
          case_id TEXT NOT NULL,
          creditor_name TEXT NOT NULL,
          creditor_address TEXT,
          account_number TEXT,
          account_last4 TEXT,
          balance DECIMAL(10, 2) NOT NULL,
          monthly_payment DECIMAL(10, 2),
          interest_rate DECIMAL(5, 2),
          debt_type TEXT NOT NULL,
          secured BOOLEAN DEFAULT false,
          priority BOOLEAN DEFAULT false,
          collateral TEXT,
          collateral_value DECIMAL(10, 2),
          date_incurred DATE,
          created_at TIMESTAMP NOT NULL DEFAULT NOW()
        )
      `;

      const recordId = `debt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      const result = await sql`
        INSERT INTO debts (
          id, case_id, creditor_name, creditor_address, account_number, account_last4,
          balance, monthly_payment, interest_rate, debt_type, secured, priority,
          collateral, collateral_value, date_incurred, created_at
        ) VALUES (
          ${recordId},
          ${id},
          ${body.creditorName},
          ${body.creditorAddress || null},
          ${body.accountNumber || null},
          ${body.accountLast4 || null},
          ${parseFloat(body.balance)},
          ${body.monthlyPayment ? parseFloat(body.monthlyPayment) : null},
          ${body.interestRate ? parseFloat(body.interestRate) : null},
          ${body.debtType},
          ${body.secured || false},
          ${body.priority || false},
          ${body.collateral || null},
          ${body.collateralValue ? parseFloat(body.collateralValue) : null},
          ${body.dateIncurred || null},
          NOW()
        )
        RETURNING
          id,
          case_id as "caseId",
          creditor_name as "creditorName",
          creditor_address as "creditorAddress",
          account_number as "accountNumber",
          account_last4 as "accountLast4",
          balance,
          monthly_payment as "monthlyPayment",
          interest_rate as "interestRate",
          debt_type as "debtType",
          secured,
          priority,
          collateral,
          collateral_value as "collateralValue",
          date_incurred as "dateIncurred",
          created_at as "createdAt"
      `;

      return NextResponse.json({ debt: result[0] });
    } finally {
      await sql.end();
    }
  } catch (error: any) {
    console.error('Error creating debt:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create debt' },
      { status: 500 }
    );
  }
}
