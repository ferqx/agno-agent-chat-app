
import React from 'react';
import { AgentMetrics } from '../types';
import { Icon } from './Icon';
import { translations, Language } from '../translations';

interface EvaluationPanelProps {
  metrics?: AgentMetrics;
  language: Language;
  className?: string;
}

export const EvaluationPanel: React.FC<EvaluationPanelProps> = ({ metrics, language, className = '' }) => {
  const t = translations[language];
  
  // Default metrics if undefined
  const safeMetrics = metrics || { qualityScore: 0, interactionCount: 0, satisfactionRate: 0 };
  
  // Helper for score color
  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-emerald-500';
    if (score >= 70) return 'text-primary-500';
    if (score >= 50) return 'text-amber-500';
    return 'text-red-500';
  };
  
  const getProgressColor = (score: number) => {
    if (score >= 90) return 'bg-emerald-500';
    if (score >= 70) return 'bg-primary-500';
    if (score >= 50) return 'bg-amber-500';
    return 'bg-red-500';
  };

  return (
    <div className={`bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 ${className}`}>
       <div className="flex items-center gap-2 mb-6">
         <Icon name="BarChart2" className="text-primary-500" />
         <h3 className="text-lg font-bold text-slate-900 dark:text-white">{t.metricsOverview}</h3>
       </div>
       
       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         {/* Quality Score */}
         <div className="flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800/50">
           <div className="relative w-24 h-24 flex items-center justify-center">
             <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
               <path
                 className="text-slate-200 dark:text-slate-800"
                 d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                 fill="none"
                 stroke="currentColor"
                 strokeWidth="3"
               />
               <path
                 className={`${getScoreColor(safeMetrics.qualityScore)} transition-all duration-1000 ease-out`}
                 strokeDasharray={`${safeMetrics.qualityScore}, 100`}
                 d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                 fill="none"
                 stroke="currentColor"
                 strokeWidth="3"
               />
             </svg>
             <div className="absolute inset-0 flex items-center justify-center flex-col">
               <span className={`text-2xl font-bold ${getScoreColor(safeMetrics.qualityScore)}`}>
                 {safeMetrics.qualityScore}
               </span>
             </div>
           </div>
           <span className="mt-3 text-sm font-medium text-slate-600 dark:text-slate-400">{t.qualityScore}</span>
         </div>

         {/* Interaction Count */}
         <div className="flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800/50">
           <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-2">
             <Icon name="MessageSquare" size={28} />
           </div>
           <span className="text-2xl font-bold text-slate-900 dark:text-white">{safeMetrics.interactionCount}</span>
           <span className="mt-1 text-sm font-medium text-slate-600 dark:text-slate-400">{t.interactions}</span>
         </div>

         {/* User Satisfaction */}
         <div className="flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800/50">
            <div className="w-full max-w-[120px] space-y-4">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-500">Sat.</span>
                <span className="font-bold">{safeMetrics.satisfactionRate}%</span>
              </div>
              <div className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full ${getProgressColor(safeMetrics.satisfactionRate)}`} 
                  style={{ width: `${safeMetrics.satisfactionRate}%` }}
                ></div>
              </div>
            </div>
            <span className="mt-4 text-sm font-medium text-slate-600 dark:text-slate-400">{t.satisfaction}</span>
         </div>
       </div>
    </div>
  );
};
