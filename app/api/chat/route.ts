import { NextRequest, NextResponse } from "next/server";
import postgres from "postgres";
import { CaseDevClient } from "@/lib/case-dev/client";

/**
 * Chat API for client intake and case questions
 *
 * Handles:
 * - Client intake with identity verification
 * - Case-specific questions
 * - General platform feature questions
 */

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface ChatRequest {
  messages: ChatMessage[];
  context?: {
    caseId?: string;
    mode?: "intake" | "questions" | "general";
    verifiedClient?: {
      firstName: string;
      lastName: string;
      ssnLast4: string;
      caseId: string;
    };
  };
}

const SYSTEM_PROMPT = `You are a helpful bankruptcy assistant for a law firm's case management system. You help with:

1. **Client Intake**: Help new or returning clients provide their information for bankruptcy cases.
   - First ask if they have an existing case
   - Verify identity with first name, last name, and last 4 digits of SSN
   - For new clients, collect: full name, SSN last 4, email, phone, address, filing type (individual/joint), case type (chapter7/chapter13)
   - For existing clients, help them update their information

2. **Case Questions**: Answer questions about specific bankruptcy cases when the client is verified.
   - You can check what documents have been uploaded
   - You can tell them what documents are still required
   - You can provide case status and details

3. **Chapter 7 Bankruptcy Information**: Answer general questions about Chapter 7 bankruptcy:

   **Eligibility Requirements:**
   - Individuals, partnerships, and corporations can file Chapter 7
   - Must complete credit counseling within 180 days before filing
   - The means test applies if income exceeds state median - if monthly income over 5 years (minus allowed expenses) meets certain thresholds, filing may be presumptively abusive
   - Cannot file if a prior case was dismissed within 180 days due to failure to appear or comply with court orders

   **Filing Process:**
   - File with the bankruptcy court serving your area
   - Required documents: Schedules of assets/liabilities, income/expenditures statement, financial affairs documentation, executory contracts and lease records
   - Filing fees: $245 case fee + $75 administrative fee + $15 trustee surcharge = $335 total
   - Installment payments allowed (max 4 installments, final due within 120 days)
   - Fee waivers available for those earning below 150% of poverty level
   - Creditors' meeting occurs 21-40 days after filing (trustee questions debtor under oath)

   **Dischargeable Debts (generally discharged):**
   - Most consumer and business debts
   - Credit card debt, medical bills, personal loans

   **Non-Dischargeable Debts:**
   - Alimony and child support
   - Certain taxes
   - Student loans (with rare exceptions)
   - Criminal restitution
   - Debts from fraud or willful injury
   - DUI-related injuries

   **Property - Exempt vs Non-Exempt:**
   - "Exempt" property is protected under federal or state law (varies by jurisdiction)
   - Trustee liquidates nonexempt assets to pay creditors
   - Secured property (mortgages, liens) may require reaffirmation agreements to retain

   **Timeline:**
   - Discharge typically 60-90 days after creditors' meeting
   - Discharge releases personal liability for most debts
   - Prevents creditors from collection actions

   **Means Test:**
   - Compares your income to state median income by household size
   - If above median, calculates disposable income using IRS expense standards
   - Categories: National Standards (food, clothing, personal care), Healthcare, Local Standards (housing/utilities by county, transportation by region)
   - If disposable income too high, may need to file Chapter 13 instead

4. **Platform Features**: Explain available features:
   - Client Intake: Secure portal for document collection
   - Document Upload: OCR & AI-powered data extraction
   - Means Test: Automatic Chapter 7 eligibility calculation
   - Form Generation: Auto-generate official bankruptcy forms (101-423)
   - Chapter 13 Plan: Calculate 3-5 year repayment plans
   - Payment Tracking: Monitor trustee payments

Be professional, helpful, and concise. When collecting information, ask for one piece at a time.
For client verification, always require first name, last name, AND last 4 of SSN before accessing case information.

When you need to perform actions, use the following JSON format in your response:
[ACTION: action_name | param1: value1 | param2: value2]

Available actions:
- [ACTION: check_existing_case | first_name: X | last_name: Y]
- [ACTION: verify_client | first_name: X | last_name: Y | ssn_last_4: XXXX]
- [ACTION: create_case | client_name: X | ssn_last_4: XXXX | case_type: chapter7 | filing_type: individual]
- [ACTION: update_case | case_id: X | field: value | ...]
- [ACTION: get_case_info | case_id: X]
- [ACTION: get_documents | case_id: X]
- [ACTION: get_required_documents | case_id: X]`;

export async function POST(request: NextRequest) {
  try {
    const connectionString = request.nextUrl.searchParams.get("connectionString");
    const apiKey = request.headers.get("x-api-key");

    if (!connectionString) {
      return NextResponse.json(
        { error: "Database connection required" },
        { status: 400 }
      );
    }

    if (!apiKey) {
      return NextResponse.json(
        { error: "API key required" },
        { status: 401 }
      );
    }

    const body: ChatRequest = await request.json();
    const { messages, context } = body;

    if (!messages || messages.length === 0) {
      return NextResponse.json(
        { error: "Messages required" },
        { status: 400 }
      );
    }

    const sql = postgres(connectionString);
    const client = new CaseDevClient(apiKey);

    try {
      // Build conversation with system prompt
      const conversationMessages: ChatMessage[] = [
        { role: "system", content: SYSTEM_PROMPT },
        ...messages,
      ];

      // If we have a verified client context, add it
      if (context?.verifiedClient) {
        conversationMessages.splice(1, 0, {
          role: "system",
          content: `Client verified: ${context.verifiedClient.firstName} ${context.verifiedClient.lastName}, Case ID: ${context.verifiedClient.caseId}. They can now ask questions about their case or update information.`,
        });
      }

      // Call LLM
      const response = await client.llmComplete({
        model: "gpt-4o-mini",
        messages: conversationMessages,
        temperature: 0.7,
      });

      let assistantMessage = response.choices[0].message.content;

      // Check if the response contains an action
      const actionMatch = assistantMessage.match(/\[ACTION:\s*(\w+)\s*\|([^\]]+)\]/);

      if (actionMatch) {
        const actionName = actionMatch[1];
        const paramsString = actionMatch[2];
        const params: Record<string, string> = {};

        // Parse parameters
        paramsString.split("|").forEach((param) => {
          const [key, value] = param.split(":").map((s) => s.trim());
          if (key && value) {
            params[key] = value;
          }
        });

        // Execute action
        const actionResult = await executeAction(sql, actionName, params);

        // Remove the action from the message and add result context
        assistantMessage = assistantMessage.replace(/\[ACTION:[^\]]+\]/, "").trim();

        // If the action returned context, include it
        if (actionResult.context) {
          return NextResponse.json({
            message: assistantMessage || actionResult.message,
            context: actionResult.context,
            actionResult,
          });
        }

        // Append action result to the message
        if (actionResult.message) {
          assistantMessage = actionResult.message;
        }
      }

      return NextResponse.json({
        message: assistantMessage,
        context: context,
      });
    } finally {
      await sql.end();
    }
  } catch (error: any) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process chat" },
      { status: 500 }
    );
  }
}

async function executeAction(
  sql: postgres.Sql,
  actionName: string,
  params: Record<string, string>
): Promise<{ message: string; context?: any }> {
  switch (actionName) {
    case "check_existing_case": {
      const firstName = params.first_name?.toLowerCase();
      const lastName = params.last_name?.toLowerCase();

      if (!firstName || !lastName) {
        return { message: "I need both your first and last name to check for existing cases." };
      }

      const cases = await sql`
        SELECT id, client_name, status, created_at
        FROM bankruptcy_cases
        WHERE LOWER(client_name) LIKE ${`%${firstName}%`}
          AND LOWER(client_name) LIKE ${`%${lastName}%`}
        ORDER BY created_at DESC
        LIMIT 5
      `;

      if (cases.length > 0) {
        return {
          message: `I found ${cases.length} case(s) that might be yours. To verify your identity and access your case, I'll need the last 4 digits of your Social Security Number.`,
        };
      }

      return {
        message: `I don't see any existing cases for ${firstName} ${lastName}. Would you like me to help you start a new bankruptcy case?`,
      };
    }

    case "verify_client": {
      const firstName = params.first_name?.toLowerCase();
      const lastName = params.last_name?.toLowerCase();
      const ssnLast4 = params.ssn_last_4;

      if (!firstName || !lastName || !ssnLast4) {
        return { message: "I need your first name, last name, and last 4 digits of your SSN to verify your identity." };
      }

      if (ssnLast4.length !== 4 || !/^\d{4}$/.test(ssnLast4)) {
        return { message: "Please provide exactly 4 digits for your SSN." };
      }

      const cases = await sql`
        SELECT id, client_name, client_email, client_phone,
               case_type, filing_type, status, address, city, state, zip
        FROM bankruptcy_cases
        WHERE LOWER(client_name) LIKE ${`%${firstName}%`}
          AND LOWER(client_name) LIKE ${`%${lastName}%`}
          AND ssn_last4 = ${ssnLast4}
        ORDER BY created_at DESC
        LIMIT 1
      `;

      if (cases.length === 0) {
        return {
          message: "I couldn't verify your identity with that information. Please double-check your name and SSN digits. If you don't have an existing case, I can help you create one.",
        };
      }

      const caseData = cases[0];
      return {
        message: `Identity verified! I found your ${caseData.case_type === "chapter7" ? "Chapter 7" : "Chapter 13"} case (Status: ${caseData.status}). How can I help you today? You can ask questions about your case or update your information.`,
        context: {
          verifiedClient: {
            firstName,
            lastName,
            ssnLast4,
            caseId: caseData.id,
          },
        },
      };
    }

    case "create_case": {
      const clientName = params.client_name;
      const ssnLast4 = params.ssn_last_4;
      const caseType = params.case_type || "chapter7";
      const filingType = params.filing_type || "individual";

      if (!clientName) {
        return { message: "I need your full name to create a case." };
      }

      const id = `case_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      await sql`
        CREATE TABLE IF NOT EXISTS bankruptcy_cases (
          id TEXT PRIMARY KEY,
          client_name TEXT NOT NULL,
          client_email TEXT,
          client_phone TEXT,
          ssn_last4 TEXT,
          address TEXT,
          city TEXT,
          state TEXT,
          zip TEXT,
          county TEXT,
          case_type TEXT NOT NULL,
          filing_type TEXT NOT NULL,
          household_size INTEGER,
          status TEXT NOT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        )
      `;

      await sql`
        INSERT INTO bankruptcy_cases (
          id, client_name, ssn_last4, case_type, filing_type, status
        ) VALUES (
          ${id}, ${clientName}, ${ssnLast4 || null}, ${caseType}, ${filingType}, 'intake'
        )
      `;

      const firstName = clientName.split(" ")[0]?.toLowerCase() || "";
      const lastName = clientName.split(" ").slice(-1)[0]?.toLowerCase() || "";

      return {
        message: `I've created a new ${caseType === "chapter7" ? "Chapter 7" : "Chapter 13"} bankruptcy case for you. Now let's gather some more information. What's your email address?`,
        context: {
          verifiedClient: {
            firstName,
            lastName,
            ssnLast4: ssnLast4 || "",
            caseId: id,
          },
        },
      };
    }

    case "update_case": {
      const caseId = params.case_id;
      if (!caseId) {
        return { message: "I need to know which case to update. Please verify your identity first." };
      }

      const updates: Record<string, any> = {};
      if (params.email) updates.client_email = params.email;
      if (params.phone) updates.client_phone = params.phone;
      if (params.address) updates.address = params.address;
      if (params.city) updates.city = params.city;
      if (params.state) updates.state = params.state;
      if (params.zip) updates.zip = params.zip;

      if (Object.keys(updates).length === 0) {
        return { message: "What information would you like to update?" };
      }

      await sql`
        UPDATE bankruptcy_cases
        SET
          client_email = COALESCE(${updates.client_email || null}, client_email),
          client_phone = COALESCE(${updates.client_phone || null}, client_phone),
          address = COALESCE(${updates.address || null}, address),
          city = COALESCE(${updates.city || null}, city),
          state = COALESCE(${updates.state || null}, state),
          zip = COALESCE(${updates.zip || null}, zip),
          updated_at = NOW()
        WHERE id = ${caseId}
      `;

      return {
        message: `I've updated your case information. Is there anything else you'd like to add or change?`,
      };
    }

    case "get_case_info": {
      const caseId = params.case_id;
      if (!caseId) {
        return { message: "Please verify your identity first to access case information." };
      }

      const cases = await sql`
        SELECT * FROM bankruptcy_cases WHERE id = ${caseId}
      `;

      if (cases.length === 0) {
        return { message: "I couldn't find that case." };
      }

      const c = cases[0];
      return {
        message: `Here's a summary of your case:
- **Type**: ${c.case_type === "chapter7" ? "Chapter 7" : "Chapter 13"} Bankruptcy
- **Filing**: ${c.filing_type === "individual" ? "Individual" : "Joint"}
- **Status**: ${c.status}
- **Email**: ${c.client_email || "Not provided"}
- **Phone**: ${c.client_phone || "Not provided"}
- **Address**: ${c.address ? `${c.address}, ${c.city}, ${c.state} ${c.zip}` : "Not provided"}

What would you like to know more about or update?`,
      };
    }

    case "get_documents": {
      const caseId = params.case_id;
      if (!caseId) {
        return { message: "Please verify your identity first to view your documents." };
      }

      // Check if case_documents table exists
      const tableExists = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_name = 'case_documents'
        )
      `;

      if (!tableExists[0].exists) {
        return { message: "No documents have been uploaded to your case yet. Would you like information on what documents are required?" };
      }

      const documents = await sql`
        SELECT file_name, document_type, validation_status, uploaded_at
        FROM case_documents
        WHERE case_id = ${caseId}
        ORDER BY uploaded_at DESC
      `;

      if (documents.length === 0) {
        return { message: "No documents have been uploaded to your case yet. Would you like information on what documents are required for a Chapter 7 filing?" };
      }

      const docList = documents.map((d: any) => {
        const status = d.validation_status === "valid" ? "Validated" :
                       d.validation_status === "pending" ? "Processing" : "Needs Review";
        const type = formatDocumentType(d.document_type);
        return `- **${d.file_name}** (${type}) - ${status}`;
      }).join("\n");

      return {
        message: `Here are the documents uploaded to your case:\n\n${docList}\n\nWould you like to know what other documents may be needed?`,
      };
    }

    case "get_required_documents": {
      const caseId = params.case_id;
      if (!caseId) {
        return { message: "Please verify your identity first to check required documents." };
      }

      // Define required documents for Chapter 7
      const requiredDocs = [
        { type: "tax_return", label: "Tax Returns (Last 2 Years)", required: true },
        { type: "paystub", label: "Pay Stubs (Last 6 Months)", required: true },
        { type: "bank_statement", label: "Bank Statements (Last 6 Months)", required: true },
        { type: "mortgage", label: "Mortgage Statement or Lease", required: true },
        { type: "credit_card", label: "Credit Card Statements", required: true },
        { type: "vehicle_title", label: "Vehicle Titles & Loan Statements", required: false },
        { type: "medical_bill", label: "Medical Bills", required: false },
        { type: "utility", label: "Utility Bills", required: false },
      ];

      // Check what's been uploaded
      let uploadedTypes: string[] = [];
      const tableExists = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_name = 'case_documents'
        )
      `;

      if (tableExists[0].exists) {
        const docs = await sql`
          SELECT DISTINCT document_type FROM case_documents WHERE case_id = ${caseId}
        `;
        uploadedTypes = docs.map((d: any) => d.document_type);
      }

      const missingRequired = requiredDocs
        .filter(d => d.required && !uploadedTypes.includes(d.type))
        .map(d => `- ${d.label}`);

      const missingOptional = requiredDocs
        .filter(d => !d.required && !uploadedTypes.includes(d.type))
        .map(d => `- ${d.label} (optional)`);

      const completedDocs = requiredDocs
        .filter(d => uploadedTypes.includes(d.type))
        .map(d => `- ${d.label}`);

      let message = "";

      if (completedDocs.length > 0) {
        message += `**Documents Uploaded:**\n${completedDocs.join("\n")}\n\n`;
      }

      if (missingRequired.length > 0) {
        message += `**Still Required:**\n${missingRequired.join("\n")}\n\n`;
      } else {
        message += `All required documents have been uploaded.\n\n`;
      }

      if (missingOptional.length > 0) {
        message += `**Optional Documents:**\n${missingOptional.join("\n")}\n\n`;
      }

      message += "You can upload documents through the case dashboard or ask me any questions about what each document should contain.";

      return { message };
    }

    default:
      return { message: "I'm not sure how to help with that. Can you please rephrase?" };
  }
}

// Helper function to format document type for display
function formatDocumentType(type: string | null): string {
  if (!type) return "Unknown";
  const typeMap: Record<string, string> = {
    tax_return: "Tax Return",
    paystub: "Pay Stub",
    bank_statement: "Bank Statement",
    mortgage: "Mortgage/Lease",
    credit_card: "Credit Card Statement",
    vehicle_title: "Vehicle Title",
    medical_bill: "Medical Bill",
    utility: "Utility Bill",
    w2: "W-2 Form",
    "1099": "1099 Form",
    loan_statement: "Loan Statement",
    collection_notice: "Collection Notice",
    property_deed: "Property Deed",
    insurance: "Insurance Statement",
    lease: "Lease Agreement",
    other: "Other Document",
  };
  return typeMap[type] || type.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}
