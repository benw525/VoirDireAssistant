import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  ArrowRight,
  AlertCircle,
  Database,
  FileUp,
  Brain,
  Sparkles,
  AlertTriangle,
  Check,
  X,
  Pencil,
  Plus,
  Trash2
} from 'lucide-react';
import { Juror } from '../../types';
import { useDropzone } from 'react-dropzone';
import { parseStrikeList } from '../../lib/api';

interface StrikeListProps {
  jurors: Juror[];
  onJurorsLoaded: (jurors: Juror[]) => void;
  onProceed: () => void;
  generateSampleJurors: () => Juror[];
}

type EditableField = 'name' | 'sex' | 'race' | 'birthDate' | 'occupation' | 'employer';

interface EditingCell {
  jurorNumber: number;
  field: EditableField;
}

function EditableCell({ value, onSave, isIllegible, fieldWidth }: {
  value: string;
  onSave: (newValue: string) => void;
  isIllegible: boolean;
  fieldWidth?: string;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = () => {
    onSave(editValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') handleCancel();
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-1">
        <input
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          className={`px-1.5 py-0.5 border border-amber-400 rounded text-sm bg-white focus:outline-none focus:ring-1 focus:ring-amber-500 ${fieldWidth || 'w-full'}`}
        />
      </div>
    );
  }

  return (
    <div
      onClick={() => {
        setEditValue(value);
        setIsEditing(true);
      }}
      className={`cursor-pointer group flex items-center gap-1 rounded px-1 -mx-1 transition-colors hover:bg-amber-50 ${
        isIllegible ? 'text-rose-600 font-medium bg-rose-50 hover:bg-rose-100' : ''
      }`}
      title="Click to edit"
    >
      <span className="truncate">{value}</span>
      <Pencil className="w-3 h-3 text-slate-300 group-hover:text-amber-500 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
}

export function StrikeList({
  jurors,
  onJurorsLoaded,
  onProceed,
  generateSampleJurors
}: StrikeListProps) {
  const [pasteData, setPasteData] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newJuror, setNewJuror] = useState({ number: '', name: '', sex: '', race: '', birthDate: '', occupation: '', employer: '' });
  const [renumberConflict, setRenumberConflict] = useState<{ existingJuror: Juror; newJuror: Juror; newNumber: string } | null>(null);

  const handleAIParse = useCallback(async (fileOrText: File | string) => {
    setIsParsing(true);
    setError('');
    setStatusMessage('Building strike list...');

    try {
      const parsedJurors = await parseStrikeList(fileOrText);
      onJurorsLoaded(parsedJurors);
      setPasteData('');
      setStatusMessage('');
    } catch (err: any) {
      setError(err.message || 'Failed to parse strike list. Please try again.');
      setStatusMessage('');
    } finally {
      setIsParsing(false);
    }
  }, [onJurorsLoaded]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      handleAIParse(file);
    }
  }, [handleAIParse]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false
  });

  const handleParse = () => {
    if (!pasteData.trim()) {
      setError('Please paste strike list data first.');
      return;
    }
    handleAIParse(pasteData);
  };

  const loadSampleData = () => {
    onJurorsLoaded(generateSampleJurors());
  };

  const updateJurorField = (jurorNumber: number, field: EditableField, value: string) => {
    const updated = jurors.map(j => {
      if (j.number !== jurorNumber) return j;
      const updatedJuror = { ...j, [field]: value };
      const hasIllegible = [updatedJuror.name, updatedJuror.sex, updatedJuror.race, updatedJuror.birthDate, updatedJuror.occupation, updatedJuror.employer]
        .some(v => v === 'Illegible' || v.includes('(partial)'));
      return { ...updatedJuror, needsReview: hasIllegible };
    });
    onJurorsLoaded(updated);
  };

  const buildNewJuror = (jurorNumber: number): Juror => ({
    number: jurorNumber,
    name: newJuror.name.trim(),
    address: '',
    cityStateZip: '',
    sex: newJuror.sex.trim() || 'Unknown',
    race: newJuror.race.trim() || 'Unknown',
    birthDate: newJuror.birthDate.trim() || 'Unknown',
    occupation: newJuror.occupation.trim() || 'Unknown',
    employer: newJuror.employer.trim() || 'Unknown',
    responses: [],
    lean: 'unknown',
    riskTier: 'unassessed',
    notes: '',
    aiSummary: '',
    aiAnalysis: '',
  });

  const handleAddJuror = () => {
    if (!newJuror.name.trim()) return;

    const specifiedNumber = newJuror.number.trim() ? parseInt(newJuror.number.trim(), 10) : null;

    if (specifiedNumber !== null && !isNaN(specifiedNumber) && specifiedNumber > 0) {
      const existing = jurors.find(j => j.number === specifiedNumber);
      if (existing) {
        const maxNumber = Math.max(...jurors.map(j => j.number));
        setRenumberConflict({
          existingJuror: existing,
          newJuror: buildNewJuror(specifiedNumber),
          newNumber: String(maxNumber + 1),
        });
        return;
      }
      const juror = buildNewJuror(specifiedNumber);
      onJurorsLoaded([...jurors, juror].sort((a, b) => a.number - b.number));
    } else {
      const maxNumber = jurors.length > 0 ? Math.max(...jurors.map(j => j.number)) : 0;
      const juror = buildNewJuror(maxNumber + 1);
      onJurorsLoaded([...jurors, juror].sort((a, b) => a.number - b.number));
    }

    setNewJuror({ number: '', name: '', sex: '', race: '', birthDate: '', occupation: '', employer: '' });
    setShowAddForm(false);
  };

  const handleConfirmRenumber = () => {
    if (!renumberConflict) return;
    const renumberTo = parseInt(renumberConflict.newNumber.trim(), 10);
    if (isNaN(renumberTo) || renumberTo <= 0) return;

    if (renumberTo === renumberConflict.newJuror.number) return;
    const conflictWithNew = jurors.find(j => j.number === renumberTo && j.number !== renumberConflict.existingJuror.number);
    if (conflictWithNew) return;

    const updated = jurors.map(j =>
      j.number === renumberConflict.existingJuror.number
        ? { ...j, number: renumberTo }
        : j
    );
    onJurorsLoaded([...updated, renumberConflict.newJuror].sort((a, b) => a.number - b.number));
    setRenumberConflict(null);
    setNewJuror({ number: '', name: '', sex: '', race: '', birthDate: '', occupation: '', employer: '' });
    setShowAddForm(false);
  };

  const handleDeleteJuror = (jurorNumber: number) => {
    onJurorsLoaded(jurors.filter(j => j.number !== jurorNumber));
  };

  const reviewCount = jurors.filter((j: any) => j.needsReview).length;
  const isIllegibleValue = (val: string) => val === 'Illegible' || val.includes('(partial)');

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8 h-full flex flex-col">
      <div className="mb-6 flex justify-between items-end shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-slate-900" data-testid="text-phase-title">
            Phase 2: Strike List
          </h2>
          <p className="text-slate-600 mt-1">
            Upload or paste the court-provided strike list to initialize the
            juror database.
          </p>
        </div>
        {jurors.length > 0 &&
        <div className="flex items-center gap-3">
            {reviewCount > 0 && (
              <div className="bg-amber-50 px-3 py-2 rounded-lg border border-amber-200 flex items-center">
                <AlertTriangle className="w-4 h-4 text-amber-500 mr-1.5" />
                <span className="font-bold text-amber-700 text-sm" data-testid="text-review-count">{reviewCount}</span>
                <span className="text-amber-600 ml-1 text-xs">need review</span>
              </div>
            )}
            <div className="bg-slate-100 px-4 py-2 rounded-lg border border-slate-200 flex items-center">
              <Users className="w-5 h-5 text-slate-500 mr-2" />
              <span className="font-bold text-slate-900" data-testid="text-juror-count">{jurors.length}</span>
              <span className="text-slate-600 ml-1 text-sm">Jurors Loaded</span>
            </div>
          </div>
        }
      </div>

      {jurors.length === 0 ?
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex-1 flex flex-col">

          <div className="bg-gradient-to-r from-violet-50 to-amber-50 border-b border-slate-200 p-4 flex items-start space-x-3">
            <Sparkles className="w-5 h-5 text-violet-500 shrink-0 mt-0.5" />
            <div className="text-sm text-slate-700">
              <p className="font-semibold mb-1">
                AI-Powered Document Parsing
              </p>
              <p className="text-slate-600">
                Upload any strike list format — PDF, TXT, CSV, or paste text directly.
                Our AI agent will intelligently extract juror data regardless of formatting.
              </p>
            </div>
          </div>

          <div className="p-6 flex-1 flex flex-col">
            <div 
              {...getRootProps()} 
              data-testid="dropzone-strike-list"
              className={`border-2 border-dashed rounded-xl p-8 mb-4 text-center cursor-pointer transition-colors ${
                isParsing ? 'border-violet-400 bg-violet-50 pointer-events-none' :
                isDragActive ? 'border-amber-500 bg-amber-50' : 'border-slate-300 hover:border-slate-400 bg-slate-50'
              }`}
            >
              <input {...getInputProps()} data-testid="input-file-upload" />
              {isParsing ? (
                <>
                  <Brain className="w-10 h-10 text-violet-500 mx-auto mb-3 animate-pulse" />
                  <p className="text-violet-700 font-medium" data-testid="text-parsing-status">
                    {statusMessage}
                  </p>
                  <div className="mt-3 flex justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-violet-500 border-t-transparent" />
                  </div>
                </>
              ) : (
                <>
                  <FileUp className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                  <p className="text-slate-600 font-medium">
                    {isDragActive ? 'Drop the file here...' : 'Drag & drop a file here, or click to upload'}
                  </p>
                  <p className="text-slate-500 text-sm mt-1">
                    Supports PDF, TXT, CSV — any format with juror data
                  </p>
                </>
              )}
            </div>

            <div className="relative mb-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-slate-500">OR PASTE DATA</span>
              </div>
            </div>

            <textarea
            value={pasteData}
            onChange={(e) => setPasteData(e.target.value)}
            placeholder="Paste strike list data here in any format..."
            disabled={isParsing}
            data-testid="input-paste-data"
            className="flex-1 w-full p-4 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-slate-50 font-mono text-sm resize-none transition-colors mb-4 min-h-[120px] disabled:opacity-50" />

            {error &&
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-sm flex items-center" data-testid="text-error-message">
                <AlertCircle className="w-4 h-4 mr-2 shrink-0" />
                {error}
              </div>
          }

            <div className="flex justify-between items-center">
              <button
              onClick={loadSampleData}
              disabled={isParsing}
              data-testid="button-load-sample"
              className="text-slate-500 hover:text-slate-800 text-sm font-medium flex items-center transition-colors disabled:opacity-50">
                <Database className="w-4 h-4 mr-2" />
                Load Sample Data (Demo)
              </button>

              <button
              onClick={handleParse}
              disabled={!pasteData.trim() || isParsing}
              data-testid="button-parse-strike-list"
              className="inline-flex items-center px-6 py-3 bg-slate-900 text-white font-medium rounded-xl hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 disabled:opacity-50 transition-colors">
                {isParsing ?
              <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                    Building...
                  </> :
              <>
                    <Brain className="w-5 h-5 mr-2" />
                    Parse with AI
                  </>
              }
              </button>
            </div>
          </div>
        </motion.div> :

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex-1 flex flex-col min-h-0">

          {reviewCount > 0 && (
            <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2 text-sm">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-amber-800">{reviewCount} juror{reviewCount > 1 ? 's' : ''} flagged for review.</span>
                <span className="text-amber-700 ml-1">Fields highlighted in red could not be read from the document. Click any cell to edit and correct the data.</span>
              </div>
            </div>
          )}

          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex-1 flex flex-col">
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-sm text-left" data-testid="table-jurors">
                <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3 font-semibold w-12">#</th>
                    <th className="px-4 py-3 font-semibold">Name</th>
                    <th className="px-4 py-3 font-semibold w-14">Sex</th>
                    <th className="px-4 py-3 font-semibold w-14">Race</th>
                    <th className="px-4 py-3 font-semibold w-28">DOB</th>
                    <th className="px-4 py-3 font-semibold">Occupation</th>
                    <th className="px-4 py-3 font-semibold">Employer</th>
                    <th className="px-4 py-3 font-semibold w-10"></th>
                    <th className="px-2 py-3 font-semibold w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {jurors.map((juror) => {
                    const needsReview = (juror as any).needsReview;
                    return (
                      <tr
                        key={juror.number}
                        data-testid={`row-juror-${juror.number}`}
                        className={`transition-colors ${needsReview ? 'bg-amber-50/50 hover:bg-amber-50' : 'hover:bg-slate-50'}`}
                      >
                        <td className="px-4 py-2.5 font-bold text-slate-900">
                          {juror.number}
                        </td>
                        <td className="px-4 py-2.5 font-medium text-slate-700">
                          <EditableCell
                            value={juror.name}
                            onSave={(v) => updateJurorField(juror.number, 'name', v)}
                            isIllegible={isIllegibleValue(juror.name)}
                          />
                        </td>
                        <td className="px-4 py-2.5 text-slate-600">
                          <EditableCell
                            value={juror.sex}
                            onSave={(v) => updateJurorField(juror.number, 'sex', v)}
                            isIllegible={isIllegibleValue(juror.sex)}
                            fieldWidth="w-12"
                          />
                        </td>
                        <td className="px-4 py-2.5 text-slate-600">
                          <EditableCell
                            value={juror.race}
                            onSave={(v) => updateJurorField(juror.number, 'race', v)}
                            isIllegible={isIllegibleValue(juror.race)}
                            fieldWidth="w-12"
                          />
                        </td>
                        <td className="px-4 py-2.5 text-slate-600">
                          <EditableCell
                            value={juror.birthDate}
                            onSave={(v) => updateJurorField(juror.number, 'birthDate', v)}
                            isIllegible={isIllegibleValue(juror.birthDate)}
                            fieldWidth="w-24"
                          />
                        </td>
                        <td className="px-4 py-2.5 text-slate-600">
                          <EditableCell
                            value={juror.occupation}
                            onSave={(v) => updateJurorField(juror.number, 'occupation', v)}
                            isIllegible={isIllegibleValue(juror.occupation)}
                          />
                        </td>
                        <td className="px-4 py-2.5 text-slate-600">
                          <EditableCell
                            value={juror.employer}
                            onSave={(v) => updateJurorField(juror.number, 'employer', v)}
                            isIllegible={isIllegibleValue(juror.employer)}
                          />
                        </td>
                        <td className="px-2 py-2.5">
                          {needsReview && (
                            <AlertTriangle className="w-4 h-4 text-amber-500" title="This juror has fields that need review" />
                          )}
                        </td>
                        <td className="px-2 py-2.5">
                          <button
                            onClick={() => handleDeleteJuror(juror.number)}
                            data-testid={`button-delete-juror-${juror.number}`}
                            className="text-slate-300 hover:text-rose-500 transition-colors p-0.5 rounded"
                            title="Remove juror"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {showAddForm && (
              <div className="border-t border-slate-200 bg-emerald-50/50 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Plus className="w-4 h-4 text-emerald-600" />
                  <span className="text-sm font-semibold text-slate-800">Add Juror Manually</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-7 gap-2 mb-3">
                  <input
                    value={newJuror.number}
                    onChange={(e) => setNewJuror(prev => ({ ...prev, number: e.target.value.replace(/\D/g, '') }))}
                    placeholder={`# (default ${jurors.length > 0 ? Math.max(...jurors.map(j => j.number)) + 1 : 1})`}
                    data-testid="input-add-juror-number"
                    className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white w-24"
                    onKeyDown={(e) => e.key === 'Enter' && handleAddJuror()}
                  />
                  <input
                    value={newJuror.name}
                    onChange={(e) => setNewJuror(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Name *"
                    data-testid="input-add-juror-name"
                    className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                    onKeyDown={(e) => e.key === 'Enter' && handleAddJuror()}
                  />
                  <input
                    value={newJuror.sex}
                    onChange={(e) => setNewJuror(prev => ({ ...prev, sex: e.target.value }))}
                    placeholder="Sex"
                    data-testid="input-add-juror-sex"
                    className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                    onKeyDown={(e) => e.key === 'Enter' && handleAddJuror()}
                  />
                  <input
                    value={newJuror.race}
                    onChange={(e) => setNewJuror(prev => ({ ...prev, race: e.target.value }))}
                    placeholder="Race"
                    data-testid="input-add-juror-race"
                    className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                    onKeyDown={(e) => e.key === 'Enter' && handleAddJuror()}
                  />
                  <input
                    value={newJuror.birthDate}
                    onChange={(e) => setNewJuror(prev => ({ ...prev, birthDate: e.target.value }))}
                    placeholder="DOB"
                    data-testid="input-add-juror-dob"
                    className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                    onKeyDown={(e) => e.key === 'Enter' && handleAddJuror()}
                  />
                  <input
                    value={newJuror.occupation}
                    onChange={(e) => setNewJuror(prev => ({ ...prev, occupation: e.target.value }))}
                    placeholder="Occupation"
                    data-testid="input-add-juror-occupation"
                    className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                    onKeyDown={(e) => e.key === 'Enter' && handleAddJuror()}
                  />
                  <input
                    value={newJuror.employer}
                    onChange={(e) => setNewJuror(prev => ({ ...prev, employer: e.target.value }))}
                    placeholder="Employer"
                    data-testid="input-add-juror-employer"
                    className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                    onKeyDown={(e) => e.key === 'Enter' && handleAddJuror()}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleAddJuror}
                    disabled={!newJuror.name.trim()}
                    data-testid="button-confirm-add-juror"
                    className="inline-flex items-center px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                  >
                    <Check className="w-4 h-4 mr-1.5" />
                    Add Juror
                  </button>
                  <button
                    onClick={() => { setShowAddForm(false); setNewJuror({ number: '', name: '', sex: '', race: '', birthDate: '', occupation: '', employer: '' }); }}
                    data-testid="button-cancel-add-juror"
                    className="inline-flex items-center px-4 py-2 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {renumberConflict && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" data-testid="dialog-renumber-conflict">
                <div className="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 overflow-hidden">
                  <div className="bg-amber-50 px-6 py-4 border-b border-amber-200">
                    <h3 className="font-bold text-amber-900 flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5" />
                      Juror Number Conflict
                    </h3>
                  </div>
                  <div className="px-6 py-4 space-y-3">
                    <p className="text-sm text-slate-700">
                      Juror <span className="font-bold">#{renumberConflict.existingJuror.number} ({renumberConflict.existingJuror.name})</span> already
                      has that number. Please assign a new number for the existing juror.
                    </p>
                    <div>
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        New number for {renumberConflict.existingJuror.name}
                      </label>
                      <input
                        value={renumberConflict.newNumber}
                        onChange={(e) => setRenumberConflict(prev => prev ? { ...prev, newNumber: e.target.value.replace(/\D/g, '') } : null)}
                        data-testid="input-renumber-juror"
                        className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                        onKeyDown={(e) => e.key === 'Enter' && handleConfirmRenumber()}
                        autoFocus
                      />
                      {renumberConflict.newNumber && parseInt(renumberConflict.newNumber) === renumberConflict.newJuror.number && (
                        <p className="text-xs text-rose-600 mt-1 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          That number is being assigned to the new juror.
                        </p>
                      )}
                      {renumberConflict.newNumber && parseInt(renumberConflict.newNumber) !== renumberConflict.newJuror.number && jurors.some(j => j.number === parseInt(renumberConflict.newNumber) && j.number !== renumberConflict.existingJuror.number) && (
                        <p className="text-xs text-rose-600 mt-1 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          That number is already taken by another juror.
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
                    <button
                      onClick={() => setRenumberConflict(null)}
                      data-testid="button-cancel-renumber"
                      className="px-4 py-2 text-sm font-medium text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleConfirmRenumber}
                      disabled={!renumberConflict.newNumber.trim() || parseInt(renumberConflict.newNumber) <= 0 || parseInt(renumberConflict.newNumber) === renumberConflict.newJuror.number || jurors.some(j => j.number === parseInt(renumberConflict.newNumber) && j.number !== renumberConflict.existingJuror.number)}
                      data-testid="button-confirm-renumber"
                      className="px-4 py-2 text-sm font-bold text-white bg-amber-600 rounded-lg hover:bg-amber-700 disabled:opacity-50 transition-colors"
                    >
                      Renumber & Add
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-slate-50 border-t border-slate-200 p-4 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => onJurorsLoaded([])}
                  data-testid="button-clear-jurors"
                  className="text-slate-500 hover:text-slate-700 font-medium text-sm">
                  Clear & Re-upload
                </button>
                {!showAddForm && (
                  <button
                    onClick={() => setShowAddForm(true)}
                    data-testid="button-add-juror"
                    className="inline-flex items-center text-emerald-600 hover:text-emerald-700 font-medium text-sm transition-colors"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Juror
                  </button>
                )}
              </div>
              <button
                onClick={onProceed}
                data-testid="button-confirm-proceed"
                className="inline-flex items-center px-6 py-3 bg-amber-500 text-slate-900 font-bold rounded-xl hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 transition-colors shadow-sm">
                Confirm & Proceed
                <ArrowRight className="w-5 h-5 ml-2" />
              </button>
            </div>
          </div>
        </motion.div>
      }
    </div>);
}
