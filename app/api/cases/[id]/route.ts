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
      // Fetch case by ID
      const cases = await sql`
        SELECT
          id,
          client_name as "clientName",
          client_email as "clientEmail",
          client_phone as "clientPhone",
          ssn_last4 as "ssnLast4",
          address,
          city,
          state,
          zip,
          county,
          case_type as "caseType",
          filing_type as "filingType",
          household_size as "householdSize",
          status,
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM bankruptcy_cases
        WHERE id = ${id}
      `;

      if (cases.length === 0) {
        return NextResponse.json(
          { error: 'Case not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({ case: cases[0] });
    } finally {
      await sql.end();
    }
  } catch (error: any) {
    console.error('Error fetching case:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch case' },
      { status: 500 }
    );
  }
}

export async function PUT(
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
      // Convert undefined values to null (postgres.js doesn't accept undefined)
      const updates = {
        clientName: body.clientName ?? null,
        clientEmail: body.clientEmail ?? null,
        clientPhone: body.clientPhone ?? null,
        ssnLast4: body.ssnLast4 ?? null,
        address: body.address ?? null,
        city: body.city ?? null,
        state: body.state ?? null,
        zip: body.zip ?? null,
        county: body.county ?? null,
        caseType: body.caseType ?? null,
        filingType: body.filingType ?? null,
        householdSize: body.householdSize ?? null,
        status: body.status ?? null,
      };

      // Update case
      const result = await sql`
        UPDATE bankruptcy_cases
        SET
          client_name = COALESCE(${updates.clientName}, client_name),
          client_email = COALESCE(${updates.clientEmail}, client_email),
          client_phone = COALESCE(${updates.clientPhone}, client_phone),
          ssn_last4 = COALESCE(${updates.ssnLast4}, ssn_last4),
          address = COALESCE(${updates.address}, address),
          city = COALESCE(${updates.city}, city),
          state = COALESCE(${updates.state}, state),
          zip = COALESCE(${updates.zip}, zip),
          county = COALESCE(${updates.county}, county),
          case_type = COALESCE(${updates.caseType}, case_type),
          filing_type = COALESCE(${updates.filingType}, filing_type),
          household_size = COALESCE(${updates.householdSize}, household_size),
          status = COALESCE(${updates.status}, status),
          updated_at = NOW()
        WHERE id = ${id}
        RETURNING
          id,
          client_name as "clientName",
          client_email as "clientEmail",
          client_phone as "clientPhone",
          ssn_last4 as "ssnLast4",
          address,
          city,
          state,
          zip,
          county,
          case_type as "caseType",
          filing_type as "filingType",
          household_size as "householdSize",
          status,
          created_at as "createdAt",
          updated_at as "updatedAt"
      `;

      if (result.length === 0) {
        return NextResponse.json(
          { error: 'Case not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({ case: result[0] });
    } finally {
      await sql.end();
    }
  } catch (error: any) {
    console.error('Error updating case:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update case' },
      { status: 500 }
    );
  }
}

export async function DELETE(
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
      // Delete case
      const result = await sql`
        DELETE FROM bankruptcy_cases
        WHERE id = ${id}
        RETURNING id
      `;

      if (result.length === 0) {
        return NextResponse.json(
          { error: 'Case not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({ success: true });
    } finally {
      await sql.end();
    }
  } catch (error: any) {
    console.error('Error deleting case:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete case' },
      { status: 500 }
    );
  }
}
