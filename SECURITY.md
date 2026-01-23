# Security Considerations

## Multi-Tenant Database Architecture

This application uses a **multi-tenant architecture** where each user provisions their own database via the case.dev API:

1. User logs in with case.dev API key
2. System provisions a dedicated Neon PostgreSQL database for that user
3. Database connection string is stored in browser localStorage
4. Connection string is passed to backend APIs as needed

## VAPI Integration Security Tradeoffs

### The Challenge

For outbound calling with VAPI webhooks, we face a technical constraint:

```
Browser → API (schedule call) → VAPI → Calls client
                                   ↓
                      Webhook ← VAPI (function calls)
                                   ↓
                      Which database to access? 🤔
```

The webhook is called by VAPI (not the browser), so it doesn't have access to:
- Browser localStorage
- User session context
- Original request context

### Current Approach: Connection String in Metadata

**What we do:**
- Pass the database connection string to VAPI when scheduling outbound calls
- VAPI includes it in webhook metadata
- Webhook uses it to access the correct database

**Security implications:**
- ⚠️ Connection string is sent to VAPI (third-party service)
- ⚠️ Connection string may appear in VAPI's logs
- ⚠️ Connection string is transmitted over the wire (HTTPS)

**Mitigations:**
- ✅ Connection string already exists client-side (localStorage)
- ✅ HTTPS encryption in transit
- ✅ Each user has isolated database (no cross-user access)
- ✅ Neon databases can use connection pooling with separate credentials
- ✅ PII is minimized in VAPI requests (only boolean flags sent)

### Alternative Approaches

#### Option 1: Single Shared Database (Not Multi-Tenant)
Set `DATABASE_URL` in `.env.local` and have all users share one database.
- ❌ Loses multi-tenancy
- ✅ No connection string to VAPI
- ❌ Requires user authentication/authorization

#### Option 2: Database Mapping Service
Store a mapping of `caseId → connectionString` in a separate service.
- ✅ No connection string to VAPI
- ❌ Requires additional infrastructure
- ❌ Chicken-and-egg: where to store the mapping?

#### Option 3: User-Specific Webhook URLs
Generate unique webhook URLs per user with embedded credentials.
- ❌ Complex VAPI configuration
- ❌ Not scalable
- ❌ Credentials in URLs (worse than metadata)

### Recommendations for Production

If deploying this to production with real client data:

1. **Use Neon Connection Pooling**
   - Create separate credentials for webhook access
   - Use Neon's connection pooler with limited permissions
   - Rotate credentials regularly

2. **Implement Database-Level Security**
   - Row-level security (RLS) policies
   - Separate schemas per tenant
   - Audit logging

3. **Consider Alternative Architecture**
   - Centralized database with proper auth
   - Server-side session management
   - OAuth for VAPI webhooks

4. **Add Monitoring**
   - Log all VAPI webhook calls
   - Alert on unusual access patterns
   - Implement rate limiting

5. **Review VAPI's Security**
   - Read VAPI's security documentation
   - Understand their data retention policies
   - Review their SOC 2 / compliance certifications

## For Development/Demo Use

This architecture is acceptable for:
- ✅ Development and testing
- ✅ Demo applications
- ✅ POC / MVP projects
- ✅ Non-production environments

This architecture needs hardening for:
- ⚠️ Production deployments
- ⚠️ Handling real client PII
- ⚠️ HIPAA/SOC 2 compliance requirements
- ⚠️ Large-scale multi-tenant SaaS

## Additional Security Features

### Already Implemented

1. **PII Minimization**
   - Only boolean flags sent to VAPI (`hasAddress`, not actual address)
   - No SSN, full addresses, or emails in variable values

2. **Error Handling**
   - Generic error messages to clients
   - Detailed errors only logged server-side

3. **Input Validation**
   - Phone number validation
   - Case existence verification before updates

4. **Case Isolation**
   - Webhook verifies case exists before updates
   - Never creates cases (prevents injection)

### TODO for Production

- [ ] Add authentication middleware
- [ ] Implement rate limiting
- [ ] Add audit logging
- [ ] Rotate database credentials
- [ ] Add webhook signature verification from VAPI
- [ ] Implement connection string encryption at rest
- [ ] Add monitoring and alerting

---

**Last Updated:** 2026-01-23
**Review Frequency:** Before any production deployment
