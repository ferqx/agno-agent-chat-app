
import { AgnoAgent, AgnoSession, AgnoMessage, AgnoTeam, RunContent, RunCompleted } from '../types';

export class AgnoClient {
  private baseUrl: string;
  private apiKey?: string;

  constructor(baseUrl: string, apiKey?: string) {
    this.baseUrl = this.normalizeUrl(baseUrl);
    this.apiKey = apiKey;
  }

  private normalizeUrl(url: string) {
    if (!url) return '';
    let normalized = url.trim().replace(/\/+$/, '');
    if (!normalized.match(/^https?:\/\//)) {
      normalized = normalized.includes('localhost') || normalized.includes('127.0.0.1')
        ? `http://${normalized}`
        : `https://${normalized}`;
    }
    // removed automatic /v1 appending based on user request
    return normalized;
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }
    return headers;
  }

  private async fetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: { ...this.getHeaders(), ...options.headers },
      mode: 'cors'
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => response.statusText);
      throw new Error(`Agno API Error ${response.status}: ${errorText}`);
    }

    // Handle 204 No Content
    if (response.status === 204) return {} as T;
    return response.json();
  }

  // --- Agents ---

  async listAgents(): Promise<AgnoAgent[]> {
    const data = await this.fetch<any>('/agents/list-all-agents'); 
    return Array.isArray(data) ? data : (data.agents || []);
  }

  async cancelAgentRun(agentId: string, runId: string): Promise<void> {
    await this.fetch('/agents/cancel-agent-run', {
      method: 'POST',
      body: JSON.stringify({ agent_id: agentId, run_id: runId })
    });
  }

  async continueAgentRun(agentId: string, runId: string, input: string): Promise<void> {
    await this.fetch('/agents/continue-agent-run', {
      method: 'POST',
      body: JSON.stringify({ agent_id: agentId, run_id: runId, input })
    });
  }

  // --- Sessions ---

  async listSessions(agentId?: string, limit = 50, offset = 0): Promise<AgnoSession[]> {
    const params = new URLSearchParams({ limit: limit.toString(), offset: offset.toString() });
    if (agentId) params.append('agent_id', agentId);
    
    const data = await this.fetch<any>(`/sessions/list-sessions?${params.toString()}`);
    return Array.isArray(data) ? data : (data.sessions || []);
  }

  async getSession(sessionId: string): Promise<AgnoSession & { messages?: AgnoMessage[] }> {
    // Assuming response structure contains session details + messages
    return this.fetch<AgnoSession & { messages?: AgnoMessage[] }>(`/sessions/get-session-by-id?session_id=${sessionId}`);
  }

  async createSession(agentId: string, title?: string): Promise<AgnoSession> {
    return this.fetch<AgnoSession>('/sessions/create-new-session', {
      method: 'POST',
      body: JSON.stringify({ agent_id: agentId, title })
    });
  }

  async renameSession(sessionId: string, title: string): Promise<AgnoSession> {
    return this.fetch<AgnoSession>('/sessions/rename-session', {
      method: 'POST',
      body: JSON.stringify({ session_id: sessionId, title })
    });
  }

  async deleteSession(sessionId: string): Promise<void> {
    // Using POST based on typical Agno action patterns, documentation implies it's an action
    await this.fetch<void>('/sessions/delete-session', {
      method: 'POST',
      body: JSON.stringify({ session_id: sessionId })
    });
  }

  async updateSession(sessionId: string, sessionData: Partial<AgnoSession>): Promise<AgnoSession> {
    return this.fetch<AgnoSession>('/sessions/update-session', {
      method: 'POST',
      body: JSON.stringify({ session_id: sessionId, ...sessionData })
    });
  }

  // --- Teams ---

  async listTeams(): Promise<AgnoTeam[]> {
    const data = await this.fetch<any>('/teams/list-all-teams');
    return Array.isArray(data) ? data : (data.teams || []);
  }

  async getTeamDetails(teamId: string): Promise<AgnoTeam> {
    return this.fetch<AgnoTeam>(`/teams/get-team-details?team_id=${teamId}`);
  }

  async createTeamRun(teamId: string, input: string, sessionId?: string): Promise<any> {
    return this.fetch('/teams/create-team-run', {
      method: 'POST',
      body: JSON.stringify({ team_id: teamId, input, session_id: sessionId })
    });
  }

  async cancelTeamRun(teamId: string, runId: string): Promise<void> {
    await this.fetch('/teams/cancel-team-run', {
      method: 'POST',
      body: JSON.stringify({ team_id: teamId, run_id: runId })
    });
  }

  // --- Runs (Streaming) ---

  async createAgentRunStream(
    agentId: string,
    sessionId: string | undefined,
    input: string,
    onChunk: (content: string) => void,
    onComplete: (fullContent: string, metrics?: any) => void,
    onError: (error: Error) => void
  ): Promise<void> {
    
    try {
      console.log('[Agno] Creating agent run stream for agent:', agentId);
      const response = await fetch(`${this.baseUrl}/agents/create-agent-run`, {
        method: 'POST',
        headers: this.getHeaders(),
        mode: 'cors',
        body: JSON.stringify({
          agent_id: agentId,
          session_id: sessionId,
          input: input,
          stream: true
        })
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Run failed: ${response.status} ${text}`);
      }
      
      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;
          
          // Handle SSE format (data: ...)
          const jsonStr = line.startsWith('data: ') ? line.slice(6).trim() : line.trim();
          if (jsonStr === '[DONE]') continue;
          
          try {
            const event = JSON.parse(jsonStr);
            
            if (event.event === 'RunContent') {
               const content = (event as RunContent).content;
               if (content) {
                 accumulatedText += content;
                 onChunk(accumulatedText);
               }
            } else if (event.event === 'RunCompleted') {
               const completed = event as RunCompleted;
               // If completed event has full content, prioritize it
               if (completed.content) {
                 accumulatedText = completed.content;
                 onChunk(accumulatedText);
               }
               onComplete(accumulatedText, completed.metrics);
               return; 
            }
          } catch (e) {
            console.warn('Error parsing SSE event chunk:', e);
          }
        }
      }
      // Fallback complete if no RunCompleted event
      onComplete(accumulatedText);
    } catch (err) {
      onError(err instanceof Error ? err : new Error('Unknown stream error'));
    }
  }

  // --- Core ---
  
  async getOsConfig(): Promise<any> {
    return this.fetch('/core/get-os-configuration');
  }
}
