# Vapi Assistant Configuration for Bankruptcy Client Intake

This document describes how to configure your Vapi assistant to work with the bankruptcy tool's voice intake system.

## Overview

The voice intake system supports two workflows:

1. **Existing Client**: Verify identity with name + SSN last 4, then update their case
2. **New Client**: Create a new case and collect intake information

## Server URL Configuration

In your Vapi dashboard, set the **Server URL** to:

```
https://your-domain.com/api/vapi/webhook
```

For local development with ngrok:
```
https://your-ngrok-id.ngrok.io/api/vapi/webhook
```

## Assistant System Prompt

Use this system prompt for your bankruptcy intake assistant:

```
You are a helpful legal intake assistant for a bankruptcy law firm. Your role is to help clients either access their existing case or create a new one.

WORKFLOW:
1. First, greet the caller and ask for their first and last name
2. Use the check_existing_case function to see if they have an existing case
3. If they have an existing case:
   - Ask for the last 4 digits of their Social Security Number to verify identity
   - Use the verify_client function to confirm their identity
   - If verified, help them update their case information using update_case_intake
4. If they don't have an existing case:
   - Confirm they want to start a new case
   - Collect their full name and SSN last 4 digits
   - Use create_new_case to create their case
   - Then collect additional information using update_case_intake

INFORMATION TO COLLECT FOR NEW CASES:
- Full legal name
- Last 4 digits of SSN (for verification)
- Email address
- Phone number
- Current address (street, city, state, zip code, county)
- Household size
- Filing type (individual or joint with spouse)
- Case type (Chapter 7 or Chapter 13 - if unsure, default to Chapter 7)

IMPORTANT GUIDELINES:
- Be patient and speak clearly
- Confirm information by repeating it back
- If the caller seems confused, explain the process
- Never store or repeat the full SSN - only the last 4 digits
- Be empathetic - bankruptcy can be a stressful topic
- If asked legal questions, explain you can only collect information and they should speak with an attorney
```

## Function Definitions

Add these functions to your Vapi assistant:

### 1. check_existing_case

Checks if a client has any existing cases in the system.

```json
{
  "name": "check_existing_case",
  "description": "Check if a client has an existing bankruptcy case by their name",
  "parameters": {
    "type": "object",
    "properties": {
      "first_name": {
        "type": "string",
        "description": "The client's first name"
      },
      "last_name": {
        "type": "string",
        "description": "The client's last name"
      }
    },
    "required": ["first_name", "last_name"]
  }
}
```

### 2. verify_client

Verifies client identity using name and SSN last 4 digits.

```json
{
  "name": "verify_client",
  "description": "Verify a client's identity using their name and last 4 SSN digits to access their case",
  "parameters": {
    "type": "object",
    "properties": {
      "first_name": {
        "type": "string",
        "description": "The client's first name"
      },
      "last_name": {
        "type": "string",
        "description": "The client's last name"
      },
      "ssn_last_4": {
        "type": "string",
        "description": "The last 4 digits of the client's Social Security Number"
      }
    },
    "required": ["first_name", "last_name", "ssn_last_4"]
  }
}
```

### 3. create_new_case

Creates a new bankruptcy case for a client.

```json
{
  "name": "create_new_case",
  "description": "Create a new bankruptcy case for a client",
  "parameters": {
    "type": "object",
    "properties": {
      "client_name": {
        "type": "string",
        "description": "The client's full legal name"
      },
      "ssn_last_4": {
        "type": "string",
        "description": "The last 4 digits of the client's SSN"
      },
      "case_type": {
        "type": "string",
        "enum": ["chapter7", "chapter13"],
        "description": "The type of bankruptcy filing"
      },
      "filing_type": {
        "type": "string",
        "enum": ["individual", "joint"],
        "description": "Whether filing individually or jointly with spouse"
      }
    },
    "required": ["client_name"]
  }
}
```

### 4. update_case_intake

Updates an existing case with client information.

```json
{
  "name": "update_case_intake",
  "description": "Update a bankruptcy case with client intake information",
  "parameters": {
    "type": "object",
    "properties": {
      "case_id": {
        "type": "string",
        "description": "The ID of the case to update"
      },
      "client_email": {
        "type": "string",
        "description": "Client's email address"
      },
      "client_phone": {
        "type": "string",
        "description": "Client's phone number"
      },
      "ssn_last_4": {
        "type": "string",
        "description": "Last 4 digits of SSN"
      },
      "address": {
        "type": "string",
        "description": "Street address"
      },
      "city": {
        "type": "string",
        "description": "City"
      },
      "state": {
        "type": "string",
        "description": "State (2-letter code)"
      },
      "zip": {
        "type": "string",
        "description": "ZIP code"
      },
      "county": {
        "type": "string",
        "description": "County name"
      },
      "household_size": {
        "type": "integer",
        "description": "Number of people in household"
      },
      "case_type": {
        "type": "string",
        "enum": ["chapter7", "chapter13"],
        "description": "Type of bankruptcy"
      },
      "filing_type": {
        "type": "string",
        "enum": ["individual", "joint"],
        "description": "Individual or joint filing"
      }
    },
    "required": ["case_id"]
  }
}
```

## Environment Variables

Add these to your `.env.local`:

```env
# Vapi Configuration
NEXT_PUBLIC_VAPI_PUBLIC_KEY=your_public_key_here
NEXT_PUBLIC_VAPI_ASSISTANT_ID=your_assistant_id_here
VAPI_API_KEY=your_private_api_key_here
```

## Testing

1. Start your development server: `bun dev`
2. If testing locally, use ngrok to expose your webhook: `ngrok http 3000`
3. Update your Vapi assistant's Server URL with the ngrok URL
4. Use the VoiceIntake component in your app
5. Test both workflows:
   - New client (no existing case)
   - Returning client (verify and update)

## Component Usage

```tsx
import { VoiceIntake } from '@/components/voice-intake';

function IntakePage() {
  return (
    <VoiceIntake
      onCaseCreated={(caseId) => {
        console.log('New case created:', caseId);
        // Navigate to case details or show confirmation
      }}
      onCaseVerified={(caseId, details) => {
        console.log('Client verified, case:', caseId, details);
        // Load case data into form
      }}
      onDataExtracted={(data) => {
        console.log('Data extracted:', data);
        // Populate form fields
      }}
      onCallEnd={(transcripts) => {
        console.log('Call ended, transcripts:', transcripts);
        // Save transcript for records
      }}
    />
  );
}
```

## Security Considerations

1. The webhook receives the database connection string via call metadata
2. Never log or expose full SSN - only last 4 digits
3. Use HTTPS in production
4. Consider adding webhook signature verification for production
5. Rate limit the webhook endpoint to prevent abuse
