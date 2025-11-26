
import React, { useState, useEffect, useRef } from 'react';
import { Icon } from './Icon';
import { translations, Language } from '../translations';
import { KnowledgeBase } from './KnowledgeBase';
import { useAgents } from '../hooks/useAgents';
import { AgentConfig, KnowledgeBaseItem, KnowledgeDocument, ChunkingStrategy, Message, Role, Session, LogEntry } from '../types';
import { EvaluationDashboard } from './EvaluationDashboard';
import { ChatInput } from './ChatInput';
import { MessageBubble } from './MessageBubble';
import { Drawer } from './Drawer';
import { Select } from './Select';
import { AgnoClient } from '../lib/agno';

// Simplified AdminDashboard - most complexity moved to AgentPlayground or removed if unused
// The original file had a large embedded playground. In the new structure, use AgentPlayground component.
// However, to satisfy "update" requirements and keep features, I will restore the structure but use Agno.

interface AdminDashboardProps {
  onBack: () => void;
  language: Language;
  onToggleLanguage: () => void;
  onToggleTheme: () => void;
  themeIcon: string;
  themeTitle: string;
  
  // Knowledge Props
  knowledgeBases: KnowledgeBaseItem[];
  createKnowledgeBase: (name: string, desc: string) => string;
  updateKnowledgeBase: (id: string, name: string, desc: string) => void;
  deleteKnowledgeBase: (id: string) => void;
  documents: KnowledgeDocument[];
  uploadDocument: (baseId: string, file: File) => void;
  deleteDocument: (id: string) => void;
  getStorageUsage: () => number;
  updateDocumentStrategy: (id: string, strategy: ChunkingStrategy) => void;
  startProcessing: (id: string) => void;
  batchDeleteDocuments: (ids: string[]) => void;
  batchUpdateStrategy: (ids: string[], strategy: ChunkingStrategy) => void;
  batchStartProcessing: (ids: string[]) => void;
}

// Reuse AgentPlayground component for the agents tab to avoid duplication
import { AgentPlayground } from './admin/AgentPlayground';

export const AdminDashboard: React.FC<AdminDashboardProps> = (props) => {
  const [activeTab, setActiveTab] = useState<'agents' | 'rag' | 'eval'>('agents');
  const t = translations[props.language];
  
  const NavItem = ({ id, icon, label }: { id: 'agents' | 'rag' | 'eval', icon: string, label: string }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`relative flex items-center justify-center lg:justify-start gap-3 px-3 lg:px-4 py-2.5 lg:py-3.5 rounded-xl lg:rounded-2xl transition-all duration-300 group ${
        activeTab === id 
          ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/30' 
          : 'text-slate-500 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white'
      }`}
      title={label}
    >
      <Icon name={icon} size={20} className={`transition-transform group-hover:scale-110 ${activeTab === id ? '' : 'opacity-70'}`} />
      <span className="font-medium tracking-wide hidden lg:block">{label}</span>
      {activeTab === id && <span className="absolute right-3 hidden lg:block"><Icon name="ChevronRight" size={14} className="opacity-50" /></span>}
    </button>
  );

  return (
    <div className="relative h-full w-full overflow-hidden bg-slate-50 dark:bg-slate-950 bg-texture transition-colors duration-500">
      <div className="relative z-10 flex flex-col md:flex-row h-full w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl shadow-2xl border border-white/40 dark:border-white/5 overflow-hidden ring-1 ring-black/5 rounded-none md:rounded-2xl md:my-4 md:mx-4 md:h-[calc(100%-2rem)] md:w-[calc(100%-2rem)] max-w-screen-2xl mx-auto">
        
        <div className="w-full md:w-20 lg:w-64 border-b md:border-b-0 md:border-r border-slate-200/50 dark:border-slate-800/50 flex flex-row md:flex-col flex-shrink-0 bg-white/30 dark:bg-slate-900/30 h-auto md:h-full z-20">
          <div className="p-4 lg:p-6 flex items-center md:flex-col md:items-center lg:items-start gap-3">
             <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 dark:from-white dark:to-slate-200 flex items-center justify-center text-white dark:text-slate-900 shadow-lg shrink-0">
               <Icon name="Shield" size={16} />
             </div>
             <div className="flex flex-col">
               <span className="font-bold text-lg tracking-tight text-slate-900 dark:text-white block md:hidden lg:block">{t.adminPanel}</span>
               <span className="text-[9px] text-slate-400 font-medium uppercase tracking-widest hidden lg:block">Workspace OS</span>
             </div>
          </div>
          
          <div className="flex-1 px-2 lg:px-4 flex md:flex-col items-center md:items-stretch gap-1 md:gap-2 overflow-x-auto md:overflow-visible no-scrollbar py-2 md:py-0">
             <NavItem id="agents" icon="Bot" label={t.agentManagement} />
             <NavItem id="rag" icon="Database" label={t.ragKnowledge} />
             <NavItem id="eval" icon="FlaskConical" label={t.evalLab} />
          </div>

          <div className="p-2 lg:p-6 md:space-y-3 border-l md:border-l-0 md:border-t border-slate-200/50 dark:border-slate-800/50 bg-white/20 dark:bg-black/20 backdrop-blur-sm flex md:flex-col items-center justify-center lg:justify-start gap-2">
            <div className="flex items-center gap-2">
              <button onClick={props.onToggleTheme} className="flex items-center justify-center w-8 h-8 lg:w-auto lg:h-auto lg:p-3 rounded-lg lg:rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-primary-500 dark:hover:text-primary-400 transition-all shadow-sm">
                 <Icon name={props.themeIcon} size={16} />
              </button>
              <button onClick={props.onToggleLanguage} className="flex items-center justify-center w-8 h-8 lg:w-auto lg:h-auto lg:p-3 rounded-lg lg:rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-primary-500 dark:hover:text-primary-400 transition-all shadow-sm font-bold text-xs">
                 {props.language === 'zh' ? 'EN' : '中'}
              </button>
            </div>
            <button onClick={props.onBack} className="md:w-full flex items-center justify-center gap-2 p-2 lg:px-4 lg:py-3 rounded-lg lg:rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 transition-all shadow-md hover:shadow-lg group">
              <Icon name="ArrowLeft" size={16} className="lg:group-hover:-translate-x-1 transition-transform" />
              <span className="text-sm font-bold hidden lg:inline">{t.backToChat}</span>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden relative flex flex-col">
          {activeTab === 'agents' && (
             <AgentPlayground 
                language={props.language} 
                knowledgeBases={props.knowledgeBases} 
                documents={props.documents} 
             />
          )}

          {activeTab === 'rag' && (
            <KnowledgeBase 
              knowledgeBases={props.knowledgeBases}
              onCreateBase={props.createKnowledgeBase}
              onUpdateBase={props.updateKnowledgeBase}
              onDeleteBase={props.deleteKnowledgeBase}
              documents={props.documents}
              onUpload={props.uploadDocument}
              onDeleteDoc={props.deleteDocument}
              onUpdateStrategy={props.updateDocumentStrategy}
              onStartProcessing={props.startProcessing}
              onBatchDelete={props.batchDeleteDocuments}
              onBatchUpdateStrategy={props.batchUpdateStrategy}
              onBatchStartProcessing={props.batchStartProcessing}
              storageUsed={props.getStorageUsage()}
              language={props.language}
            />
          )}

          {activeTab === 'eval' && (
            <EvaluationDashboard agents={[]} language={props.language} />
          )}
        </div>
      </div>
    </div>
  );
};