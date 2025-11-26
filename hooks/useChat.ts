
import { useState, useEffect, useCallback } from 'react';
import { Session, Message, Role, AgentConfig, Attachment, UserProfile, KnowledgeDocument, AGENTS } from '../types';
import { Language } from '../translations';
import { AgnoClient } from '../lib/agno';

export const useChat = (
  language: Language,
  userProfile: UserProfile,
  availableAgents: AgentConfig[],
  documents: KnowledgeDocument[]
) => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  
  // Ensure activeAgent is never undefined by falling back to AGENTS[0]
  const [activeAgent, setActiveAgent] = useState<AgentConfig>(
    availableAgents.length > 0 ? availableAgents[0] : AGENTS[0]
  );
  
  const [modelId, setModelId] = useState<string>('gemini-2.5-flash');
  const [client, setClient] = useState<AgnoClient | null>(null);

  // Initialize Agno Client
  useEffect(() => {
    const baseUrl = localStorage.getItem('agno_base_url') || '';
    const apiKey = localStorage.getItem('agno_api_key');
    if (baseUrl) {
      setClient(new AgnoClient(baseUrl, apiKey || undefined));
    }
  }, []);

  // Reload Client on settings change
  useEffect(() => {
    const handleSettingsUpdate = () => {
      const baseUrl = localStorage.getItem('agno_base_url') || '';
      const apiKey = localStorage.getItem('agno_api_key');
      if (baseUrl) setClient(new AgnoClient(baseUrl, apiKey || undefined));
    };
    window.addEventListener('agno_settings_updated', handleSettingsUpdate);
    return () => window.removeEventListener('agno_settings_updated', handleSettingsUpdate);
  }, []);

  // Fetch Sessions from Server
  const refreshSessions = useCallback(async () => {
    if (!client) return;
    try {
      // Fetch sessions, possibly filtered by agent if needed
      const agnoSessions = await client.listSessions(activeAgent?.id);
      const mappedSessions: Session[] = agnoSessions.map(s => ({
        id: s.session_id,
        title: s.title || 'Untitled Chat',
        messages: [], // Will load on select
        agentId: s.agent_id,
        lastModified: s.updated_at * 1000 || Date.now()
      }));
      setSessions(mappedSessions);
    } catch (e) {
      console.error("Failed to fetch sessions:", e);
    }
  }, [client, activeAgent?.id]);

  useEffect(() => {
    refreshSessions();
  }, [refreshSessions]);

  // Sync active agent
  useEffect(() => {
    if (availableAgents.length > 0) {
        const exists = availableAgents.find(a => a.id === activeAgent?.id);
        if (!exists) {
            setActiveAgent(availableAgents[0]);
        }
    }
  }, [availableAgents, activeAgent]);

  // Load Messages when Session Selected
  useEffect(() => {
    const loadSessionHistory = async () => {
      if (currentSessionId && client) {
        try {
          const sessionData = await client.getSession(currentSessionId);
          if (sessionData.messages) {
            const mappedMessages: Message[] = sessionData.messages.map((m, idx) => ({
              id: `${currentSessionId}-${idx}`,
              role: m.role === 'user' ? Role.USER : Role.MODEL,
              text: m.content,
              timestamp: m.created_at * 1000,
              agentName: m.role === 'model' ? activeAgent.name : undefined
            }));
            setMessages(mappedMessages);
          }
        } catch (e) {
          console.error("Failed to load session history:", e);
        }
      } else {
        setMessages([]);
      }
    };
    loadSessionHistory();
  }, [currentSessionId, client, activeAgent.name]);

  const handleSendMessage = async (text: string, attachments: Attachment[]) => {
    if (!activeAgent || !client) return;

    let sessionId = currentSessionId;

    // Create session if needed
    if (!sessionId) {
      try {
        const newSession = await client.createSession(activeAgent.id, text.slice(0, 30));
        sessionId = newSession.session_id;
        setCurrentSessionId(sessionId);
        refreshSessions();
      } catch (e) {
        console.error("Failed to create session:", e);
        return;
      }
    }

    const userMsg: Message = {
      id: Date.now().toString(),
      role: Role.USER,
      text,
      attachments,
      timestamp: Date.now()
    };

    // Optimistic update
    setMessages(prev => [...prev, userMsg]);
    setIsStreaming(true);

    const botMsgId = (Date.now() + 1).toString();
    const botMsg: Message = {
      id: botMsgId,
      role: Role.MODEL,
      text: '',
      timestamp: Date.now(),
      isStreaming: true,
      agentName: activeAgent.name,
      logs: []
    };
    
    setMessages(prev => [...prev, botMsg]);

    try {
      await client.createAgentRunStream(
        activeAgent.id,
        sessionId,
        text,
        (chunk) => {
          setMessages(prev => prev.map(m => m.id === botMsgId ? { ...m, text: chunk } : m));
        },
        (fullText, metrics) => {
           setMessages(prev => prev.map(m => m.id === botMsgId ? { ...m, text: fullText, isStreaming: false, metrics } : m));
           setIsStreaming(false);
           refreshSessions(); // Update timestamps/list
        },
        (err) => {
           setMessages(prev => prev.map(m => m.id === botMsgId ? { ...m, text: "Error: " + err.message, isStreaming: false } : m));
           setIsStreaming(false);
        }
      );
    } catch (e) {
      console.error(e);
      setIsStreaming(false);
    }
  };

  const handleEditMessage = (id: string, newText: string) => {
    // Implement logic to edit user message and regenerate response if backend supports it
    // For now, update local state
    setMessages(prev => prev.map(m => m.id === id ? { ...m, text: newText } : m));
  };

  const handleDeleteMessage = (id: string) => {
    // Optimistic delete
    setMessages(prev => prev.filter(m => m.id !== id));
  };

  const handleDeleteSession = async (id: string) => {
    if (client) {
      await client.deleteSession(id);
      refreshSessions();
      if (currentSessionId === id) setCurrentSessionId(null);
    }
  };

  const handleNewChat = () => {
    setCurrentSessionId(null);
    setMessages([]);
  };

  const handleClearChat = async () => {
    // Agno doesn't have a direct "clear messages" endpoint usually, typically we delete and recreate or just create new
    if (currentSessionId && client) {
       // Logic: Delete and create new with same ID? Not possible.
       // Just clear local messages or create new session.
       // For this implementation, we'll just start a new session.
       handleNewChat();
    }
  };

  return {
    sessions,
    currentSessionId,
    setCurrentSessionId,
    messages,
    isStreaming,
    activeAgent,
    setActiveAgent,
    modelId,
    setModelId,
    suggestions: [],
    isGeneratingSuggestions: false,
    clearSuggestions: () => {},
    handleSendMessage,
    handleEditMessage,
    handleDeleteMessage,
    handleFeedback: (messageId: string, type: 'up' | 'down') => {
      console.log(`Feedback for ${messageId}: ${type}`);
    },
    handleDeleteSession,
    handleNewChat,
    handleClearChat,
    handleExportChat: () => {},
    handleSelectSession: setCurrentSessionId
  };
};