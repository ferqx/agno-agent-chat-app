
import React, { useState, useEffect, useRef } from 'react';
import { AgentConfig, Message, Role } from '../types';
import { Icon } from './Icon';
import { translations, Language } from '../translations';
import { TestLab } from './TestLab';
import { DiffViewer } from './DiffViewer';
import { ChatInput } from './ChatInput';
import { MessageBubble } from './MessageBubble';
import { streamGeminiResponse } from '../services/geminiService';
import { StatusBadge } from './StatusBadge';
import { EvaluationPanel } from './EvaluationPanel';

interface AgentEditorProps {
  agent: AgentConfig;
  onSaveDraft: (id: string, updates: Partial<AgentConfig>) => void;
  onPublish: (id: string, changeLog: string) => void;
  onDiscardDraft: (id: string) => void;
  onUpdateTestCases: (id: string, cases: any[]) => void;
  onRestore: (id: string, version: number) => void;
  onClose: () => void;
  language: Language;
}

type EditorTab = 'config' | 'test' | 'diff' | 'history';

export const AgentEditor: React.FC<AgentEditorProps> = ({
  agent,
  onSaveDraft,
  onPublish,
  onDiscardDraft,
  onUpdateTestCases,
  onRestore,
  onClose,
  language
}) => {
  const t = translations[language];
  
  // Local State for form inputs (mirroring draft or live)
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [instruction, setInstruction] = useState('');
  const [activeTab, setActiveTab] = useState<EditorTab>('config');
  
  // Playground State
  const [playMessages, setPlayMessages] = useState<Message[]>([]);
  const [isPlayStreaming, setIsPlayStreaming] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [changeLog, setChangeLog] = useState('');

  // Load initial state from Draft if exists, else Live
  useEffect(() => {
    const source = agent.draftConfig || agent;
    setName(language === 'zh' ? (source.name_zh || source.name) : source.name);
    setDesc(language === 'zh' ? (source.description_zh || source.description) : source.description);
    setInstruction(source.systemInstruction);
  }, [agent.id, language]); // Reset when agent changes

  const hasDraft = !!agent.draftConfig;
  
  // Check for local dirty state (changes not yet saved to draft)
  const source = agent.draftConfig || agent;
  const savedInstruction = source.systemInstruction || '';
  const isDirty = instruction !== savedInstruction;

  const handleSaveDraft = () => {
    onSaveDraft(agent.id, {
      [language === 'zh' ? 'name_zh' : 'name']: name,
      [language === 'zh' ? 'description_zh' : 'description']: desc,
      systemInstruction: instruction
    });
  };

  const handlePublishClick = () => {
    // First ensure draft is saved
    if (isDirty) handleSaveDraft();
    setShowPublishModal(true);
  };

  const confirmPublish = () => {
    onPublish(agent.id, changeLog);
    setShowPublishModal(false);
    setChangeLog('');
  };

  // Playground Handler
  const handlePlaygroundSend = async (text: string, attachments: any[]) => {
    const newUserMsg: Message = {
      id: Date.now().toString(),
      role: Role.USER,
      text,
      attachments,
      timestamp: Date.now()
    };
    const newHistory = [...playMessages, newUserMsg];
    setPlayMessages(newHistory);
    setIsPlayStreaming(true);

    // Use the CURRENT editor instruction for the playground, effectively testing the "work in progress"
    const playgroundAgentConfig = {
      ...agent,
      systemInstruction: instruction // <--- Vital: Uses local state
    };

    const botMsgId = (Date.now() + 1).toString();
    setPlayMessages(prev => [...prev, {
      id: botMsgId,
      role: Role.MODEL,
      text: '',
      timestamp: Date.now(),
      isStreaming: true
    }]);

    await streamGeminiResponse(
      playgroundAgentConfig,
      newHistory,
      text,
      attachments,
      (chunk) => {
        setPlayMessages(prev => prev.map(m => m.id === botMsgId ? { ...m, text: chunk } : m));
      },
      (full) => {
        setPlayMessages(prev => prev.map(m => m.id === botMsgId ? { ...m, text: full, isStreaming: false } : m));
        setIsPlayStreaming(false);
      },
      () => setIsPlayStreaming(false)
    );
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 absolute inset-0 z-50">
      {/* Top Bar */}
      <div className="h-16 flex items-center justify-between px-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm shrink-0">
        <div className="flex items-center gap-4">
           <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${agent.color.replace('text-', 'bg-').replace('500', '100')} dark:bg-slate-800`}>
            <Icon name={agent.icon} className={agent.color} size={20} />
          </div>
          <div>
             <div className="flex items-center gap-2">
               <h2 className="font-bold text-slate-900 dark:text-white text-lg">{name}</h2>
               {hasDraft && <span className="px-2 py-0.5 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-[10px] font-bold uppercase rounded-full">{t.draft}</span>}
             </div>
             <div className="text-xs text-slate-500 flex items-center gap-1">
               <span className="font-mono">v{agent.currentVersion || 1}</span>
               <span>•</span>
               <span>{agent.model}</span>
             </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {hasDraft && (
            <button 
              onClick={() => onDiscardDraft(agent.id)}
              className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg font-medium transition-colors"
            >
              {t.discardDraft}
            </button>
          )}
          
          <button 
            onClick={handleSaveDraft}
            disabled={!isDirty}
            className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isDirty ? t.saveDraft : t.saved}
            {isDirty && <div className="w-2 h-2 bg-amber-500 rounded-full"></div>}
          </button>

          <button 
            onClick={handlePublishClick}
            disabled={!hasDraft && !isDirty}
            className="px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-bold text-sm shadow-lg shadow-primary-600/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Icon name="UploadCloud" size={16} />
            {t.publish}
          </button>
          
          <div className="w-px h-6 bg-slate-200 dark:bg-slate-800 mx-2"></div>
          
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500">
            <Icon name="X" size={20} />
          </button>
        </div>
      </div>

      {/* Main Split Area */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* LEFT PANEL: Editor / Config */}
        <div className="flex-1 flex flex-col border-r border-slate-200 dark:border-slate-800 min-w-[400px]">
           {/* Tabs */}
           <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 px-4">
              {[
                { id: 'config', icon: 'Settings', label: t.generalSettings },
                { id: 'test', icon: 'FlaskConical', label: t.testLab },
                { id: 'diff', icon: 'GitCompare', label: t.diffView },
                { id: 'history', icon: 'History', label: t.versionHistory }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as EditorTab)}
                  className={`flex items-center gap-2 px-4 py-3 text-xs font-bold uppercase tracking-wide border-b-2 transition-colors ${
                    activeTab === tab.id 
                      ? 'border-primary-500 text-primary-600 dark:text-primary-400 bg-white dark:bg-slate-900' 
                      : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <Icon name={tab.icon} size={14} />
                  {tab.label}
                </button>
              ))}
           </div>

           <div className="flex-1 overflow-y-auto bg-white dark:bg-slate-900 relative">
              {activeTab === 'config' && (
                <div className="p-6 space-y-6 max-w-3xl mx-auto">
                   {/* Info Card */}
                   <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t.agentName}</label>
                        <input 
                          value={name} 
                          onChange={e => setName(e.target.value)}
                          className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t.agentDesc}</label>
                        <input 
                          value={desc} 
                          onChange={e => setDesc(e.target.value)}
                          className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm"
                        />
                      </div>
                   </div>

                   {/* Prompt Editor */}
                   <div className="flex flex-col h-[500px]">
                      <label className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold text-slate-500 uppercase">{t.systemInstruction}</span>
                        <span className="text-[10px] text-primary-500 cursor-help" title={t.promptVariablesHint}>{t.promptVariablesHint}</span>
                      </label>
                      <textarea 
                        value={instruction}
                        onChange={e => setInstruction(e.target.value)}
                        className="flex-1 w-full p-4 bg-slate-900 text-slate-100 font-mono text-sm rounded-xl border border-slate-700 focus:ring-2 focus:ring-primary-500 outline-none leading-relaxed resize-none"
                        spellCheck={false}
                      />
                   </div>
                </div>
              )}

              {activeTab === 'test' && (
                <div className="p-6 h-full">
                   <TestLab 
                     agent={agent}
                     testCases={agent.testCases || []}
                     onUpdateTestCases={(cases) => onUpdateTestCases(agent.id, cases)}
                     language={language}
                   />
                </div>
              )}

              {activeTab === 'diff' && (
                <div className="p-6 h-full">
                   <DiffViewer 
                     original={agent.systemInstruction} // Live
                     modified={instruction} // Current Draft/Editor state
                     language={language}
                   />
                </div>
              )}

              {activeTab === 'history' && (
                <div className="p-6 space-y-4">
                   <EvaluationPanel metrics={agent.metrics} language={language} className="mb-6" />
                   <h3 className="font-bold text-sm uppercase text-slate-500">{t.versionHistory}</h3>
                   <div className="space-y-4 pl-4 border-l-2 border-slate-200 dark:border-slate-800">
                     {agent.promptVersions?.map((v, i) => (
                       <div key={i} className="relative pl-6">
                          <div className="absolute -left-[21px] top-1 w-3.5 h-3.5 rounded-full border-2 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600"></div>
                          <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-lg">
                            <div className="flex justify-between items-start">
                               <div>
                                 <div className="font-bold text-sm">v{v.version}</div>
                                 <div className="text-xs text-slate-500">{new Date(v.timestamp).toLocaleString()}</div>
                               </div>
                               <button 
                                 onClick={() => {
                                   if(confirm(t.restore + '?')) onRestore(agent.id, v.version);
                                 }}
                                 className="text-xs text-primary-600 hover:underline"
                               >
                                 {t.restore}
                               </button>
                            </div>
                            <div className="mt-2 text-xs text-slate-600 dark:text-slate-400">{v.changeLog}</div>
                          </div>
                       </div>
                     ))}
                   </div>
                </div>
              )}
           </div>
        </div>

        {/* RIGHT PANEL: Playground */}
        <div className="w-[450px] flex flex-col bg-slate-50 dark:bg-black/20 border-l border-slate-200 dark:border-slate-800">
           <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900">
              <div className="flex items-center gap-2">
                <Icon name="Play" size={14} className="text-emerald-500" />
                <span className="font-bold text-xs uppercase tracking-wide text-slate-600 dark:text-slate-300">{t.playground}</span>
              </div>
              <button 
                onClick={() => setPlayMessages([])} 
                className="text-xs text-slate-400 hover:text-red-500 flex items-center gap-1"
              >
                <Icon name="Eraser" size={12} />
                {t.clear}
              </button>
           </div>

           <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-texture">
              {playMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
                   <Icon name="Bot" size={48} className="mb-2" />
                   <p className="text-sm text-center max-w-[200px]">Test your draft changes here instantly.</p>
                </div>
              ) : (
                playMessages.map((msg, idx) => (
                  <MessageBubble 
                     key={msg.id} 
                     message={msg} 
                     isLast={idx === playMessages.length - 1}
                     language={language}
                     userProfile={{ name: 'Tester' }}
                  />
                ))
              )}
           </div>

           <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
              <ChatInput 
                onSendMessage={handlePlaygroundSend}
                isStreaming={isPlayStreaming}
                language={language}
              />
           </div>
        </div>
      </div>

      {/* Publish Modal */}
      {showPublishModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
           <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md p-6">
              <h3 className="text-lg font-bold mb-4 text-slate-900 dark:text-white">{t.publish} Agent</h3>
              <p className="text-sm text-slate-500 mb-4">{t.publishDesc}</p>
              
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">{t.changeLog}</label>
              <textarea 
                 value={changeLog}
                 onChange={e => setChangeLog(e.target.value)}
                 className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 h-24 resize-none mb-6"
                 placeholder={t.changeLogPlaceholder}
              />
              
              <div className="flex justify-end gap-3">
                 <button onClick={() => setShowPublishModal(false)} className="px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-700">{t.cancel}</button>
                 <button 
                   onClick={confirmPublish}
                   disabled={!changeLog.trim()}
                   className="px-4 py-2 bg-primary-600 text-white rounded-lg font-bold text-sm disabled:opacity-50"
                 >
                   {t.publish}
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
