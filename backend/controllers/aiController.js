import Material from "../models/Material.js";
import extractTextFromUrl from "../utils/extractText.js";
import AINote from "../models/AINote.js";
import { generateWithAI } from "../services/aiGatewayService.js";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

export const summarizeMaterial = async (req, res) => {
  try {
    const material = await Material.findById(req.params.materialId);

    if (!material) {
      return res.status(404).json({
        message: "Material not found",
      });
    }

    if (
      (req.user.role === "student" || req.user.role === "learner") &&
      !material.students.includes(req.user._id)
    ) {
      return res.status(403).json({
        message: "Not authorized",
      });
    }

    // Extract material text
    const text = await extractTextFromUrl(material.filePath, material.fileName);

    const shortText = text.slice(0, 20000);

    // For now, material summarization uses Gemini
    const aiResult = await generateWithAI({
      provider: "gemini",
      purpose: "material-summary",

      content: `Summarize this study material in clean bullet points and highlight key concepts:

${shortText}`,

      classification:
        material.classification === "UNKNOWN" || !material.classification
          ? "CATEGORY_A_OPEN_ACCESS"
          : material.classification,

      externalAIAllowed: true,

      systemPrompt:
        "You are an educational AI assistant. Summarize the provided study material clearly using concise bullet points. Highlight important concepts, definitions, facts, and key takeaways.",

      maxTokens: 2048,
    });

    if (!aiResult.success) {
      return res.status(aiResult.allowed === false ? 403 : 502).json({
        message: aiResult.reason || "AI summary failed",
        classification: aiResult.classification,
      });
    }

    return res.json({
      summary: aiResult.data,
      provider: aiResult.provider,
    });
  } catch (error) {
    console.error("AI Controller Error:", error);

    return res.status(500).json({
      message: error.message || "AI summary failed",
    });
  }
};

export const generateAINotes = async (req, res) => {
  try {
    const { topic, description, classification, externalAIAllowed } = req.body;

    if (!topic) {
      return res.status(400).json({ message: "Topic is required" });
    }

    const prompt = `
CRITICAL: You MUST respond ONLY with valid JSON. No markdown, no explanations, no code blocks - ONLY pure JSON.

Generate comprehensive AI notes for the topic: "${topic}" ${description ? `with additional context: ${description}` : ""}

Your response must be valid JSON following this exact structure:
{
  "title": "Topic Title Here",
  "overview": "Brief overview paragraph",
  "sections": [
    {
      "heading": "Section Heading",
      "content": "Detailed content in plain text. Can use bullet points starting with - ",
      "visuals": [
        {
          "type": "table",
          "title": "Table Title",
          "description": "What this table shows",
          "data": [
            {"Column1": "Value1", "Column2": "Value2"},
            {"Column1": "Value3", "Column2": "Value4"}
          ]
        },
        {
          "type": "flowchart",
          "title": "Process Flow",
          "description": "Step by step process flow",
          "data": [
            {"step": 1, "label": "Start", "next": 2},
            {"step": 2, "label": "Process Data", "next": 3},
            {"step": 3, "label": "End", "next": null}
          ]
        },
        {
          "type": "mindmap",
          "title": "Concept Map",
          "description": "Central concept and branches",
          "data": {
            "central": "Main Concept",
            "branches": [
              {"title": "Branch 1", "description": "Details about branch 1"},
              {"title": "Branch 2", "description": "Details about branch 2"}
            ]
          }
        }
      ],
      "examples": ["Example 1 description", "Example 2 description"]
    }
  ],
  "summary": "Key takeaways in plain text"
}

VISUAL TYPE OPTIONS:
- "table": For comparing concepts, listing features, showing relationships in rows/columns
- "flowchart": For showing processes, workflows, decision trees, sequences
- "mindmap": For showing hierarchical concepts, central ideas with sub-topics
- "diagram": For architectural diagrams, system designs, structural relationships

RULES:
1. Response must be ONLY JSON - no markdown, no code blocks, no extra text
2. All strings must be properly escaped
3. Include 2-4 sections with different visual types
4. Use flowcharts for processes and workflows
5. Use mindmaps for conceptual hierarchies
6. Use tables for comparisons and data
7. Content should be detailed and educational
`;

    const aiResult = await generateWithAI({
      purpose: "ai-notes",
      content: prompt,
      classification: classification || "PUBLIC",
      externalAIAllowed: externalAIAllowed !== false,
    });

    if (!aiResult.success) {
      return res.status(aiResult.allowed === false ? 403 : 502).json({
        message: aiResult.reason || "AI notes generation failed",
        classification: aiResult.classification,
      });
    }

    const response = aiResult.data;

    console.log("Raw AI response:", response);
    console.log("Response length:", response.length);

    // Extract JSON from response (handle cases where AI adds markdown or extra text)
    let jsonString = response;

    // Remove markdown code blocks if present
    if (response.includes("```json")) {
      const match = response.match(/```json\s*([\s\S]*?)\s*```/);
      if (match) jsonString = match[1];
    } else if (response.includes("```")) {
      const match = response.match(/```\s*([\s\S]*?)\s*```/);
      if (match) jsonString = match[1];
    }

    // Try to find JSON object in the response
    const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonString = jsonMatch[0];
    }

    // Try to parse as JSON, if fails return as plain text
    let notesData;
    try {
      notesData = JSON.parse(jsonString);
      console.log("Successfully parsed JSON");

      // Validate structure
      if (!notesData.sections || !Array.isArray(notesData.sections)) {
        throw new Error("Invalid structure: sections missing");
      }
    } catch (parseError) {
      console.log("JSON parse failed, using fallback:", parseError.message);
      // Fallback: structure the plain text response
      notesData = {
        title: topic,
        overview: "AI-generated notes for " + topic,
        sections: [
          {
            heading: "Generated Content",
            content:
              "The AI generated the following content:\n\n" +
              response.substring(0, 2000),
            visuals: [],
            examples: [],
          },
        ],
        summary: "AI-generated summary based on the topic",
      };
    }

    // Save to database
    try {
      const aiNote = new AINote({
        student: req.user._id,
        title: notesData.title,
        topic: topic,
        description: description || "",
        overview: notesData.overview,
        sections: notesData.sections,
        summary: notesData.summary,
        tags: [topic.toLowerCase(), ...topic.split(" ")].filter(
          (tag) => tag.length > 2,
        ),
      });

      await aiNote.save();
      console.log("AI Note saved to database:", aiNote._id);

      res.json({
        notes: notesData,
        noteId: aiNote._id,
        saved: true,
      });
    } catch (dbError) {
      console.error("Database save error:", dbError);
      // Still return the notes even if save fails
      res.json({
        notes: notesData,
        saved: false,
        error: "Failed to save notes to database",
      });
    }
  } catch (error) {
    console.error("AI Notes Generation Error:", error);
    res.status(500).json({
      message: error.message || "AI notes generation failed",
    });
  }
};

export const downloadAINotePDF = async (req, res) => {
  try {
    const { noteId } = req.params;

    const note = await AINote.findById(noteId);
    if (!note) {
      return res.status(404).json({ message: "Note not found" });
    }

    if (note.student.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // Create PDF
    const pdf = new jsPDF();
    let yPosition = 20;

    // Title
    pdf.setFontSize(20);
    pdf.text(note.title, 20, yPosition);
    yPosition += 15;

    // Topic and Overview
    pdf.setFontSize(12);
    pdf.text(`Topic: ${note.topic}`, 20, yPosition);
    yPosition += 10;

    pdf.setFontSize(10);
    const overviewLines = pdf.splitTextToSize(note.overview, 170);
    pdf.text(overviewLines, 20, yPosition);
    yPosition += overviewLines.length * 5 + 10;

    // Sections
    note.sections.forEach((section, index) => {
      if (yPosition > 250) {
        pdf.addPage();
        yPosition = 20;
      }

      pdf.setFontSize(14);
      pdf.text(section.heading, 20, yPosition);
      yPosition += 10;

      pdf.setFontSize(10);
      const contentLines = pdf.splitTextToSize(section.content, 170);
      pdf.text(contentLines, 20, yPosition);
      yPosition += contentLines.length * 5 + 10;

      // Visuals
      if (section.visuals && section.visuals.length > 0) {
        section.visuals.forEach((visual) => {
          if (visual.type === "table" && Array.isArray(visual.data)) {
            pdf.setFontSize(11);
            pdf.text(visual.title, 20, yPosition);
            yPosition += 7;

            // Simple table rendering
            const keys = Object.keys(visual.data[0]);
            let tableY = yPosition;

            // Headers
            pdf.setFontSize(9);
            keys.forEach((key, i) => {
              pdf.text(key, 20 + i * 40, tableY);
            });
            tableY += 5;

            // Data rows
            visual.data.forEach((row, rowIndex) => {
              if (tableY > 270) {
                pdf.addPage();
                tableY = 20;
              }
              keys.forEach((key, i) => {
                pdf.text(String(row[key] || ""), 20 + i * 40, tableY);
              });
              tableY += 4;
            });

            yPosition = tableY + 10;
          }
        });
      }

      yPosition += 10;
    });

    // Summary
    if (yPosition > 240) {
      pdf.addPage();
      yPosition = 20;
    }

    pdf.setFontSize(14);
    pdf.text("Summary", 20, yPosition);
    yPosition += 10;

    pdf.setFontSize(10);
    const summaryLines = pdf.splitTextToSize(note.summary, 170);
    pdf.text(summaryLines, 20, yPosition);

    // Update download count
    note.downloadCount += 1;
    await note.save();

    // Send PDF
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${note.title.replace(/[^a-z0-9]/gi, "_")}.pdf"`,
    );
    res.send(Buffer.from(pdf.output("arraybuffer")));
  } catch (error) {
    console.error("PDF download error:", error);
    res.status(500).json({ message: "Failed to generate PDF" });
  }
};

export const getSavedNotes = async (req, res) => {
  try {
    const notes = await AINote.find({ student: req.user._id })
      .sort({ createdAt: -1 })
      .select("title topic overview createdAt tags downloadCount viewCount");

    res.json(notes);
  } catch (error) {
    console.error("Get saved notes error:", error);
    res.status(500).json({ message: "Failed to fetch saved notes" });
  }
};

export const getAINoteById = async (req, res) => {
  try {
    const { noteId } = req.params;

    const note = await AINote.findById(noteId);
    if (!note) {
      return res.status(404).json({ message: "Note not found" });
    }

    if (note.student.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // Update view count
    note.viewCount += 1;
    await note.save();

    res.json(note);
  } catch (error) {
    console.error("Get note by ID error:", error);
    res.status(500).json({ message: "Failed to fetch note" });
  }
};
