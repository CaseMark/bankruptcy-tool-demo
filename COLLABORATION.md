# Collaboration Guide: Avoiding Merge Conflicts

This document outlines how to work in parallel on Chapter 7 functionality and Vapi integration with minimal merge conflicts.

## Quick Reference

### Key Principle
**Layer-based separation**: Chapter 7 owns core logic, Vapi adds voice layer on top.

### Your Conflict-Free Zones

#### Chapter 7 Engineer (80% conflict-free)
```
lib/bankruptcy/chapter7/          ✅ Your territory
├── means-test.ts                 ✅ Means test calculations
├── standards.ts                  ✅ IRS standards data
└── index.ts                      ✅ Exports

app/(dashboard)/cases/[id]/
├── means-test/                   ✅ Means test UI pages
└── forms/                        ⚠️  Coordinate (Vapi may wrap)

components/cases/chapter7/        ✅ Chapter 7 components (create as needed)
```

#### Vapi Engineer (80% conflict-free)
```
lib/vapi/                         ✅ Your territory
├── client.ts                     ✅ Vapi SDK wrapper
├── transcription.ts              ✅ Speech-to-text
├── handlers.ts                   ✅ Voice commands
└── types.ts                      ✅ Type definitions

components/vapi/                  ✅ Voice UI components
├── voice-enabled-form.tsx        ✅ Wrapper for forms
├── voice-controls.tsx            ✅ Voice input controls
└── transcription-view.tsx        ✅ Transcription display

app/api/vapi/                     ✅ Vapi API endpoints
├── webhook/                      ✅ Vapi webhooks
├── transcribe/                   ✅ Transcription
└── commands/                     ✅ Voice commands
```

### High-Conflict Zones (Coordinate Before Touching)

⚠️ **MUST coordinate before modifying:**

1. **`lib/db/schema.ts`** - Database schema
   - Announce changes immediately in team chat
   - Use separate migration files (see below)
   - Merge schema changes quickly

2. **`components/cases/new-case-form.tsx`** - Case creation form
   - Chapter 7: Form logic and validation
   - Vapi: Wrap with voice controls (don't modify directly)

3. **Financial forms** (`components/cases/financial/*-modal.tsx`)
   - Chapter 7: Update calculations and fields
   - Vapi: Wrap with voice input (composition pattern)

4. **`package.json`** - Dependencies
   - Coordinate before adding new packages
   - Merge dependency changes immediately

## Workflow Strategy

### Merge Order (Critical!)
1. ✅ Chapter 7 merges changes **first**
2. ✅ Vapi pulls latest and builds on top
3. ✅ This prevents conflicts and rework

### Component Composition Pattern

**❌ DON'T modify the same component:**
```tsx
// components/cases/new-case-form.tsx - CONFLICT RISK
export function NewCaseForm() {
  // Chapter 7 adds fields
  // Vapi adds voice button
  // = MERGE CONFLICT!
}
```

**✅ DO use composition:**
```tsx
// components/cases/new-case-form.tsx - Chapter 7 owns
export function NewCaseForm() {
  // Chapter 7 work only
}

// components/vapi/voice-enabled-form.tsx - Vapi owns
export function VoiceEnabledForm({ children }) {
  return (
    <>
      <VoiceControls />
      {children}
    </>
  );
}

// Usage - no conflicts
<VoiceEnabledForm>
  <NewCaseForm />
</VoiceEnabledForm>
```

### Database Migration Coordination

**✅ Use numbered, separate migration files:**

```
drizzle/
├── 0010_chapter7_means_test_cache.sql    ← Chapter 7
├── 0011_vapi_transcriptions.sql          ← Vapi
├── 0012_chapter7_form_templates.sql      ← Chapter 7
└── 0013_vapi_voice_sessions.sql          ← Vapi
```

**Process:**
1. Announce in chat: "Creating migration 0010 for means test cache"
2. Create your migration file
3. Run `pnpm drizzle-kit generate`
4. Commit and push immediately
5. Notify team: "Migration 0010 merged, next number is 0011"

## Daily Workflow

### Morning Routine
1. Pull latest from `main`
2. Quick sync with other engineer:
   - "What files are you touching today?"
   - "Any schema changes planned?"
3. Work in your conflict-free zones

### Before Modifying Shared Files
1. Check team chat: "About to modify [filename] to add X"
2. Wait for acknowledgment
3. Pull latest
4. Make minimal changes
5. Commit immediately with clear message
6. Push and notify: "[filename] updated with X, please pull"

### End of Day
1. Commit and push all isolated work
2. If touching shared files, coordinate merge timing

## Communication Protocol

### Slack/Teams Channel Format

**Good examples:**
```
🔔 About to modify schema.ts to add means_test_cache table
✅ Merged schema.ts with means_test_cache, please pull before your next commit
🚧 Working on lib/bankruptcy/chapter7/ today (no conflicts expected)
📊 Created migration 0010, next available: 0011
```

**When conflicts occur:**
```
⚠️ Conflict in new-case-form.tsx - let's pair on this for 10 min?
```

## Branch Strategy

### Current (Direct to main)
```
feat/chapter7-means-test → main
feat/vapi-voice-input    → main
```

**Best practices:**
- Keep feature branches short-lived (1-3 days)
- Merge to main frequently (daily if possible)
- Pull from main before starting each day
- Small PRs (< 500 lines) merge faster

### Optional: Integration Branch
```
feat/chapter7-* → integration → main (weekly)
feat/vapi-*     → integration → main (weekly)
```

Use if you want an extra safety layer.

## Week-by-Week Plan

### Week 1: Foundation (Low Conflict)
**Chapter 7:**
- ✅ Create `lib/bankruptcy/chapter7/` structure
- ✅ Move means test logic
- ✅ Update imports
- Add new calculation functions

**Vapi:**
- ✅ Create `lib/vapi/` structure
- Set up Vapi SDK client
- Build transcription utilities
- Create voice component library

### Week 2: Core Features (Medium Conflict)
**Chapter 7 (goes first):**
- Enhance means test UI
- Update financial form validation
- Improve form generation
- **Merge by end of week**

**Vapi (goes second):**
- Pull Chapter 7's changes
- Add voice controls to updated components
- Test with enhanced forms

### Week 3+: Integration
- Daily sync: "What are you touching today?"
- Coordinate any schema changes
- Test both features together

## File Ownership Reference

| File/Directory | Owner | Other Engineer |
|---|---|---|
| `lib/bankruptcy/chapter7/` | Chapter 7 | Read only |
| `lib/vapi/` | Vapi | Read only |
| `lib/db/schema.ts` | **Shared** | Coordinate! |
| `components/cases/new-case-form.tsx` | Chapter 7 | Wrap, don't modify |
| `components/cases/financial/*` | Chapter 7 | Wrap, don't modify |
| `components/vapi/*` | Vapi | Read only |
| `app/api/vapi/*` | Vapi | Read only |
| `app/api/cases/[id]/means-test/` | Chapter 7 | Read only |
| `package.json` | **Shared** | Coordinate! |

## Success Metrics

✅ **Target: < 1 merge conflict per week**
✅ **Goal: < 30 minutes to resolve conflicts**
✅ **Ideal: Daily merges to main**
✅ **Standard: No broken builds on main**

## Getting Help

If you're unsure whether a change will conflict:
1. Ask in team chat first
2. Do a quick pair review (5 min)
3. Better to ask than to create conflicts!

## Tools

### Check for potential conflicts before committing
```bash
# See what files changed on main since you branched
git fetch origin
git diff origin/main --name-only

# See what files the other engineer modified recently
git log origin/main --name-only --since="1 day ago"
```

### Resolve conflicts quickly
```bash
# Pull latest and rebase your work on top
git pull --rebase origin main

# If conflicts occur, resolve and continue
# ... fix conflicts ...
git add .
git rebase --continue
```

---

**Remember:** Communication is cheaper than conflict resolution. When in doubt, ask!
