import { NextRequest, NextResponse } from 'next/server';
import postgres from 'postgres';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; debtId: string }> }
) {
  try {
    const { id, debtId } = await params;
    const connectionString = request.nextUrl.searchParams.get('connectionString');

    if (!connectionString) {
      return NextResponse.json(
        { error: 'Database not initialized' },
        { status: 400 }
      );
    }

    const sql = postgres(connectionString);

    try {
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
        WHERE id = ${debtId} AND case_id = ${id}
      `;

      if (records.length === 0) {
        return NextResponse.json(
          { error: 'Debt not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({ debt: records[0] });
    } finally {
      await sql.end();
    }
  } catch (error: any) {
    console.error('Error fetching debt:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch debt' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; debtId: string }> }
) {
  try {
    const { id, debtId } = await params;
    const connectionString = request.nextUrl.searchParams.get('connectionString');
    const body = await request.json();

    if (!connectionString) {
      return NextResponse.json(
        { error: 'Database not initialized' },
        { status: 400 }
      );
    }

    const sql = postgres(connectionString);

    try {
      const result = await sql`
        UPDATE debts
        SET
          creditor_name = COALESCE(${body.creditorName}, creditor_name),
          creditor_address = COALESCE(${body.creditorAddress}, creditor_address),
          account_number = COALESCE(${body.accountNumber}, account_number),
          account_last4 = COALESCE(${body.accountLast4}, account_last4),
          balance = COALESCE(${body.balance ? parseFloat(body.balance) : null}, balance),
          monthly_payment = COALESCE(${body.monthlyPayment ? parseFloat(body.monthlyPayment) : null}, monthly_payment),
          interest_rate = COALESCE(${body.interestRate ? parseFloat(body.interestRate) : null}, interest_rate),
          debt_type = COALESCE(${body.debtType}, debt_type),
          secured = COALESCE(${body.secured}, secured),
          priority = COALESCE(${body.priority}, priority),
          collateral = COALESCE(${body.collateral}, collateral),
          collateral_value = COALESCE(${body.collateralValue ? parseFloat(body.collateralValue) : null}, collateral_value),
          date_incurred = COALESCE(${body.dateIncurred}, date_incurred)
        WHERE id = ${debtId} AND case_id = ${id}
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

      if (result.length === 0) {
        return NextResponse.json(
          { error: 'Debt not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({ debt: result[0] });
    } finally {
      await sql.end();
    }
  } catch (error: any) {
    console.error('Error updating debt:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update debt' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; debtId: string }> }
) {
  try {
    const { id, debtId } = await params;
    const connectionString = request.nextUrl.searchParams.get('connectionString');

    if (!connectionString) {
      return NextResponse.json(
        { error: 'Database not initialized' },
        { status: 400 }
      );
    }

    const sql = postgres(connectionString);

    try {
      const result = await sql`
        DELETE FROM debts
        WHERE id = ${debtId} AND case_id = ${id}
        RETURNING id
      `;

      if (result.length === 0) {
        return NextResponse.json(
          { error: 'Debt not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({ success: true });
    } finally {
      await sql.end();
    }
  } catch (error: any) {
    console.error('Error deleting debt:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete debt' },
      { status: 500 }
    );
  }
}
