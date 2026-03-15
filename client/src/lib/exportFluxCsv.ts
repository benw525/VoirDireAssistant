import { Juror } from '../types';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import { saveAs } from 'file-saver';

export async function exportJurorsForFlux(jurors: Juror[]): Promise<void> {
  const paragraphs: Paragraph[] = [];

  jurors.forEach((j, idx) => {
    const lines = [
      `Number: ${j.number}`,
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

    const runs: TextRun[] = [];
    lines.forEach((line, i) => {
      if (i > 0) runs.push(new TextRun({ break: 1, text: '' }));
      runs.push(new TextRun({ text: line, size: 22 }));
    });

    paragraphs.push(new Paragraph({ children: runs }));

    if (idx < jurors.length - 1) {
      paragraphs.push(new Paragraph({ children: [] }));
    }
  });

  const doc = new Document({
    sections: [{ children: paragraphs }],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `data-for-fluxprompt-${Date.now()}.docx`);
}
