import { NextRequest, NextResponse } from 'next/server';
import postgres from 'postgres';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; assetId: string }> }
) {
  try {
    const { id, assetId } = await params;
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
          asset_type as "assetType",
          description,
          current_value as "currentValue",
          address,
          make,
          model,
          year,
          vin,
          institution,
          account_number_last4 as "accountNumberLast4",
          ownership_percentage as "ownershipPercentage",
          created_at as "createdAt"
        FROM assets
        WHERE id = ${assetId} AND case_id = ${id}
      `;

      if (records.length === 0) {
        return NextResponse.json(
          { error: 'Asset not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({ asset: records[0] });
    } finally {
      await sql.end();
    }
  } catch (error: any) {
    console.error('Error fetching asset:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch asset' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; assetId: string }> }
) {
  try {
    const { id, assetId } = await params;
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
        UPDATE assets
        SET
          asset_type = COALESCE(${body.assetType}, asset_type),
          description = COALESCE(${body.description}, description),
          current_value = COALESCE(${body.currentValue ? parseFloat(body.currentValue) : null}, current_value),
          address = COALESCE(${body.address}, address),
          make = COALESCE(${body.make}, make),
          model = COALESCE(${body.model}, model),
          year = COALESCE(${body.year ? parseInt(body.year) : null}, year),
          vin = COALESCE(${body.vin}, vin),
          institution = COALESCE(${body.institution}, institution),
          account_number_last4 = COALESCE(${body.accountNumberLast4}, account_number_last4),
          ownership_percentage = COALESCE(${body.ownershipPercentage ? parseFloat(body.ownershipPercentage) : null}, ownership_percentage)
        WHERE id = ${assetId} AND case_id = ${id}
        RETURNING
          id,
          case_id as "caseId",
          asset_type as "assetType",
          description,
          current_value as "currentValue",
          address,
          make,
          model,
          year,
          vin,
          institution,
          account_number_last4 as "accountNumberLast4",
          ownership_percentage as "ownershipPercentage",
          created_at as "createdAt"
      `;

      if (result.length === 0) {
        return NextResponse.json(
          { error: 'Asset not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({ asset: result[0] });
    } finally {
      await sql.end();
    }
  } catch (error: any) {
    console.error('Error updating asset:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update asset' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; assetId: string }> }
) {
  try {
    const { id, assetId } = await params;
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
        DELETE FROM assets
        WHERE id = ${assetId} AND case_id = ${id}
        RETURNING id
      `;

      if (result.length === 0) {
        return NextResponse.json(
          { error: 'Asset not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({ success: true });
    } finally {
      await sql.end();
    }
  } catch (error: any) {
    console.error('Error deleting asset:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete asset' },
      { status: 500 }
    );
  }
}
