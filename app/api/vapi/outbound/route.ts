import { NextRequest, NextResponse } from 'next/server';
import postgres from 'postgres';
import { validateUSPhoneNumber, formatToE164 } from '@/lib/utils/phone-validation';

/**
 * VAPI Outbound Call API
 *
 * This endpoint initiates an outbound phone call via VAPI to conduct bankruptcy intake.
 * It fetches existing case data and passes it to VAPI so the assistant knows what information
 * is already collected and what still needs to be asked.
 */

interface OutboundCallRequest {
  caseId: string;
  phoneNumber: string;  // Should be E.164 format: +1XXXXXXXXXX
  clientName: string;
}

interface CaseData {
  id: string;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  ssnLast4?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  county?: string;
  caseType: string;
  filingType: string;
  householdSize?: number;
}

export async function POST(request: NextRequest) {
  try {
    const body: OutboundCallRequest = await request.json();
    const { caseId, phoneNumber, clientName } = body;

    // Validate required fields
    if (!caseId || !phoneNumber || !clientName) {
      return NextResponse.json(
        { error: 'Missing required fields: caseId, phoneNumber, clientName' },
        { status: 400 }
      );
    }

    // Validate phone number
    if (!validateUSPhoneNumber(phoneNumber)) {
      return NextResponse.json(
        { error: 'Invalid phone number format' },
        { status: 400 }
      );
    }

    // Format phone to E.164
    const formattedPhone = formatToE164(phoneNumber);
    if (!formattedPhone) {
      return NextResponse.json(
        { error: 'Failed to format phone number' },
        { status: 400 }
      );
    }

    // Verify VAPI configuration
    const vapiApiKey = process.env.VAPI_API_KEY;
    const assistantId = process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID;
    const phoneNumberId = process.env.VAPI_PHONE_NUMBER_ID;

    if (!vapiApiKey || !assistantId || !phoneNumberId) {
      console.error('Missing VAPI configuration:', {
        hasApiKey: !!vapiApiKey,
        hasAssistantId: !!assistantId,
        hasPhoneNumberId: !!phoneNumberId,
      });
      return NextResponse.json(
        { error: 'VAPI service not configured' },
        { status: 500 }
      );
    }

    // Get database connection
    const connectionString = request.nextUrl.searchParams.get('connectionString') || process.env.DATABASE_URL;

    if (!connectionString) {
      return NextResponse.json(
        { error: 'Database connection not configured' },
        { status: 500 }
      );
    }

    // Fetch existing case data
    const sql = postgres(connectionString);
    let caseData: CaseData;

    try {
      const result = await sql`
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
          household_size as "householdSize"
        FROM bankruptcy_cases
        WHERE id = ${caseId}
      `;

      if (result.length === 0) {
        await sql.end();
        return NextResponse.json(
          { error: 'Case not found' },
          { status: 404 }
        );
      }

      caseData = result[0] as CaseData;
    } catch (dbError) {
      console.error('Database error:', dbError);
      await sql.end();
      return NextResponse.json(
        { error: 'Failed to fetch case data' },
        { status: 500 }
      );
    } finally {
      await sql.end();
    }

    // Build variable values based on existing data
    // The assistant will use these to know what NOT to ask
    const variableValues = {
      caseId: caseData.id,
      clientName: caseData.clientName,

      // Address information
      hasAddress: !!(caseData.address && caseData.city && caseData.state && caseData.zip),
      existingAddress: caseData.address || '',
      existingCity: caseData.city || '',
      existingState: caseData.state || '',
      existingZip: caseData.zip || '',
      existingCounty: caseData.county || '',

      // Contact information
      hasEmail: !!caseData.clientEmail,
      existingEmail: caseData.clientEmail || '',

      hasPhone: !!caseData.clientPhone,
      existingPhone: caseData.clientPhone || '',

      // SSN
      hasSsn: !!caseData.ssnLast4,
      existingSsnLast4: caseData.ssnLast4 || '',

      // Case details
      hasCaseType: !!caseData.caseType,
      existingCaseType: caseData.caseType || 'chapter7',

      hasFilingType: !!caseData.filingType,
      existingFilingType: caseData.filingType || 'individual',

      hasHouseholdSize: !!caseData.householdSize,
      existingHouseholdSize: caseData.householdSize?.toString() || '',
    };

    // Call VAPI REST API to initiate outbound call
    const vapiResponse = await fetch('https://api.vapi.ai/call', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${vapiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        assistantId: assistantId,
        phoneNumberId: phoneNumberId,
        customer: {
          number: formattedPhone,
        },
        assistantOverrides: {
          variableValues: variableValues,
          metadata: {
            caseId: caseId,
            connectionString: connectionString,
          },
        },
      }),
    });

    if (!vapiResponse.ok) {
      const errorData = await vapiResponse.json().catch(() => ({}));
      console.error('VAPI API error:', {
        status: vapiResponse.status,
        statusText: vapiResponse.statusText,
        error: errorData,
      });

      return NextResponse.json(
        {
          error: 'Failed to schedule call with VAPI',
          details: errorData,
        },
        { status: vapiResponse.status }
      );
    }

    const vapiData = await vapiResponse.json();

    return NextResponse.json({
      success: true,
      message: `Call scheduled for ${clientName}`,
      callId: vapiData.id,
      phoneNumber: formattedPhone,
    });

  } catch (error: any) {
    console.error('Error in outbound call API:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
