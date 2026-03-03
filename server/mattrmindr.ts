interface MattrMindrCase {
  id: string;
  caseNum: string;
  title: string;
  defendantName: string;
  caseType: string;
  status: string;
  stage: string;
  court: string;
  judge: string;
}

interface MattrMindrCaseDetail extends MattrMindrCase {
  charges: Array<{ description: string; statute?: string; severity?: string }>;
  arrestDate?: string;
  arraignmentDate?: string;
  nextCourtDate?: string;
  trialDate?: string;
  sentencingDate?: string;
  dispositionDate?: string;
  custodyStatus?: string;
  bondAmount?: string;
  prosecutor?: string;
  county?: string;
  parties: Array<{ name: string; partyType: string; entityKind?: string; phone?: string; email?: string }>;
  notes: Array<{ content: string; category: string; createdAt: string }>;
}

async function mmFetch(baseUrl: string, path: string, token: string, options: RequestInit = {}): Promise<any> {
  const url = `${baseUrl.replace(/\/$/, '')}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: res.statusText }));
    const err: any = new Error(body.message || `MattrMindr API error: ${res.status}`);
    err.status = res.status;
    throw err;
  }

  return res.json();
}

export async function loginToMattrMindr(baseUrl: string, email: string, password: string): Promise<{ token: string; user: any }> {
  const url = `${baseUrl.replace(/\/$/, '')}/api/external/auth/login`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(body.message || 'Failed to authenticate with MattrMindr');
  }

  return res.json();
}

export async function verifyMattrMindrToken(baseUrl: string, token: string): Promise<{ valid: boolean; user?: any }> {
  try {
    const result = await mmFetch(baseUrl, '/api/external/auth/verify', token, { method: 'POST' });
    return result;
  } catch {
    return { valid: false };
  }
}

export async function fetchMattrMindrCases(baseUrl: string, token: string): Promise<MattrMindrCase[]> {
  return mmFetch(baseUrl, '/api/external/cases', token);
}

export async function fetchMattrMindrCase(baseUrl: string, token: string, caseId: string): Promise<MattrMindrCaseDetail> {
  return mmFetch(baseUrl, `/api/external/cases/${caseId}`, token);
}

export async function pushJuryAnalysis(
  baseUrl: string,
  token: string,
  caseId: string,
  data: { jurors: any[]; strikeStrategy: string }
): Promise<any> {
  return mmFetch(baseUrl, `/api/external/cases/${caseId}/jury-analysis`, token, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
