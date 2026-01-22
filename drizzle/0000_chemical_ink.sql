CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid NOT NULL,
	"asset_type" text NOT NULL,
	"description" text NOT NULL,
	"current_value" numeric(10, 2) NOT NULL,
	"address" text,
	"make" text,
	"model" text,
	"year" integer,
	"vin" text,
	"institution" text,
	"account_number_last4" text,
	"ownership_percentage" numeric(5, 2) DEFAULT '100',
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bankruptcy_cases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"client_name" text NOT NULL,
	"client_email" text,
	"client_phone" text,
	"ssn_last4" text,
	"address" text,
	"city" text,
	"state" text,
	"zip" text,
	"county" text,
	"case_type" text NOT NULL,
	"filing_type" text NOT NULL,
	"household_size" integer,
	"status" text DEFAULT 'intake' NOT NULL,
	"pacer_case_number" text,
	"court_district" text,
	"filing_date" date,
	"discharge_date" date,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "case_dev_credentials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"api_key_encrypted" text NOT NULL,
	"api_key_last4" text NOT NULL,
	"api_key_prefix" text,
	"verified_at" timestamp,
	"last_used_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "case_dev_credentials_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "case_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid NOT NULL,
	"vault_object_id" text NOT NULL,
	"file_name" text NOT NULL,
	"file_size" integer,
	"content_type" text,
	"document_type" text NOT NULL,
	"validation_status" text DEFAULT 'pending' NOT NULL,
	"validation_notes" text,
	"ocr_text" text,
	"ocr_completed" boolean DEFAULT false,
	"uploaded_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "debts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid NOT NULL,
	"creditor_name" text NOT NULL,
	"creditor_address" text,
	"account_number" text,
	"account_last4" text,
	"balance" numeric(10, 2) NOT NULL,
	"monthly_payment" numeric(10, 2),
	"interest_rate" numeric(5, 2),
	"debt_type" text NOT NULL,
	"secured" boolean DEFAULT false,
	"priority" boolean DEFAULT false,
	"collateral" text,
	"collateral_value" numeric(10, 2),
	"date_incurred" date,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "income_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid NOT NULL,
	"document_id" uuid,
	"employer" text,
	"occupation" text,
	"gross_pay" numeric(10, 2),
	"net_pay" numeric(10, 2),
	"pay_period" text,
	"pay_date" date,
	"ytd_gross" numeric(10, 2),
	"income_source" text DEFAULT 'employment',
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invitation" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"email" text NOT NULL,
	"role" text,
	"status" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"inviter_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "means_test_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid NOT NULL,
	"current_monthly_income" numeric(10, 2) NOT NULL,
	"annualized_income" numeric(10, 2) NOT NULL,
	"state_median_income" numeric(10, 2) NOT NULL,
	"below_median" boolean NOT NULL,
	"disposable_income" numeric(10, 2),
	"passed" boolean NOT NULL,
	"eligible" boolean NOT NULL,
	"explanation" text,
	"calculated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "means_test_results_case_id_unique" UNIQUE("case_id")
);
--> statement-breakpoint
CREATE TABLE "member" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text,
	"logo" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"metadata" text,
	CONSTRAINT "organization_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "two_factor" (
	"id" text PRIMARY KEY NOT NULL,
	"secret" text NOT NULL,
	"backup_codes" text NOT NULL,
	"user_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "user_databases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"project_id" text NOT NULL,
	"project_name" text NOT NULL,
	"connection_string" text NOT NULL,
	"pooler_connection_string" text,
	"region" text DEFAULT 'aws-us-east-1' NOT NULL,
	"status" text DEFAULT 'provisioning' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_databases_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_case_id_bankruptcy_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."bankruptcy_cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bankruptcy_cases" ADD CONSTRAINT "bankruptcy_cases_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_dev_credentials" ADD CONSTRAINT "case_dev_credentials_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_documents" ADD CONSTRAINT "case_documents_case_id_bankruptcy_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."bankruptcy_cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "debts" ADD CONSTRAINT "debts_case_id_bankruptcy_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."bankruptcy_cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "income_records" ADD CONSTRAINT "income_records_case_id_bankruptcy_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."bankruptcy_cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "income_records" ADD CONSTRAINT "income_records_document_id_case_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."case_documents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_inviter_id_user_id_fk" FOREIGN KEY ("inviter_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "means_test_results" ADD CONSTRAINT "means_test_results_case_id_bankruptcy_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."bankruptcy_cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member" ADD CONSTRAINT "member_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member" ADD CONSTRAINT "member_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "two_factor" ADD CONSTRAINT "two_factor_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_databases" ADD CONSTRAINT "user_databases_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "assets_case_id_idx" ON "assets" USING btree ("case_id");--> statement-breakpoint
CREATE INDEX "bankruptcy_cases_user_id_idx" ON "bankruptcy_cases" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "bankruptcy_cases_status_idx" ON "bankruptcy_cases" USING btree ("status");--> statement-breakpoint
CREATE INDEX "case_dev_creds_user_id_idx" ON "case_dev_credentials" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "case_documents_case_id_idx" ON "case_documents" USING btree ("case_id");--> statement-breakpoint
CREATE INDEX "case_documents_type_idx" ON "case_documents" USING btree ("document_type");--> statement-breakpoint
CREATE INDEX "debts_case_id_idx" ON "debts" USING btree ("case_id");--> statement-breakpoint
CREATE INDEX "debts_type_idx" ON "debts" USING btree ("debt_type");--> statement-breakpoint
CREATE INDEX "income_records_case_id_idx" ON "income_records" USING btree ("case_id");--> statement-breakpoint
CREATE INDEX "means_test_case_id_idx" ON "means_test_results" USING btree ("case_id");--> statement-breakpoint
CREATE INDEX "user_databases_user_id_idx" ON "user_databases" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_databases_project_id_idx" ON "user_databases" USING btree ("project_id");