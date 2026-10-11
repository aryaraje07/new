import {
  translateText,
  translateBatch,
  getSupportedLanguages,
  isBhashiniConfigured,
} from "../services/bhashiniService.js";

/**
 * Handle translation requests
 * POST /api/translate
 * Backend proxy for the Bhashini translation API.
 */
export const translateHandler = async (req, res) => {
  try {
    const { text, texts, sourceLanguage = "en", targetLanguage = "hi" } = req.body;

    // Handle single string translation
    if (typeof text === "string") {
      if (!text.trim()) {
        return res.json({
          success: true,
          translatedText: "",
          sourceLanguage,
          targetLanguage,
        });
      }

      const translated = await translateText(text, sourceLanguage, targetLanguage);
      return res.json({
        success: true,
        translatedText: translated,
        sourceLanguage,
        targetLanguage,
      });
    }

    // Handle batch translation
    if (Array.isArray(texts)) {
      // Limit batch size to 50 items to prevent abuse
      const safeBatch = texts.slice(0, 50).map((t) => (typeof t === "string" ? t : String(t || "")));

      const translatedList = await translateBatch(safeBatch, sourceLanguage, targetLanguage);
      return res.json({
        success: true,
        translatedTexts: translatedList,
        sourceLanguage,
        targetLanguage,
      });
    }

    return res.status(400).json({
      success: false,
      message: "Please provide either 'text' (string) or 'texts' (array of strings) in the request body.",
    });
  } catch (error) {
    console.error("[TranslateController] Unexpected error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Translation service encountered an error.",
    });
  }
};

/**
 * Get verified supported languages
 * GET /api/translate/supported-languages
 */
export const getSupportedLanguagesHandler = async (req, res) => {
  try {
    const languages = getSupportedLanguages();
    const configured = isBhashiniConfigured();

    return res.json({
      success: true,
      configured,
      languages,
    });
  } catch (error) {
    console.error("[TranslateController] Error fetching supported languages:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve supported languages.",
    });
  }
};

export default {
  translateHandler,
  getSupportedLanguagesHandler,
};

