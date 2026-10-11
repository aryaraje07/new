import axios from "axios";
import mammoth from "mammoth";
import pdfParse from "pdf-parse/lib/pdf-parse.js";

/* ======================================================
   USED BY MATERIALS / SUMMARY (URL BASED)
====================================================== */
const extractTextFromUrl = async (fileUrl, fileName) => {
  try {
    // Convert relative upload path into a complete backend URL
    const fullUrl = fileUrl.startsWith("http")
      ? fileUrl
      : `http://localhost:${process.env.PORT || 5000}${fileUrl}`;

    console.log("📄 Extracting text from:", fullUrl);

    const response = await axios.get(fullUrl, {
      responseType: "arraybuffer",
    });

    const lowerName = fileName.toLowerCase();

    // PDF
    if (lowerName.endsWith(".pdf")) {
      const data = await pdfParse(response.data);

      console.log(
        "📄 PDF extraction successful, text length:",
        data.text?.length || 0,
      );

      return data.text;
    }

    // DOCX
    if (lowerName.endsWith(".docx")) {
      const result = await mammoth.extractRawText({
        buffer: response.data,
      });

      console.log(
        "📄 DOCX extraction successful, text length:",
        result.value?.length || 0,
      );

      return result.value;
    }

    // PPTX
    if (lowerName.endsWith(".pptx")) {
      return "PPTX summarization not yet implemented.";
    }

    throw new Error("Unsupported file type");
  } catch (error) {
    console.error("❌ URL text extraction error:", error.message);
    console.error("❌ File URL:", fileUrl);
    throw error;
  }
};

/* ======================================================
   USED ONLY FOR CREATE EXAM (LOCAL UPLOAD)
====================================================== */
export const extractTextFromUploadedFile = async (file) => {
  try {
    console.log("📄 Processing file:", {
      mimetype: file?.mimetype,
      size: file?.size,
      originalname: file?.originalname,
    });

    if (!file) {
      throw new Error("No uploaded file received");
    }

    const { mimetype, buffer } = file;

    if (mimetype === "application/pdf") {
      console.log("📄 Processing PDF file...");
      const data = await pdfParse(buffer);
      console.log(
        "📄 PDF extraction successful, text length:",
        data.text?.length || 0,
      );
      return data.text;
    }

    if (
      mimetype ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      console.log("📄 Processing DOCX file...");
      const result = await mammoth.extractRawText({ buffer });
      console.log(
        "📄 DOCX extraction successful, text length:",
        result.value?.length || 0,
      );
      return result.value;
    }

    if (mimetype === "text/plain") {
      console.log("📄 Processing TXT file...");
      const text = buffer.toString("utf-8");
      console.log(
        "📄 TXT extraction successful, text length:",
        text?.length || 0,
      );
      return text;
    }

    throw new Error(`Unsupported file type: ${mimetype}`);
  } catch (error) {
    console.error("❌ Text extraction error:", error.message);
    console.error("❌ Error stack:", error.stack);
    throw new Error(`Failed to extract text: ${error.message}`);
  }
};

export default extractTextFromUrl;
