# Bankruptcy Automation Tool

**AI-Powered Bankruptcy Case Management Platform**

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-61dafb)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6)](https://typescriptlang.org)

A modern bankruptcy case management platform that leverages [case.dev](https://case.dev) AI capabilities for document processing, financial data extraction, and automated form generation.

## Overview

This application streamlines the bankruptcy filing process for attorneys by providing:

- **Client Intake** - Create and manage Chapter 7 and Chapter 13 bankruptcy cases
- **Document Processing** - Upload documents with automatic OCR and AI-powered validation
- **Means Test Calculator** - Automated Chapter 7 eligibility determination
- **Financial Management** - Track income, debts, and assets with automatic extraction from documents
- **Form Generation** - Auto-populate 20+ official bankruptcy forms

## Features

### Production Ready (P0)

| Feature | Description |
|---------|-------------|
| **Case Management** | Create cases for Chapter 7/13, individual/joint filings with full client information |
| **Document Upload** | Drag-and-drop upload with OCR processing and AI validation |
| **Document Types** | Paystubs, W2s, tax returns, 1099s, bank statements, mortgages, utilities, credit cards, medical bills, and more |
| **Means Test** | Two-step eligibility calculator with state median income comparison and IRS standards |
| **Financial Tracking** | Income records, debt management, and asset tracking |
| **Form Generation** | Support for Official Bankruptcy Forms 101-423 with auto-population |
| **Case Dashboard** | Overview of all cases with status tracking and validation checklists |

### Coming Soon (P1)

- 341 Meeting Preparation
- Credit Report Integration
- Timeline & Deadlines Tracking
- PACER eFiling Integration

## Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org) with App Router
- **Language**: TypeScript 5
- **UI**: [Shadcn UI](https://ui.shadcn.com) (Maia preset) + [Tailwind CSS 4](https://tailwindcss.com)
- **Database**: PostgreSQL with [Drizzle ORM](https://orm.drizzle.team)
- **Authentication**: [Better Auth](https://better-auth.com) + case.dev API keys
- **AI/Document Processing**: [case.dev](https://case.dev) SDK (OCR, LLM validation, Vaults)
- **Typography**: Inter + Spectral (serif for legal documents)
- **Package Manager**: [Bun](https://bun.sh)

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org) 18+ or [Bun](https://bun.sh)
- PostgreSQL database (local or [Neon](https://neon.tech))
- [case.dev](https://console.case.dev) API key

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd bankruptcy-tool-demo

# Install dependencies
bun install
```

### Environment Setup

Copy the example environment file and configure your variables:

```bash
cp .env.example .env.local
```

Required environment variables:

```env
# Database
DATABASE_URL=postgresql://user:password@host:5432/database

# Authentication
BETTER_AUTH_SECRET=<base64-encoded-32-char-secret>
BETTER_AUTH_URL=http://localhost:3000

# case.dev Integration
CASE_DEV_ENCRYPTION_KEY=<64-char-hex-string>
```

### Database Setup

```bash
# Generate migrations
bun run drizzle-kit generate

# Apply migrations
bun run drizzle-kit push

# (Optional) Open database studio
bun run drizzle-kit studio
```

### Run Development Server

```bash
bun dev
```

Open [http://localhost:3000](http://localhost:3000) to access the application.

## Project Structure

```
/app
  /(auth)           # Login and signup pages
  /(dashboard)      # Main application pages
    /cases          # Case listing and management
    /cases/[id]     # Case details, documents, financial data, forms
    /settings       # API key configuration
  /api              # API routes for cases, documents, authentication
/components         # React components (UI primitives + custom)
/lib
  /case-dev         # case.dev API client
  /db               # Database schema and queries
  /auth             # Authentication configuration
/skills             # AI agent documentation
/drizzle            # Database migrations
```

## Available Scripts

| Script | Description |
|--------|-------------|
| `bun dev` | Start development server |
| `bun build` | Build for production |
| `bun start` | Start production server |
| `bun lint` | Run ESLint |
| `bun test` | Run tests |
| `bun test:watch` | Run tests in watch mode |
| `bun test:coverage` | Run tests with coverage |
| `bun drizzle-kit generate` | Generate database migrations |
| `bun drizzle-kit push` | Apply database migrations |
| `bun drizzle-kit studio` | Open Drizzle Studio |

## Database Schema

The application uses the following main tables:

- **`bankruptcy_cases`** - Client information, case type, filing status, court details
- **`case_documents`** - Uploaded documents with OCR results and validation status
- **`income_records`** - Employment and income data
- **`debts`** - Creditor information and debt details
- **`assets`** - Real estate, vehicles, accounts, and other assets
- **`means_test_results`** - Chapter 7 eligibility calculations
- **`case_dev_credentials`** - Encrypted API keys per user

## Authentication Flow

1. User enters their case.dev API key at `/login`
2. Key is validated against the case.dev API
3. Valid key stored in browser localStorage
4. All subsequent API requests include the key for authorization
5. Per-user database provisioned automatically via case.dev

## API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/verify-key` | POST | Validate case.dev API key |
| `/api/case-dev/connect` | POST | Connect and store API key |
| `/api/case-dev/status` | GET | Check connection status |
| `/api/cases` | GET, POST | List or create bankruptcy cases |
| `/api/cases/[id]` | GET | Get case details |
| `/api/cases/[id]/documents` | GET | List case documents |
| `/api/documents/upload` | POST | Upload and process documents |

## AI Agent Documentation

This repository includes comprehensive documentation for AI coding assistants in the `/skills` directory:

- **`/skills/case-dev`** - case.dev SDK usage, Vaults, OCR pipelines
- **`/skills/database`** - Schema design patterns
- **`/skills/auth`** - Authentication flow documentation

AI agents should read `AGENTS.md` first for project architecture and principles.

## Means Test Calculation

The means test determines Chapter 7 eligibility:

1. **Step 1**: Compare client's current monthly income to state median
   - Below median: Qualifies for Chapter 7
   - Above median: Proceed to Step 2

2. **Step 2**: Calculate disposable income using IRS standards
   - Deduct allowed expenses (national/local standards)
   - If disposable income below threshold: Qualifies for Chapter 7
   - Otherwise: Chapter 13 recommended

Supports state-specific median income data for CA, TX, NY, FL, and other states.

## License

This project is licensed under the [Apache 2.0 License](LICENSE).
