// Shared TypeScript types for the Agent System
// Aligned with Python backend response format

export interface PythonAgent {
  agent_id: string;
  name: string;
  type: string; // monitor, orchestrator, executor, reporter
  status: string; // idle, active, busy, error, offline
  active_tasks: number;
  capabilities: string[];
  metrics: Record<string, unknown>;
  last_heartbeat: string;
}

export interface PythonTask {
  id: string;
  title: string;
  description: string;
  priority: string; // CRITICAL, HIGH, MEDIUM, LOW
  status: string; // pending, assigned, in_progress, completed, failed, cancelled
  assigned_agent: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  metadata: Record<string, unknown>;
  retry_count: number;
  max_retries: number;
  dependencies: string[];
  estimated_duration: number;
  actual_duration: number | null;
  progress: number;
}

export interface PythonMessage {
  from: string;
  from_name: string;
  target: string;
  message: Record<string, unknown>;
  timestamp: string;
}

export interface PythonMetrics {
  cpu_usage: number;
  memory_usage: number;
  disk_usage: number;
  active_tasks: number;
  error_rate: number;
  response_time: number;
  timestamp: string;
}

export interface PythonEvent {
  id: string;
  type: string;
  source: string;
  data: Record<string, unknown>;
  timestamp: string;
  priority: string;
}

// Frontend display types (transformed from Python backend)

export interface Agent {
  id: string;
  name: string;
  type: string;
  status: string;
  description: string;
  config: string;
  avatar: string;
  capabilities: string;
  createdAt: string;
  updatedAt: string;
  tasks?: Task[];
  messages?: Message[];
  workflows?: WorkflowAgent[];
  _count?: {
    tasks: number;
    messages: number;
  };
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  agentId: string | null;
  workflowId: string | null;
  input: string;
  output: string;
  error: string | null;
  progress: number;
  parentTaskId: string | null;
  depth: number;
  reasoningStep: string;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  agent?: Pick<Agent, 'id' | 'name' | 'avatar'> | null;
  workflow?: Pick<Workflow, 'id' | 'name'> | null;
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  status: string;
  steps: string;
  createdAt: string;
  updatedAt: string;
  agents?: WorkflowAgent[];
  tasks?: Pick<Task, 'id' | 'title' | 'status'>[];
  _count?: {
    tasks: number;
    agents: number;
  };
}

export interface WorkflowAgent {
  id: string;
  workflowId: string;
  agentId: string;
  role: string;
  step: number;
  agent?: Pick<Agent, 'id' | 'name' | 'avatar' | 'status'>;
  workflow?: Pick<Workflow, 'id' | 'name'>;
}

export interface Message {
  id: string;
  fromAgentId: string | null;
  toAgentId: string | null;
  type: string;
  content: string;
  metadata: string;
  createdAt: string;
  fromAgent?: Pick<Agent, 'id' | 'name' | 'avatar'> | null;
}

export interface SystemMetric {
  id: string;
  name: string;
  value: number;
  unit: string;
  category: string;
  createdAt: string;
}

export interface MetricsSummary {
  agents: {
    total: number;
    running: number;
    idle: number;
    error: number;
    offline: number;
  };
  tasks: {
    total: number;
    pending: number;
    running: number;
    completed: number;
    failed: number;
  };
  workflows: {
    total: number;
    active: number;
    draft: number;
  };
  metrics: SystemMetric[];
}

export interface WorkflowStep {
  id: number;
  name: string;
  agentType: string;
  action: string;
  next: number | null;
}

export interface CollaborationLog {
  id: string;
  sessionId: string;
  phase: string;
  fromAgentId: string | null;
  toAgentId: string | null;
  action: string;
  reasoning: string;
  result: string;
  chainDepth: number;
  createdAt: string;
  fromAgent?: Agent | null;
  toAgent?: Agent | null;
}

export interface CollaborationSession {
  sessionId: string;
  logCount: number;
  lastActivity: string | null;
  phases: string[];
  logs: CollaborationLog[];
}

export interface ReasoningChain {
  rootTask: Task;
  subTasks: Task[];
  chainProgress: number;
  chainType: string;
}

export type ViewType = 'overview' | 'dashboard' | 'agents' | 'tasks' | 'workflows' | 'messages' | 'orchestrate' | 'settings';
