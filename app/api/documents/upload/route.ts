import { NextRequest, NextResponse } from "next/server";
import postgres from "postgres";
import { CaseDevClient } from "@/lib/case-dev/client";

export async function POST(request: NextRequest) {
  try {
    // Get connection string from query params
    const connectionString = request.nextUrl.searchParams.get('connectionString');
    
    if (!connectionString) {
      return NextResponse.json(
        { error: 'Database not initialized' },
        { status: 400 }
      );
    }

    // Get API key from header
    const apiKey = request.headers.get('x-api-key');
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key required' },
        { status: 401 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const caseId = formData.get("caseId") as string;
    const documentType = formData.get("documentType") as string;

    if (!file || !caseId || !documentType) {
      return NextResponse.json(
        { error: "File, caseId, and documentType are required" },
        { status: 400 }
      );
    }

    const sql = postgres(connectionString);

    try {
      // Verify case exists
      const caseResult = await sql`
        SELECT id FROM bankruptcy_cases WHERE id = ${caseId}
      `;

      if (caseResult.length === 0) {
        return NextResponse.json(
          { error: "Case not found" },
          { status: 404 }
        );
      }

      // Create case.dev client for vault operations
      const client = new CaseDevClient(apiKey);

      // Upload to Vaults with OCR enabled
      const vaultName = `bankruptcy-case-${caseId}`;

      // Upload file to vault (handles vault creation automatically)
      const uploadResult = await client.uploadToVault({
        vaultName,
        file,
        enableOCR: true,
        enableSemanticSearch: true,
        metadata: {
          caseId,
          documentType,
          fileName: file.name,
        },
      });

      // Store both vaultId and objectId in format "vaultId:objectId" for download/delete operations
      const vaultFileId = `${uploadResult.vaultId}:${uploadResult.objectId}`;

      // Ensure case_documents table exists
      // Note: case_id is TEXT to match bankruptcy_cases.id which uses TEXT primary keys
      try {
        await sql`
          CREATE TABLE IF NOT EXISTS case_documents (
            id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
            case_id TEXT NOT NULL REFERENCES bankruptcy_cases(id) ON DELETE CASCADE,
            file_name TEXT NOT NULL,
            file_type TEXT,
            file_size INTEGER,
            document_type TEXT,
            validation_status TEXT DEFAULT 'pending',
            extracted_data JSONB,
            vault_file_id TEXT,
            ocr_text TEXT,
            ocr_completed BOOLEAN DEFAULT FALSE,
            uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          )
        `;
      } catch (tableError: any) {
        // If table creation fails due to schema mismatch, try to drop and recreate
        if (tableError.code === '42804' || tableError.message?.includes('incompatible types')) {
          console.log('Dropping and recreating case_documents table due to schema mismatch...');
          await sql`DROP TABLE IF EXISTS case_documents CASCADE`;
          await sql`
            CREATE TABLE case_documents (
              id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
              case_id TEXT NOT NULL REFERENCES bankruptcy_cases(id) ON DELETE CASCADE,
              file_name TEXT NOT NULL,
              file_type TEXT,
              file_size INTEGER,
              document_type TEXT,
              validation_status TEXT DEFAULT 'pending',
              extracted_data JSONB,
              vault_file_id TEXT,
              ocr_text TEXT,
              ocr_completed BOOLEAN DEFAULT FALSE,
              uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )
          `;
        } else {
          throw tableError;
        }
      }

      // Store document record in database
      const result = await sql`
        INSERT INTO case_documents (
          case_id,
          file_name,
          file_type,
          file_size,
          document_type,
          validation_status,
          vault_file_id
        ) VALUES (
          ${caseId},
          ${file.name},
          ${file.type || null},
          ${file.size || null},
          ${documentType},
          'pending',
          ${vaultFileId}
        )
        RETURNING
          id,
          case_id as "caseId",
          file_name as "fileName",
          file_type as "fileType",
          file_size as "fileSize",
          document_type as "documentType",
          validation_status as "validationStatus",
          vault_file_id as "vaultFileId",
          uploaded_at as "uploadedAt"
      `;

      const newDocument = result[0];

      // Return immediately - client will use SSE to track processing status
      return NextResponse.json({
        success: true,
        documentId: newDocument.id,
        document: newDocument,
        vaultId: uploadResult.vaultId,
        message: "Document uploaded. Subscribe to SSE for processing updates.",
      });
    } finally {
      await sql.end();
    }
  } catch (error: any) {
    console.error("Error uploading document:", error);
    return NextResponse.json(
      { error: error.message || "Failed to upload document" },
      { status: 500 }
    );
  }
}
