import React, { useState } from 'react';
import { KnowledgeDocument, RetrievalResult } from '../types';
import { Icon } from './Icon';
import { translations, Language } from '../translations';
import { StatusBadge } from './StatusBadge';

interface RagTesterProps {
  documents: KnowledgeDocument[];
  language: Language;
}

export const RagTester: React.FC<RagTesterProps> = ({ documents, language }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<RetrievalResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const t = translations[language];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    // Simple client-side search simulation (contains match)
    // In a real app, this would call an Agno/RAG endpoint if available.
    const hits: RetrievalResult[] = documents
      .filter(doc => doc.name.toLowerCase().includes(query.toLowerCase()))
      .map(doc => ({
        docId: doc.id,
        docName: doc.name,
        score: 85, // Mock score
        excerpt: `Found match in ${doc.name}`
      }));

    setResults(hits);
    setHasSearched(true);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50/50 dark:bg-slate-900/20 p-6 overflow-hidden">
      <div className="max-w-3xl mx-auto w-full flex flex-col h-full">
        <div className="mb-6 text-center">
          <div className="inline-flex items-center justify-center p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-sm mb-4">
             <Icon name="Search" size={24} className="text-primary-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{t.ragRetrievalTest}</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm max-w-md mx-auto">
            {t.ragRetrievalDesc}
          </p>
        </div>

        <form onSubmit={handleSearch} className="relative mb-8 shrink-0">
           <input
             type="text"
             value={query}
             onChange={(e) => setQuery(e.target.value)}
             placeholder={t.ragSearchPlaceholder}
             className="w-full pl-6 pr-14 py-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg shadow-primary-900/5 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-slate-900 dark:text-white outline-none transition-all"
           />
           <button 
             type="submit"
             disabled={!query.trim()}
             className="absolute right-2 top-2 bottom-2 aspect-square bg-primary-600 hover:bg-primary-700 text-white rounded-xl flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
           >
             <Icon name="ArrowRight" size={20} />
           </button>
        </form>

        <div className="flex-1 overflow-y-auto min-h-0 space-y-4 pb-4">
          {hasSearched && results.length === 0 && (
             <div className="text-center py-10 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900/50">
                <Icon name="FileQuestion" size={32} className="mx-auto text-slate-300 mb-2" />
                <p className="text-slate-500 font-medium">{t.noRagResults}</p>
                <p className="text-xs text-slate-400 mt-1">Try different keywords or check your document content.</p>
             </div>
          )}

          {results.map((result, idx) => (
             <div key={idx} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm animate-in slide-in-from-bottom-2 fade-in fill-mode-forwards" style={{ animationDelay: `${idx * 100}ms` }}>
                <div className="flex justify-between items-start mb-2">
                   <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                         result.score > 70 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                         result.score > 40 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                         'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                      }`}>
                         {result.score}%
                      </div>
                      <div>
                         <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">{result.docName}</h4>
                         <span className="text-[10px] text-slate-400 font-mono">ID: {result.docId.substring(0,8)}...</span>
                      </div>
                   </div>
                   <StatusBadge 
                      status={result.score > 70 ? 'success' : result.score > 40 ? 'warning' : 'neutral'} 
                      text={result.score > 70 ? 'High' : result.score > 40 ? 'Medium' : 'Low'}
                      className="!py-0.5 !text-[10px]"
                   />
                </div>
                <div className="pl-11">
                   <div className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800/50 font-mono leading-relaxed">
                      {result.excerpt}
                   </div>
                </div>
             </div>
          ))}
        </div>
      </div>
    </div>
  );
};