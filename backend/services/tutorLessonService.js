import axios from "axios";

export const generateTutorLesson = async (topic, minutes = 5) => {
  const apiKey =
    process.env.GEMINI_EXTENSION_TUTOR_API_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.GRIEVANCES_API_KEY;

  if (!apiKey) {
    throw new Error("Gemini API key missing");
  }

  //   const response = await axios.post(
  //     `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
  //     {
  //       contents: [
  //         {
  //           parts: [
  //             {
  //               text: `
  // You are an experienced classroom teacher.

  // Teach the topic "${topic}" for about ${minutes} minutes.

  // Return STRICT JSON ONLY in this format:

  // {
  //   "steps": [
  //     {
  //       "title": "INTRODUCTION",
  //       "content": [
  //         "Point one",
  //         "Point two"
  //       ]
  //     },
  //     {
  //       "title": "CORE CONCEPT",
  //       "content": [
  //         "Point one",
  //         "Point two"
  //       ]
  //     }
  //   ]
  // }

  // Rules:
  // - Use bullet-style points
  // - No paragraphs
  // - No markdown
  // - No explanations outside JSON
  // `
  //             }
  //           ]
  //         }
  //       ]
  //     },
  //     {
  //       headers: {
  //         "Content-Type": "application/json"
  //       }
  //     }
  //   );

  let response;

  try {
    response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        contents: [
          {
            parts: [
              {
                text: `
You are an experienced classroom teacher.

Teach the topic "${topic}" for about ${minutes} minutes.

Return STRICT JSON ONLY in this format:

{
  "steps": [
    {
      "title": "INTRODUCTION",
      "content": [
        "Point one",
        "Point two"
      ]
    },
    {
      "title": "CORE CONCEPT",
      "content": [
        "Point one",
        "Point two"
      ]
    }
  ]
}

Rules:
- Use bullet-style points
- No paragraphs
- No markdown
- No explanations outside JSON
`,
              },
            ],
          },
        ],
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  } catch (error) {
    console.error(
      "GEMINI TUTOR ERROR:",
      error.response?.status,
      error.response?.data || error.message,
    );

    throw error;
  }

  const rawText =
    response.data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

  // Clean Gemini formatting issues
  const cleaned = rawText
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();

  try {
    const parsed = JSON.parse(cleaned);
    return parsed.steps || [];
  } catch (err) {
    console.error("Gemini JSON parse failed:", cleaned);
    return [];
  }
};
