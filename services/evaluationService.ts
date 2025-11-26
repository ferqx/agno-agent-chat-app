import { TestResult } from '../types';
import { AgnoClient } from '../lib/agno';

export const evaluateTestCase = async (
  input: string,
  actualOutput: string,
  expectedOutput: string,
  systemInstruction?: string
): Promise<TestResult> => {
  const baseUrl = localStorage.getItem('agno_base_url');
  const apiKey = localStorage.getItem('agno_api_key');

  if (!baseUrl) {
    return {
      pass: false,
      score: 0,
      actualOutput,
      reasoning: "Agno Service URL not configured."
    };
  }

  const client = new AgnoClient(baseUrl, apiKey || undefined);

  try {
    const prompt = `
      You are an expert AI evaluator.
      
      System Instruction Context: ${systemInstruction || 'None'}
      User Input: ${input}
      Actual Output: ${actualOutput}
      Expected Output (Golden): ${expectedOutput}
      
      Compare the Actual Output with the Expected Output.
      Determine if the Actual Output accurately answers the User Input and matches the intent/facts of the Expected Output.
      
      Return a pure JSON object (no markdown) with:
      - pass: boolean (true if correct/acceptable)
      - score: number (0 to 100)
      - reasoning: string (explanation of the score)
    `;

    // Use a temporary session to run the evaluation logic via the default agent or a specific evaluator
    // Assuming the first available agent can handle this or we create a generic session
    const agents = await client.listAgents();
    const evaluatorAgent = agents[0]; // Use first agent as evaluator for now

    if (!evaluatorAgent) throw new Error("No agents available for evaluation");

    const session = await client.createSession(evaluatorAgent.agent_id, "Evaluation Run");
    
    let jsonResult = "{}";
    await client.createAgentRunStream(
        evaluatorAgent.agent_id,
        session.session_id,
        prompt,
        (chunk) => { jsonResult = chunk; }, // Assuming the model returns the JSON at the end or we accumulate it
        (fullText) => { jsonResult = fullText; },
        (err) => console.error(err)
    );

    // Cleanup
    await client.deleteSession(session.session_id);

    // Attempt to parse JSON from the response
    // The model might return markdown code blocks, strip them
    const cleanJson = jsonResult.replace(/```json\n?|\n?```/g, '').trim();
    const parsed = JSON.parse(cleanJson);

    return {
      pass: parsed.pass ?? false,
      score: parsed.score ?? 0,
      actualOutput: actualOutput,
      reasoning: parsed.reasoning ?? "Evaluation parsed."
    };
  } catch (e) {
    console.error("Evaluation failed", e);
    return {
      pass: false,
      score: 0,
      actualOutput: actualOutput,
      reasoning: "Evaluation failed due to API error or parsing issue."
    };
  }
};