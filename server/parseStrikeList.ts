import { GoogleGenerativeAI } from "@google/generative-ai";
import { PDFParse } from "pdf-parse";
import sharp from "sharp";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

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
  const mapped = IMAGE_EXTENSIONS[ext];
  if (mapped) return mapped;
  return null;
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
  const converted = await sharp(buffer).png().toBuffer();
  return { data: converted, mime: "image/png" };
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
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const base64Data = data.toString("base64");

  const result = await model.generateContent({
    contents: [{
      role: "user",
      parts: [
        { text: SYSTEM_PROMPT + "\n\nParse the following strike list image and extract all juror data. Return ONLY valid JSON." },
        {
          inlineData: {
            mimeType: mime,
            data: base64Data,
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
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const result = await model.generateContent({
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
