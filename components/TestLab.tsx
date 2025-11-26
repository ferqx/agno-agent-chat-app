import React, { useState } from 'react';
import { AgentConfig, TestCase, TestResult } from '../types';
import { Icon } from './Icon';
import { translations, Language } from '../translations';
import { evaluateTestCase } from '../services/evaluationService';
import { StatusBadge } from './StatusBadge';
import { AgnoClient } from '../lib/agno';

interface TestLabProps {
  agent: AgentConfig;
  testCases: TestCase[];
  onUpdateTestCases: (cases: TestCase[]) => void;
  language: Language;
}

export const TestLab: React.FC<TestLabProps> = ({ agent, testCases, onUpdateTestCases, language }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<Record<string, TestResult>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editInput, setEditInput] = useState('');
  const [editExpected, setEditExpected] = useState('');
  const t = translations[language];

  const handleAdd = () => {
    const newCase: TestCase = {
      id: Date.now().toString(),
      input: '',
      expectedOutput: ''
    };
    onUpdateTestCases([...testCases, newCase]);
    setEditingId(newCase.id);
    setEditInput('');
    setEditExpected('');
  };

  const handleDelete = (id: string) => {
    onUpdateTestCases(testCases.filter(c => c.id !== id));
    const newResults = { ...results };
    delete newResults[id];
    setResults(newResults);
  };

  const handleSaveCase = (id: string) => {
    onUpdateTestCases(testCases.map(c => 
      c.id === id ? { ...c, input: editInput, expectedOutput: editExpected } : c
    ));
    setEditingId(null);
  };

  const runTests = async () => {
    const baseUrl = localStorage.getItem('agno_base_url');
    if (!baseUrl) {
        alert("Agno Service URL is required.");
        return;
    }
    
    setIsRunning(true);
    const client = new AgnoClient(baseUrl, localStorage.getItem('agno_api_key') || undefined);
    const newResults: Record<string, TestResult> = {};

    for (const testCase of testCases) {
      if (!testCase.input.trim()) continue;

      try {
        let actualOutput = "";
        
        // Run against Agent via Agno
        const session = await client.createSession(agent.id, "Test Lab");
        
        await new Promise<void>((resolve, reject) => {
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
        
        await client.deleteSession(session.session_id);

        const evalResult = await evaluateTestCase(
          testCase.input,
          actualOutput,
          testCase.expectedOutput,
          agent.systemInstruction
        );
        
        evalResult.testCaseId = testCase.id;
        newResults[testCase.id] = evalResult;
        setResults(prev => ({ ...prev, [testCase.id]: evalResult }));

      } catch (e) {
        console.error(e);
      }
    }
    setIsRunning(false);
  };

  return (
    <div className="h-full flex flex-col animate-in fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-bold text-slate-900 dark:text-white text-lg">{t.testLab}</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {testCases.length} cases defined.
          </p>
        </div>
        <div className="flex gap-3">
           <button
             onClick={handleAdd}
             className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-xs font-medium"
           >
             <Icon name="Plus" size={14} />
             {t.addTestCase}
           </button>
           <button
             onClick={runTests}
             disabled={isRunning || testCases.length === 0}
             className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white shadow-md shadow-primary-600/20 transition-all text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
           >
             {isRunning ? <Icon name="Loader2" className="animate-spin" size={14} /> : <Icon name="Play" size={14} />}
             {isRunning ? t.runningTests : t.runAllTests}
           </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pb-4">
        {testCases.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900/50">
            <Icon name="FlaskConical" size={32} className="text-slate-300 mb-3" />
            <p className="text-sm text-slate-500">{t.noTestCases}</p>
            <button onClick={handleAdd} className="mt-4 text-primary-600 text-xs font-bold hover:underline">
              {t.addFirstTestCase}
            </button>
          </div>
        )}

        {testCases.map((testCase, index) => {
          const result = results[testCase.id];
          const isEditing = editingId === testCase.id;

          return (
            <div key={testCase.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-sm hover:border-primary-200 dark:hover:border-primary-800 transition-colors">
              {isEditing ? (
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-400 mb-1 block">{t.input}</label>
                    <textarea
                      value={editInput}
                      onChange={e => setEditInput(e.target.value)}
                      className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                      rows={2}
                      placeholder="What does the user say?"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-400 mb-1 block">{t.expectedOutput} (Optional)</label>
                    <textarea
                      value={editExpected}
                      onChange={e => setEditExpected(e.target.value)}
                      className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                      rows={2}
                      placeholder="Ideally, what should the agent answer?"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button onClick={() => setEditingId(null)} className="text-xs text-slate-500 px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded">{t.cancel}</button>
                    <button onClick={() => handleSaveCase(testCase.id)} className="text-xs bg-primary-600 text-white px-3 py-1.5 rounded font-medium">{t.save}</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="bg-slate-100 dark:bg-slate-700 text-slate-500 text-[10px] font-bold px-1.5 py-0.5 rounded">#{index + 1}</span>
                      <h4 className="text-sm font-medium text-slate-900 dark:text-white line-clamp-1">{testCase.input || "Empty Input"}</h4>
                    </div>
                    <div className="flex items-center gap-2">
                      {result && (
                        <StatusBadge 
                          status={result.pass ? 'success' : 'error'} 
                          text={result.pass ? t.pass : t.fail}
                          className="!py-0.5 !px-2"
                        />
                      )}
                      <button onClick={() => {
                        setEditingId(testCase.id);
                        setEditInput(testCase.input);
                        setEditExpected(testCase.expectedOutput || '');
                      }} className="p-1 text-slate-400 hover:text-primary-500">
                        <Icon name="Edit2" size={14} />
                      </button>
                      <button onClick={() => handleDelete(testCase.id)} className="p-1 text-slate-400 hover:text-red-500">
                        <Icon name="Trash2" size={14} />
                      </button>
                    </div>
                  </div>

                  {testCase.expectedOutput && (
                    <div className="mb-3 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50 p-2 rounded border border-slate-100 dark:border-slate-800">
                      <span className="font-bold mr-1">Expected:</span> {testCase.expectedOutput}
                    </div>
                  )}

                  {result && (
                    <div className={`mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 ${result.pass ? 'bg-emerald-50/30 dark:bg-emerald-900/10' : 'bg-red-50/30 dark:bg-red-900/10'} -mx-4 -mb-4 px-4 py-3 rounded-b-xl`}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-bold text-slate-700 dark:text-slate-300">{t.actualOutput}</span>
                        <span className="font-bold">{t.score}: {result.score}/100</span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-3 mb-2 font-mono bg-white/50 dark:bg-black/20 p-1.5 rounded">
                        {result.actualOutput}
                      </p>
                      <div className="text-[10px] text-slate-500 flex gap-1">
                        <span className="font-bold">{t.testResultReasoning}:</span>
                        <span>{result.reasoning}</span>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};