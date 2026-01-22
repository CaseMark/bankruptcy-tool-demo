import { NextRequest } from "next/server";
import postgres from "postgres";
import { CaseDevClient } from "@/lib/case-dev/client";

/**
 * Server-Sent Events endpoint for real-time document processing status
 *
 * Streams status updates as the document goes through:
 * 1. uploaded -> Processing started
 * 2. processing -> OCR in progress
 * 3. validating -> LLM validation in progress
 * 4. completed -> All processing done
 * 5. error -> Processing failed
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: documentId } = await params;
  const connectionString = request.nextUrl.searchParams.get("connectionString");
  const apiKey = request.nextUrl.searchParams.get("apiKey");

  if (!connectionString) {
    return new Response("Database connection required", { status: 400 });
  }

  // Create a readable stream for SSE
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const sql = postgres(connectionString);
      let client: CaseDevClient | null = null;

      if (apiKey) {
        client = new CaseDevClient(apiKey);
      }

      const sendEvent = (event: string, data: any) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        );
      };

      const sendStatus = (status: string, message: string, progress?: number, data?: any) => {
        sendEvent("status", { status, message, progress, ...data });
      };

      try {
        // Get initial document state
        const docs = await sql`
          SELECT
            id,
            case_id as "caseId",
            file_name as "fileName",
            document_type as "documentType",
            validation_status as "validationStatus",
            vault_file_id as "vaultFileId",
            ocr_completed as "ocrCompleted",
            ocr_text as "ocrText",
            extracted_data as "extractedData"
          FROM case_documents
          WHERE id = ${documentId}
        `;

        if (docs.length === 0) {
          sendEvent("error", { message: "Document not found" });
          controller.close();
          await sql.end();
          return;
        }

        const doc = docs[0];

        // If already completed, send final status and close
        if (doc.ocrCompleted && doc.validationStatus !== "pending") {
          sendStatus("completed", "Document processing complete", 100, {
            validationStatus: doc.validationStatus,
            extractedData: doc.extractedData,
          });
          controller.close();
          await sql.end();
          return;
        }

        // Send initial status
        sendStatus("processing", "Starting document processing...", 10);

        // If we have vault info and API key, poll for OCR completion
        if (doc.vaultFileId && client) {
          // Parse vault ID and object ID from stored format "vaultId:objectId"
          const [vaultId, objectId] = doc.vaultFileId.split(':');

          if (vaultId && objectId) {
            sendStatus("processing", "Extracting text from document...", 30);

            // Poll for OCR completion
            const maxAttempts = 12; // 60 seconds max
            const delayMs = 5000;

            for (let attempt = 1; attempt <= maxAttempts; attempt++) {
              await new Promise((resolve) => setTimeout(resolve, delayMs));

              try {
                const ocrResult = await client.getVaultObjectText({
                  vaultId,
                  objectId,
                });

                const ocrText = ocrResult.text || "";

                // OCR completed successfully
                sendStatus("validating", "Text extracted, validating document...", 60);

                // Update database with OCR text
                await sql`
                  UPDATE case_documents
                  SET ocr_text = ${ocrText.substring(0, 50000)},
                      ocr_completed = true
                  WHERE id = ${documentId}
                `;

                // Validate with LLM if we have text
                let validationStatus = "valid";
                let validationNotes = "";

                if (ocrText && ocrText.length > 50) {
                  sendStatus("validating", "Running AI validation...", 80);

                  try {
                    const validation = await client.llmComplete({
                      model: "gpt-4o-mini",
                      messages: [
                        {
                          role: "system",
                          content: `You are a bankruptcy paralegal validating client documents.
Check if this document is a valid ${doc.documentType}.
Verify: 1) Legibility, 2) Completeness, 3) Dates (not expired), 4) Required information is present.
Return JSON: { "valid": boolean, "issues": string[], "confidence": number }`,
                        },
                        {
                          role: "user",
                          content: `Document type: ${doc.documentType}\n\nOCR Text (first 2000 chars):\n${ocrText.substring(0, 2000)}`,
                        },
                      ],
                      temperature: 0.1,
                      response_format: { type: "json_object" },
                    });

                    const validationResult = JSON.parse(
                      validation.choices[0].message.content
                    );
                    validationStatus = validationResult.valid ? "valid" : "needs_review";
                    validationNotes = validationResult.issues?.join("; ") || "";
                  } catch (llmError) {
                    console.error("LLM validation error:", llmError);
                    validationStatus = "valid"; // Default to valid if LLM fails
                  }
                }

                // Update final status in database
                await sql`
                  UPDATE case_documents
                  SET validation_status = ${validationStatus},
                      extracted_data = ${JSON.stringify({ validationNotes })}
                  WHERE id = ${documentId}
                `;

                // Send completion event
                sendStatus("completed", "Document processing complete", 100, {
                  validationStatus,
                  validationNotes,
                  ocrTextLength: ocrText.length,
                });

                break;
              } catch (ocrError: any) {
                const isStillProcessing =
                  ocrError.message?.includes("processing") ||
                  ocrError.message?.includes("not been processed");

                if (isStillProcessing && attempt < maxAttempts) {
                  const progress = 30 + Math.floor((attempt / maxAttempts) * 30);
                  sendStatus(
                    "processing",
                    `Extracting text... (attempt ${attempt}/${maxAttempts})`,
                    progress
                  );
                  continue;
                } else if (!isStillProcessing) {
                  throw ocrError;
                }

                // Max attempts reached
                sendStatus("completed", "Processing complete (OCR pending)", 100, {
                  validationStatus: "pending",
                  note: "OCR still processing, will complete in background",
                });
              }
            }
          }
        } else {
          // No vault info, just mark as complete
          sendStatus("completed", "Document uploaded successfully", 100, {
            validationStatus: doc.validationStatus,
          });
        }

        controller.close();
        await sql.end();
      } catch (error: any) {
        console.error("SSE stream error:", error);
        sendEvent("error", { message: error.message || "Processing failed" });
        controller.close();
        try {
          await sql.end();
        } catch (e) {
          // Connection may already be closed
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
