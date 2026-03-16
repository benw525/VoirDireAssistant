import { db } from './server/db';
import { sql } from 'drizzle-orm';
import { analyzeJuror } from './server/analyzeJuror';
import { getEnrichedDataForCase } from './server/perplexityEnrichment';
import * as fs from 'fs';

const caseId = 'fca6d415-1715-42bf-912c-5415881212a8';

async function run() {
  const caseRow = await db.execute(sql`SELECT * FROM cases WHERE id = ${caseId}`);
  const c = caseRow.rows[0] as any;
  const caseInfo = {
    name: c.name,
    areaOfLaw: c.area_of_law,
    summary: c.summary,
    side: c.side,
    favorableTraits: c.favorable_traits || [],
    riskTraits: c.risk_traits || [],
  };

  const jurorRows = await db.execute(sql`SELECT id, number, name, sex, race, birth_date, occupation, employer FROM jurors WHERE case_id = ${caseId} ORDER BY number ASC`);
  const jurors = jurorRows.rows as any[];

  const enrichmentMap = await getEnrichedDataForCase(caseId);
  console.log('Enrichment entries available:', Object.keys(enrichmentMap).length);

  const results: any[] = [];
  const BATCH = 5;

  for (let i = 0; i < jurors.length; i += BATCH) {
    const batch = jurors.slice(i, i + BATCH);
    const batchResults = await Promise.all(batch.map(async (j: any, idx: number) => {
      const jurorData = {
        number: j.number,
        name: j.name,
        sex: j.sex,
        race: j.race,
        birthDate: j.birth_date || 'Unknown',
        occupation: j.occupation || 'Unknown',
        employer: j.employer || 'Unknown',
        lean: 'unknown',
        riskTier: 'unassessed',
        notes: '',
      };
      const enrichment = enrichmentMap[j.id] || null;
      try {
        const analysis = await analyzeJuror(caseInfo, jurorData, [], enrichment);
        return { number: j.number, name: j.name, analysis };
      } catch (err: any) {
        return { number: j.number, name: j.name, analysis: 'Error: ' + err.message };
      }
    }));

    for (const r of batchResults) {
      results.push(r);
      const status = r.analysis.startsWith('Error') ? 'FAILED' : 'OK';
      console.log(`[${results.length}/${jurors.length}] #${r.number} ${r.name}: ${status}`);
    }
  }

  fs.writeFileSync('/tmp/juror_assessments.txt', results.map(r =>
    `=== #${r.number} — ${r.name} ===\n${r.analysis}\n`
  ).join('\n'));
  console.log('\nAll assessments written to /tmp/juror_assessments.txt');
  process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
