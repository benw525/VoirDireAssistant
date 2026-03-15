import { Juror } from '../types';

function escapeRtf(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/\{/g, '\\{').replace(/\}/g, '\\}');
}

export function exportJurorsForFlux(jurors: Juror[]): void {
  const paragraphs = jurors.map((j) => {
    const lines = [
      `Juror Number: ${j.number}`,
      `Name: ${j.name}`,
      `Phone: ${j.phone || 'Unknown'}`,
      `Sex: ${j.sex}`,
      `Race: ${j.race}`,
      `Date of Birth: ${j.birthDate}`,
      `Occupation: ${j.occupation}`,
      `Employer: ${j.employer}`,
      `Address: ${j.address || ''}`,
      `City/State/Zip: ${j.cityStateZip || ''}`,
    ];
    return lines.map((l) => escapeRtf(l)).join('\\line ');
  });

  const rtfContent = [
    '{\\rtf1\\ansi\\deff0',
    '{\\fonttbl{\\f0 Calibri;}}',
    '\\f0\\fs22',
    paragraphs.join('\\par\\par '),
    '}',
  ].join('\n');

  const blob = new Blob([rtfContent], { type: 'application/rtf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `juror-data-for-fluxprompt-${Date.now()}.rtf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
