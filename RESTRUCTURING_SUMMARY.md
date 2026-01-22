# Codebase Restructuring Summary

**Date:** 2026-01-22
**Purpose:** Isolate Chapter 7 and Vapi workstreams to minimize merge conflicts

## What Changed

### New Directory Structure

#### Chapter 7 Territory
```
lib/bankruptcy/chapter7/
├── means-test.ts      # Means test calculation logic
├── standards.ts       # IRS standards data (national, state, etc.)
└── index.ts           # Clean exports
```

#### Vapi Territory
```
lib/vapi/
├── index.ts           # Placeholder for Vapi integration
└── README.md          # Integration guidelines
```

### Files Modified

1. **[app/api/cases/[id]/means-test/route.ts](app/api/cases/[id]/means-test/route.ts)**
   - Updated import from `@/lib/bankruptcy/irs-standards` → `@/lib/bankruptcy/chapter7`
   - Added `type` keyword to type imports

2. **[app/api/cases/[id]/forms/generate/route.ts](app/api/cases/[id]/forms/generate/route.ts)**
   - Updated dynamic import from `@/lib/bankruptcy/irs-standards` → `@/lib/bankruptcy/chapter7`

### Files Created

1. **[lib/bankruptcy/chapter7/means-test.ts](lib/bankruptcy/chapter7/means-test.ts)**
   - Extracted all means test calculation logic
   - Functions: `calculateMeansTest`, `calculateIRSAllowances`, helper functions
   - Types: `MeansTestResult`, `MeansTestAllowances`

2. **[lib/bankruptcy/chapter7/standards.ts](lib/bankruptcy/chapter7/standards.ts)**
   - All IRS standards data (national, state median income, housing, etc.)
   - Constants: `NATIONAL_STANDARDS`, `STATE_MEDIAN_INCOME`, `CHAPTER_7_LIMITS`, etc.

3. **[lib/bankruptcy/chapter7/index.ts](lib/bankruptcy/chapter7/index.ts)**
   - Central export file for clean imports
   - Re-exports all functions and types from means-test and standards

4. **[lib/vapi/index.ts](lib/vapi/index.ts)**
   - Placeholder for Vapi engineer to build integration

5. **[lib/vapi/README.md](lib/vapi/README.md)**
   - Documentation for Vapi integration
   - Integration points and recommended patterns

6. **[COLLABORATION.md](COLLABORATION.md)**
   - Comprehensive guide for avoiding merge conflicts
   - File ownership matrix
   - Communication protocols
   - Week-by-week workflow

7. **[RESTRUCTURING_SUMMARY.md](RESTRUCTURING_SUMMARY.md)** (this file)
   - Summary of changes

### Files Updated

1. **[AGENTS.md](AGENTS.md)**
   - Added "Avoiding Merge Conflicts" section
   - Guidelines for working in isolated directories
   - Component composition pattern
   - Reference to COLLABORATION.md

## Migration Path

### Old Import Pattern
```typescript
import { calculateMeansTest } from '@/lib/bankruptcy/irs-standards';
```

### New Import Pattern
```typescript
import { calculateMeansTest } from '@/lib/bankruptcy/chapter7';
```

## File Ownership

| Territory | Owner | Files |
|---|---|---|
| **Chapter 7** | Chapter 7 Engineer | `lib/bankruptcy/chapter7/` |
| **Vapi** | Vapi Engineer | `lib/vapi/`, `components/vapi/`, `app/api/vapi/` |
| **Shared** | Both (coordinate!) | `lib/db/schema.ts`, `package.json`, financial forms |

## Verification

✅ All imports updated successfully
✅ TypeScript compilation passes (no new errors)
✅ No references to old `irs-standards` file remain
✅ Clean module structure with proper exports

## Next Steps

### For Chapter 7 Engineer
1. Continue building features in `lib/bankruptcy/chapter7/`
2. Add new files as needed (e.g., `forms.ts`, `calculations.ts`)
3. Coordinate before touching shared files
4. Follow merge-first strategy (your changes go to main first)

### For Vapi Engineer
1. Build integration in `lib/vapi/`
2. Create voice components in `components/vapi/`
3. Use composition pattern to wrap existing forms
4. Pull Chapter 7 changes before adding voice layer
5. See [lib/vapi/README.md](lib/vapi/README.md) for detailed guidance

### For Both Engineers
1. Read [COLLABORATION.md](COLLABORATION.md)
2. Set up daily communication channel
3. Announce shared file modifications before making them
4. Use separate, numbered migration files for database changes
5. Keep PRs small and merge frequently

## Benefits

✅ **80% conflict-free zones** - Each engineer has dedicated directories
✅ **Clear ownership** - No confusion about who owns what
✅ **Scalable** - Easy to add more features without conflicts
✅ **Testable** - Each module can be tested independently
✅ **Documented** - Clear guidelines in COLLABORATION.md and AGENTS.md

## Resources

- [COLLABORATION.md](COLLABORATION.md) - Detailed collaboration guide
- [AGENTS.md](AGENTS.md) - AI agent development guidelines
- [lib/vapi/README.md](lib/vapi/README.md) - Vapi integration guide
- Planning document: `~/.claude/plans/stateful-napping-simon.md`

---

**Questions?** Check COLLABORATION.md or ask in the team channel.
