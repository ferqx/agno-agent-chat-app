import { useState, useEffect } from 'react';
import { EvaluationSuite, EvaluationRun, EvaluationCase, AgentConfig, TestResult } from '../types';
import { AgnoClient } from '../lib/agno';
import { evaluateTestCase } from '../services/evaluationService';

const SUITES_KEY = 'agno_eval_suites';
const RUNS_KEY = 'agno_eval_runs';

export const useEvaluation = () => {
  const [suites, setSuites] = useState<EvaluationSuite[]>([]);
  const [runs, setRuns] = useState<EvaluationRun[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    const savedSuites = localStorage.getItem(SUITES_KEY);
    const savedRuns = localStorage.getItem(RUNS_KEY);
    
    if (savedSuites) {
      try { setSuites(JSON.parse(savedSuites)); } catch (e) {}
    }
    if (savedRuns) {
      try { setRuns(JSON.parse(savedRuns)); } catch (e) {}
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(SUITES_KEY, JSON.stringify(suites));
  }, [suites]);

  useEffect(() => {
    localStorage.setItem(RUNS_KEY, JSON.stringify(runs));
  }, [runs]);

  // --- Suite Management ---

  const createSuite = (name: string, description: string) => {
    const newSuite: EvaluationSuite = {
      id: Date.now().toString(),
      name,
      description,
      cases: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    setSuites(prev => [newSuite, ...prev]);
    return newSuite.id;
  };

  const updateSuite = (id: string, updates: Partial<EvaluationSuite>) => {
    setSuites(prev => prev.map(s => s.id === id ? { ...s, ...updates, updatedAt: Date.now() } : s));
  };

  const deleteSuite = (id: string) => {
    setSuites(prev => prev.filter(s => s.id !== id));
    setRuns(prev => prev.filter(r => r.suiteId !== id));
  };

  const updateSuiteCases = (suiteId: string, cases: EvaluationCase[]) => {
    setSuites(prev => prev.map(s => s.id === suiteId ? { ...s, cases, updatedAt: Date.now() } : s));
  };

  // --- Runner Logic ---

  const runSuite = async (suiteId: string, agent: AgentConfig) => {
    const suite = suites.find(s => s.id === suiteId);
    if (!suite || suite.cases.length === 0) return;

    const baseUrl = localStorage.getItem('agno_base_url');
    const apiKey = localStorage.getItem('agno_api_key');
    if (!baseUrl) {
        alert("Service URL missing");
        return;
    }
    const client = new AgnoClient(baseUrl, apiKey || undefined);

    setIsRunning(true);
    const results: TestResult[] = [];
    const runId = Date.now().toString();
    
    for (const testCase of suite.cases) {
      if (!testCase.input.trim()) continue;

      try {
        let actualOutput = "";
        
        // 1. Create ephemeral session for test
        const session = await client.createSession(agent.id, "Eval Run");

        // 2. Generate Response
        await new Promise<void>((resolve) => {
          client.createAgentRunStream(
            agent.id,
            session.session_id,
            testCase.input,
            () => {}, 
            (fullText) => {
              actualOutput = fullText;
              resolve();
            },
            (err) => {
              actualOutput = "Error: " + err.message;
              resolve();
            }
          );
        });

        // 3. Cleanup Session
        await client.deleteSession(session.session_id);

        // 4. Judge Response
        const evalResult = await evaluateTestCase(
          testCase.input,
          actualOutput,
          testCase.expectedOutput || '',
          agent.systemInstruction
        );
        
        evalResult.testCaseId = testCase.id;
        results.push(evalResult);

      } catch (e) {
        console.error("Run error", e);
      }
    }

    const totalScore = results.reduce((acc, r) => acc + r.score, 0);
    const avgScore = results.length > 0 ? Math.round(totalScore / results.length) : 0;

    const newRun: EvaluationRun = {
      id: runId,
      suiteId,
      suiteNameSnapshot: suite.name,
      agentId: agent.id,
      agentNameSnapshot: agent.name,
      agentVersionSnapshot: agent.currentVersion || 1,
      timestamp: Date.now(),
      overallScore: avgScore,
      results
    };

    setRuns(prev => [newRun, ...prev]);
    setIsRunning(false);
  };

  const getRunsBySuite = (suiteId: string) => {
    return runs.filter(r => r.suiteId === suiteId).sort((a, b) => b.timestamp - a.timestamp);
  };

  return {
    suites,
    createSuite,
    updateSuite,
    deleteSuite,
    updateSuiteCases,
    runSuite,
    getRunsBySuite,
    isRunning,
    runs
  };
};