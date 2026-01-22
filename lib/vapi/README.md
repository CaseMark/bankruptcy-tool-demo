# Vapi Voice Integration

This directory is reserved for Vapi voice input integration.

## Purpose
Enable voice input for bankruptcy case data entry - users can speak case information and have it transcribed into forms.

## Recommended Structure

```
lib/vapi/
├── index.ts           # Main exports
├── client.ts          # Vapi SDK wrapper
├── transcription.ts   # Speech-to-text processing
├── handlers.ts        # Voice command handlers
├── types.ts           # TypeScript type definitions
└── README.md          # This file
```

## Integration Points

### Forms to Integrate With
- Case creation form: `components/cases/new-case-form.tsx`
- Income modal: `components/cases/financial/income-modal.tsx`
- Debt modal: `components/cases/financial/debt-modal.tsx`
- Asset modal: `components/cases/financial/asset-modal.tsx`
- Expense modal: `components/cases/financial/expense-modal.tsx`

### Recommended Pattern
Use component composition to wrap existing forms without modifying them:

```tsx
// components/vapi/voice-enabled-form.tsx
export function VoiceEnabledForm({ children }) {
  return (
    <>
      <VoiceControls />
      {children}
    </>
  );
}

// Usage
<VoiceEnabledForm>
  <NewCaseForm />
</VoiceEnabledForm>
```

## Coordination with Chapter 7 Work

- **Chapter 7 engineer** owns form logic, validation, and calculations
- **Vapi engineer** adds voice layer on top of completed forms
- Coordinate before modifying shared files (see root README)

## API Endpoints

Suggested API route structure:
```
app/api/vapi/
├── route.ts           # Existing endpoint
├── webhook/           # Vapi webhooks
├── transcribe/        # Transcription endpoints
└── commands/          # Voice command processing
```
