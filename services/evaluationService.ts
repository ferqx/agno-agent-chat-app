
import { GoogleGenAI, Type } from "@google/genai";
import { AgentConfig, TestResult } from "../types";

export interface EvaluationResult {
  score: number; // 0-100
  reasoning: string;
  suggestions: string[];
  metrics: {
    relevance: number;
    accuracy: number;
    clarity: number;
    safety: number;
  };
}

/**
 * Evaluates an agent's response based on the user's prompt and the agent's system instructions.
 * Uses a strong model (Gemini 2.5 Flash or Pro) as a judge.
 */
export const evaluateAgentPerformance = async (
  userPrompt: string,
  agentResponse: string,
  systemInstruction: string
): Promise<EvaluationResult> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const evaluationPrompt = `
      Act as an impartial and expert judge. Evaluate the Quality of the AI Agent's response based on the User Prompt and the Agent's System Instructions.
      
      System Instruction (The Agent's Persona/Rules):
      "${systemInstruction}"
      
      User Prompt:
      "${userPrompt}"
      
      Agent Response:
      "${agentResponse}"
      
      Task:
      1. Rate the response from 0 to 100 (Overall Score).
      2. Rate individual aspects (Relevance, Accuracy, Clarity, Safety) from 0 to 10.
      3. Provide a concise reasoning for the score.
      4. Provide 2-3 specific suggestions for improvement, either for the response or the system instruction.
      
      Return the result in JSON format.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: evaluationPrompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.NUMBER, description: "Overall score 0-100" },
            reasoning: { type: Type.STRING, description: "Explanation for the score" },
            suggestions: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: "List of suggestions"
            },
            metrics: {
              type: Type.OBJECT,
              properties: {
                relevance: { type: Type.NUMBER },
                accuracy: { type: Type.NUMBER },
                clarity: { type: Type.NUMBER },
                safety: { type: Type.NUMBER },
              }
            }
          }
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as EvaluationResult;
    }
    
    throw new Error("Empty response from evaluation model");

  } catch (error) {
    console.error("Evaluation failed:", error);
    // Return a fallback result in case of error to prevent app crash
    return {
      score: 0,
      reasoning: "Evaluation failed due to API error.",
      suggestions: ["Check API connection"],
      metrics: { relevance: 0, accuracy: 0, clarity: 0, safety: 0 }
    };
  }
};

/**
 * Evaluates a specific test case comparing actual output vs expected output (if provided).
 */
export const evaluateTestCase = async (
  input: string,
  actualOutput: string,
  expectedOutput: string | undefined,
  systemInstruction: string
): Promise<TestResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Construct the prompt based on whether we have a Golden Answer (Reference)
  let prompt = "";
  
  if (expectedOutput) {
    prompt = `
      You are an expert AI Quality Assurance Engineer. Compare the Actual Output against the Expected Output (Golden Answer) for the given Input.
      
      System Instruction: "${systemInstruction}"
      Input: "${input}"
      
      Expected Output (Ideal): "${expectedOutput}"
      Actual Output (To Grade): "${actualOutput}"
      
      Task:
      1. Rate the Actual Output from 0 to 100 based on how well it matches the *intent* and *facts* of the Expected Output.
      2. Determine if it PASSES (score >= 70) or FAILS.
      3. Provide reasoning.
      
      Return JSON.
    `;
  } else {
    // Reference-less evaluation (just quality check)
    prompt = `
      You are an expert AI Quality Assurance Engineer. Evaluate the quality of the Agent's response.
      
      System Instruction: "${systemInstruction}"
      Input: "${input}"
      Actual Output: "${actualOutput}"
      
      Task:
      1. Rate from 0 to 100 based on accuracy, relevance, and tone.
      2. Determine PASS/FAIL (score >= 70).
      3. Provide reasoning.
      
      Return JSON.
    `;
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.NUMBER },
            pass: { type: Type.BOOLEAN },
            reasoning: { type: Type.STRING }
          }
        }
      }
    });

    if (response.text) {
      const result = JSON.parse(response.text);
      return {
        testCaseId: '', // Will be filled by caller
        actualOutput,
        score: result.score,
        pass: result.pass,
        reasoning: result.reasoning,
        timestamp: Date.now()
      };
    }
    throw new Error("No response");
  } catch (e) {
    return {
      testCaseId: '',
      actualOutput,
      score: 0,
      pass: false,
      reasoning: "Evaluation Error: " + (e instanceof Error ? e.message : 'Unknown'),
      timestamp: Date.now()
    };
  }
};
