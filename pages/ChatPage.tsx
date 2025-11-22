
import React, { useState, useRef, useEffect } from 'react';
import { Role, ThemeColor, AgentConfig } from '../types';
import { AgentSelector } from '../components/AgentSelector';
import { ChatInput } from '../components/ChatInput';
import { MessageBubble } from '../components/MessageBubble';
import { ModelSelector } from '../components/ModelSelector';
import { SessionList } from '../components/SessionList';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { UserMenu } from '../components/UserMenu';
import { UserSettingsModal } from '../components/UserSettingsModal';
import { AdminDashboard } from '../components/AdminDashboard';
import { Icon } from '../components/Icon';
import { translations, Language } from '../translations';
import { Tooltip } from '../components/Tooltip';
import { useTheme } from '../hooks/useTheme';
import { useUserProfile } from '../hooks/useUserProfile';
import { useChat } from '../hooks/useChat';
import { useAgents } from '../hooks/useAgents';

// Color palettes for dynamic theming
const THEME_COLORS: Record<ThemeColor, Record<string, string>> = {
  blue: {
    50: '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe', 300: '#93c5fd', 400: '#60a5fa',
    500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8', 800: '#1e40af', 900: '#1e3a8a', 950: '#172554'
  },
  emerald: {
    50: '#ecfdf5', 100: '#d1fae5', 200: '#a7f3d0', 300: '#6ee7b7', 400: '#34d399',
    500: '#10b981', 600: '#059669', 700: '#047857', 800: '#065f46', 900: '#064e3b', 950: '#022c22'
  },
  violet: {
    50: '#f5f3ff', 100: '#ede9fe', 200: '#ddd6fe', 300: '#c4b5fd', 400: '#a78bfa',
    500: '#8b5cf6', 600: '#7c3aed', 700: '#6d28d9', 800: '#5b21b6', 900: '#4c1d95', 950: '#2e1065'
  },
  amber: {
    50: '#fffbeb', 100: '#fef3c7', 200: '#fde68a', 300: '#fcd34d', 400: '#fbbf24',
    500: '#f59e0b', 600: '#d97706', 700: '#b45309', 800: '#92400e', 900: '#78350f', 950: '#451a03'
  },
  rose: {
    50: '#fff1f2', 100: '#ffe4e6', 200: '#fecdd3', 300: '#fda4af', 400: '#fb7185',
    500: '#f43f5e', 600: '#e11d48', 700: '#be123c', 800: '#9f1239', 900: '#881337', 950: '#4c0519'
  }
};

interface ChatPageProps {
  onLogout: () => void;
}

export const ChatPage: React.FC<ChatPageProps> = ({ onLogout }) => {
  // View State: 'chat' or 'admin'
  const [currentView, setCurrentView] = useState<'chat' | 'admin'>('chat');

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [deleteSessionId, setDeleteSessionId] = useState<string | null>(null);
  const [showClearModal, setShowClearModal] = useState(false);
  const [language, setLanguage] = useState<Language>('zh');
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const savedLang = localStorage.getItem('language') as Language;
    if (savedLang === 'en' || savedLang === 'zh') {
      setLanguage(savedLang);
    }
  }, []);

  const toggleLanguage = () => {
    const newLang = language === 'zh' ? 'en' : 'zh';
    setLanguage(newLang);
    localStorage.setItem('language', newLang);
  };

  const { themeMode, toggleTheme, getThemeIcon, getThemeTitle } = useTheme(language);
  const { userProfile, saveUserProfile } = useUserProfile();
  
  // Load dynamic agents
  const { agents } = useAgents();

  const {
    sessions,
    currentSessionId,
    messages,
    activeAgent,
    setActiveAgent,
    modelId,
    setModelId,
    isStreaming,
    suggestions,
    isGeneratingSuggestions,
    clearSuggestions,
    handleSendMessage,
    handleEditMessage,
    handleDeleteMessage,
    handleFeedback,
    handleDeleteSession,
    handleClearChat,
    handleExportChat,
    handleNewChat,
    handleSelectSession
  } = useChat(language, userProfile, agents); // Pass dynamic agents

  const t = translations[language];

  // Dynamic Theme Injection
  useEffect(() => {
    const theme = THEME_COLORS[activeAgent.themeColor || 'blue'];
    const root = document.documentElement;
    
    Object.entries(theme).forEach(([shade, color]) => {
      root.style.setProperty(`--color-primary-${shade}`, color as string);
    });
  }, [activeAgent]);

  // Smart Scroll Logic
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (currentView === 'chat') {
      scrollToBottom();
    }
  }, [messages.length, isStreaming, suggestions.length, currentView]);

  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      setShowScrollBottom(!isNearBottom);
    }
  };

  const onNewChat = () => {
    handleNewChat();
    if (window.innerWidth < 768) setSidebarOpen(false);
  };

  const onSelectSession = (id: string) => {
    handleSelectSession(id);
    if (window.innerWidth < 768) setSidebarOpen(false);
  };
  
  const onSelectAgent = (agent: AgentConfig) => {
    setActiveAgent(agent);
    handleNewChat();
    if (window.innerWidth < 768) setSidebarOpen(false);
  };

  // If in Admin View, render AdminDashboard
  if (currentView === 'admin') {
    return (
      <AdminDashboard 
        onBack={() => setCurrentView('chat')} 
        language={language}
      />
    );
  }

  return (
    <div className="flex h-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden font-sans transition-colors duration-500">
      <ConfirmationModal 
        isOpen={!!deleteSessionId}
        title={t.deleteChatTitle}
        message={t.deleteChatMsg}
        onConfirm={() => {
          if (deleteSessionId) handleDeleteSession(deleteSessionId);
          setDeleteSessionId(null);
        }}
        onCancel={() => setDeleteSessionId(null)}
      />

      <ConfirmationModal 
        isOpen={showClearModal}
        title={t.clearChatTitle}
        message={t.clearChatMsg}
        onConfirm={() => {
          handleClearChat();
          setShowClearModal(false);
        }}
        onCancel={() => setShowClearModal(false)}
      />
      
      <UserSettingsModal
        isOpen={isUserModalOpen}
        userProfile={userProfile}
        onSave={saveUserProfile}
        onClose={() => setIsUserModalOpen(false)}
        language={language}
      />

      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-80 translate-x-0' : 'w-0 -translate-x-full opacity-0'} 
        transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1) bg-slate-100/80 dark:bg-black/20 backdrop-blur-xl border-r border-white/20 dark:border-white/5 flex flex-col h-full fixed md:relative z-30 shadow-2xl md:shadow-none`}>
        
        <div className="p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/20 text-white transition-colors duration-300">
              <Icon name="Zap" size={20} />
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-tight text-slate-900 dark:text-white leading-none">
                Agno<span className="text-primary-500 transition-colors duration-300">Chat</span>
              </h1>
              <span className="text-[10px] text-slate-500 font-medium tracking-widest uppercase">Agentic OS</span>
            </div>
          </div>
          <button 
            onClick={() => setSidebarOpen(false)} 
            className="md:hidden p-2 hover:bg-black/5 rounded-lg transition-colors"
          >
            <Icon name="X" size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-hidden px-2">
          <SessionList 
            sessions={sessions}
            currentSessionId={currentSessionId}
            onSelectSession={onSelectSession}
            onDeleteSession={setDeleteSessionId}
            onNewChat={onNewChat}
            language={language}
          />
        </div>

        <div className="shrink-0 p-2 space-y-2">
          <AgentSelector 
            currentAgent={activeAgent} 
            onSelectAgent={onSelectAgent}
            language={language}
          />
            <UserMenu 
              userProfile={userProfile}
              onClick={() => setIsUserModalOpen(true)}
              onLogout={onLogout}
              onAdmin={() => setCurrentView('admin')}
              language={language}
            />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full relative w-full bg-texture transition-colors duration-300">
        
        {/* Modern Header */}
        <header className="h-16 absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 sm:px-6 bg-gradient-to-b from-slate-50/90 to-slate-50/0 dark:from-slate-950/90 dark:to-slate-950/0 pointer-events-none">
          <div className="pointer-events-auto flex items-center gap-4">
            {!sidebarOpen && (
              <button 
                onClick={() => setSidebarOpen(true)}
                className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm text-slate-500 hover:text-primary-600 hover:border-primary-200 transition-all hover:shadow-md group"
              >
                <Icon name="PanelLeft" size={20} className="group-hover:scale-110 transition-transform" />
              </button>
            )}
            <div className="flex items-center gap-3 backdrop-blur-md bg-white/50 dark:bg-black/50 px-3 py-1.5 rounded-full border border-white/20 dark:border-white/5 shadow-sm">
                <Icon name={activeAgent.icon} className="text-primary-600 dark:text-primary-400 transition-colors duration-300" size={16} />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  {language === 'zh' ? activeAgent.name_zh : activeAgent.name}
                </span>
            </div>
          </div>

          <div className="pointer-events-auto flex items-center gap-2 backdrop-blur-md bg-white/50 dark:bg-black/50 p-1 rounded-2xl border border-white/20 dark:border-white/5 shadow-sm">
              <ModelSelector selectedModelId={modelId} onSelectModel={setModelId} language={language} />
              <div className="w-px h-4 bg-slate-300 dark:bg-slate-700 mx-1"></div>
              
              <Tooltip content={t.switchLanguage}>
                <button onClick={toggleLanguage} className="w-8 h-8 flex items-center justify-center text-[10px] font-bold rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-colors">
                  {language === 'zh' ? '中' : 'EN'}
                </button>
              </Tooltip>

              <Tooltip content={getThemeTitle()}>
                <button onClick={toggleTheme} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-colors text-slate-500">
                  <Icon name={getThemeIcon()} size={16} />
                </button>
              </Tooltip>

              <Tooltip content={t.clear}>
                <button 
                  onClick={() => { if (currentSessionId && messages.length > 0) setShowClearModal(true); }}
                  disabled={!currentSessionId || messages.length === 0}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-slate-400 hover:text-red-500 transition-colors disabled:opacity-30"
                >
                  <Icon name="Eraser" size={16} />
                </button>
              </Tooltip>

              <Tooltip content={t.export}>
                <button 
                  onClick={handleExportChat}
                  disabled={!currentSessionId || messages.length === 0}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-800/50 text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors disabled:opacity-30"
                >
                  <Icon name="Download" size={16} />
                </button>
              </Tooltip>
          </div>
        </header>

        {/* Scrollable Chat Area */}
        <main 
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto scroll-smooth relative z-0 pt-24 pb-64"
        >
          <div className="max-w-3xl mx-auto px-4">
            {messages.length === 0 ? (
              <div className="min-h-[60vh] flex flex-col items-center justify-center text-center animate-in fade-in slide-in-from-bottom-8 duration-700">
                {/* Enhanced Welcome Hero */}
                <div className="relative mb-10 group">
                  <div className="absolute inset-0 bg-gradient-to-r from-primary-400 to-primary-600 rounded-full blur-3xl opacity-20 group-hover:opacity-40 transition-opacity duration-700 animate-pulse-slow"></div>
                  <div className="relative w-24 h-24 bg-white dark:bg-slate-900 rounded-[2rem] flex items-center justify-center shadow-2xl ring-1 ring-slate-200 dark:ring-slate-800 transform group-hover:scale-110 transition-all duration-500 rotate-0 group-hover:rotate-3">
                    <Icon name={activeAgent.icon} size={48} className="text-primary-600 dark:text-primary-400 transition-colors duration-300" />
                  </div>
                </div>
                
                <h1 className="text-5xl font-bold mb-6 tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 via-slate-700 to-slate-900 dark:from-white dark:via-slate-300 dark:to-white">
                    {t.hello} <span className="text-primary-600 dark:text-primary-400 transition-colors duration-300">{language === 'zh' ? activeAgent.name_zh : activeAgent.name}</span>
                </h1>
                <p className="text-slate-500 dark:text-slate-400 text-lg max-w-md mb-10 leading-relaxed font-light">
                    {language === 'zh' ? activeAgent.description_zh : activeAgent.description}
                </p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-xl">
                    {t.hints.map((hint, i) => (
                      <button 
                        key={i}
                        onClick={() => handleSendMessage(hint, [])}
                        className="group p-4 text-left bg-white/60 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-primary-400 dark:hover:border-primary-500 hover:shadow-lg dark:hover:shadow-primary-900/20 transition-all duration-300 backdrop-blur-sm"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <Icon name="MessageSquare" size={16} className="text-slate-400 group-hover:text-primary-500 transition-colors" />
                          <Icon name="ArrowRight" size={14} className="text-slate-300 group-hover:text-primary-500 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                        </div>
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                          {hint}
                        </span>
                      </button>
                    ))}
                </div>
              </div>
            ) : (
              <>
                {messages.map((msg, index) => (
                  <MessageBubble 
                    key={msg.id} 
                    message={msg} 
                    isLast={index === messages.length - 1}
                    onEdit={msg.role === Role.USER ? (newText) => handleEditMessage(msg.id, newText) : undefined}
                    onFeedback={msg.role === Role.MODEL ? (type) => handleFeedback(msg.id, type) : undefined}
                    onDelete={() => handleDeleteMessage(msg.id)}
                    language={language}
                    userProfile={userProfile}
                  />
                ))}
                <div ref={messagesEndRef} className="h-4" />
              </>
            )}
          </div>
        </main>

        {/* Floating Scroll Button */}
        {showScrollBottom && (
          <button
            onClick={scrollToBottom}
            className="absolute bottom-32 right-8 z-10 p-2 bg-white dark:bg-slate-800 rounded-full shadow-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-primary-600 transition-all hover:-translate-y-1 animate-in fade-in zoom-in"
          >
            <Icon name="ArrowDown" size={20} />
          </button>
        )}

        {/* Floating Input Container - Enhanced Gradient and spacing */}
        <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-slate-50 via-slate-50/95 to-transparent dark:from-slate-950 dark:via-slate-950/95 pt-20 pointer-events-none pb-8">
          <div className="pointer-events-auto">
            <ChatInput 
              onSendMessage={handleSendMessage} 
              isStreaming={isStreaming} 
              language={language} 
              suggestions={suggestions}
              isGeneratingSuggestions={isGeneratingSuggestions}
              onClearSuggestions={clearSuggestions}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
