import { jsPDF } from 'jspdf';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle } from 'docx';
import { saveAs } from 'file-saver';
import type { VoirDireDocument, VoirDireQuestion, CaseInfo } from '../types';

function buildPlainText(
  doc: VoirDireDocument,
  questions: VoirDireQuestion[],
  caseInfo: CaseInfo,
): string {
  const lines: string[] = [];
  const divider = '═'.repeat(60);
  const subDivider = '─'.repeat(40);

  lines.push(divider);
  lines.push('VOIR DIRE STRATEGY');
  lines.push(`Case: ${caseInfo.name}`);
  lines.push(`Area of Law: ${caseInfo.areaOfLaw}`);
  lines.push(`Side: ${caseInfo.side.charAt(0).toUpperCase() + caseInfo.side.slice(1)}`);
  lines.push(divider);
  lines.push('');

  lines.push('OPENING STATEMENT');
  lines.push(subDivider);
  lines.push(doc.opening);
  lines.push('');

  if (doc.caseOverview) {
    lines.push('NEUTRAL CASE OVERVIEW');
    lines.push(subDivider);
    lines.push(doc.caseOverview);
    lines.push('');
  }

  lines.push(`STRATEGIC QUESTIONS (${questions.length})`);
  lines.push(subDivider);
  questions.forEach((q) => {
    const docQ = doc.questions.find((dq) => dq.id === q.id);
    lines.push(`Q${q.id}. ${q.originalText}`);
    if (docQ?.module) lines.push(`   [${docQ.module}]`);
    lines.push(`   Rephrase: ${q.rephrase}`);
    if (q.followUps.length > 0) {
      lines.push('   Follow-ups:');
      q.followUps.forEach((fu, i) => {
        lines.push(`     ${i + 1}. ${fu}`);
      });
    }
    lines.push('');
  });

  if (doc.jurorFollowUps.length > 0) {
    lines.push(`JUROR-SPECIFIC FOLLOW-UPS (${doc.jurorFollowUps.length} jurors)`);
    lines.push(subDivider);
    doc.jurorFollowUps.forEach((jf) => {
      lines.push(`Juror #${jf.jurorNumber} — ${jf.jurorName}`);
      lines.push(`   Rationale: ${jf.rationale}`);
      jf.questions.forEach((q, i) => {
        lines.push(`   ${i + 1}. ${q}`);
      });
      lines.push('');
    });
  }

  if (doc.causeFlags.length > 0) {
    lines.push(`CAUSE CHALLENGE FLAGS (${doc.causeFlags.length} flagged)`);
    lines.push(subDivider);
    doc.causeFlags.forEach((cf) => {
      lines.push(`Juror #${cf.jurorNumber} — ${cf.jurorName}`);
      lines.push(`   Risk: ${cf.riskSummary}`);
      lines.push('   Lock-down Questions:');
      cf.lockDownQuestions.forEach((q, i) => {
        lines.push(`     ${i + 1}. ${q}`);
      });
      lines.push(`   Inability-to-be-fair: ${cf.inabilityQuestion}`);
      lines.push('');
    });
  }

  if (doc.rehabilitationOptions.length > 0) {
    lines.push('REHABILITATION OPTIONS');
    lines.push(subDivider);
    doc.rehabilitationOptions.forEach((opt, i) => {
      lines.push(`${i + 1}. ${opt}`);
    });
    lines.push('');
  }

  if (doc.strikeGuide.length > 0) {
    lines.push(`STRIKE GUIDE (${doc.strikeGuide.length} jurors)`);
    lines.push(subDivider);
    doc.strikeGuide.forEach((sg) => {
      lines.push(`Juror #${sg.jurorNumber} — ${sg.jurorName}`);
      lines.push(`   Risk Level: ${sg.riskLevel}`);
      lines.push(`   Concern: ${sg.primaryConcern}`);
      lines.push(`   Recommendation: ${sg.recommendation}`);
      lines.push('');
    });
  }

  lines.push(divider);
  lines.push(`Generated on ${new Date().toLocaleDateString()}`);

  return lines.join('\n');
}

export function exportAsText(
  doc: VoirDireDocument,
  questions: VoirDireQuestion[],
  caseInfo: CaseInfo,
) {
  const text = buildPlainText(doc, questions, caseInfo);
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  saveAs(blob, `Voir_Dire_Strategy_${caseInfo.name.replace(/[^a-zA-Z0-9]/g, '_')}.txt`);
}

export function exportAsPdf(
  doc: VoirDireDocument,
  questions: VoirDireQuestion[],
  caseInfo: CaseInfo,
) {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const checkPage = (needed: number) => {
    if (y + needed > pdf.internal.pageSize.getHeight() - margin) {
      pdf.addPage();
      y = margin;
    }
  };

  const addTitle = (text: string, size: number = 16) => {
    checkPage(12);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(size);
    pdf.setTextColor(30, 41, 59);
    pdf.text(text, margin, y);
    y += size * 0.5 + 2;
  };

  const addSubtitle = (text: string) => {
    checkPage(10);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    pdf.setTextColor(71, 85, 105);
    pdf.text(text, margin, y);
    y += 6;
  };

  const addBody = (text: string, indent: number = 0) => {
    checkPage(8);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.setTextColor(51, 65, 85);
    const lines = pdf.splitTextToSize(text, contentWidth - indent);
    lines.forEach((line: string) => {
      checkPage(5);
      pdf.text(line, margin + indent, y);
      y += 5;
    });
  };

  const addDivider = () => {
    checkPage(6);
    y += 2;
    pdf.setDrawColor(203, 213, 225);
    pdf.setLineWidth(0.3);
    pdf.line(margin, y, pageWidth - margin, y);
    y += 4;
  };

  const addSpacer = (h: number = 4) => { y += h; };

  addTitle('VOIR DIRE STRATEGY', 20);
  addSpacer(2);
  addBody(`Case: ${caseInfo.name}`);
  addBody(`Area of Law: ${caseInfo.areaOfLaw}`);
  addBody(`Side: ${caseInfo.side.charAt(0).toUpperCase() + caseInfo.side.slice(1)}`);
  addDivider();

  addTitle('Opening Statement', 14);
  addBody(doc.opening);
  addSpacer();

  if (doc.caseOverview) {
    addSubtitle('Neutral Case Overview');
    addBody(doc.caseOverview);
    addSpacer();
  }

  addDivider();
  addTitle(`Strategic Questions (${questions.length})`, 14);
  addSpacer(2);

  questions.forEach((q) => {
    const docQ = doc.questions.find((dq) => dq.id === q.id);
    checkPage(20);

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.setTextColor(30, 41, 59);
    const qLines = pdf.splitTextToSize(`Q${q.id}. ${q.originalText}`, contentWidth);
    qLines.forEach((line: string) => {
      checkPage(5);
      pdf.text(line, margin, y);
      y += 5;
    });

    if (docQ?.module) {
      pdf.setFont('helvetica', 'italic');
      pdf.setFontSize(8);
      pdf.setTextColor(100, 116, 139);
      pdf.text(`[${docQ.module}]`, margin + 4, y);
      y += 4;
    }

    addBody(`Rephrase: ${q.rephrase}`, 4);

    if (q.followUps.length > 0) {
      pdf.setFont('helvetica', 'italic');
      pdf.setFontSize(9);
      pdf.setTextColor(100, 116, 139);
      checkPage(5);
      pdf.text('Follow-ups:', margin + 4, y);
      y += 4;
      q.followUps.forEach((fu, i) => {
        addBody(`${i + 1}. ${fu}`, 8);
      });
    }
    addSpacer(3);
  });

  if (doc.jurorFollowUps.length > 0) {
    addDivider();
    addTitle(`Juror-Specific Follow-ups (${doc.jurorFollowUps.length})`, 14);
    addSpacer(2);
    doc.jurorFollowUps.forEach((jf) => {
      checkPage(15);
      addSubtitle(`Juror #${jf.jurorNumber} — ${jf.jurorName}`);
      addBody(`Rationale: ${jf.rationale}`, 4);
      jf.questions.forEach((q, i) => {
        addBody(`${i + 1}. ${q}`, 8);
      });
      addSpacer(3);
    });
  }

  if (doc.causeFlags.length > 0) {
    addDivider();
    addTitle(`Cause Challenge Flags (${doc.causeFlags.length})`, 14);
    addSpacer(2);
    doc.causeFlags.forEach((cf) => {
      checkPage(20);
      addSubtitle(`Juror #${cf.jurorNumber} — ${cf.jurorName}`);
      addBody(`Risk: ${cf.riskSummary}`, 4);
      pdf.setFont('helvetica', 'italic');
      pdf.setFontSize(9);
      pdf.setTextColor(100, 116, 139);
      checkPage(5);
      pdf.text('Lock-down Questions:', margin + 4, y);
      y += 4;
      cf.lockDownQuestions.forEach((q, i) => {
        addBody(`${i + 1}. ${q}`, 8);
      });
      addBody(`Inability-to-be-fair: ${cf.inabilityQuestion}`, 4);
      addSpacer(3);
    });
  }

  if (doc.rehabilitationOptions.length > 0) {
    addDivider();
    addTitle('Rehabilitation Options', 14);
    addSpacer(2);
    doc.rehabilitationOptions.forEach((opt, i) => {
      addBody(`${i + 1}. ${opt}`);
    });
    addSpacer();
  }

  if (doc.strikeGuide.length > 0) {
    addDivider();
    addTitle(`Strike Guide (${doc.strikeGuide.length})`, 14);
    addSpacer(2);
    doc.strikeGuide.forEach((sg) => {
      checkPage(20);
      addSubtitle(`Juror #${sg.jurorNumber} — ${sg.jurorName}`);
      addBody(`Risk Level: ${sg.riskLevel}`, 4);
      addBody(`Concern: ${sg.primaryConcern}`, 4);
      addBody(`Recommendation: ${sg.recommendation}`, 4);
      addSpacer(3);
    });
  }

  addDivider();
  pdf.setFont('helvetica', 'italic');
  pdf.setFontSize(8);
  pdf.setTextColor(148, 163, 184);
  pdf.text(`Generated on ${new Date().toLocaleDateString()}`, margin, y);

  pdf.save(`Voir_Dire_Strategy_${caseInfo.name.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
}

export async function exportAsWord(
  doc: VoirDireDocument,
  questions: VoirDireQuestion[],
  caseInfo: CaseInfo,
) {
  const children: Paragraph[] = [];

  const heading = (text: string, level: (typeof HeadingLevel)[keyof typeof HeadingLevel] = HeadingLevel.HEADING_1) =>
    new Paragraph({ heading: level, spacing: { before: 240, after: 120 }, children: [new TextRun({ text, bold: true })] });

  const body = (text: string, opts?: { bold?: boolean; italic?: boolean; indent?: number }) =>
    new Paragraph({
      spacing: { after: 80 },
      indent: opts?.indent ? { left: opts.indent } : undefined,
      children: [new TextRun({ text, bold: opts?.bold, italics: opts?.italic, size: 22 })],
    });

  const divider = () =>
    new Paragraph({
      spacing: { before: 160, after: 160 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' } },
      children: [new TextRun({ text: '' })],
    });

  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
      children: [new TextRun({ text: 'VOIR DIRE STRATEGY', bold: true, size: 36 })],
    }),
  );
  children.push(body(`Case: ${caseInfo.name}`, { bold: true }));
  children.push(body(`Area of Law: ${caseInfo.areaOfLaw}`));
  children.push(body(`Side: ${caseInfo.side.charAt(0).toUpperCase() + caseInfo.side.slice(1)}`));
  children.push(divider());

  children.push(heading('Opening Statement', HeadingLevel.HEADING_2));
  children.push(body(doc.opening, { italic: true }));

  if (doc.caseOverview) {
    children.push(body('Neutral Case Overview:', { bold: true }));
    children.push(body(doc.caseOverview));
  }
  children.push(divider());

  children.push(heading(`Strategic Questions (${questions.length})`, HeadingLevel.HEADING_2));
  questions.forEach((q) => {
    const docQ = doc.questions.find((dq) => dq.id === q.id);
    const moduleTag = docQ?.module ? ` [${docQ.module}]` : '';
    children.push(body(`Q${q.id}. ${q.originalText}${moduleTag}`, { bold: true }));
    children.push(body(`Rephrase: ${q.rephrase}`, { indent: 360 }));
    if (q.followUps.length > 0) {
      children.push(body('Follow-ups:', { italic: true, indent: 360 }));
      q.followUps.forEach((fu, i) => {
        children.push(body(`${i + 1}. ${fu}`, { indent: 720 }));
      });
    }
  });

  if (doc.jurorFollowUps.length > 0) {
    children.push(divider());
    children.push(heading(`Juror-Specific Follow-ups (${doc.jurorFollowUps.length})`, HeadingLevel.HEADING_2));
    doc.jurorFollowUps.forEach((jf) => {
      children.push(body(`Juror #${jf.jurorNumber} — ${jf.jurorName}`, { bold: true }));
      children.push(body(`Rationale: ${jf.rationale}`, { italic: true, indent: 360 }));
      jf.questions.forEach((q, i) => {
        children.push(body(`${i + 1}. ${q}`, { indent: 720 }));
      });
    });
  }

  if (doc.causeFlags.length > 0) {
    children.push(divider());
    children.push(heading(`Cause Challenge Flags (${doc.causeFlags.length})`, HeadingLevel.HEADING_2));
    doc.causeFlags.forEach((cf) => {
      children.push(body(`Juror #${cf.jurorNumber} — ${cf.jurorName}`, { bold: true }));
      children.push(body(`Risk: ${cf.riskSummary}`, { indent: 360 }));
      children.push(body('Lock-down Questions:', { italic: true, indent: 360 }));
      cf.lockDownQuestions.forEach((q, i) => {
        children.push(body(`${i + 1}. ${q}`, { indent: 720 }));
      });
      children.push(body(`Inability-to-be-fair: ${cf.inabilityQuestion}`, { bold: true, indent: 360 }));
    });
  }

  if (doc.rehabilitationOptions.length > 0) {
    children.push(divider());
    children.push(heading('Rehabilitation Options', HeadingLevel.HEADING_2));
    doc.rehabilitationOptions.forEach((opt, i) => {
      children.push(body(`${i + 1}. ${opt}`));
    });
  }

  if (doc.strikeGuide.length > 0) {
    children.push(divider());
    children.push(heading(`Strike Guide (${doc.strikeGuide.length})`, HeadingLevel.HEADING_2));
    doc.strikeGuide.forEach((sg) => {
      children.push(body(`Juror #${sg.jurorNumber} — ${sg.jurorName}`, { bold: true }));
      children.push(body(`Risk Level: ${sg.riskLevel}`, { indent: 360 }));
      children.push(body(`Concern: ${sg.primaryConcern}`, { indent: 360 }));
      children.push(body(`Recommendation: ${sg.recommendation}`, { indent: 360 }));
    });
  }

  children.push(divider());
  children.push(body(`Generated on ${new Date().toLocaleDateString()}`, { italic: true }));

  const wordDoc = new Document({
    sections: [{ children }],
  });

  const blob = await Packer.toBlob(wordDoc);
  saveAs(blob, `Voir_Dire_Strategy_${caseInfo.name.replace(/[^a-zA-Z0-9]/g, '_')}.docx`);
}
