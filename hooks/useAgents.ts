
import { useState, useEffect } from 'react';
import { AgentConfig, DEFAULT_AGENTS, PromptVersion, AgentMetrics, TestCase } from '../types';

const STORAGE_KEY = 'agno_agents_v2'; // Bump version to avoid schema conflicts

export const useAgents = () => {
  const [agents, setAgents] = useState<AgentConfig[]>([]);

  // Initialize agents
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setAgents(parsed);
      } catch (e) {
        setAgents(DEFAULT_AGENTS);
      }
    } else {
      // Initialize defaults with new fields if needed
      const initializedDefaults = DEFAULT_AGENTS.map(agent => ({
        ...agent,
        promptVersions: agent.promptVersions || [],
        metrics: agent.metrics || { qualityScore: 80, interactionCount: 0, satisfactionRate: 0 },
        testCases: [],
        draftConfig: undefined 
      }));
      setAgents(initializedDefaults);
    }
  }, []);

  // Save
  useEffect(() => {
    if (agents.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(agents));
    }
  }, [agents]);

  /**
   * Updates the DRAFT configuration.
   * Does NOT affect the live agent until published.
   */
  const saveDraft = (id: string, draftUpdates: Partial<AgentConfig>) => {
    setAgents(prev => prev.map(agent => {
      if (agent.id !== id) return agent;
      
      // Merge with existing draft or create new one based on current config
      const currentDraft = agent.draftConfig || { 
        name: agent.name, 
        description: agent.description, 
        systemInstruction: agent.systemInstruction 
      };

      return {
        ...agent,
        draftConfig: {
          ...currentDraft,
          ...draftUpdates
        }
      };
    }));
  };

  /**
   * Discards the draft, reverting to live config.
   */
  const discardDraft = (id: string) => {
    setAgents(prev => prev.map(agent => {
      if (agent.id !== id) return agent;
      return { ...agent, draftConfig: undefined };
    }));
  };

  /**
   * Publishes the draft configuration to Live.
   * Creates a version history entry.
   */
  const publishDraft = (id: string, changeLog: string) => {
    setAgents(prev => prev.map(agent => {
      if (agent.id !== id || !agent.draftConfig) return agent;

      const draft = agent.draftConfig;
      const newVersionNumber = (agent.currentVersion || 0) + 1;
      
      // Create version history if prompt changed
      let newVersions = agent.promptVersions || [];
      if (draft.systemInstruction && draft.systemInstruction !== agent.systemInstruction) {
        const versionEntry: PromptVersion = {
          version: newVersionNumber,
          timestamp: Date.now(),
          systemInstruction: draft.systemInstruction,
          changeLog: changeLog || 'Published from draft',
          author: 'Admin'
        };
        newVersions = [versionEntry, ...newVersions];
      }

      return {
        ...agent,
        ...draft, // Apply draft properties to root (Live)
        currentVersion: newVersionNumber,
        promptVersions: newVersions,
        draftConfig: undefined // Clear draft
      };
    }));
  };

  /**
   * Updates test cases for an agent.
   */
  const updateTestCases = (id: string, testCases: TestCase[]) => {
    setAgents(prev => prev.map(agent => {
      if (agent.id !== id) return agent;
      return { ...agent, testCases };
    }));
  };

  /**
   * Legacy update method (mostly for non-prompt fields if needed)
   */
  const updateAgent = (id: string, updates: Partial<AgentConfig>) => {
     setAgents(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
  };

  const createAgent = (agent: AgentConfig) => {
    setAgents(prev => [...prev, agent]);
  };

  const deleteAgent = (id: string) => {
    setAgents(prev => prev.filter(a => a.id !== id));
  };

  const restoreVersion = (agentId: string, versionNumber: number) => {
    // When restoring, we essentially load that version into the DRAFT
    setAgents(prev => prev.map(agent => {
      if (agent.id !== agentId) return agent;
      const target = agent.promptVersions?.find(v => v.version === versionNumber);
      if (!target) return agent;

      return {
        ...agent,
        draftConfig: {
          ...(agent.draftConfig || {}),
          systemInstruction: target.systemInstruction,
        }
      };
    }));
  };

  return {
    agents,
    saveDraft,
    discardDraft,
    publishDraft,
    updateTestCases,
    updateAgent,
    createAgent,
    deleteAgent,
    restoreVersion
  };
};
