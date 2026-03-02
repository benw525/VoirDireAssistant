import OpenAI from "openai";
import { PDFParse } from "pdf-parse";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

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
}

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "text/plain",
  "text/csv",
  "text/tab-separated-values",
]);

const ALLOWED_EXTENSIONS = new Set([".pdf", ".txt", ".csv", ".tsv"]);

export function isAllowedFileType(mimetype: string, filename: string): boolean {
  if (ALLOWED_MIME_TYPES.has(mimetype)) return true;
  const ext = filename.toLowerCase().slice(filename.lastIndexOf("."));
  return ALLOWED_EXTENSIONS.has(ext);
}

export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  await parser.load();
  const result = await parser.getText();
  await parser.destroy();
  return typeof result === "string" ? result : result.text || "";
}

export async function parseStrikeListWithAI(rawText: string): Promise<ParsedJuror[]> {
  const systemPrompt = `You are a legal document parsing assistant specializing in jury strike lists. 
Your job is to extract structured juror data from court-provided strike list documents.

The documents may come in many formats — tables, lists, paragraphs, or mixed layouts.
Extract every juror you can find and return a JSON object with a "jurors" key containing an array.

For each juror, extract these fields:
- number: The juror's seat or panel number (integer). If not explicitly listed, assign sequential numbers starting from 1.
- name: Full name (string)
- address: Street address (string). Use "Unknown" if not provided.
- cityStateZip: City, state, and ZIP code (string). Use "Unknown" if not provided.
- sex: Sex/gender, abbreviated as M or F (string). Use "U" if not provided.
- race: Race/ethnicity, abbreviated (W=White, B=Black, H=Hispanic, A=Asian, O=Other) (string). Use "U" if not provided.
- birthDate: Date of birth in any recognizable format (string). If only an age is given, note it as "Age: X". Use "Unknown" if not provided.
- occupation: Current occupation (string). Use "Unknown" if not provided.
- employer: Current employer (string). Use "Unknown" if not provided.

Important rules:
- Extract ALL jurors found in the document, even if some fields are missing.
- Do not invent or fabricate data. If a field is not present in the source text, use "Unknown" or "U" as appropriate.
- Preserve the original text for names, addresses, and employers — do not paraphrase.
- If the document contains header rows, footnotes, or non-juror text, ignore those.
- Return ONLY a JSON object in this exact format: { "jurors": [ { ... }, { ... } ] }`;

  const response = await openai.chat.completions.create({
    model: "gpt-5.2",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Parse the following strike list document and extract all juror data:\n\n${rawText}` },
    ],
    response_format: { type: "json_object" },
    temperature: 0.1,
  });

  const content = response.choices[0]?.message?.content || "{}";
  let parsed: any;

  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("AI returned invalid JSON. Please try again.");
  }

  const jurorArray = parsed.jurors || parsed.data || (Array.isArray(parsed) ? parsed : []);

  if (!Array.isArray(jurorArray) || jurorArray.length === 0) {
    throw new Error("No jurors could be extracted from the document. Please check the content and try again.");
  }

  return jurorArray.map((j: any, index: number) => {
    const name = j.name ? String(j.name) : "Unknown";
    if (name === "Unknown") return null;

    return {
      number: typeof j.number === "number" ? j.number : index + 1,
      name,
      address: String(j.address || "Unknown"),
      cityStateZip: String(j.cityStateZip || j.city_state_zip || j.cityState || "Unknown"),
      sex: String(j.sex || j.gender || "U").charAt(0).toUpperCase(),
      race: String(j.race || j.ethnicity || "U").charAt(0).toUpperCase(),
      birthDate: String(j.birthDate || j.birth_date || j.dob || j.dateOfBirth || (j.age ? `Age: ${j.age}` : "Unknown")),
      occupation: String(j.occupation || j.job || "Unknown"),
      employer: String(j.employer || j.company || "Unknown"),
    };
  }).filter(Boolean) as ParsedJuror[];
}
