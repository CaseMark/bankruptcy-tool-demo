import { NextRequest, NextResponse } from 'next/server';
import postgres from 'postgres';

/**
 * Check if a case exists for a client, or create a new one
 * Used by the outbound intake feature to find/create cases before calling
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { connectionString, userId, firstName, lastName, phoneNumber } = body;

    if (!connectionString || !userId || !firstName || !lastName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const sql = postgres(connectionString);

    try {
      const fullName = `${firstName.trim()} ${lastName.trim()}`;

      // Check for existing case
      const existingCases = await sql`
        SELECT id, client_name, client_phone
        FROM bankruptcy_cases
        WHERE user_id = ${userId}
          AND LOWER(client_name) LIKE ${`%${firstName.trim().toLowerCase()}%`}
          AND LOWER(client_name) LIKE ${`%${lastName.trim().toLowerCase()}%`}
        ORDER BY created_at DESC
        LIMIT 1
      `;

      if (existingCases.length > 0) {
        const existingCase = existingCases[0];

        // Update phone number if provided and different
        if (phoneNumber && phoneNumber !== existingCase.client_phone) {
          await sql`
            UPDATE bankruptcy_cases
            SET client_phone = ${phoneNumber}, updated_at = NOW()
            WHERE id = ${existingCase.id}
          `;
        }

        return NextResponse.json({
          caseId: existingCase.id,
          existed: true,
        });
      }

      // Create new case
      const result = await sql`
        INSERT INTO bankruptcy_cases (
          user_id,
          client_name,
          client_phone,
          case_type,
          filing_type,
          status
        ) VALUES (
          ${userId},
          ${fullName},
          ${phoneNumber || null},
          'chapter7',
          'individual',
          'intake'
        )
        RETURNING id
      `;

      return NextResponse.json({
        caseId: result[0].id,
        existed: false,
      });
    } finally {
      await sql.end();
    }
  } catch (error: any) {
    console.error('[Check or Create Case] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
