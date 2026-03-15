# Replit Agent Prompt — FluxPrompt API Integration

---

## Environment Variable (set this in Replit Secrets BEFORE running)

```
FLUXPROMPT_API_KEY = f4932a42-ca17-4d2e-8193-790e68eea9f3
```

---

## Task

Implement a server-side API route that calls the FluxPrompt API. The call must be made from the **Express/Node backend** (never the browser) to keep the API key secret.

---

## FluxPrompt API — Exact Specification

### Endpoint

```
POST https://api.fluxprompt.ai/flux/api-v2?flowId=afef519e-acfd-4242-af29-89b6083c7353
```

### Authentication

The API key is passed as a **request header** — NOT as a Bearer token, NOT as a query parameter.

```
Header name:  api-key
Header value: <value of FLUXPROMPT_API_KEY env var>
```

Read it at runtime with `process.env.FLUXPROMPT_API_KEY`. **Never hardcode the key in source code.**

### Request Body

Every request is a `POST` with `Content-Type: application/json`. The body is always this shape:

```json
{
  "variableInputs": [
    {
      "inputId": "varInputNode_1773346441251_0.9263",
      "inputText": ""
    },
    {
      "inputId": "varInputNode_1773346442395_0.6514",
      "inputText": ""
    }
  ]
}
```

**Critical rules:**
- `variableInputs` is an **ordered array** — order matters.
- Every `inputId` must match **exactly** what the flow expects. Wrong IDs produce no HTTP error — the input is silently ignored and the flow returns a canned/default response.
- All values are **strings**.
- Missing inputs do not throw an HTTP error — they produce incorrect AI behavior. **Always send both inputs.**

---

## Input Mapping

This flow takes exactly **2 inputs**:

| # | inputId | Purpose |
|---|---------|---------|
| 1 | `varInputNode_1773346441251_0.9263` | Juror data |
| 2 | `varInputNode_1773346442395_0.6514` | Callback URL |

**Example request body:**

```json
{
  "variableInputs": [
    {
      "inputId": "varInputNode_1773346441251_0.9263",
      "inputText": "<juror data goes here as a string>"
    },
    {
      "inputId": "varInputNode_1773346442395_0.6514",
      "inputText": "https://your-public-domain.replit.dev/api/callback"
    }
  ]
}
```

**Do not modify, rename, or reformat the `inputId` strings.** Copy them exactly as shown above. A single wrong character causes the input to be silently ignored.

---

## Full Fetch Example (Node/Express)

```ts
const FLUXPROMPT_URL = "https://api.fluxprompt.ai/flux/api-v2";
const FLOW_ID = "afef519e-acfd-4242-af29-89b6083c7353";
const TIMEOUT_MS = 600_000; // 10 minutes

async function callFluxPrompt(jurorData: string, callbackUrl: string) {
  const apiKey = process.env.FLUXPROMPT_API_KEY;
  if (!apiKey) throw new Error("FLUXPROMPT_API_KEY is not set");

  const url = `${FLUXPROMPT_URL}?flowId=${FLOW_ID}`;

  const body = {
    variableInputs: [
      {
        inputId: "varInputNode_1773346441251_0.9263",
        inputText: jurorData,
      },
      {
        inputId: "varInputNode_1773346442395_0.6514",
        inputText: callbackUrl,
      },
    ],
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": apiKey,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`FluxPrompt API error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const text = extractResponseText(data);

    if (!text) {
      console.error("Unexpected FluxPrompt response structure:", JSON.stringify(data));
      throw new Error("Could not extract text from FluxPrompt response");
    }

    return text;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("FluxPrompt request timed out after 10 minutes.");
    }
    throw err;
  }
}
```

---

## Response Parsing

The API returns JSON with this structure:

```json
{
  "status": "success",
  "data": {
    "message": [
      {
        "timestamp": "3/14/2026, 1:48:21 AM",
        "text": "Here is the answer to your question...",
        "outputId": "outputObjectNode_..."
      }
    ]
  }
}
```

**Primary extraction path:** `response.data.data.message[0].text`

(The first `.data` is the Axios/fetch parsed body; the second `.data` is the `data` key inside the JSON.)

Implement this **defensive parser** — do not hardcode a single path:

```ts
function extractResponseText(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;

  // Primary path — actual FluxPrompt structure
  if (d.data && typeof d.data === "object") {
    const inner = d.data as Record<string, unknown>;
    if (Array.isArray(inner.message) && inner.message.length > 0) {
      const first = inner.message[0] as Record<string, unknown>;
      if (typeof first.text === "string" && first.text) return first.text;
    }
  }

  // Fallback: flat string fields
  for (const key of ["output", "result", "message", "text", "response", "content", "answer"]) {
    if (typeof d[key] === "string" && d[key]) return d[key] as string;
  }

  // Fallback: nested arrays
  for (const key of ["data", "outputs", "choices", "results"]) {
    const nested = d[key];
    if (Array.isArray(nested) && nested.length > 0) {
      const item = nested[0] as Record<string, unknown>;
      for (const k of ["text", "content", "output", "result", "message"]) {
        if (typeof item[k] === "string" && item[k]) return item[k] as string;
      }
    }
  }

  return null;
}
```

If this returns `null`, log the full raw response and throw — never silently return empty.

---

## Timeouts

This flow can take **up to several minutes** for complex tasks. Set the fetch timeout to **10 minutes (600,000 ms)** minimum. **Never use a short timeout (30s, 60s).** The model may be doing extended reasoning.

Catch `AbortError` specifically and throw a descriptive timeout message.

---

## URL Rules

FluxPrompt's servers fetch URLs **server-side**. This means:
- `http://localhost/...` → **WILL FAIL** — FluxPrompt cannot reach your local machine
- `/api/callback` → **WILL FAIL** — relative paths are meaningless to a remote server
- `https://your-app.replit.dev/api/callback` → **WILL WORK**

The callback URL (input #2) must be an **absolute public HTTPS URL**. On Replit, use the public `.replit.dev` domain.

---

## Flow Guardrails

If you get a fast canned/default response, it usually means:
1. Incorrect or missing `inputId` values (inputs silently dropped)
2. URLs that are not publicly accessible from the internet

**Diagnosis:** Log the full raw request body and verify every `inputId` is copied exactly and every URL is publicly reachable.

---

## Constants Reference

```ts
const FLUXPROMPT_URL = "https://api.fluxprompt.ai/flux/api-v2";
const FLOW_ID = "afef519e-acfd-4242-af29-89b6083c7353";

const INPUT_IDS = {
  jurorData:   "varInputNode_1773346441251_0.9263",
  callbackUrl: "varInputNode_1773346442395_0.6514",
} as const;
```

---

## Pre-Flight Checklist

Before making the first call, verify ALL of these:

- [ ] `FLUXPROMPT_API_KEY` is set in Replit Secrets with value `f4932a42-ca17-4d2e-8193-790e68eea9f3`
- [ ] The header is `api-key` (not `Authorization`, not `Bearer`)
- [ ] The Flow ID in the query string is `afef519e-acfd-4242-af29-89b6083c7353`
- [ ] BOTH inputs are present with **exact** `inputId` strings (copy-paste, do not retype)
- [ ] The callback URL is an absolute public HTTPS URL (not localhost, not a relative path)
- [ ] Timeout is set to 600,000 ms (10 minutes)
- [ ] Response is parsed via the defensive `extractResponseText` function
