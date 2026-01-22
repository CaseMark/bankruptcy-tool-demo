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
        CREATE TABLE IF NOT EXISTS income_records (
          id TEXT PRIMARY KEY,
          case_id TEXT NOT NULL,
          employer TEXT,
          occupation TEXT,
          gross_pay DECIMAL(10, 2),
          net_pay DECIMAL(10, 2),
          pay_period TEXT,
          pay_date DATE,
          ytd_gross DECIMAL(10, 2),
          income_source TEXT DEFAULT 'employment',
          created_at TIMESTAMP NOT NULL DEFAULT NOW()
        )
      `;

      const records = await sql`
        SELECT
          id,
          case_id as "caseId",
          employer,
          occupation,
          gross_pay as "grossPay",
          net_pay as "netPay",
          pay_period as "payPeriod",
          pay_date as "payDate",
          ytd_gross as "ytdGross",
          income_source as "incomeSource",
          created_at as "createdAt"
        FROM income_records
        WHERE case_id = ${id}
        ORDER BY created_at DESC
      `;

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

    const sql = postgres(connectionString);

    try {
      // Ensure table exists
      await sql`
        CREATE TABLE IF NOT EXISTS income_records (
          id TEXT PRIMARY KEY,
          case_id TEXT NOT NULL,
          employer TEXT,
          occupation TEXT,
          gross_pay DECIMAL(10, 2),
          net_pay DECIMAL(10, 2),
          pay_period TEXT,
          pay_date DATE,
          ytd_gross DECIMAL(10, 2),
          income_source TEXT DEFAULT 'employment',
          created_at TIMESTAMP NOT NULL DEFAULT NOW()
        )
      `;

      // Generate ID
      const recordId = `inc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      const result = await sql`
        INSERT INTO income_records (
          id, case_id, employer, occupation, gross_pay, net_pay,
          pay_period, pay_date, ytd_gross, income_source, created_at
        ) VALUES (
          ${recordId},
          ${id},
          ${body.employer || null},
          ${body.occupation || null},
          ${body.grossPay ? parseFloat(body.grossPay) : null},
          ${body.netPay ? parseFloat(body.netPay) : null},
          ${body.payPeriod || 'monthly'},
          ${body.payDate || null},
          ${body.ytdGross ? parseFloat(body.ytdGross) : null},
          ${body.incomeSource || 'employment'},
          NOW()
        )
        RETURNING
          id,
          case_id as "caseId",
          employer,
          occupation,
          gross_pay as "grossPay",
          net_pay as "netPay",
          pay_period as "payPeriod",
          pay_date as "payDate",
          ytd_gross as "ytdGross",
          income_source as "incomeSource",
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
