import aiProvider from "../providers/index.js";

/**
 * AI Health Check Controller
 * Provides status of AI providers (Ollama, Gemini fallback)
 */
export const getAIHealth = async (req, res) => {
  try {
    const healthStatus = await aiProvider.getHealthStatus();
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      providers: healthStatus,
      recommendation: healthStatus.primary.available 
        ? "System is ready for AI-powered assessments" 
        : healthStatus.fallback.enabled 
          ? "Primary provider unavailable, fallback enabled" 
          : "No AI providers available - please configure Ollama",
    });
  } catch (error) {
    console.error("AI Health Check Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to check AI provider health",
      error: error.message,
    });
  }
};