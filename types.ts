
export enum Role {
  USER = 'user',
  MODEL = 'model',
  SYSTEM = 'system'
}

export interface Attachment {
  mimeType: string;
  data: string; // base64
  name?: string;
}

export interface Message {
  id: string;
  role: Role;
  text: string;
  attachments?: Attachment[];
  timestamp: number;
  isStreaming?: boolean;
  agentName?: string;
  feedback?: 'up' | 'down';
}

export interface Session {
  id: string;
  title: string;
  messages: Message[];
  agentId: string;
  lastModified: number;
}

export interface UserProfile {
  name: string;
  avatar?: string; // base64
}

export type ThemeColor = 'blue' | 'emerald' | 'violet' | 'amber' | 'rose';

export interface PromptVersion {
  version: number;
  timestamp: number;
  systemInstruction: string;
  changeLog: string;
  author?: string;
}

export interface AgentMetrics {
  qualityScore: number; // 0-100, based on AI evaluation
  interactionCount: number;
  satisfactionRate: number; // 0-100, based on user thumbs up
  lastEvaluatedAt?: number;
}

export interface TestCase {
  id: string;
  input: string;
  expectedOutput?: string; // Optional "Golden Answer" for reference-based eval
}

export interface TestResult {
  testCaseId: string;
  actualOutput: string;
  score: number;
  pass: boolean;
  reasoning: string;
  timestamp: number;
}

export interface AgentConfig {
  id: string;
  name: string;
  name_zh: string;
  description: string;
  description_zh: string;
  systemInstruction: string; // The "Live" prompt
  icon: string;
  color: string;
  themeColor: ThemeColor;
  model: string;
  
  // Version Control & Evaluation
  promptVersions?: PromptVersion[];
  currentVersion?: number;
  metrics?: AgentMetrics;
  
  // AgentOps / Dev Mode
  draftConfig?: Partial<AgentConfig>; // Work-in-progress changes
  testCases?: TestCase[];
  lastTestResults?: TestResult[];
}

export interface ModelOption {
  id: string;
  name: string;
  description: string;
  description_zh: string;
}

export type KnowledgeStatus = 'uploading' | 'uploaded' | 'processing' | 'indexing' | 'ready' | 'error';
export type ChunkingStrategy = 'fixed' | 'semantic' | 'hierarchical';

export interface KnowledgeBaseItem {
  id: string;
  name: string;
  description: string;
  createdAt: number;
  updatedAt: number;
}

export interface KnowledgeDocument {
  id: string;
  knowledgeBaseId: string; // Link to parent base
  name: string;
  type: 'pdf' | 'txt' | 'md';
  size: number;
  status: KnowledgeStatus;
  progress: number; // 0-100
  uploadedAt: number;
  chunkingStrategy: ChunkingStrategy;
  content?: string; 
}

export const AVAILABLE_MODELS: ModelOption[] = [
  { 
    id: 'gemini-2.5-flash', 
    name: 'Gemini 2.5 Flash', 
    description: 'Balanced speed & intelligence',
    description_zh: '平衡速度与智能'
  },
  { 
    id: 'gemini-flash-lite-latest', 
    name: 'Gemini 2.5 Flash Lite', 
    description: 'Fastest, lowest cost',
    description_zh: '速度最快，成本最低'
  },
  { 
    id: 'gemini-3-pro-preview', 
    name: 'Gemini 3.0 Pro', 
    description: 'Reasoning & complex tasks',
    description_zh: '推理与复杂任务'
  },
];

export const DEFAULT_AGENTS: AgentConfig[] = [
  {
    id: 'general',
    name: 'Orchestrator',
    name_zh: '全能助手',
    description: 'General purpose assistant',
    description_zh: '通用任务处理与协调',
    systemInstruction: 'You are the Orchestrator, a helpful and precise AI assistant within the AgnoChat OS. You are concise, accurate, and helpful.',
    icon: 'Cpu',
    color: 'text-blue-500',
    themeColor: 'blue',
    model: 'gemini-2.5-flash',
    promptVersions: [],
    currentVersion: 1,
    metrics: { qualityScore: 95, interactionCount: 120, satisfactionRate: 98 }
  },
  {
    id: 'developer',
    name: 'Dev Architect',
    name_zh: '技术架构师',
    description: 'Code and systems engineering',
    description_zh: '代码编写与系统工程',
    systemInstruction: 'You are a Senior Software Architect. You specialize in clean code, design patterns, and scalable architecture. Provide code examples in TypeScript or Python where applicable.',
    icon: 'Terminal',
    color: 'text-emerald-500',
    themeColor: 'emerald',
    model: 'gemini-2.5-flash',
    promptVersions: [],
    currentVersion: 1,
    metrics: { qualityScore: 92, interactionCount: 85, satisfactionRate: 95 }
  },
  {
    id: 'creative',
    name: 'Creative Studio',
    name_zh: '创意工作室',
    description: 'Content creation and ideation',
    description_zh: '内容创作与灵感构思',
    systemInstruction: 'You are a Creative Director. You help with brainstorming, storytelling, and visual ideation. Your tone is inspiring and vivid.',
    icon: 'Palette',
    color: 'text-violet-500',
    themeColor: 'violet',
    model: 'gemini-2.5-flash',
    promptVersions: [],
    currentVersion: 1,
    metrics: { qualityScore: 88, interactionCount: 45, satisfactionRate: 90 }
  },
  {
    id: 'analyst',
    name: 'Data Analyst',
    name_zh: '数据分析师',
    description: 'Reasoning and data insights',
    description_zh: '逻辑推理与数据洞察',
    systemInstruction: 'You are a Data Analyst. You excel at breaking down complex problems, analyzing data patterns, and providing logical reasoning.',
    icon: 'BarChart',
    color: 'text-amber-500',
    themeColor: 'amber',
    model: 'gemini-2.5-flash',
    promptVersions: [],
    currentVersion: 1,
    metrics: { qualityScore: 94, interactionCount: 60, satisfactionRate: 92 }
  },
  {
    id: 'writer',
    name: 'Tech Writer',
    name_zh: '技术作家',
    description: 'Documentation and blogs',
    description_zh: '文档撰写与博客文章',
    systemInstruction: 'You are a professional technical writer. You write clear, concise, and engaging documentation and blog posts.',
    icon: 'Feather',
    color: 'text-rose-500',
    themeColor: 'rose',
    model: 'gemini-2.5-flash',
    promptVersions: [],
    currentVersion: 1,
    metrics: { qualityScore: 90, interactionCount: 30, satisfactionRate: 100 }
  }
];

// Export alias for backward compatibility if needed, but prefer DEFAULT_AGENTS for clarity
export const AGENTS = DEFAULT_AGENTS;
