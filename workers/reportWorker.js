const { Worker } = require("bullmq");
const fs = require("fs");
const db = require("../src/config/db");
const dotenv = require("dotenv");
const Tesseract = require("tesseract.js");
const pdfParse = require("pdf-parse");
const OpenAI = require("openai");
dotenv.config();

const useMockAI = process.env.USE_MOCK_AI === "true";

const openai = !useMockAI
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

function redactPII(text) {
  return text
    .replace(/Name:\s*[A-Za-z ]+/i, "Name: [REDACTED]")
    .replace(/\b\d{10}\b/g, "[REDACTED]"); // phone number
}

async function analyzeWithAI(redactedText) {
  if (useMockAI) {
    await new Promise((res) => setTimeout(res, 5000));

    return {
      patient_name: "[REDACTED]",
      blood_sugar: { value: 95, unit: "mg/dL", status: "Normal" },
      cholesterol: { value: 210, unit: "mg/dL", status: "High" },
    };
  }

  const prompt = `
    Extract Blood Sugar and Cholesterol values from this text.
    Return valid JSON only:
    ---
    ${redactedText}
    ---
    `;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
  });

  return JSON.parse(response.choices[0].message.content);
}

const reportWorker = new Worker(
  "reportQueue",
  async (job) => {

    const { reportId, filePath, fileType } = job.data;

    let extractedText = "";

    // -----------------------
    // STEP 1: OCR EXTRACTION
    // -----------------------
    if (fileType?.startsWith("image/")) {
      const result = await Tesseract.recognize(filePath, "eng");
      extractedText = result.data.text;
    } else if (fileType === "application/pdf") {
      let buffer;
      try {
        buffer = fs.readFileSync(filePath);
      } catch (e) {
        console.error("PDF FILE READ ERROR:", e);
        throw e;
      }

      let data;
      try {
        data = await pdfParse(buffer);
      } catch (e) {
        console.error("PDF PARSE ERROR:", e);
        throw e;
      }

      extractedText = data.text;
    } else {
      console.warn("⚠ Unknown fileType — defaulting to PDF extraction");
      const buffer = fs.readFileSync(filePath);
      const data = await pdfParse(buffer);
      extractedText = data.text;
    }

    // -----------------------
    // STEP 2: PII REDACTION
    // -----------------------

    const redactedText = redactPII(extractedText);

    // -----------------------
    // STEP 3: AI PROCESSING
    // -----------------------
    let aiResult;
    try {
      aiResult = await analyzeWithAI(redactedText);
    } catch (err) {
      console.error("AI Error:", err);
      aiResult = { error: "AI failed" };
    }

    // -----------------------
    // STEP 4: DB UPDATE
    // -----------------------
    await db.query(
      `UPDATE reports SET
        extracted_text = $1,
        ai_summary = $2,
        status = 'completed'
      WHERE id = $3`,
      [redactedText, JSON.stringify(aiResult), reportId]
    );

    console.log("Job completed:", reportId);
  },
  {
    connection: {
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT,
      password: process.env.REDIS_PASSWORD,
    },
  }
);

module.exports = reportWorker;
