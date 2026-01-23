import { NextRequest } from "next/server";
import postgres from "postgres";
import { CaseDevClient } from "@/lib/case-dev/client";
import { FinancialDataExtractor, type ExtractedMonthlyIncome } from "@/lib/extraction/financial-extractor";
import { getValidationPrompt, parseValidationResponse } from "@/lib/extraction/document-validator";

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
  const reprocess = request.nextUrl.searchParams.get("reprocess") === "true";

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

        // If already completed and not reprocessing, send final status and close
        if (doc.ocrCompleted && doc.validationStatus !== "pending" && !reprocess) {
          sendStatus("completed", "Document processing complete", 100, {
            validationStatus: doc.validationStatus,
            extractedData: doc.extractedData,
          });
          controller.close();
          await sql.end();
          return;
        }

        // Send initial status
        if (reprocess) {
          sendStatus("extracting", "AI extraction in progress...", 30);
        } else {
          sendStatus("extracting", "AI extraction in progress...", 20);
        }

        // If reprocessing with existing OCR text, skip OCR and go directly to extraction
        if (reprocess && doc.ocrText && doc.ocrText.length > 50 && client) {
          sendStatus("extracting", "AI extraction in progress...", 40);

          const ocrText = doc.ocrText;
          let validationStatus = doc.validationStatus || "valid";
          let validationNotes = "";

          // Define document type categories for extraction
          const incomeDocumentTypes = ['paystub', 'w2', 'tax_return', '1099'];
          const debtDocumentTypes = ['credit_card', 'loan_statement', 'medical_bill', 'collection_notice', 'mortgage'];
          const assetDocumentTypes = ['vehicle_title', 'property_deed', 'bank_statement', 'mortgage'];
          const expenseDocumentTypes = ['utility', 'lease', 'mortgage', 'insurance'];

          const isIncomeDocument = incomeDocumentTypes.includes(doc.documentType);
          const isDebtDocument = debtDocumentTypes.includes(doc.documentType);
          const isAssetDocument = assetDocumentTypes.includes(doc.documentType);
          const isExpenseDocument = expenseDocumentTypes.includes(doc.documentType);

          let extractedIncomeCount = 0;
          let extractedDebtCount = 0;
          let extractedAssetCount = 0;
          let extractedExpenseCount = 0;
          let extractionWarnings: string[] = [];

          // Run extraction based on document type
          const extractor = new FinancialDataExtractor(client);

          // Extract income
          if (isIncomeDocument) {
            sendStatus("extracting", "AI extraction in progress...", 50);
            try {
              const extractionResult = await extractor.extractMonthlyIncome(ocrText, doc.documentType, documentId);
              extractionWarnings = extractionResult.warnings;

              if (extractionResult.monthlyIncomes.length > 0) {
                await sql`
                  CREATE TABLE IF NOT EXISTS income_records (
                    id TEXT PRIMARY KEY, case_id TEXT NOT NULL, document_id TEXT,
                    income_month TEXT NOT NULL, employer TEXT, gross_amount DECIMAL(10, 2) NOT NULL,
                    net_amount DECIMAL(10, 2), income_source TEXT NOT NULL DEFAULT 'employment',
                    description TEXT, confidence DECIMAL(3, 2), extracted_at TIMESTAMP,
                    created_at TIMESTAMP NOT NULL DEFAULT NOW()
                  )
                `;

                for (const income of extractionResult.monthlyIncomes) {
                  const existingRecords = await sql`
                    SELECT id FROM income_records
                    WHERE case_id = ${doc.caseId} AND income_month = ${income.incomeMonth}
                      AND income_source = ${income.incomeSource} AND ABS(gross_amount - ${income.grossAmount}) < 1
                  `;
                  if (existingRecords.length > 0) {
                    extractionWarnings.push(`Skipped duplicate income: ${income.employer || income.incomeSource} for ${income.incomeMonth}`);
                    continue;
                  }
                  const recordId = `inc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
                  await sql`
                    INSERT INTO income_records (id, case_id, document_id, income_month, employer, gross_amount, net_amount, income_source, description, confidence, extracted_at, created_at)
                    VALUES (${recordId}, ${doc.caseId}, ${documentId}, ${income.incomeMonth}, ${income.employer}, ${income.grossAmount}, ${income.netAmount}, ${income.incomeSource}, ${income.description}, ${income.confidence}, NOW(), NOW())
                    ON CONFLICT DO NOTHING
                  `;
                  extractedIncomeCount++;
                }
              }
            } catch (e) { extractionWarnings.push("Income extraction failed"); }
          }

          // Extract debts
          if (isDebtDocument) {
            sendStatus("extracting", "AI extraction in progress...", 60);
            try {
              const debts = await extractor.extractDebts(ocrText, doc.documentType);
              for (const debt of debts) {
                const existingDebts = await sql`SELECT id FROM debts WHERE case_id = ${doc.caseId} AND LOWER(creditor_name) = LOWER(${debt.creditorName}) AND ABS(balance - ${debt.currentBalance}) < 1`;
                if (existingDebts.length > 0) { extractionWarnings.push(`Skipped duplicate debt: ${debt.creditorName}`); continue; }
                const recordId = `debt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
                await sql`
                  INSERT INTO debts (id, case_id, document_id, creditor_name, account_last4, balance, monthly_payment, debt_type, secured, collateral, confidence, created_at)
                  VALUES (${recordId}, ${doc.caseId}, ${documentId}, ${debt.creditorName}, ${debt.accountNumber?.slice(-4) || null}, ${debt.currentBalance}, ${debt.monthlyPayment}, ${debt.debtType}, ${debt.isSecured}, ${debt.collateralDescription}, ${debt.confidence}, NOW())
                  ON CONFLICT DO NOTHING
                `;
                extractedDebtCount++;
              }
            } catch (e) { extractionWarnings.push("Debt extraction failed"); }
          }

          // Extract assets
          if (isAssetDocument) {
            sendStatus("extracting", "AI extraction in progress...", 70);
            try {
              const assets = await extractor.extractAssets(ocrText, doc.documentType);
              for (const asset of assets) {
                const existingAssets = await sql`SELECT id FROM assets WHERE case_id = ${doc.caseId} AND asset_type = ${asset.assetType} AND ABS(current_value - ${asset.estimatedValue}) < 1`;
                if (existingAssets.length > 0) { extractionWarnings.push(`Skipped duplicate asset: ${asset.description}`); continue; }
                const recordId = `asset_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
                await sql`
                  INSERT INTO assets (id, case_id, document_id, asset_type, description, current_value, ownership_percentage, confidence, created_at)
                  VALUES (${recordId}, ${doc.caseId}, ${documentId}, ${asset.assetType}, ${asset.description}, ${asset.estimatedValue}, ${asset.ownershipPercentage}, ${asset.confidence}, NOW())
                  ON CONFLICT DO NOTHING
                `;
                extractedAssetCount++;
              }
            } catch (e) { extractionWarnings.push("Asset extraction failed"); }
          }

          // Extract expenses
          if (isExpenseDocument) {
            sendStatus("extracting", "AI extraction in progress...", 80);
            try {
              const expenses = await extractor.extractExpenses(ocrText);
              const expenseCategories = [
                { category: 'housing', amount: expenses.housing }, { category: 'utilities', amount: expenses.utilities },
                { category: 'food', amount: expenses.food }, { category: 'transportation', amount: expenses.transportation },
                { category: 'insurance', amount: expenses.insurance }, { category: 'medical', amount: expenses.medical },
                { category: 'childcare', amount: expenses.childcare }, { category: 'other', amount: expenses.other },
              ];
              for (const exp of expenseCategories) {
                if (exp.amount > 0) {
                  const existingExpenses = await sql`SELECT id FROM expenses WHERE case_id = ${doc.caseId} AND category = ${exp.category} AND ABS(monthly_amount - ${exp.amount}) < 1`;
                  if (existingExpenses.length > 0) { extractionWarnings.push(`Skipped duplicate expense: ${exp.category}`); continue; }
                  const recordId = `exp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
                  await sql`
                    INSERT INTO expenses (id, case_id, document_id, category, description, monthly_amount, confidence, created_at)
                    VALUES (${recordId}, ${doc.caseId}, ${documentId}, ${exp.category}, ${'Extracted from ' + doc.documentType}, ${exp.amount}, ${expenses.confidence}, NOW())
                    ON CONFLICT DO NOTHING
                  `;
                  extractedExpenseCount++;
                }
              }
            } catch (e) { extractionWarnings.push("Expense extraction failed"); }
          }

          // Update document extracted_data
          await sql`
            UPDATE case_documents
            SET extracted_data = ${JSON.stringify({ validationNotes, extractedIncomeCount, extractedDebtCount, extractedAssetCount, extractedExpenseCount, extractionWarnings, reprocessedAt: new Date().toISOString() })}
            WHERE id = ${documentId}
          `;

          sendStatus("completed", "Re-processing complete", 100, {
            validationStatus, extractedIncomeCount, extractedDebtCount, extractedAssetCount, extractedExpenseCount, extractionWarnings,
          });

          controller.close();
          await sql.end();
          return;
        }

        // If we have vault info and API key, poll for OCR completion
        if (doc.vaultFileId && client) {
          // Parse vault ID and object ID from stored format "vaultId:objectId"
          const [vaultId, objectId] = doc.vaultFileId.split(':');

          if (vaultId && objectId) {
            sendStatus("extracting", "AI extraction in progress...", 30);

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
                sendStatus("extracting", "AI extraction in progress...", 50);

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
                  sendStatus("extracting", "AI extraction in progress...", 60);

                  try {
                    // Use document-type-specific validation prompt
                    const validationPrompt = getValidationPrompt(doc.documentType);

                    const validation = await client.llmComplete({
                      model: "gpt-4o-mini",
                      messages: [
                        {
                          role: "system",
                          content: validationPrompt,
                        },
                        {
                          role: "user",
                          content: `Validate this ${doc.documentType} document:\n\n${ocrText.substring(0, 3000)}`,
                        },
                      ],
                      temperature: 0.1,
                    });

                    // Safely extract and parse validation response
                    const content = validation?.choices?.[0]?.message?.content;
                    const validationResult = parseValidationResponse(content);

                    validationStatus = validationResult.valid ? "valid" : "needs_review";
                    validationNotes = validationResult.issues?.join("; ") || "";

                    console.log(`Document ${documentId} validation: ${validationStatus} (confidence: ${validationResult.confidence})`);
                  } catch (llmError) {
                    console.error("LLM validation error:", llmError);
                    validationStatus = "valid"; // Default to valid if LLM fails
                  }
                }

                // Define document type categories for extraction
                const incomeDocumentTypes = ['paystub', 'w2', 'tax_return', '1099'];
                const debtDocumentTypes = ['credit_card', 'loan_statement', 'medical_bill', 'collection_notice', 'mortgage'];
                const assetDocumentTypes = ['vehicle_title', 'property_deed', 'bank_statement', 'mortgage'];
                const expenseDocumentTypes = ['utility', 'lease', 'mortgage', 'insurance'];

                const isIncomeDocument = incomeDocumentTypes.includes(doc.documentType);
                const isDebtDocument = debtDocumentTypes.includes(doc.documentType);
                const isAssetDocument = assetDocumentTypes.includes(doc.documentType);
                const isExpenseDocument = expenseDocumentTypes.includes(doc.documentType);

                let extractedIncomeCount = 0;
                let extractedDebtCount = 0;
                let extractedAssetCount = 0;
                let extractedExpenseCount = 0;
                let extractionWarnings: string[] = [];

                // Extract income data if this is an income document
                if (isIncomeDocument && ocrText && ocrText.length > 50) {
                  sendStatus("extracting", "AI extraction in progress...", 70);

                  try {
                    const extractor = new FinancialDataExtractor(client);
                    const extractionResult = await extractor.extractMonthlyIncome(
                      ocrText,
                      doc.documentType,
                      documentId
                    );

                    extractionWarnings = extractionResult.warnings;

                    // Save extracted monthly income records to database
                    if (extractionResult.monthlyIncomes.length > 0) {
                      // Ensure income_records table has the new schema
                      // This handles migration from old schema to new schema
                      await sql`
                        CREATE TABLE IF NOT EXISTS income_records (
                          id TEXT PRIMARY KEY,
                          case_id TEXT NOT NULL,
                          document_id TEXT,
                          income_month TEXT NOT NULL,
                          employer TEXT,
                          gross_amount DECIMAL(10, 2) NOT NULL,
                          net_amount DECIMAL(10, 2),
                          income_source TEXT NOT NULL DEFAULT 'employment',
                          description TEXT,
                          confidence DECIMAL(3, 2),
                          extracted_at TIMESTAMP,
                          created_at TIMESTAMP NOT NULL DEFAULT NOW()
                        )
                      `;

                      // Add missing columns if table already exists with old schema
                      await sql`
                        DO $$
                        BEGIN
                          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='income_records' AND column_name='document_id') THEN
                            ALTER TABLE income_records ADD COLUMN document_id TEXT;
                          END IF;
                          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='income_records' AND column_name='income_month') THEN
                            ALTER TABLE income_records ADD COLUMN income_month TEXT;
                          END IF;
                          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='income_records' AND column_name='gross_amount') THEN
                            ALTER TABLE income_records ADD COLUMN gross_amount DECIMAL(10, 2);
                          END IF;
                          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='income_records' AND column_name='net_amount') THEN
                            ALTER TABLE income_records ADD COLUMN net_amount DECIMAL(10, 2);
                          END IF;
                          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='income_records' AND column_name='description') THEN
                            ALTER TABLE income_records ADD COLUMN description TEXT;
                          END IF;
                          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='income_records' AND column_name='confidence') THEN
                            ALTER TABLE income_records ADD COLUMN confidence DECIMAL(3, 2);
                          END IF;
                          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='income_records' AND column_name='extracted_at') THEN
                            ALTER TABLE income_records ADD COLUMN extracted_at TIMESTAMP;
                          END IF;
                        END $$;
                      `;

                      for (const income of extractionResult.monthlyIncomes) {
                        // Check for duplicate: same case, month, amount (within $1), and income source
                        const existingRecords = await sql`
                          SELECT id FROM income_records
                          WHERE case_id = ${doc.caseId}
                            AND income_month = ${income.incomeMonth}
                            AND income_source = ${income.incomeSource}
                            AND ABS(gross_amount - ${income.grossAmount}) < 1
                        `;

                        if (existingRecords.length > 0) {
                          // Duplicate found, skip insertion
                          extractionWarnings.push(`Skipped duplicate income: ${income.employer || income.incomeSource} for ${income.incomeMonth}`);
                          continue;
                        }

                        const recordId = `inc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

                        await sql`
                          INSERT INTO income_records (
                            id, case_id, document_id, income_month,
                            employer, gross_amount, net_amount,
                            income_source, description, confidence, extracted_at, created_at
                          ) VALUES (
                            ${recordId},
                            ${doc.caseId},
                            ${documentId},
                            ${income.incomeMonth},
                            ${income.employer},
                            ${income.grossAmount},
                            ${income.netAmount},
                            ${income.incomeSource},
                            ${income.description},
                            ${income.confidence},
                            NOW(),
                            NOW()
                          )
                          ON CONFLICT DO NOTHING
                        `;
                        extractedIncomeCount++;
                      }
                    }
                  } catch (extractError) {
                    console.error("Income extraction error:", extractError);
                    extractionWarnings.push("Income extraction failed, manual entry required");
                  }
                }

                // Extract debt data if this is a debt document
                if (isDebtDocument && ocrText && ocrText.length > 50) {
                  sendStatus("extracting", "AI extraction in progress...", 75);

                  try {
                    const extractor = new FinancialDataExtractor(client);
                    const debts = await extractor.extractDebts(ocrText, doc.documentType);

                    if (debts.length > 0) {
                      // Ensure debts table exists
                      await sql`
                        CREATE TABLE IF NOT EXISTS debts (
                          id TEXT PRIMARY KEY,
                          case_id TEXT NOT NULL,
                          document_id TEXT,
                          creditor_name TEXT NOT NULL,
                          creditor_address TEXT,
                          account_number TEXT,
                          account_last4 TEXT,
                          balance DECIMAL(10, 2) NOT NULL,
                          monthly_payment DECIMAL(10, 2),
                          interest_rate DECIMAL(5, 2),
                          debt_type TEXT NOT NULL,
                          secured BOOLEAN DEFAULT false,
                          priority BOOLEAN DEFAULT false,
                          collateral TEXT,
                          collateral_value DECIMAL(10, 2),
                          date_incurred DATE,
                          confidence DECIMAL(3, 2),
                          created_at TIMESTAMP NOT NULL DEFAULT NOW()
                        )
                      `;

                      // Add document_id column if missing
                      await sql`
                        DO $$
                        BEGIN
                          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='debts' AND column_name='document_id') THEN
                            ALTER TABLE debts ADD COLUMN document_id TEXT;
                          END IF;
                          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='debts' AND column_name='confidence') THEN
                            ALTER TABLE debts ADD COLUMN confidence DECIMAL(3, 2);
                          END IF;
                        END $$;
                      `;

                      for (const debt of debts) {
                        // Check for duplicate: same case, creditor name (case-insensitive), and similar balance
                        const existingDebts = await sql`
                          SELECT id FROM debts
                          WHERE case_id = ${doc.caseId}
                            AND LOWER(creditor_name) = LOWER(${debt.creditorName})
                            AND ABS(balance - ${debt.currentBalance}) < 1
                        `;

                        if (existingDebts.length > 0) {
                          extractionWarnings.push(`Skipped duplicate debt: ${debt.creditorName}`);
                          continue;
                        }

                        const recordId = `debt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

                        await sql`
                          INSERT INTO debts (
                            id, case_id, document_id, creditor_name, account_last4,
                            balance, monthly_payment, debt_type, secured, collateral,
                            collateral_value, confidence, created_at
                          ) VALUES (
                            ${recordId},
                            ${doc.caseId},
                            ${documentId},
                            ${debt.creditorName},
                            ${debt.accountNumber?.slice(-4) || null},
                            ${debt.currentBalance},
                            ${debt.monthlyPayment},
                            ${debt.debtType},
                            ${debt.isSecured},
                            ${debt.collateralDescription},
                            ${null},
                            ${debt.confidence},
                            NOW()
                          )
                          ON CONFLICT DO NOTHING
                        `;
                        extractedDebtCount++;
                      }
                    }
                  } catch (extractError) {
                    console.error("Debt extraction error:", extractError);
                    extractionWarnings.push("Debt extraction failed, manual entry required");
                  }
                }

                // Extract asset data if this is an asset document
                if (isAssetDocument && ocrText && ocrText.length > 50) {
                  sendStatus("extracting", "AI extraction in progress...", 80);

                  try {
                    const extractor = new FinancialDataExtractor(client);
                    const assets = await extractor.extractAssets(ocrText, doc.documentType);

                    if (assets.length > 0) {
                      // Ensure assets table exists
                      await sql`
                        CREATE TABLE IF NOT EXISTS assets (
                          id TEXT PRIMARY KEY,
                          case_id TEXT NOT NULL,
                          document_id TEXT,
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
                          confidence DECIMAL(3, 2),
                          created_at TIMESTAMP NOT NULL DEFAULT NOW()
                        )
                      `;

                      // Add document_id column if missing
                      await sql`
                        DO $$
                        BEGIN
                          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='assets' AND column_name='document_id') THEN
                            ALTER TABLE assets ADD COLUMN document_id TEXT;
                          END IF;
                          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='assets' AND column_name='confidence') THEN
                            ALTER TABLE assets ADD COLUMN confidence DECIMAL(3, 2);
                          END IF;
                        END $$;
                      `;

                      for (const asset of assets) {
                        // Check for duplicate: same case, asset type, and similar value
                        const existingAssets = await sql`
                          SELECT id FROM assets
                          WHERE case_id = ${doc.caseId}
                            AND asset_type = ${asset.assetType}
                            AND ABS(current_value - ${asset.estimatedValue}) < 1
                        `;

                        if (existingAssets.length > 0) {
                          extractionWarnings.push(`Skipped duplicate asset: ${asset.description}`);
                          continue;
                        }

                        const recordId = `asset_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

                        await sql`
                          INSERT INTO assets (
                            id, case_id, document_id, asset_type, description, current_value,
                            ownership_percentage, confidence, created_at
                          ) VALUES (
                            ${recordId},
                            ${doc.caseId},
                            ${documentId},
                            ${asset.assetType},
                            ${asset.description},
                            ${asset.estimatedValue},
                            ${asset.ownershipPercentage},
                            ${asset.confidence},
                            NOW()
                          )
                          ON CONFLICT DO NOTHING
                        `;
                        extractedAssetCount++;
                      }
                    }
                  } catch (extractError) {
                    console.error("Asset extraction error:", extractError);
                    extractionWarnings.push("Asset extraction failed, manual entry required");
                  }
                }

                // Extract expense data if this is an expense document
                if (isExpenseDocument && ocrText && ocrText.length > 50) {
                  sendStatus("extracting", "AI extraction in progress...", 85);

                  try {
                    const extractor = new FinancialDataExtractor(client);
                    const expenses = await extractor.extractExpenses(ocrText);

                    // Ensure expenses table exists
                    await sql`
                      CREATE TABLE IF NOT EXISTS expenses (
                        id TEXT PRIMARY KEY,
                        case_id TEXT NOT NULL,
                        document_id TEXT,
                        category TEXT NOT NULL,
                        description TEXT,
                        monthly_amount DECIMAL(10, 2) NOT NULL,
                        is_irs_standard BOOLEAN DEFAULT false,
                        irs_standard_type TEXT,
                        confidence DECIMAL(3, 2),
                        created_at TIMESTAMP NOT NULL DEFAULT NOW()
                      )
                    `;

                    // Add document_id column if missing
                    await sql`
                      DO $$
                      BEGIN
                        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='expenses' AND column_name='document_id') THEN
                          ALTER TABLE expenses ADD COLUMN document_id TEXT;
                        END IF;
                        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='expenses' AND column_name='confidence') THEN
                          ALTER TABLE expenses ADD COLUMN confidence DECIMAL(3, 2);
                        END IF;
                      END $$;
                    `;

                    // Create expense records for each category with non-zero values
                    const expenseCategories = [
                      { category: 'housing', amount: expenses.housing },
                      { category: 'utilities', amount: expenses.utilities },
                      { category: 'food', amount: expenses.food },
                      { category: 'transportation', amount: expenses.transportation },
                      { category: 'insurance', amount: expenses.insurance },
                      { category: 'medical', amount: expenses.medical },
                      { category: 'childcare', amount: expenses.childcare },
                      { category: 'other', amount: expenses.other },
                    ];

                    for (const exp of expenseCategories) {
                      if (exp.amount > 0) {
                        // Check for duplicate: same case, category, and similar amount
                        const existingExpenses = await sql`
                          SELECT id FROM expenses
                          WHERE case_id = ${doc.caseId}
                            AND category = ${exp.category}
                            AND ABS(monthly_amount - ${exp.amount}) < 1
                        `;

                        if (existingExpenses.length > 0) {
                          extractionWarnings.push(`Skipped duplicate expense: ${exp.category}`);
                          continue;
                        }

                        const recordId = `exp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

                        await sql`
                          INSERT INTO expenses (
                            id, case_id, document_id, category, description, monthly_amount,
                            confidence, created_at
                          ) VALUES (
                            ${recordId},
                            ${doc.caseId},
                            ${documentId},
                            ${exp.category},
                            ${'Extracted from ' + doc.documentType},
                            ${exp.amount},
                            ${expenses.confidence},
                            NOW()
                          )
                          ON CONFLICT DO NOTHING
                        `;
                        extractedExpenseCount++;
                      }
                    }
                  } catch (extractError) {
                    console.error("Expense extraction error:", extractError);
                    extractionWarnings.push("Expense extraction failed, manual entry required");
                  }
                }

                // Update final status in database
                await sql`
                  UPDATE case_documents
                  SET validation_status = ${validationStatus},
                      extracted_data = ${JSON.stringify({
                        validationNotes,
                        extractedIncomeCount,
                        extractedDebtCount,
                        extractedAssetCount,
                        extractedExpenseCount,
                        extractionWarnings,
                      })}
                  WHERE id = ${documentId}
                `;

                // Send completion event
                sendStatus("completed", "Document processing complete", 100, {
                  validationStatus,
                  validationNotes,
                  ocrTextLength: ocrText.length,
                  extractedIncomeCount,
                  extractedDebtCount,
                  extractedAssetCount,
                  extractedExpenseCount,
                  extractionWarnings,
                });

                break;
              } catch (ocrError: any) {
                const isStillProcessing =
                  ocrError.message?.includes("processing") ||
                  ocrError.message?.includes("not been processed");

                if (isStillProcessing && attempt < maxAttempts) {
                  // Don't send status updates for each retry - keep UI clean
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
