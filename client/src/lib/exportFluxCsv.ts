import { Juror } from '../types';

function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function exportJurorsForFlux(jurors: Juror[]): void {
  const headers = [
    'Juror Number',
    'Name',
    'Phone',
    'Sex',
    'Race',
    'Date of Birth',
    'Occupation',
    'Employer',
    'Address',
    'City/State/Zip',
  ];

  const rows = jurors.map((j) => [
    String(j.number),
    escapeCSV(j.name),
    escapeCSV(j.phone || 'Unknown'),
    escapeCSV(j.sex),
    escapeCSV(j.race),
    escapeCSV(j.birthDate),
    escapeCSV(j.occupation),
    escapeCSV(j.employer),
    escapeCSV(j.address || ''),
    escapeCSV(j.cityStateZip || ''),
  ]);

  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `juror-data-for-fluxprompt-${Date.now()}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
