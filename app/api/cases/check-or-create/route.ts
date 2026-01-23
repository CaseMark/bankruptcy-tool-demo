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

      // Check if user_id column exists (for backwards compatibility)
      const hasUserIdColumn = await sql`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'bankruptcy_cases'
          AND column_name = 'user_id'
      `.then(rows => rows.length > 0);

      // Check for existing case
      let existingCases;
      if (hasUserIdColumn) {
        existingCases = await sql`
          SELECT id, client_name, client_phone
          FROM bankruptcy_cases
          WHERE user_id = ${userId}
            AND LOWER(client_name) LIKE ${`%${firstName.trim().toLowerCase()}%`}
            AND LOWER(client_name) LIKE ${`%${lastName.trim().toLowerCase()}%`}
          ORDER BY created_at DESC
          LIMIT 1
        `;
      } else {
        // For old databases without user_id column
        existingCases = await sql`
          SELECT id, client_name, client_phone
          FROM bankruptcy_cases
          WHERE LOWER(client_name) LIKE ${`%${firstName.trim().toLowerCase()}%`}
            AND LOWER(client_name) LIKE ${`%${lastName.trim().toLowerCase()}%`}
          ORDER BY created_at DESC
          LIMIT 1
        `;
      }

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
      // Generate UUID explicitly to work with databases that don't have auto-generation configured
      const newCaseId = crypto.randomUUID();

      let result;
      if (hasUserIdColumn) {
        result = await sql`
          INSERT INTO bankruptcy_cases (
            id,
            user_id,
            client_name,
            client_phone,
            case_type,
            filing_type,
            status
          ) VALUES (
            ${newCaseId},
            ${userId},
            ${fullName},
            ${phoneNumber || null},
            'chapter7',
            'individual',
            'intake'
          )
          RETURNING id
        `;
      } else {
        // For old databases without user_id column
        result = await sql`
          INSERT INTO bankruptcy_cases (
            id,
            client_name,
            client_phone,
            case_type,
            filing_type,
            status
          ) VALUES (
            ${newCaseId},
            ${fullName},
            ${phoneNumber || null},
            'chapter7',
            'individual',
            'intake'
          )
          RETURNING id
        `;
      }

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
