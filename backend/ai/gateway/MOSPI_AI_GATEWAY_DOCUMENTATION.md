# MoSPI-Aware AI Gateway Documentation

## Overview

This AI Gateway implements the Ministry of Statistics and Programme Implementation (MoSPI) Revised Guidelines for Statistical Data Dissemination (GSDD), 2026, where applicable.

## Important Scope Limitation

**The system does NOT assume that GSDD 2026 applies to every uploaded document or secondary-source dataset.**

According to the official MoSPI FAQ, the revised GSDD applies to:
- Data collected, compiled and produced by NSO/MoSPI
- With stated scope and qualifications regarding secondary-source data

Dissemination of secondary-source datasets remains with the source authority.

## MoSPI GSDD 2026 Categories

### CATEGORY_A_OPEN_ACCESS
**Official Description:** Aggregated/analyzed information and publications available without registration, such as specified MoSPI publications and statistical outputs.

### CATEGORY_B_REGISTERED_ACCESS
**Official Description:** Anonymized unit-level/item-level data for which access requires registration and applicable access conditions.

### CATEGORY_C_RESTRICTED_ACCESS
**Official Description:** Restricted datasets requiring authorization from MoSPI.

### NON_SHAREABLE
**Official Description:** Data that cannot be shared, including data compromising privacy or national security and other categories identified by the applicable MoSPI rules.

## Classification Sources

The system tracks the source of classification to distinguish between:

- **MOSPI_GSDD_2026**: Official MoSPI classification
- **SOURCE_AUTHORITY_POLICY**: Secondary source authority policy
- **ORGANIZATION_POLICY**: Internal organizational policy
- **DOCUMENT_OWNER**: Document owner's classification
- **UNKNOWN**: Unknown classification source

## Classification vs AI-Processing Permission

**Critical Distinction:** Data-access classification and permission to transmit data to an external AI provider are RELATED but NOT IDENTICAL decisions.

The gateway makes the final processing decision based on:
- Classification
- Classification source
- Organizational policy
- Authorization
- Configured AI-processing policy

Therefore: `classification ≠ automatic AI permission`

## Default-Deny Rule

If the applicable classification is UNKNOWN, external AI processing is BLOCKED.

The system does NOT use an LLM to guess whether unknown content is safe.

## Processing Modes

### External Processing
- Used for: Category A (Open Access) with trusted source and explicit authorization
- Providers: Gemini, Groq
- Requires: Trusted classification source + explicit authorization

### Private Processing
- Used for: Category C (Restricted), Non-Shareable, or when external AI is blocked
- Providers: Ollama (private/local)
- Requires: Approved private provider availability

### Blocked
- Used for: Unknown classification, unauthorized external AI, or when no approved provider is available
- Returns: Controlled error with reason

## Security Decision Examples

### Example 1: Category A + Allowed Policy
```
Classification: CATEGORY_A_OPEN_ACCESS
Source: MOSPI_GSDD_2026
externalAIAllowed: true
→ External AI MAY be allowed
```

### Example 2: Category B + External AI Blocked
```
Classification: CATEGORY_B_REGISTERED_ACCESS
externalAIAllowed: false
→ External AI BLOCKED
```

### Example 3: Category C
```
Classification: CATEGORY_C_RESTRICTED_ACCESS
→ External AI BLOCKED
→ Private provider MAY be used if available
```

### Example 4: Non-Shareable
```
Classification: NON_SHAREABLE
→ External AI BLOCKED
→ Private provider MAY be used if available
```

### Example 5: Unknown
```
Classification: UNKNOWN
→ External AI BLOCKED
```

### Example 6: Category C + Private Provider Available
```
Classification: CATEGORY_C_RESTRICTED_ACCESS
Private provider: Available
→ Private processing permitted
```

### Example 7: Category C + Private Provider Unavailable
```
Classification: CATEGORY_C_RESTRICTED_ACCESS
Private provider: Unavailable
→ BLOCKED
→ NEVER falls back to Gemini/Groq
```

## Why LLM is Not Used for Security Classification

The policy decision must happen BEFORE external AI processing. Using an LLM to classify its own permission would defeat the security architecture.

The gateway enforces policy deterministically based on:
- Structured classification metadata
- Centralized policy rules
- Explicit authorization flags

## Secondary Source Data Handling

For documents from secondary sources:
- Do NOT automatically label as MoSPI Category A/B/C
- Use classificationSource: SOURCE_AUTHORITY_POLICY or UNKNOWN
- If UNKNOWN: external AI = BLOCKED

## Provider Architecture

### External Providers
- **Gemini**: Google's Gemini API
- **Groq**: Groq's API

### Private Providers
- **Ollama**: Local/private LLM adapter (optional)

**Important:** "Private/local provider" does NOT automatically mean production-government security compliance. Organizations must evaluate their specific security requirements.

## Audit Logging

Safe audit metadata includes:
- requestId
- capability
- classification
- classificationSource
- provider
- processingMode
- allowed/blocked
- timestamp
- latency
- success/failure

**NOT logged:**
- API keys
- Complete sensitive documents
- Complete sensitive prompts
- Complete sensitive AI responses

## Authoritative Reference

For official MoSPI GSDD 2026 guidelines, refer to the authoritative MoSPI documentation.

This implementation uses the official MoSPI GSDD 2026 categories as the primary classification reference where applicable, with explicit scope limitations as stated in the official MoSPI FAQ.
