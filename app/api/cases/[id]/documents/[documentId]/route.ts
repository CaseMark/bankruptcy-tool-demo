import { NextRequest, NextResponse } from 'next/server';
import postgres from 'postgres';
import { CaseDevClient } from '@/lib/case-dev/client';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; documentId: string }> }
) {
  const { id: caseId, documentId } = await params;
  const connectionString = request.nextUrl.searchParams.get('connectionString');
  const action = request.nextUrl.searchParams.get('action') || 'info';
  const apiKey = request.headers.get('x-casedev-api-key');

  if (!connectionString) {
    return NextResponse.json({ error: 'Connection string is required' }, { status: 400 });
  }

  const sql = postgres(connectionString);

  try {
    // Fetch document record
    const documentResult = await sql`
      SELECT id, case_id, file_name, file_url, vault_object_id, document_type,
             extracted_data, validation_status, uploaded_at, ocr_text
      FROM documents
      WHERE id = ${documentId} AND case_id = ${caseId}
    `;

    if (documentResult.length === 0) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const document = documentResult[0];

    if (action === 'info') {
      return NextResponse.json({
        document: {
          id: document.id,
          caseId: document.case_id,
          fileName: document.file_name,
          fileUrl: document.file_url,
          vaultObjectId: document.vault_object_id,
          documentType: document.document_type,
          extractedData: document.extracted_data,
          validationStatus: document.validation_status,
          uploadedAt: document.uploaded_at,
          hasOcrText: !!document.ocr_text,
        },
      });
    }

    if (action === 'download') {
      // If we have a direct file URL, return it
      if (document.file_url) {
        return NextResponse.json({ downloadUrl: document.file_url });
      }

      // Otherwise, get download URL from case.dev vault
      if (document.vault_object_id && apiKey) {
        const client = new CaseDevClient(apiKey);

        // Parse vault info from vault_object_id (format: vaultId:objectId)
        const [vaultId, objectId] = document.vault_object_id.split(':');

        if (vaultId && objectId) {
          try {
            const result = await client.getDownloadUrl({ vaultId, objectId });
            return NextResponse.json({
              downloadUrl: result.downloadUrl,
              filename: result.filename || document.file_name,
            });
          } catch (error) {
            console.error('Failed to get download URL from vault:', error);
            return NextResponse.json(
              { error: 'Failed to get download URL' },
              { status: 500 }
            );
          }
        }
      }

      return NextResponse.json(
        { error: 'No download URL available for this document' },
        { status: 404 }
      );
    }

    if (action === 'text') {
      // Return OCR text if available
      if (document.ocr_text) {
        return NextResponse.json({ text: document.ocr_text });
      }

      // Try to fetch from vault if we have vault info
      if (document.vault_object_id && apiKey) {
        const client = new CaseDevClient(apiKey);
        const [vaultId, objectId] = document.vault_object_id.split(':');

        if (vaultId && objectId) {
          try {
            const text = await client.getOCRText(vaultId, objectId);

            // Cache the OCR text in the database
            if (text) {
              await sql`
                UPDATE documents SET ocr_text = ${text} WHERE id = ${documentId}
              `;
            }

            return NextResponse.json({ text });
          } catch (error) {
            console.error('Failed to get OCR text from vault:', error);
          }
        }
      }

      return NextResponse.json({ text: null });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error fetching document:', error);
    return NextResponse.json(
      { error: 'Failed to fetch document' },
      { status: 500 }
    );
  } finally {
    await sql.end();
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; documentId: string }> }
) {
  const { id: caseId, documentId } = await params;
  const connectionString = request.nextUrl.searchParams.get('connectionString');
  const apiKey = request.headers.get('x-casedev-api-key');
  const deleteFromVault = request.nextUrl.searchParams.get('deleteFromVault') === 'true';

  if (!connectionString) {
    return NextResponse.json({ error: 'Connection string is required' }, { status: 400 });
  }

  const sql = postgres(connectionString);

  try {
    // Fetch document to get vault info before deletion
    const documentResult = await sql`
      SELECT id, vault_object_id FROM documents
      WHERE id = ${documentId} AND case_id = ${caseId}
    `;

    if (documentResult.length === 0) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const document = documentResult[0];

    // Delete from vault if requested and we have vault info
    if (deleteFromVault && document.vault_object_id && apiKey) {
      const client = new CaseDevClient(apiKey);
      const [vaultId, objectId] = document.vault_object_id.split(':');

      if (vaultId && objectId) {
        try {
          await client.deleteVaultObject({ vaultId, objectId });
        } catch (error) {
          console.error('Failed to delete from vault (continuing with DB deletion):', error);
        }
      }
    }

    // Delete from database
    await sql`DELETE FROM documents WHERE id = ${documentId}`;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting document:', error);
    return NextResponse.json(
      { error: 'Failed to delete document' },
      { status: 500 }
    );
  } finally {
    await sql.end();
  }
}
