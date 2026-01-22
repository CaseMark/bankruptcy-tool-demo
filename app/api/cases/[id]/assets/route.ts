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
        CREATE TABLE IF NOT EXISTS assets (
          id TEXT PRIMARY KEY,
          case_id TEXT NOT NULL,
          asset_type TEXT NOT NULL,
          description TEXT NOT NULL,
          current_value DECIMAL(10, 2) NOT NULL,
          address TEXT,
          make TEXT,
          model TEXT,
          year INTEGER,
          vin TEXT,
          institution TEXT,
          account_number_last4 TEXT,
          ownership_percentage DECIMAL(5, 2) DEFAULT 100,
          created_at TIMESTAMP NOT NULL DEFAULT NOW()
        )
      `;

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
        WHERE case_id = ${id}
        ORDER BY current_value DESC
      `;

      return NextResponse.json({ assets: records });
    } finally {
      await sql.end();
    }
  } catch (error: any) {
    console.error('Error fetching assets:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch assets' },
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

    if (!body.assetType || !body.description || body.currentValue === undefined) {
      return NextResponse.json(
        { error: 'Asset type, description, and current value are required' },
        { status: 400 }
      );
    }

    const sql = postgres(connectionString);

    try {
      // Ensure table exists
      await sql`
        CREATE TABLE IF NOT EXISTS assets (
          id TEXT PRIMARY KEY,
          case_id TEXT NOT NULL,
          asset_type TEXT NOT NULL,
          description TEXT NOT NULL,
          current_value DECIMAL(10, 2) NOT NULL,
          address TEXT,
          make TEXT,
          model TEXT,
          year INTEGER,
          vin TEXT,
          institution TEXT,
          account_number_last4 TEXT,
          ownership_percentage DECIMAL(5, 2) DEFAULT 100,
          created_at TIMESTAMP NOT NULL DEFAULT NOW()
        )
      `;

      const recordId = `asset_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      const result = await sql`
        INSERT INTO assets (
          id, case_id, asset_type, description, current_value,
          address, make, model, year, vin, institution,
          account_number_last4, ownership_percentage, created_at
        ) VALUES (
          ${recordId},
          ${id},
          ${body.assetType},
          ${body.description},
          ${parseFloat(body.currentValue)},
          ${body.address || null},
          ${body.make || null},
          ${body.model || null},
          ${body.year ? parseInt(body.year) : null},
          ${body.vin || null},
          ${body.institution || null},
          ${body.accountNumberLast4 || null},
          ${body.ownershipPercentage ? parseFloat(body.ownershipPercentage) : 100},
          NOW()
        )
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

      return NextResponse.json({ asset: result[0] });
    } finally {
      await sql.end();
    }
  } catch (error: any) {
    console.error('Error creating asset:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create asset' },
      { status: 500 }
    );
  }
}
