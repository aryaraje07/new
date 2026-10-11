/**
 * Bhashini Translation Service
 * 
 * Official Government of India Bhashini (ULCA / Dhruva) API integration.
 * Provides cached translation for learner-facing content.
 * 
 * Languages supported by the Bhashini translation catalog.
 * 
 * Security & Privacy:
 * - Credentials remain strictly backend-only.
 * - Sensitive learner IDs, database keys, and PII are never sent or logged.
 */

// In-memory translation cache: key -> translated string
const translationCache = new Map();
const MAX_CACHE_SIZE = 2000;

// Pipeline config cache: languagePair -> { serviceId, callbackUrl, inferenceHeaderName, inferenceHeaderValue, expiry }
const pipelineConfigCache = new Map();
const PIPELINE_CONFIG_TTL_MS = 60 * 60 * 1000; // 1 hour

// Verified supported languages
const VERIFIED_LANGUAGES = [
  { code: "en", name: "English", nativeName: "English" },
  { code: "as", name: "Assamese", nativeName: "অসমীয়া" },
  { code: "bn", name: "Bengali", nativeName: "বাংলা" },
  { code: "brx", name: "Bodo", nativeName: "बड़ो" },
  { code: "doi", name: "Dogri", nativeName: "डोगरी" },
  { code: "gu", name: "Gujarati", nativeName: "ગુજરાતી" },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी" },
  { code: "kn", name: "Kannada", nativeName: "ಕನ್ನಡ" },
  { code: "ks", name: "Kashmiri", nativeName: "कॉशुर" },
  { code: "kok", name: "Konkani", nativeName: "कोंकणी" },
  { code: "mai", name: "Maithili", nativeName: "मैथिली" },
  { code: "ml", name: "Malayalam", nativeName: "മലയാളം" },
  { code: "mni", name: "Manipuri", nativeName: "মৈতৈলোন্" },
  { code: "mr", name: "Marathi", nativeName: "मराठी" },
  { code: "ne", name: "Nepali", nativeName: "नेपाली" },
  { code: "or", name: "Odia", nativeName: "ଓଡ଼ିଆ" },
  { code: "pa", name: "Punjabi", nativeName: "ਪੰਜਾਬੀ" },
  { code: "sa", name: "Sanskrit", nativeName: "संस्कृतम्" },
  { code: "sat", name: "Santali", nativeName: "संताली" },
  { code: "sd", name: "Sindhi", nativeName: "सिन्धी" },
  { code: "ta", name: "Tamil", nativeName: "தமிழ்" },
  { code: "te", name: "Telugu", nativeName: "తెలుగు" },
  { code: "ur", name: "Urdu", nativeName: "اردو" },
];

const VERIFIED_LANGUAGE_CODES = new Set(VERIFIED_LANGUAGES.map((l) => l.code));

const BHASHINI_CONFIG_URL = "https://meity-auth.ulcacontrib.org/ulca/apis/v0/model/getModelsPipeline";
const DEFAULT_PIPELINE_ID = "64392f96daac500b55c543cd";
const REQUEST_TIMEOUT_MS = 20000;
const MAX_TEXT_LENGTH = 2000;

/**
 * Helper to get cache key
 */
function getCacheKey(sourceLang, targetLang, text) {
  return `${sourceLang}:${targetLang}:${text.trim()}`;
}

/**
 * Safe setter for translation cache with eviction
 */
function setCachedTranslation(key, value) {
  if (translationCache.size >= MAX_CACHE_SIZE) {
    const firstKey = translationCache.keys().next().value;
    if (firstKey) translationCache.delete(firstKey);
  }
  translationCache.set(key, value);
}

/**
 * Check if Bhashini credentials are configured
 */
export function isBhashiniConfigured() {
  const userId = process.env.BHASHINI_USER_ID;
  const udyatKey = process.env.BHASHINI_UDYAT_KEY;
  const inferenceKey = process.env.BHASHINI_INFERENCE_KEY;
  return Boolean(userId && udyatKey && inferenceKey);
}

/**
 * Get verified supported languages
 */
export function getSupportedLanguages() {
  return [...VERIFIED_LANGUAGES];
}

/**
 * Retrieve pipeline configuration for language pair with caching
 */
async function getPipelineConfig(sourceLang, targetLang) {
  const pairKey = `${sourceLang}:${targetLang}`;
  const cached = pipelineConfigCache.get(pairKey);
  if (cached && cached.expiry > Date.now()) {
    return cached;
  }

  const userId = process.env.BHASHINI_USER_ID;
  const udyatKey = process.env.BHASHINI_UDYAT_KEY;
  const inferenceKey = process.env.BHASHINI_INFERENCE_KEY;
  const pipelineId = process.env.BHASHINI_PIPELINE_ID || DEFAULT_PIPELINE_ID;

  if (!userId || !udyatKey || !inferenceKey) {
    throw new Error("Bhashini credentials are not fully configured in environment.");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(BHASHINI_CONFIG_URL, {
      method: "POST",
      headers: {
        "userID": userId,
        "ulcaApiKey": udyatKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        pipelineTasks: [
          {
            taskType: "translation",
            config: {
              language: {
                sourceLanguage: sourceLang,
                targetLanguage: targetLang,
              },
            },
          },
        ],
        pipelineRequestConfig: {
          pipelineId: pipelineId,
        },
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Bhashini config endpoint returned status ${response.status}`);
    }

    const data = await response.json();
    const taskConfig = data?.pipelineResponseConfig?.[0]?.config?.[0];
    const serviceId = taskConfig?.serviceId;
    const callbackUrl = data?.pipelineInferenceAPIEndPoint?.callbackUrl || "https://dhruva-api.bhashini.gov.in/services/inference/pipeline";
    const inferenceHeaderName = data?.pipelineInferenceAPIEndPoint?.inferenceApiKey?.name || "Authorization";
    const inferenceHeaderValue = data?.pipelineInferenceAPIEndPoint?.inferenceApiKey?.value || inferenceKey;

    if (!serviceId) {
      throw new Error(`No translation service found for pair ${sourceLang} -> ${targetLang}`);
    }

    const config = {
      serviceId,
      callbackUrl,
      inferenceHeaderName,
      inferenceHeaderValue,
      expiry: Date.now() + PIPELINE_CONFIG_TTL_MS,
    };

    pipelineConfigCache.set(pairKey, config);
    return config;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Translate a single text string using Bhashini
 * 
 * @param {string} text - Human-readable text to translate
 * @param {string} sourceLanguage - e.g. "en"
 * @param {string} targetLanguage - e.g. "hi" or "mr"
 * @returns {Promise<string>} Translated text (or original text on failure/no-op)
 */
export async function translateText(text, sourceLanguage = "en", targetLanguage = "hi") {
  if (typeof text !== "string") return "";
  const trimmed = text.trim();
  if (!trimmed) return "";

  const src = (sourceLanguage || "en").toLowerCase();
  const tgt = (targetLanguage || "en").toLowerCase();

  // English no-op or identical source and target
  if (src === tgt || (src === "en" && tgt === "en")) {
    return text;
  }

  // Check language support
  if (!VERIFIED_LANGUAGE_CODES.has(src) || !VERIFIED_LANGUAGE_CODES.has(tgt)) {
    throw new Error(`Bhashini does not support the language pair ${src} -> ${tgt}.`);
  }

  // Check in-memory translation cache
  const cacheKey = getCacheKey(src, tgt, trimmed);
  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey);
  }

  // Check credentials
  if (!isBhashiniConfigured()) {
    throw new Error("Bhashini credentials are not fully configured in environment.");
  }

  if (trimmed.length > MAX_TEXT_LENGTH) {
    throw new Error(`Text exceeds the Bhashini limit of ${MAX_TEXT_LENGTH} characters.`);
  }
  const safeText = trimmed;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const config = await getPipelineConfig(src, tgt);

    const payload = {
      pipelineTasks: [
        {
          taskType: "translation",
          config: {
            language: {
              sourceLanguage: src,
              targetLanguage: tgt,
            },
            serviceId: config.serviceId,
          },
        },
      ],
      inputData: {
        input: [{ source: safeText }],
      },
    };

    const response = await fetch(config.callbackUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        [config.inferenceHeaderName]: config.inferenceHeaderValue,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Bhashini inference returned status ${response.status}.`);
    }

    const data = await response.json();
    const translated = data?.pipelineResponse?.[0]?.output?.[0]?.target;

    if (typeof translated === "string" && translated.trim()) {
      const finalTranslated = translated.trim();
      setCachedTranslation(cacheKey, finalTranslated);
      return finalTranslated;
    }

    throw new Error("Bhashini returned no translated text.");
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("Bhashini translation timed out.");
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Translate an array of text strings in a single batch request
 * 
 * @param {string[]} texts - Array of text strings to translate
 * @param {string} sourceLanguage - e.g. "en"
 * @param {string} targetLanguage - e.g. "hi" or "mr"
 * @returns {Promise<string[]>} Array of translated strings
 */
export async function translateBatch(texts, sourceLanguage = "en", targetLanguage = "hi") {
  if (!Array.isArray(texts)) return [];
  if (texts.length === 0) return [];

  const src = (sourceLanguage || "en").toLowerCase();
  const tgt = (targetLanguage || "en").toLowerCase();

  // English no-op or identical source/target
  if (src === tgt || (src === "en" && tgt === "en")) {
    return [...texts];
  }

  // Check language support
  if (!VERIFIED_LANGUAGE_CODES.has(src) || !VERIFIED_LANGUAGE_CODES.has(tgt)) {
    throw new Error(`Bhashini does not support the language pair ${src} -> ${tgt}.`);
  }

  // Check credentials
  if (!isBhashiniConfigured()) {
    throw new Error("Bhashini credentials are not fully configured in environment.");
  }

  // Check which texts are already in cache
  const results = new Array(texts.length);
  const uncachedIndices = [];
  const uncachedInputs = [];

  for (let i = 0; i < texts.length; i++) {
    const original = typeof texts[i] === "string" ? texts[i] : String(texts[i] || "");
    const trimmed = original.trim();
    if (!trimmed) {
      results[i] = original;
      continue;
    }

    const cacheKey = getCacheKey(src, tgt, trimmed);
    if (translationCache.has(cacheKey)) {
      results[i] = translationCache.get(cacheKey);
    } else {
      if (trimmed.length > MAX_TEXT_LENGTH) {
        throw new Error(`Text exceeds the Bhashini limit of ${MAX_TEXT_LENGTH} characters.`);
      }
      const safeText = trimmed;
      uncachedIndices.push(i);
      uncachedInputs.push({ source: safeText });
    }
  }

  if (uncachedIndices.length === 0) {
    return results;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const config = await getPipelineConfig(src, tgt);

    const payload = {
      pipelineTasks: [
        {
          taskType: "translation",
          config: {
            language: {
              sourceLanguage: src,
              targetLanguage: tgt,
            },
            serviceId: config.serviceId,
          },
        },
      ],
      inputData: {
        input: uncachedInputs,
      },
    };

    const response = await fetch(config.callbackUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        [config.inferenceHeaderName]: config.inferenceHeaderValue,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Bhashini batch inference returned status ${response.status}.`);
    }

    const data = await response.json();
    const outputs = data?.pipelineResponse?.[0]?.output || [];

    for (let j = 0; j < uncachedIndices.length; j++) {
      const originalIdx = uncachedIndices[j];
      const originalText = texts[originalIdx];
      const translated = outputs[j]?.target;

      if (typeof translated === "string" && translated.trim()) {
        const finalVal = translated.trim();
        const cacheKey = getCacheKey(src, tgt, typeof originalText === "string" ? originalText.trim() : originalText);
        setCachedTranslation(cacheKey, finalVal);
        results[originalIdx] = finalVal;
      } else {
        throw new Error(`Bhashini returned no translation for batch item ${originalIdx}.`);
      }
    }

    return results;
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("Bhashini batch translation timed out.");
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Clear in-memory caches (useful for testing)
 */
export function clearCaches() {
  translationCache.clear();
  pipelineConfigCache.clear();
}

export default {
  translateText,
  translateBatch,
  getSupportedLanguages,
  isBhashiniConfigured,
  clearCaches,
};

