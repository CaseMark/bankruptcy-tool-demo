import { NextRequest, NextResponse } from 'next/server';
import postgres from 'postgres';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; expenseId: string }> }
) {
  try {
    const { id, expenseId } = await params;
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
          category,
          description,
          monthly_amount as "monthlyAmount",
          is_irs_standard as "isIrsStandard",
          irs_standard_type as "irsStandardType",
          created_at as "createdAt"
        FROM expenses
        WHERE id = ${expenseId} AND case_id = ${id}
      `;

      if (records.length === 0) {
        return NextResponse.json(
          { error: 'Expense not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({ expense: records[0] });
    } finally {
      await sql.end();
    }
  } catch (error: any) {
    console.error('Error fetching expense:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch expense' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; expenseId: string }> }
) {
  try {
    const { id, expenseId } = await params;
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
        UPDATE expenses
        SET
          category = COALESCE(${body.category}, category),
          description = COALESCE(${body.description}, description),
          monthly_amount = COALESCE(${body.monthlyAmount ? parseFloat(body.monthlyAmount) : null}, monthly_amount),
          is_irs_standard = COALESCE(${body.isIrsStandard}, is_irs_standard),
          irs_standard_type = COALESCE(${body.irsStandardType}, irs_standard_type)
        WHERE id = ${expenseId} AND case_id = ${id}
        RETURNING
          id,
          case_id as "caseId",
          category,
          description,
          monthly_amount as "monthlyAmount",
          is_irs_standard as "isIrsStandard",
          irs_standard_type as "irsStandardType",
          created_at as "createdAt"
      `;

      if (result.length === 0) {
        return NextResponse.json(
          { error: 'Expense not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({ expense: result[0] });
    } finally {
      await sql.end();
    }
  } catch (error: any) {
    console.error('Error updating expense:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update expense' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; expenseId: string }> }
) {
  try {
    const { id, expenseId } = await params;
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
        DELETE FROM expenses
        WHERE id = ${expenseId} AND case_id = ${id}
        RETURNING id
      `;

      if (result.length === 0) {
        return NextResponse.json(
          { error: 'Expense not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({ success: true });
    } finally {
      await sql.end();
    }
  } catch (error: any) {
    console.error('Error deleting expense:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete expense' },
      { status: 500 }
    );
  }
}
