export interface AgentTool {
  name: string;
  description: string;
  parameters: string; // Explaining the inputs required
  execute: (args: any, userId?: string) => Promise<string>;
}

export interface ExecutionStep {
  thought: string;
  action?: string;
  actionInput?: any;
  observation?: string;
}

export interface AgentResponse {
  response: string;
  steps: ExecutionStep[];
}
