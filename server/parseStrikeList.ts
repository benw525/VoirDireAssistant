import { GoogleGenerativeAI } from "@google/generative-ai";
import { PDFParse } from "pdf-parse";
import sharp from "sharp";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";
import Tesseract from "tesseract.js";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const GEMINI_MODEL = "gemini-3.1-pro-preview";
const MAX_BATCH_SIZE = 32 * 1024 * 1024; // 32MB raw = ~43MB base64 encoded (under 50MB Gemini limit)
const MAX_PAGE_SIZE = 20 * 1024 * 1024; // 20MB per page before compression kicks in
const GEMINI_MAX_RETRIES = 3;
const GEMINI_RETRY_DELAYS = [3000, 8000, 15000];

async function geminiGenerateWithRetry(model: any, request: any): Promise<any> {
  for (let attempt = 0; attempt <= GEMINI_MAX_RETRIES; attempt++) {
    try {
      return await model.generateContent(request);
    } catch (err: any) {
      const status = err?.status || err?.httpStatusCode || (err?.message?.includes('503') ? 503 : err?.message?.includes('429') ? 429 : 0);
      const isRetryable = status === 503 || status === 429 || err?.message?.includes('high demand') || err?.message?.includes('overloaded') || err?.message?.includes('Service Unavailable');
      if (isRetryable && attempt < GEMINI_MAX_RETRIES) {
        const delay = GEMINI_RETRY_DELAYS[attempt] || 15000;
        console.log(`Gemini ${status || 'transient'} error, retrying in ${delay / 1000}s (attempt ${attempt + 1}/${GEMINI_MAX_RETRIES})...`);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      throw err;
    }
  }
}

export interface ParsedJuror {
  number: number;
  name: string;
  address: string;
  cityStateZip: string;
  sex: string;
  race: string;
  birthDate: string;
  occupation: string;
  employer: string;
  needsReview: boolean;
}

const GEMINI_NATIVE_MIMES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);

const CONVERTIBLE_MIMES = new Set([
  "image/bmp",
  "image/tiff",
  "image/heic",
  "image/heif",
  "image/avif",
  "image/svg+xml",
]);

const ALL_IMAGE_MIMES = new Set([...GEMINI_NATIVE_MIMES, ...CONVERTIBLE_MIMES]);

const DOCUMENT_MIME_TYPES = new Set([
  "application/pdf",
  "text/plain",
  "text/csv",
  "text/tab-separated-values",
]);

const IMAGE_EXTENSIONS: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".bmp": "image/bmp",
  ".tiff": "image/tiff",
  ".tif": "image/tiff",
  ".heic": "image/heic",
  ".heif": "image/heif",
  ".avif": "image/avif",
  ".svg": "image/svg+xml",
};

const DOCUMENT_EXTENSIONS = new Set([".pdf", ".txt", ".csv", ".tsv"]);

function getExtension(filename: string): string {
  return filename.toLowerCase().slice(filename.lastIndexOf("."));
}

function resolveImageMime(mimetype: string, filename: string): string | null {
  if (ALL_IMAGE_MIMES.has(mimetype)) return mimetype;
  const ext = getExtension(filename);
  return IMAGE_EXTENSIONS[ext] || null;
}

export function isAllowedFileType(mimetype: string, filename: string): boolean {
  if (ALL_IMAGE_MIMES.has(mimetype) || DOCUMENT_MIME_TYPES.has(mimetype)) return true;
  const ext = getExtension(filename);
  return !!(IMAGE_EXTENSIONS[ext] || DOCUMENT_EXTENSIONS.has(ext));
}

export function isImageFile(mimetype: string, filename: string): boolean {
  if (ALL_IMAGE_MIMES.has(mimetype)) return true;
  const ext = getExtension(filename);
  return !!IMAGE_EXTENSIONS[ext];
}

export function isPdfFile(mimetype: string, filename: string): boolean {
  return mimetype === "application/pdf" || filename.toLowerCase().endsWith(".pdf");
}

export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  await parser.load();
  const result = await parser.getText();
  await parser.destroy();
  return typeof result === "string" ? result : result.text || "";
}

async function convertToSupportedFormat(buffer: Buffer, mime: string): Promise<{ data: Buffer; mime: string }> {
  if (GEMINI_NATIVE_MIMES.has(mime)) {
    return { data: buffer, mime };
  }
  const converted = await sharp(buffer).jpeg({ quality: 85 }).toBuffer();
  return { data: converted, mime: "image/jpeg" };
}

function getDpiForPdfSize(sizeBytes: number): number {
  if (sizeBytes > 100 * 1024 * 1024) return 150;
  if (sizeBytes > 50 * 1024 * 1024) return 200;
  return 300;
}

async function compressPageImage(imageBuffer: Buffer): Promise<Buffer | null> {
  let buf = imageBuffer;

  if (buf.length <= MAX_PAGE_SIZE) return buf;

  const qualities = [70, 50, 30];
  for (const q of qualities) {
    buf = await sharp(imageBuffer).jpeg({ quality: q }).toBuffer();
    if (buf.length <= MAX_PAGE_SIZE) return buf;
  }

  const resolutions = [0.75, 0.5, 0.25];
  for (const scale of resolutions) {
    const metadata = await sharp(imageBuffer).metadata();
    const w = Math.round((metadata.width || 1000) * scale);
    const h = Math.round((metadata.height || 1000) * scale);
    buf = await sharp(imageBuffer).resize(w, h).jpeg({ quality: 40 }).toBuffer();
    if (buf.length <= MAX_PAGE_SIZE) return buf;
  }

  console.warn("Page image too large even after max compression, skipping");
  return null;
}

function renderPdfToImages(pdfBuffer: Buffer, dpi: number): Buffer[] {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "pdf-render-"));
  const pdfPath = path.join(tmpDir, "input.pdf");
  const outputPrefix = path.join(tmpDir, "page");

  try {
    fs.writeFileSync(pdfPath, pdfBuffer);
    execSync(`pdftoppm -jpeg -r ${dpi} "${pdfPath}" "${outputPrefix}"`, {
      timeout: 120000,
      maxBuffer: 500 * 1024 * 1024,
    });

    const files = fs.readdirSync(tmpDir)
      .filter(f => f.startsWith("page-") && f.endsWith(".jpg"))
      .sort();

    return files.map(f => fs.readFileSync(path.join(tmpDir, f)));
  } finally {
    try {
      const remaining = fs.readdirSync(tmpDir);
      for (const f of remaining) fs.unlinkSync(path.join(tmpDir, f));
      fs.rmdirSync(tmpDir);
    } catch {}
  }
}

function batchPagesBySize(pages: Buffer[]): Buffer[][] {
  const batches: Buffer[][] = [];
  let currentBatch: Buffer[] = [];
  let currentSize = 0;

  for (const page of pages) {
    if (currentSize + page.length > MAX_BATCH_SIZE && currentBatch.length > 0) {
      batches.push(currentBatch);
      currentBatch = [];
      currentSize = 0;
    }
    currentBatch.push(page);
    currentSize += page.length;
  }

  if (currentBatch.length > 0) {
    batches.push(currentBatch);
  }

  return batches;
}

async function parseImageBatchWithGemini(pageImages: Buffer[]): Promise<ParsedJuror[]> {
  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

  const parts: any[] = [
    { text: SYSTEM_PROMPT + "\n\nParse the following strike list page image(s) and extract all juror data. Return ONLY valid JSON." },
  ];

  for (const img of pageImages) {
    parts.push({
      inlineData: {
        mimeType: "image/jpeg",
        data: img.toString("base64"),
      },
    });
  }

  const result = await geminiGenerateWithRetry(model, {
    contents: [{ role: "user", parts }],
    generationConfig: {
      temperature: 0.1,
      responseMimeType: "application/json",
    },
  });

  const content = result.response.text();
  return parseJurorJson(content);
}

async function tesseractOcrFromImages(pages: Buffer[]): Promise<ParsedJuror[]> {
  console.log(`Running Tesseract OCR on ${pages.length} page image(s)...`);
  let allText = "";
  for (let i = 0; i < pages.length; i++) {
    try {
      const { data } = await Tesseract.recognize(pages[i], "eng");
      allText += data.text + "\n\n";
    } catch (err) {
      console.warn(`Tesseract failed on page ${i + 1}:`, err);
    }
  }

  if (!allText.trim()) {
    throw new Error("Tesseract could not extract any text from the pages.");
  }

  return parseStrikeListWithAI(allText);
}

async function pdfTextFallback(pdfBuffer: Buffer): Promise<ParsedJuror[]> {
  console.log("Falling back to PDF text extraction...");
  const rawText = await extractTextFromPdf(pdfBuffer);
  if (!rawText.trim()) {
    throw new Error("Could not extract any text from the PDF.");
  }
  return parseStrikeListWithAI(rawText);
}

export async function parseStrikeListFromPdf(pdfBuffer: Buffer): Promise<ParsedJuror[]> {
  const dpi = getDpiForPdfSize(pdfBuffer.length);
  console.log(`PDF size: ${(pdfBuffer.length / 1024 / 1024).toFixed(1)}MB, rendering at ${dpi} DPI`);

  let pages: Buffer[];
  try {
    pages = renderPdfToImages(pdfBuffer, dpi);
  } catch (err) {
    console.error("PDF rendering failed, falling back to text extraction:", err);
    return pdfTextFallback(pdfBuffer);
  }

  if (pages.length === 0) {
    console.log("No pages rendered, falling back to text extraction");
    return pdfTextFallback(pdfBuffer);
  }

  console.log(`Rendered ${pages.length} pages from PDF`);

  const compressedPages: Buffer[] = [];
  for (let i = 0; i < pages.length; i++) {
    const compressed = await compressPageImage(pages[i]);
    if (compressed) {
      compressedPages.push(compressed);
    } else {
      console.warn(`Skipping page ${i + 1} — could not compress to under ${MAX_PAGE_SIZE / 1024 / 1024}MB`);
    }
  }

  if (compressedPages.length === 0) {
    console.log("All pages too large after compression, trying tesseract OCR on rendered images");
    return tesseractOcrFromImages(pages);
  }

  const batches = batchPagesBySize(compressedPages);
  console.log(`Processing ${compressedPages.length} pages in ${batches.length} batch(es)`);

  let allJurors: ParsedJuror[] = [];

  for (let i = 0; i < batches.length; i++) {
    const batchSize = batches[i].reduce((sum, p) => sum + p.length, 0);
    console.log(`Batch ${i + 1}/${batches.length}: ${batches[i].length} pages, ${(batchSize / 1024 / 1024).toFixed(1)}MB`);

    try {
      const jurors = await parseImageBatchWithGemini(batches[i]);
      allJurors.push(...jurors);
    } catch (err: any) {
      console.error(`Gemini failed on batch ${i + 1}:`, err.message);
      if (batches.length === 1) {
        console.log("Single batch Gemini failure, trying tesseract OCR on rendered images");
        return tesseractOcrFromImages(pages);
      }
    }
  }

  if (allJurors.length === 0) {
    console.log("Gemini extracted no jurors, trying tesseract OCR on rendered images");
    return tesseractOcrFromImages(pages);
  }

  return allJurors;
}

const SYSTEM_PROMPT = `You are a legal document parsing assistant specializing in jury strike lists from court systems.
Your job is to extract structured juror data from court-provided strike list documents.

The documents may come in many formats — tables, lists, paragraphs, or mixed layouts.
These documents are often generated from older court computer systems and may contain OCR artifacts, garbled characters, or corrupted text from poor PDF encoding.

Extract every juror you can find and return a JSON object with a "jurors" key containing an array.

For each juror, extract these fields:
- number: The juror's seat or panel number (integer). If not explicitly listed, assign sequential numbers starting from 1.
- name: Full name (string). Format as "LASTNAME FIRSTNAME MIDDLE" as shown in court documents.
- address: Street address (string). Use "Illegible" if corrupted/unreadable.
- cityStateZip: City, state, and ZIP code (string). Use "Illegible" if corrupted/unreadable.
- sex: Sex/gender, abbreviated as M or F (string). Use "U" if not provided or unreadable.
- race: Race/ethnicity, abbreviated (W=White, B=Black, H=Hispanic, A=Asian, O=Other) (string). Use "U" if not provided or unreadable.
- birthDate: Date of birth in MM/DD/YYYY format (string). Use "Illegible" if corrupted/unreadable.
- occupation: Current occupation (string). Use "Illegible" if corrupted/unreadable.
- employer: Current employer (string). Use "Illegible" if corrupted/unreadable.
- needsReview: Boolean. Set to true if ANY field for this juror was garbled, corrupted, or uncertain. Set to false if all fields were clearly readable.

CRITICAL rules for handling corrupted/garbled text:
- Court PDFs often have characters like ~, §, ¥, !, or random symbols replacing real text. These are OCR/encoding errors.
- When you see garbled text (e.g. "!~o/~l" or "AiI~ ~iu§fi~c§~~~o"), mark those specific fields as "Illegible" and set needsReview to true.
- DO NOT output the garbled characters as the field value. Use "Illegible" instead.
- Still extract whatever IS readable from that juror's entry. For example, if the name is garbled but the address, sex, race, and birthdate are clear, include those clear values.
- Use surrounding context to help: if you can see a partial name fragment within garbled text (e.g. "SHAWN" within "i¥~k~~:sHAWN"), include it as the best available value (e.g. "SHAWN (partial)").
- Every juror entry in the document must be included, even if most fields are illegible.

Other rules:
- Extract ALL jurors found in the document, even if some fields are missing or illegible.
- Do not invent or fabricate data. If a field is not present in the source text, use "Unknown". If present but unreadable, use "Illegible".
- Preserve the original text for names, addresses, and employers when readable — do not paraphrase.
- If the document contains header rows, page headers, footnotes, or non-juror text, ignore those.
- Return ONLY a JSON object in this exact format: { "jurors": [ { ... }, { ... } ] }`;

export async function parseStrikeListFromImage(buffer: Buffer, mimetype: string, filename: string): Promise<ParsedJuror[]> {
  const resolvedMime = resolveImageMime(mimetype, filename);
  if (!resolvedMime) {
    throw new Error(`Unsupported image format: ${filename}`);
  }

  const { data, mime } = await convertToSupportedFormat(buffer, resolvedMime);

  const compressed = await compressPageImage(data);
  if (!compressed) {
    throw new Error(`Image ${filename} is too large to process even after compression.`);
  }

  const finalMime = compressed !== data ? "image/jpeg" : mime;
  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

  const result = await geminiGenerateWithRetry(model, {
    contents: [{
      role: "user",
      parts: [
        { text: SYSTEM_PROMPT + "\n\nParse the following strike list image and extract all juror data. Return ONLY valid JSON." },
        {
          inlineData: {
            mimeType: finalMime,
            data: compressed.toString("base64"),
          },
        },
      ],
    }],
    generationConfig: {
      temperature: 0.1,
      responseMimeType: "application/json",
    },
  });

  const content = result.response.text();
  return parseJurorJson(content);
}

export async function parseStrikeListWithAI(rawText: string): Promise<ParsedJuror[]> {
  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

  const result = await geminiGenerateWithRetry(model, {
    contents: [{
      role: "user",
      parts: [
        { text: SYSTEM_PROMPT + `\n\nParse the following strike list document and extract all juror data:\n\n${rawText}` },
      ],
    }],
    generationConfig: {
      temperature: 0.1,
      responseMimeType: "application/json",
    },
  });

  const content = result.response.text();
  return parseJurorJson(content);
}

function parseJurorJson(content: string): ParsedJuror[] {
  let parsed: any;

  try {
    parsed = JSON.parse(content);
  } catch {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        parsed = JSON.parse(jsonMatch[0]);
      } catch {
        throw new Error("AI returned invalid JSON. Please try again.");
      }
    } else {
      throw new Error("AI returned invalid JSON. Please try again.");
    }
  }

  const jurorArray = parsed.jurors || parsed.data || (Array.isArray(parsed) ? parsed : []);

  if (!Array.isArray(jurorArray) || jurorArray.length === 0) {
    throw new Error("No jurors could be extracted from the document. Please check the content and try again.");
  }

  return jurorArray.map((j: any, index: number) => {
    const name = j.name ? String(j.name) : "Unknown";
    const address = String(j.address || "Unknown");
    const cityStateZip = String(j.cityStateZip || j.city_state_zip || j.cityState || "Unknown");
    const sex = String(j.sex || j.gender || "U").charAt(0).toUpperCase();
    const race = String(j.race || j.ethnicity || "U").charAt(0).toUpperCase();
    const birthDate = String(j.birthDate || j.birth_date || j.dob || j.dateOfBirth || (j.age ? `Age: ${j.age}` : "Unknown"));
    const occupation = String(j.occupation || j.job || "Unknown");
    const employer = String(j.employer || j.company || "Unknown");

    const hasIllegible = [name, address, cityStateZip, sex, race, birthDate, occupation, employer].some(
      v => v === "Illegible" || v.includes("(partial)")
    );

    return {
      number: typeof j.number === "number" ? j.number : index + 1,
      name,
      address,
      cityStateZip,
      sex,
      race,
      birthDate,
      occupation,
      employer,
      needsReview: Boolean(j.needsReview) || hasIllegible,
    };
  }) as ParsedJuror[];
}
