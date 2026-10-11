/**
 * MoSPI GSDD 2026-Aware AI Policy
 * 
 * This policy implements the Ministry of Statistics and Programme Implementation
 * Revised Guidelines for Statistical Data Dissemination (GSDD), 2026, where applicable.
 * 
 * IMPORTANT: The system does NOT assume that GSDD 2026 applies to every uploaded document
 * or secondary-source dataset. The official MoSPI FAQ states that the revised GSDD applies
 * to data collected, compiled and produced by NSO/MoSPI, with stated scope and qualifications
 * regarding secondary-source data.
 * 
 * Classification sources are tracked to distinguish between:
 * - MOSPI_GSDD_2026: Official MoSPI classification
 * - SOURCE_AUTHORITY_POLICY: Secondary source authority policy
 * - ORGANIZATION_POLICY: Internal organizational policy
 * - DOCUMENT_OWNER: Document owner's classification
 * - UNKNOWN: Unknown classification source
 */

// MoSPI GSDD 2026 Categories
export const MOSPI_CLASSIFICATIONS = [
  "CATEGORY_A_OPEN_ACCESS",
  "CATEGORY_B_REGISTERED_ACCESS",
  "CATEGORY_C_RESTRICTED_ACCESS",
  "NON_SHAREABLE",
];

// Legacy/Other Classification Schemes (for backward compatibility)
export const LEGACY_CLASSIFICATIONS = [
  "PUBLIC",
  "REGISTERED",
  "INTERNAL",
  "RESTRICTED",
  "UNCLASSIFIED",
];

export const ALL_CLASSIFICATIONS = [
  ...MOSPI_CLASSIFICATIONS,
  ...LEGACY_CLASSIFICATIONS,
  "UNKNOWN",
];

/**
 * AI Processing Policy
 * 
 * Default-deny: UNKNOWN classification blocks external AI
 * MoSPI Category C and NON_SHAREABLE block external AI
 * MoSPI Category B requires explicit externalAIAllowed authorization
 * MoSPI Category A may permit external AI based on organizational policy
 */
export const AI_POLICY = {
  // MoSPI GSDD 2026 Categories
  CATEGORY_A_OPEN_ACCESS: { 
    allowExternalAI: true, 
    requireTrustedSource: true,
    description: "Aggregated/analyzed information available without registration"
  },
  CATEGORY_B_REGISTERED_ACCESS: { 
    allowExternalAI: false, 
    requireExplicitAuthorization: true,
    description: "Anonymized unit-level data requiring registration"
  },
  CATEGORY_C_RESTRICTED_ACCESS: { 
    allowExternalAI: false, 
    requirePrivateProcessing: true,
    description: "Restricted datasets requiring authorization from MoSPI"
  },
  NON_SHAREABLE: { 
    allowExternalAI: false, 
    requirePrivateProcessing: true,
    blockAllExternal: true,
    description: "Data that cannot be shared (privacy, national security, etc.)"
  },
  
  // Legacy Classifications (for backward compatibility)
  PUBLIC: { 
    allowExternalAI: true, 
    description: "Legacy public classification"
  },
  REGISTERED: { 
    allowExternalAI: false, 
    requireExplicitAuthorization: true,
    description: "Legacy registered classification"
  },
  INTERNAL: { 
    allowExternalAI: false, 
    description: "Legacy internal classification"
  },
  RESTRICTED: { 
    allowExternalAI: false, 
    requirePrivateProcessing: true,
    description: "Legacy restricted classification"
  },
  UNCLASSIFIED: { 
    allowExternalAI: false, 
    description: "Legacy unclassified classification"
  },
  
  // Default-deny for unknown
  UNKNOWN: { 
    allowExternalAI: false, 
    blockAllExternal: true,
    description: "Unknown classification - default deny"
  },
};

/**
 * Normalize classification to standard format
 */
export const normalizeClassification = (value) => {
  if (!value && value !== 0) return "UNKNOWN";
  const normalized = String(value).trim().toUpperCase();
  
  // Direct match
  if (ALL_CLASSIFICATIONS.includes(normalized)) return normalized;
  
  // Aliases for MoSPI categories
  const mospiAliases = {
    "CATEGORY_A": "CATEGORY_A_OPEN_ACCESS",
    "OPEN_ACCESS": "CATEGORY_A_OPEN_ACCESS",
    "CATEGORY_B": "CATEGORY_B_REGISTERED_ACCESS",
    "REGISTERED_ACCESS": "CATEGORY_B_REGISTERED_ACCESS",
    "CATEGORY_C": "CATEGORY_C_RESTRICTED_ACCESS",
    "RESTRICTED_ACCESS": "CATEGORY_C_RESTRICTED_ACCESS",
    "NON_SHAREABLE_DATA": "NON_SHAREABLE",
  };
  
  if (mospiAliases[normalized]) return mospiAliases[normalized];
  
  // Legacy aliases
  const legacyAliases = {
    "OPEN": "PUBLIC",
    "NONE": "UNCLASSIFIED",
  };
  
  return legacyAliases[normalized] || "UNKNOWN";
};

/**
 * Evaluate AI processing permission based on classification and policy
 * 
 * This implements the default-deny rule: UNKNOWN classification blocks external AI.
 * Classification ≠ automatic AI permission - the gateway makes the final decision.
 */
export const evaluateAIClassification = ({ 
  classification, 
  classificationSource = "UNKNOWN",
  externalAIAllowed = false,
  privateProviderAvailable = false
} = {}) => {
  const normalized = normalizeClassification(classification);
  const policy = AI_POLICY[normalized];
  const externalAIExplicitlyAllowed = Boolean(externalAIAllowed);
  
  // Default-deny for UNKNOWN
  if (normalized === "UNKNOWN") {
    return {
      classification: normalized,
      classificationSource,
      allowed: false,
      processingMode: "blocked",
      reason: "EXTERNAL_AI_NOT_AUTHORIZED: External AI processing is not permitted because the applicable data classification or AI-processing authorization is unknown.",
      policy,
    };
  }
  
  // NON_SHAREABLE - always block external AI
  if (normalized === "NON_SHAREABLE") {
    const canUsePrivate = privateProviderAvailable && policy.requirePrivateProcessing;
    return {
      classification: normalized,
      classificationSource,
      allowed: canUsePrivate,
      processingMode: canUsePrivate ? "private" : "blocked",
      reason: canUsePrivate 
        ? "Non-shareable data may use approved private AI provider."
        : "PRIVATE_PROVIDER_UNAVAILABLE: Non-shareable data requires an available approved private AI provider.",
      policy,
    };
  }
  
  // CATEGORY_C_RESTRICTED_ACCESS - block external, may use private
  if (normalized === "CATEGORY_C_RESTRICTED_ACCESS") {
    const canUsePrivate = privateProviderAvailable && policy.requirePrivateProcessing;
    return {
      classification: normalized,
      classificationSource,
      allowed: canUsePrivate,
      processingMode: canUsePrivate ? "private" : "blocked",
      reason: canUsePrivate
        ? "Restricted data may use approved private AI provider."
        : "PRIVATE_PROVIDER_UNAVAILABLE: Category C (Restricted Access) data requires an available approved private AI provider.",
      policy,
    };
  }
  
  // CATEGORY_B_REGISTERED_ACCESS - requires explicit authorization
  if (normalized === "CATEGORY_B_REGISTERED_ACCESS") {
    if (externalAIExplicitlyAllowed && classificationSource === "MOSPI_GSDD_2026") {
      return {
        classification: normalized,
        classificationSource,
        allowed: true,
        processingMode: "external",
        reason: "Category B data with explicit external AI authorization from trusted MoSPI source.",
        policy,
      };
    }
    
    const canUsePrivate = privateProviderAvailable;
    return {
      classification: normalized,
      classificationSource,
      allowed: canUsePrivate,
      processingMode: canUsePrivate ? "private" : "blocked",
      reason: canUsePrivate
        ? "Category B data may use private AI provider."
        : "EXTERNAL_AI_NOT_AUTHORIZED: Category B (Registered Access) requires explicit external AI authorization or approved private processing.",
      policy,
    };
  }
  
  // CATEGORY_A_OPEN_ACCESS - may permit external AI with trusted source
  if (normalized === "CATEGORY_A_OPEN_ACCESS") {
    if (policy.allowExternalAI && classificationSource === "MOSPI_GSDD_2026") {
      return {
        classification: normalized,
        classificationSource,
        allowed: true,
        processingMode: "external",
        reason: "Category A (Open Access) data from trusted MoSPI source may use external AI.",
        policy,
      };
    }
    
    // If source is not trusted, require explicit authorization
    if (externalAIExplicitlyAllowed) {
      return {
        classification: normalized,
        classificationSource,
        allowed: true,
        processingMode: "external",
        reason: "Category A data with explicit external AI authorization.",
        policy,
      };
    }
    
    const canUsePrivate = privateProviderAvailable;
    return {
      classification: normalized,
      classificationSource,
      allowed: canUsePrivate,
      processingMode: canUsePrivate ? "private" : "blocked",
      reason: canUsePrivate
        ? "Category A data may use private AI provider."
        : "EXTERNAL_AI_NOT_AUTHORIZED: Category A data requires trusted source or explicit authorization for external AI.",
      policy,
    };
  }
  
  // Legacy classifications - conservative blocking
  if (normalized === "INTERNAL" || normalized === "RESTRICTED" || normalized === "UNCLASSIFIED") {
    const canUsePrivate = privateProviderAvailable;
    return {
      classification: normalized,
      classificationSource,
      allowed: canUsePrivate,
      processingMode: canUsePrivate ? "private" : "blocked",
      reason: canUsePrivate
        ? "Legacy classification may use private AI provider."
        : "EXTERNAL_AI_NOT_AUTHORIZED: Legacy classification requires approved private processing.",
      policy,
    };
  }
  
  // Legacy PUBLIC - may permit external AI
  if (normalized === "PUBLIC") {
    if (policy.allowExternalAI) {
      return {
        classification: normalized,
        classificationSource,
        allowed: true,
        processingMode: "external",
        reason: "Legacy PUBLIC classification may use external AI.",
        policy,
      };
    }
    
    const canUsePrivate = privateProviderAvailable;
    return {
      classification: normalized,
      classificationSource,
      allowed: canUsePrivate,
      processingMode: canUsePrivate ? "private" : "blocked",
      reason: canUsePrivate
        ? "Legacy PUBLIC data may use private AI provider."
        : "EXTERNAL_AI_NOT_AUTHORIZED: Legacy PUBLIC data requires approved processing.",
      policy,
    };
  }
  
  // Fallback - block
  return {
    classification: normalized,
    classificationSource,
    allowed: false,
    processingMode: "blocked",
    reason: "EXTERNAL_AI_NOT_AUTHORIZED: Classification not recognized or policy not defined.",
    policy,
  };
};
