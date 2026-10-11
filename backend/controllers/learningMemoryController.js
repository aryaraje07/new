import {
  getUserLearningMemory,
  getRecallConcepts,
  getRecallQuestion,
  getCompetencyLearningMemory,
} from "../services/learningMemoryService.js";

/**
 * Get user's complete learning memory
 */
export const getMyLearningMemory = async (req, res) => {
  try {
    const memories = await getUserLearningMemory(req.user);
    res.json({ memories });
  } catch (error) {
    console.error("Error fetching learning memory:", error);
    res.status(500).json({ message: "Failed to fetch learning memory" });
  }
};

/**
 * Get concepts that need recall
 */
export const getMyRecallConcepts = async (req, res) => {
  try {
    const concepts = await getRecallConcepts(req.user);
    res.json({ concepts });
  } catch (error) {
    console.error("Error fetching recall concepts:", error);
    res.status(500).json({ message: "Failed to fetch recall concepts" });
  }
};

/**
 * Get a recall question for a specific competency
 */
export const getRecallQuestionForCompetency = async (req, res) => {
  try {
    const { competencyId } = req.params;
    const { topic, lang } = req.query;
    const language = lang || req.headers["x-learner-language"] || "en";

    const question = await getRecallQuestion(
      req.user,
      competencyId,
      topic || "",
      language
    );

    if (!question) {
      return res.status(404).json({
        message: "No suitable recall question available",
      });
    }

    res.json({ question });
  } catch (error) {
    console.error("Error fetching recall question:", error);
    res.status(500).json({ message: "Failed to fetch recall question" });
  }
};

/**
 * Get detailed learning memory for a specific competency
 */
export const getCompetencyMemoryDetail = async (req, res) => {
  try {
    const { competencyId } = req.params;
    const { topic } = req.query;

    const memory = await getCompetencyLearningMemory(
      req.user,
      competencyId,
      topic || ""
    );

    if (!memory) {
      return res.status(404).json({
        message: "No learning memory found for this competency",
      });
    }

    res.json({ memory });
  } catch (error) {
    console.error("Error fetching competency memory detail:", error);
    res.status(500).json({ message: "Failed to fetch memory detail" });
  }
};

export default {
  getMyLearningMemory,
  getMyRecallConcepts,
  getRecallQuestionForCompetency,
  getCompetencyMemoryDetail,
};
