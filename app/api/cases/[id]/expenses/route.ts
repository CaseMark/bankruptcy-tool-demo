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
        CREATE TABLE IF NOT EXISTS expenses (
          id TEXT PRIMARY KEY,
          case_id TEXT NOT NULL,
          category TEXT NOT NULL,
          description TEXT,
          monthly_amount DECIMAL(10, 2) NOT NULL,
          is_irs_standard BOOLEAN DEFAULT false,
          irs_standard_type TEXT,
          created_at TIMESTAMP NOT NULL DEFAULT NOW()
        )
      `;

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
        WHERE case_id = ${id}
        ORDER BY category, monthly_amount DESC
      `;

      return NextResponse.json({ expenses: records });
    } finally {
      await sql.end();
    }
  } catch (error: any) {
    console.error('Error fetching expenses:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch expenses' },
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

    if (!body.category || body.monthlyAmount === undefined) {
      return NextResponse.json(
        { error: 'Category and monthly amount are required' },
        { status: 400 }
      );
    }

    const sql = postgres(connectionString);

    try {
      // Ensure table exists
      await sql`
        CREATE TABLE IF NOT EXISTS expenses (
          id TEXT PRIMARY KEY,
          case_id TEXT NOT NULL,
          category TEXT NOT NULL,
          description TEXT,
          monthly_amount DECIMAL(10, 2) NOT NULL,
          is_irs_standard BOOLEAN DEFAULT false,
          irs_standard_type TEXT,
          created_at TIMESTAMP NOT NULL DEFAULT NOW()
        )
      `;

      const recordId = `exp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      const result = await sql`
        INSERT INTO expenses (
          id, case_id, category, description, monthly_amount,
          is_irs_standard, irs_standard_type, created_at
        ) VALUES (
          ${recordId},
          ${id},
          ${body.category},
          ${body.description || null},
          ${parseFloat(body.monthlyAmount)},
          ${body.isIrsStandard || false},
          ${body.irsStandardType || null},
          NOW()
        )
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

      return NextResponse.json({ expense: result[0] });
    } finally {
      await sql.end();
    }
  } catch (error: any) {
    console.error('Error creating expense:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create expense' },
      { status: 500 }
    );
  }
}
