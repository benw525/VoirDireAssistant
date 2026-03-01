import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  UploadCloud,
  ArrowRight,
  AlertCircle,
  Database } from
'lucide-react';
import { Juror } from '../../types';
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
  const handleParse = () => {
    setIsParsing(true);
    setError('');
    setTimeout(() => {
      try {
        if (!pasteData.trim()) {
          throw new Error('Please paste strike list data first.');
        }
        // Very basic mock parser for demo purposes
        const lines = pasteData.split('\n').filter((l) => l.trim());
        const parsedJurors: Juror[] = lines.map((line, index) => {
          const parts = line.split(/[\t,]/).map((p) => p.trim());
          return {
            number: parseInt(parts[0]) || index + 1,
            name: parts[1] || 'Unknown',
            address: parts[2] || 'Unknown',
            cityStateZip: parts[3] || 'Unknown',
            sex: parts[4] || 'U',
            race: parts[5] || 'U',
            birthDate: parts[6] || 'Unknown',
            occupation: parts[7] || 'Unknown',
            employer: parts[8] || 'Unknown',
            responses: [],
            lean: 'unknown',
            riskTier: 'unassessed',
            notes: ''
          };
        });
        onJurorsLoaded(parsedJurors);
        setPasteData('');
      } catch (err: any) {
        setError(
          err.message || 'Failed to parse data. Please check the format.'
        );
      } finally {
        setIsParsing(false);
      }
    }, 600);
  };
  const loadSampleData = () => {
    onJurorsLoaded(generateSampleJurors());
  };
  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8 h-full flex flex-col">
      <div className="mb-6 flex justify-between items-end shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">
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
            <span className="font-bold text-slate-900">{jurors.length}</span>
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

          <div className="bg-slate-50 border-b border-slate-200 p-4 flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="text-sm text-slate-700">
              <p className="font-semibold mb-1">
                Expected Format (Tab or Comma separated):
              </p>
              <code className="bg-white px-2 py-1 rounded border border-slate-200 text-xs text-slate-600 block">
                Number | Name | Address | City, State Zip | Sex | Race | DOB |
                Occupation | Employer
              </code>
            </div>
          </div>

          <div className="p-6 flex-1 flex flex-col">
            <textarea
            value={pasteData}
            onChange={(e) => setPasteData(e.target.value)}
            placeholder="Paste strike list data here..."
            className="flex-1 w-full p-4 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-slate-50 font-mono text-sm resize-none transition-colors mb-4 min-h-[200px]" />


            {error &&
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-sm flex items-center">
                <AlertCircle className="w-4 h-4 mr-2 shrink-0" />
                {error}
              </div>
          }

            <div className="flex justify-between items-center">
              <button
              onClick={loadSampleData}
              className="text-slate-500 hover:text-slate-800 text-sm font-medium flex items-center transition-colors">

                <Database className="w-4 h-4 mr-2" />
                Load Sample Data (Demo)
              </button>

              <button
              onClick={handleParse}
              disabled={!pasteData.trim() || isParsing}
              className="inline-flex items-center px-6 py-3 bg-slate-900 text-white font-medium rounded-xl hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 disabled:opacity-50 transition-colors">

                {isParsing ?
              <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                    Parsing...
                  </> :

              <>
                    <UploadCloud className="w-5 h-5 mr-2" />
                    Parse Strike List
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
              <table className="w-full text-sm text-left">
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
              className="text-slate-500 hover:text-slate-700 font-medium text-sm">

                Clear & Re-upload
              </button>
              <button
              onClick={onProceed}
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