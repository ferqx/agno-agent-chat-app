
import React from 'react';
import { translations, Language } from '../translations';

interface DiffViewerProps {
  original: string;
  modified: string;
  language: Language;
}

export const DiffViewer: React.FC<DiffViewerProps> = ({ original, modified, language }) => {
  const t = translations[language];

  return (
    <div className="grid grid-cols-2 gap-4 h-full overflow-hidden">
      <div className="flex flex-col h-full">
        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 pl-1">
          {t.original}
        </div>
        <div className="flex-1 bg-slate-100 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl p-4 overflow-y-auto font-mono text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap">
          {original || <span className="opacity-50 italic">Empty</span>}
        </div>
      </div>
      <div className="flex flex-col h-full">
        <div className="text-xs font-bold text-primary-600 dark:text-primary-400 uppercase tracking-wider mb-2 pl-1">
          {t.modified}
        </div>
        <div className="flex-1 bg-white dark:bg-slate-800 border-2 border-primary-100 dark:border-primary-900/30 rounded-xl p-4 overflow-y-auto font-mono text-sm text-slate-900 dark:text-slate-100 whitespace-pre-wrap shadow-sm">
          {modified || <span className="opacity-50 italic">Empty</span>}
        </div>
      </div>
    </div>
  );
};
