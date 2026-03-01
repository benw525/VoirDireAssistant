import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  UploadCloud,
  ArrowRight,
  AlertCircle,
  Database,
  FileUp,
  Brain,
  Sparkles
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

  const handleAIParse = useCallback(async (fileOrText: File | string) => {
    setIsParsing(true);
    setError('');
    setStatusMessage('Analyzing document with AI...');

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
        <div className="bg-slate-100 px-4 py-2 rounded-lg border border-slate-200 flex items-center">
            <Users className="w-5 h-5 text-slate-500 mr-2" />
            <span className="font-bold text-slate-900" data-testid="text-juror-count">{jurors.length}</span>
            <span className="text-slate-600 ml-1 text-sm">Jurors Loaded</span>
          </div>
        }
      </div>

      {jurors.length === 0 ?
      <motion.div
        initial={{
          opacity: 0,
          y: 20
        }}
        animate={{
          opacity: 1,
          y: 0
        }}
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
                    Analyzing...
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
        initial={{
          opacity: 0
        }}
        animate={{
          opacity: 1
        }}
        className="flex-1 flex flex-col min-h-0">

          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex-1 flex flex-col">
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-sm text-left" data-testid="table-jurors">
                <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3 font-semibold w-16">#</th>
                    <th className="px-4 py-3 font-semibold">Name</th>
                    <th className="px-4 py-3 font-semibold w-16">Sex</th>
                    <th className="px-4 py-3 font-semibold w-16">Race</th>
                    <th className="px-4 py-3 font-semibold">DOB</th>
                    <th className="px-4 py-3 font-semibold">Occupation</th>
                    <th className="px-4 py-3 font-semibold">Employer</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {jurors.map((juror) =>
                <tr
                  key={juror.number}
                  data-testid={`row-juror-${juror.number}`}
                  className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-bold text-slate-900">
                        {juror.number}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-700">
                        {juror.name}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{juror.sex}</td>
                      <td className="px-4 py-3 text-slate-600">{juror.race}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {juror.birthDate}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {juror.occupation}
                      </td>
                      <td
                    className="px-4 py-3 text-slate-600 truncate max-w-[150px]"
                    title={juror.employer}>
                        {juror.employer}
                      </td>
                    </tr>
                )}
                </tbody>
              </table>
            </div>

            <div className="bg-slate-50 border-t border-slate-200 p-4 flex justify-between items-center shrink-0">
              <button
              onClick={() => onJurorsLoaded([])}
              data-testid="button-clear-jurors"
              className="text-slate-500 hover:text-slate-700 font-medium text-sm">
                Clear & Re-upload
              </button>
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
