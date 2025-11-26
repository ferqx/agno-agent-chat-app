import React, { useState, useEffect } from 'react';
import { AgentConfig, Message, Role, KnowledgeBaseItem } from '../types';
import { Icon } from './Icon';
import { translations, Language } from '../translations';
import { DiffViewer } from './DiffViewer';
import { ChatInput } from './ChatInput';
import { MessageBubble } from './MessageBubble';
import { EvaluationPanel } from './EvaluationPanel';
import { Select } from './Select';
import { AgnoClient } from '../lib/agno';

interface AgentEditorProps {
  agent: AgentConfig;
  allAgents?: AgentConfig[];
  knowledgeBases?: KnowledgeBaseItem[];
  onSaveDraft: (id: string, updates: Partial<AgentConfig>) => void;
  onPublish: (id: string, changeLog: string) => void;
  onDiscardDraft: (id: string) => void;
  onUpdateTestCases: (id: string, cases: any[]) => void;
  onRestore: (id: string, version: number) => void;
  onClose: () => void;
  language: Language;
}

type EditorTab = 'config' | 'diff' | 'history';

export const AgentEditor: React.FC<AgentEditorProps> = ({
  agent,
  allAgents = [],
  knowledgeBases = [],
  onSaveDraft,
  onPublish,
  onDiscardDraft,
  onRestore,
  onClose,
  language
}) => {
  const t = translations[language];
  
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [instruction, setInstruction] = useState('');
  const [selectedKBId, setSelectedKBId] = useState<string>('');
  const [type, setType] = useState<'agent' | 'supervisor'>('agent');
  const [subAgentIds, setSubAgentIds] = useState<string[]>([]);
  
  const [activeTab, setActiveTab] = useState<EditorTab>('config');
  
  const [playMessages, setPlayMessages] = useState<Message[]>([]);
  const [isPlayStreaming, setIsPlayStreaming] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [changeLog, setChangeLog] = useState('');

  useEffect(() => {
    const source = agent.draftConfig || agent;
    setName(language === 'zh' ? (source.name_zh || source.name) : source.name);
    setDesc(language === 'zh' ? (source.description_zh || source.description) : source.description);
    setInstruction(source.systemInstruction);
    setSelectedKBId(source.knowledgeBaseId || '');
    setType(source.type || 'agent');
    setSubAgentIds(source.subAgentIds || []);
  }, [agent.id, language]);

  const hasDraft = !!agent.draftConfig;
  const source = agent.draftConfig || agent;
  const isDirty = 
    instruction !== source.systemInstruction || 
    selectedKBId !== (source.knowledgeBaseId || '') ||
    type !== (source.type || 'agent') ||
    JSON.stringify(subAgentIds) !== JSON.stringify(source.subAgentIds || []);

  const handleSaveDraft = () => {
    onSaveDraft(agent.id, {
      [language === 'zh' ? 'name_zh' : 'name']: name,
      [language === 'zh' ? 'description_zh' : 'description']: desc,
      systemInstruction: instruction,
      knowledgeBaseId: selectedKBId || undefined,
      type: type,
      subAgentIds: type === 'supervisor' ? subAgentIds : undefined
    });
  };

  const handlePublishClick = () => {
    if (isDirty) handleSaveDraft();
    setShowPublishModal(true);
  };

  const confirmPublish = () => {
    onPublish(agent.id, changeLog);
    setShowPublishModal(false);
    setChangeLog('');
  };

  const toggleSubAgent = (id: string) => {
    if (subAgentIds.includes(id)) {
      setSubAgentIds(prev => prev.filter(aid => aid !== id));
    } else {
      setSubAgentIds(prev => [...prev, id]);
    }
  };

  const handlePlaygroundSend = async (text: string, attachments: any[]) => {
    const baseUrl = localStorage.getItem('agno_base_url');
    if (!baseUrl) {
        alert("Service URL missing");
        return;
    }
    const client = new AgnoClient(baseUrl, localStorage.getItem('agno_api_key') || undefined);

    const newUserMsg: Message = {
      id: Date.now().toString(),
      role: Role.USER,
      text,
      attachments,
      timestamp: Date.now()
    };
    setPlayMessages(prev => [...prev, newUserMsg]);
    setIsPlayStreaming(true);

    const botMsgId = (Date.now() + 1).toString();
    setPlayMessages(prev => [...prev, {
      id: botMsgId,
      role: Role.MODEL,
      text: '',
      timestamp: Date.now(),
      isStreaming: true
    }]);

    try {
        // Create ephemeral session to test draft
        const session = await client.createSession(agent.id, "Draft Test");
        
        await client.createAgentRunStream(
            agent.id,
            session.session_id,
            text,
            (chunk) => {
                setPlayMessages(prev => prev.map(m => m.id === botMsgId ? { ...m, text: chunk } : m));
            },
            (full) => {
                setPlayMessages(prev => prev.map(m => m.id === botMsgId ? { ...m, text: full, isStreaming: false } : m));
                setIsPlayStreaming(false);
            },
            (err) => {
                console.error(err);
                setIsPlayStreaming(false);
            }
        );
        await client.deleteSession(session.session_id);
    } catch (e) {
        console.error(e);
        setIsPlayStreaming(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 absolute inset-0 z-50 overflow-hidden">
      <div className="h-16 flex items-center justify-between px-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm shrink-0">
        <div className="flex items-center gap-4 overflow-hidden">
           <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${agent.color.replace('text-', 'bg-').replace('500', '100')} dark:bg-slate-800`}>
            <Icon name={agent.icon} className={agent.color} size={20} />
          </div>
          <div className="min-w-0">
             <div className="flex items-center gap-2">
               <h2 className="font-bold text-slate-900 dark:text-white text-lg truncate">{name}</h2>
               {hasDraft && <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-[10px] font-bold uppercase rounded-full shrink-0">{t.draft}</span>}
             </div>
             <div className="text-xs text-slate-500 flex items-center gap-1 truncate">
               <span className="font-mono">v{agent.currentVersion || 1}</span>
               <span className="inline">•</span>
               <span className="inline">{agent.model}</span>
             </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {hasDraft && (
            <button 
              onClick={() => onDiscardDraft(agent.id)}
              className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg font-medium transition-colors whitespace-nowrap"
            >
              {t.discardDraft}
            </button>
          )}
          
          <button 
            onClick={handleSaveDraft}
            disabled={!isDirty}
            className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2 whitespace-nowrap"
          >
            {isDirty ? t.saveDraft : t.saved}
            {isDirty && <div className="w-2 h-2 bg-amber-500 rounded-full"></div>}
          </button>

          <button 
            onClick={handlePublishClick}
            disabled={!hasDraft && !isDirty}
            className="px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-bold text-sm shadow-lg shadow-primary-600/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap"
          >
            <Icon name="UploadCloud" size={16} />
            <span>{t.publish}</span>
          </button>
          
          <div className="w-px h-6 bg-slate-200 dark:bg-slate-800 mx-2"></div>
          
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500">
            <Icon name="X" size={20} />
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-row overflow-hidden min-h-0">
        <div className="flex-1 flex flex-col border-r border-slate-200 dark:border-slate-800 min-w-0 overflow-hidden">
           <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 px-4 shrink-0 overflow-x-auto no-scrollbar">
              {[
                { id: 'config', icon: 'Settings', label: t.generalSettings },
                { id: 'diff', icon: 'GitCompare', label: t.diffView },
                { id: 'history', icon: 'History', label: t.versionHistory }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as EditorTab)}
                  className={`flex items-center gap-2 px-4 py-3 text-xs font-bold uppercase tracking-wide border-b-2 transition-colors whitespace-nowrap ${
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
                   <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t.agentName}</label>
                        <input 
                          value={name} 
                          onChange={e => setName(e.target.value)}
                          className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-900 dark:text-slate-100"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t.agentDesc}</label>
                        <input 
                          value={desc} 
                          onChange={e => setDesc(e.target.value)}
                          className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-900 dark:text-slate-100"
                        />
                      </div>
                   </div>
                   
                   <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl">
                      <div className="flex items-center gap-2 mb-3">
                        <Icon name="Users" size={16} className="text-primary-500" />
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{t.agentType}</span>
                      </div>
                      
                      <div className="flex gap-4 mb-4">
                         <button 
                           onClick={() => setType('agent')}
                           className={`flex-1 p-3 rounded-lg border text-left transition-all ${
                             type === 'agent' 
                               ? 'bg-white dark:bg-slate-800 border-primary-500 ring-1 ring-primary-500' 
                               : 'bg-transparent border-slate-200 dark:border-slate-700 opacity-60 hover:opacity-100'
                           }`}
                         >
                            <div className="font-bold text-sm mb-1">{t.standardAgent}</div>
                            <div className="text-xs text-slate-500">Single purpose, handles tasks directly.</div>
                         </button>
                         <button 
                           onClick={() => setType('supervisor')}
                           className={`flex-1 p-3 rounded-lg border text-left transition-all ${
                             type === 'supervisor' 
                               ? 'bg-white dark:bg-slate-800 border-primary-500 ring-1 ring-primary-500' 
                               : 'bg-transparent border-slate-200 dark:border-slate-700 opacity-60 hover:opacity-100'
                           }`}
                         >
                            <div className="font-bold text-sm mb-1">{t.supervisorAgent}</div>
                            <div className="text-xs text-slate-500">Orchestrates multiple sub-agents.</div>
                         </button>
                      </div>

                      {type === 'supervisor' && (
                        <div className="mt-4 animate-in fade-in slide-in-from-top-2">
                           <label className="block text-xs font-bold text-slate-500 uppercase mb-2">{t.subAgents}</label>
                           <p className="text-xs text-slate-400 mb-3">{t.subAgentsHint}</p>
                           <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                              {allAgents.filter(a => a.id !== agent.id).map(a => (
                                <button
                                  key={a.id}
                                  onClick={() => toggleSubAgent(a.id)}
                                  className={`flex items-center gap-2 p-2 rounded-lg border text-left transition-all ${
                                    subAgentIds.includes(a.id)
                                      ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800'
                                      : 'bg-white dark:bg-slate-950 border-slate-100 dark:border-slate-800 hover:border-slate-300'
                                  }`}
                                >
                                   <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                                      subAgentIds.includes(a.id) ? 'bg-primary-600 border-primary-600 text-white' : 'border-slate-300'
                                   }`}>
                                      {subAgentIds.includes(a.id) && <Icon name="Check" size={10} />}
                                   </div>
                                   <div className="min-w-0">
                                      <div className="text-xs font-bold truncate">{language === 'zh' ? a.name_zh : a.name}</div>
                                      <div className="text-[9px] text-slate-400 truncate">{a.model}</div>
                                   </div>
                                </button>
                              ))}
                           </div>
                        </div>
                      )}
                   </div>

                   <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl">
                      <div className="flex items-center gap-2 mb-2">
                        <Icon name="Database" size={16} className="text-primary-500" />
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{t.linkedKnowledgeBase}</span>
                      </div>
                      <p className="text-xs text-slate-500 mb-3">{t.knowledgeBaseHint}</p>
                      
                      <Select 
                        value={selectedKBId}
                        onChange={setSelectedKBId}
                        options={[
                          { value: '', label: t.noKnowledgeBase },
                          ...knowledgeBases.map(kb => ({ value: kb.id, label: kb.name, description: kb.description }))
                        ]}
                        className="w-full"
                      />
                   </div>

                   <div className="flex flex-col h-[400px]">
                      <label className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold text-slate-500 uppercase">{t.systemInstruction}</span>
                        <span className="text-[10px] text-primary-500 cursor-help" title={t.promptVariablesHint}>{t.promptVariablesHint}</span>
                      </label>
                      <textarea 
                        value={instruction}
                        onChange={e => setInstruction(e.target.value)}
                        className="flex-1 w-full p-4 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-mono text-sm rounded-xl border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-primary-500 outline-none leading-relaxed resize-none"
                        spellCheck={false}
                      />
                   </div>
                </div>
              )}

              {activeTab === 'diff' && (
                <div className="p-6 h-full">
                   <DiffViewer 
                     original={agent.systemInstruction} 
                     modified={instruction} 
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

        <div className="w-[450px] h-full flex flex-col bg-slate-50 dark:bg-black/20 border-l border-slate-200 dark:border-slate-800 shrink-0">
           <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900 shrink-0">
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
                   <Icon name="Bot" size={32} className="mb-2" />
                   <p className="text-xs text-center max-w-[200px]">Test your draft changes here instantly.</p>
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

           <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shrink-0">
              <ChatInput 
                onSendMessage={handlePlaygroundSend}
                isStreaming={isPlayStreaming}
                language={language}
              />
           </div>
        </div>
      </div>

      {showPublishModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
           <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md p-6">
              <h3 className="text-lg font-bold mb-4 text-slate-900 dark:text-white">{t.publish} Agent</h3>
              <p className="text-sm text-slate-500 mb-4">{t.publishDesc}</p>
              
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">{t.changeLog}</label>
              <textarea 
                 value={changeLog}
                 onChange={e => setChangeLog(e.target.value)}
                 className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 h-24 resize-none mb-6 text-slate-900 dark:text-slate-100"
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