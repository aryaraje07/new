import model, { getGrievanceModel } from "./gemini.js";

/**
 * Agentic AI Service for Grievance Processing
 * Handles grievance validation, follow-up question generation, and message synthesis
 * All steps done in a single AI call with structured reasoning
 */

export const processGrievanceWithAI = async (
  studentGrievance,
  studentName,
  studentEmail
) => {
  try {
    const systemPrompt = `You are an intelligent academic grievance mediator. Your role is to:
1. Analyze if grievance is valid and legitimate
2. If valid, generate THREE relevant follow-up questions
3. Based on student answers, synthesize a professional grievance message
4. If invalid, return specific error message

INVALID GRIEVANCES INCLUDE:
- Spam, abusive language, threats
- Non-academic personal issues
- Incomplete or gibberish text
- Duplicate submissions
- Requests for grades changes without valid reason

Always respond in valid JSON format.`;

    const userPrompt = `
GRIEVANCE PROCESSING TASK:

Student Name: ${studentName}
Student Email: ${studentEmail}
Initial Grievance: "${studentGrievance}"

Please perform the following steps:

STEP 1: VALIDATION
- Analyze if this grievance is valid, meaningful, and related to academic matters
- Check if it's not spam, abusive, or irrelevant
- Provide a boolean isValid and reason

STEP 2: FOLLOW-UP QUESTIONS (if valid)
- Generate exactly THREE focused follow-up questions
- Question 1: Should be about topic/subject of concern
- Question 2: Should be about expectations vs actual results
- Question 3: Should be about specific points of disagreement or error

STEP 3: ERROR MESSAGE (if invalid)
- If grievance is invalid, provide clear error message
- Do not generate follow-up questions for invalid grievances

Respond ONLY in this JSON format:
{
  "isValid": boolean,
  "validationReason": "string explaining why it is/isn't valid",
  "followUpQuestions": [
    "Question 1?",
    "Question 2?", 
    "Question 3?"
  ],
  "errorMessage": "string explaining error (if invalid)",
  "status": "ready_for_followup" or "invalid"
}

If grievance is invalid, status should be "invalid" and include errorMessage.
If valid, status should be "ready_for_followup" and include three questions.
`;

    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `${systemPrompt}\n\n${userPrompt}`,
            },
          ],
        },
      ],
    });

    const responseText = result.response.text();

    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No valid JSON found in AI response");
    }
    const analysis = JSON.parse(jsonMatch[0]);

    return {
      success: true,
      analysis,
    };
  } catch (error) {
    console.error("AI Grievance Processing Error:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Synthesize final grievance message based on student answers
 * Called after student responses to follow-up questions are collected
 */
export const synthesizeGrievanceMessage = async (
  initialGrievance,
  followUpQuestions,
  studentAnswers,
  studentName
) => {
  try {
    const systemPrompt = `You are an expert academic grievance formatter. Your task is to synthesize student responses into a professional, respectful, and actionable grievance message that will be sent to faculty.`;

    const questionsAndAnswers = followUpQuestions
      .map(
        (q, i) =>
          `Q${i + 1}: ${q}\nA${i + 1}: ${studentAnswers[i] || "Not provided"}`
      )
      .join("\n\n");

    const userPrompt = `
GRIEVANCE SYNTHESIS TASK:

Initial Grievance: "${initialGrievance}"

Follow-up Answers:
${questionsAndAnswers}

Student Name: ${studentName}

Please create a professional, concise grievance message that:
1. Summarizes the core issue clearly
2. References relevant context from student's answers
3. Is respectful in tone and academically appropriate
4. Ends with a clear request for resolution or explanation
5. Is suitable to send directly to faculty

Respond in this JSON format:
{
  "synthesizedMessage": "The professional message text here",
  "keyPoints": ["point1", "point2", "point3"],
  "suggestedResolutionPath": "What resolution might look like"
}
`;

    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `${systemPrompt}\n\n${userPrompt}`,
            },
          ],
        },
      ],
    });

    const responseText = result.response.text();

    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No valid JSON found in AI response");
    }
    const synthesis = JSON.parse(jsonMatch[0]);

    return {
      success: true,
      synthesis,
    };
  } catch (error) {
    console.error("AI Synthesis Error:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Analyze faculty response to generate follow-up suggestions
 * Helps faculty understand student's grievance better
 */
export const analyzeFacultyContext = async (
  synthesizedMessage,
  facultyName
) => {
  try {
    const userPrompt = `
FACULTY CONTEXT ANALYSIS:

Faculty: ${facultyName}

Student's Grievance Message:
"${synthesizedMessage}"

Provide quick context for the faculty to understand:
1. What is the student's main concern?
2. What information does faculty need to gather?
3. What should faculty ask the student to clarify?

Respond in JSON:
{
  "mainConcern": "summary of main issue",
  "infoNeeded": ["data1", "data2"],
  "clarificationQuestions": ["question1", "question2"]
}
`;

    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [
            {
              text: userPrompt,
            },
          ],
        },
      ],
    });

    const responseText = result.response.text();
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No valid JSON found in AI response");
    }
    const context = JSON.parse(jsonMatch[0]);

    return {
      success: true,
      context,
    };
  } catch (error) {
    console.error("Faculty Context Analysis Error:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};

export default {
  processGrievanceWithAI,
  synthesizeGrievanceMessage,
  analyzeFacultyContext,
};
