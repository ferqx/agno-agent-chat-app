import { useState, useEffect } from 'react';
import { Session, Message, Role, AgentConfig, LogEntry, KnowledgeDocument } from '../types';
import { AgnoClient } from '../lib/agno';
import { Language } from '../translations';

export const usePlayground = (
  agents: AgentConfig[], 
  selectedAgentId: string | null,
  documents: KnowledgeDocument[],
  language: Language
) => {
  const [playSessions, setPlaySessions] = useState<Session[]>([]);
  const [currentPlaySessionId, setCurrentPlaySessionId] = useState<string | null>(null);
  const [isPlayStreaming, setIsPlayStreaming] = useState(false);
  const [executionLogs, setExecutionLogs] = useState<LogEntry[]>([]);

  const selectedAgent = agents.find(a => a.id === selectedAgentId);
  const agentSessions = playSessions
    .filter(s => s.agentId === selectedAgentId)
    .sort((a, b) => b.lastModified - a.lastModified);

  const activePlaySession = agentSessions.find(s => s.id === currentPlaySessionId) || agentSessions[0];
  const playMessages = activePlaySession?.messages || [];

  // Initialize session if needed
  useEffect(() => {
    if (selectedAgentId) {
       const hasSession = playSessions.some(s => s.agentId === selectedAgentId);
       if (!hasSession) {
          const newId = Date.now().toString();
          const newSession: Session = {
             id: newId,
             title: 'Debug Session 1',
             messages: [],
             agentId: selectedAgentId,
             lastModified: Date.now()
          };
          setPlaySessions(prev => [newSession, ...prev]);
          setCurrentPlaySessionId(newId);
       } else if (!currentPlaySessionId || !playSessions.find(s => s.id === currentPlaySessionId && s.agentId === selectedAgentId)) {
          const firstForAgent = playSessions.find(s => s.agentId === selectedAgentId);
          if (firstForAgent) setCurrentPlaySessionId(firstForAgent.id);
       }
    }
  }, [selectedAgentId, playSessions.length]);

  const handleNewSession = () => {
    if (!selectedAgentId) return;
    const newId = Date.now().toString();
    const newSession: Session = {
        id: newId,
        title: `Debug Session ${agentSessions.length + 1}`,
        messages: [],
        agentId: selectedAgentId,
        lastModified: Date.now()
    };
    setPlaySessions(prev => [newSession, ...prev]);
    setCurrentPlaySessionId(newId);
    setExecutionLogs([]);
  };

  const deleteSession = (sessionId: string) => {
     const newSessions = playSessions.filter(s => s.id !== sessionId);
     setPlaySessions(newSessions);
     if (currentPlaySessionId === sessionId) {
        const remaining = newSessions.filter(s => s.agentId === selectedAgentId);
        setCurrentPlaySessionId(remaining.length > 0 ? remaining[0].id : null);
     }
  };

  const handlePlaygroundSend = async (text: string, attachments: any[]) => {
    if (!selectedAgent || !activePlaySession) return;
    
    const baseUrl = localStorage.getItem('agno_base_url');
    const apiKey = localStorage.getItem('agno_api_key');
    if (!baseUrl) {
        alert("Please configure Agno Service URL in settings.");
        return;
    }
    const client = new AgnoClient(baseUrl, apiKey || undefined);

    const sessionId = activePlaySession.id;
    let newTitle = activePlaySession.title;
    if (activePlaySession.messages.length === 0) {
      newTitle = text.slice(0, 30) + (text.length > 30 ? '...' : '');
    }

    const newUserMsg: Message = {
      id: Date.now().toString(),
      role: Role.USER,
      text,
      attachments,
      timestamp: Date.now()
    };
    
    const newHistory = [...activePlaySession.messages, newUserMsg];
    
    setPlaySessions(prev => prev.map(s => 
      s.id === sessionId 
      ? { ...s, messages: newHistory, title: newTitle, lastModified: Date.now() } 
      : s
    ));
    
    setIsPlayStreaming(true);
    setExecutionLogs([]); 
    
    const botMsgId = (Date.now() + 1).toString();
    const placeholderMsg: Message = {
      id: botMsgId,
      role: Role.MODEL,
      text: '',
      timestamp: Date.now(),
      isStreaming: true,
      agentName: language === 'zh' ? selectedAgent.name_zh : selectedAgent.name,
      logs: [] 
    };
    
    setPlaySessions(prev => prev.map(s => 
      s.id === sessionId 
      ? { ...s, messages: [...newHistory, placeholderMsg] } 
      : s
    ));

    // Use Agno Client for Streaming
    // Note: We are simulating a session here. For a real "playground" against an Agno Agent,
    // we need to create a real session on the backend or use a temporary one.
    // Here we create a session on the fly or reuse if mapped.
    // Since playSessions are local, let's create a temp backend session.
    
    try {
        // Create a real backend session corresponding to this debug session if not tracked
        // For simplicity, we just create a new one every time or use a consistent ID if supported
        // Agno sessions are persistent. Let's create one for this debug run.
        const backendSession = await client.createSession(selectedAgent.id, newTitle);
        
        await client.createAgentRunStream(
            selectedAgent.id,
            backendSession.session_id,
            text,
            (chunk) => {
                setPlaySessions(prev => prev.map(s => {
                if (s.id === sessionId) {
                    const msgs = s.messages.map(m => m.id === botMsgId ? { ...m, text: chunk } : m);
                    return { ...s, messages: msgs };
                }
                return s;
                }));
            },
            (full, metrics) => {
                setPlaySessions(prev => prev.map(s => {
                if (s.id === sessionId) {
                    const msgs = s.messages.map(m => m.id === botMsgId ? { ...m, text: full, isStreaming: false, metrics } : m);
                    return { ...s, messages: msgs, lastModified: Date.now() };
                }
                return s;
                }));
                setIsPlayStreaming(false);
            },
            (err) => {
                console.error(err);
                setIsPlayStreaming(false);
                setPlaySessions(prev => prev.map(s => {
                    if (s.id === sessionId) {
                        const msgs = s.messages.map(m => m.id === botMsgId ? { ...m, text: "Error: " + err.message, isStreaming: false } : m);
                        return { ...s, messages: msgs };
                    }
                    return s;
                }));
            }
        );
    } catch (e: any) {
        setIsPlayStreaming(false);
        console.error("Playground Error", e);
    }
  };

  return {
    playSessions,
    activePlaySession,
    currentPlaySessionId,
    setCurrentPlaySessionId,
    playMessages,
    isPlayStreaming,
    executionLogs,
    handleNewSession,
    deleteSession,
    handlePlaygroundSend
  };
};