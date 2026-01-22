import { NextRequest, NextResponse } from 'next/server';
import postgres from 'postgres';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; incomeId: string }> }
) {
  try {
    const { id, incomeId } = await params;
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
        WHERE id = ${incomeId} AND case_id = ${id}
      `;

      if (records.length === 0) {
        return NextResponse.json(
          { error: 'Income record not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({ incomeRecord: records[0] });
    } finally {
      await sql.end();
    }
  } catch (error: any) {
    console.error('Error fetching income record:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch income record' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; incomeId: string }> }
) {
  try {
    const { id, incomeId } = await params;
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
        UPDATE income_records
        SET
          employer = COALESCE(${body.employer}, employer),
          occupation = COALESCE(${body.occupation}, occupation),
          gross_pay = COALESCE(${body.grossPay ? parseFloat(body.grossPay) : null}, gross_pay),
          net_pay = COALESCE(${body.netPay ? parseFloat(body.netPay) : null}, net_pay),
          pay_period = COALESCE(${body.payPeriod}, pay_period),
          pay_date = COALESCE(${body.payDate}, pay_date),
          ytd_gross = COALESCE(${body.ytdGross ? parseFloat(body.ytdGross) : null}, ytd_gross),
          income_source = COALESCE(${body.incomeSource}, income_source)
        WHERE id = ${incomeId} AND case_id = ${id}
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

      if (result.length === 0) {
        return NextResponse.json(
          { error: 'Income record not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({ incomeRecord: result[0] });
    } finally {
      await sql.end();
    }
  } catch (error: any) {
    console.error('Error updating income record:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update income record' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; incomeId: string }> }
) {
  try {
    const { id, incomeId } = await params;
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
        DELETE FROM income_records
        WHERE id = ${incomeId} AND case_id = ${id}
        RETURNING id
      `;

      if (result.length === 0) {
        return NextResponse.json(
          { error: 'Income record not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({ success: true });
    } finally {
      await sql.end();
    }
  } catch (error: any) {
    console.error('Error deleting income record:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete income record' },
      { status: 500 }
    );
  }
}
