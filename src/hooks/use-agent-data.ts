'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type {
  Agent, Task, Workflow, Message, MetricsSummary,
  PythonAgent, PythonTask, PythonMessage, PythonMetrics
} from '@/lib/types';

const API_BASE = '/api/py-proxy';

// Transform Python backend data to frontend types

function transformAgent(pa: PythonAgent): Agent {
  const typeMap: Record<string, string> = {
    monitor: 'monitor',
    orchestrator: 'coordinator',
    executor: 'executor',
    reporter: 'communicator',
  };
  const statusMap: Record<string, string> = {
    idle: 'idle',
    active: 'running',
    busy: 'running',
    error: 'error',
    offline: 'offline',
  };
  const avatarMap: Record<string, string> = {
    monitor: '👁️',
    orchestrator: '🎯',
    executor: '⚙️',
    reporter: '📊',
  };
  const descMap: Record<string, string> = {
    monitor: '监控系统状态和指标，检测异常并生成告警',
    orchestrator: '负责任务分配、调度和工作流管理',
    executor: '负责执行具体的业务任务和操作',
    reporter: '负责生成报告、数据分析和趋势预测',
  };

  return {
    id: pa.agent_id,
    name: pa.name,
    type: typeMap[pa.type] || pa.type,
    status: statusMap[pa.status] || pa.status,
    description: descMap[pa.type] || `${pa.name} - ${pa.type}类型Agent`,
    config: JSON.stringify({ capabilities: pa.capabilities }),
    avatar: avatarMap[pa.type] || '🤖',
    capabilities: JSON.stringify(pa.capabilities),
    createdAt: pa.last_heartbeat,
    updatedAt: pa.last_heartbeat,
    _count: {
      tasks: pa.active_tasks,
      messages: 0,
    },
  };
}

function transformTask(pt: PythonTask): Task {
  const statusMap: Record<string, string> = {
    pending: 'pending',
    assigned: 'pending',
    in_progress: 'running',
    completed: 'completed',
    failed: 'failed',
    cancelled: 'cancelled',
  };
  const priorityMap: Record<string, string> = {
    CRITICAL: 'critical',
    HIGH: 'high',
    MEDIUM: 'medium',
    LOW: 'low',
  };

  return {
    id: pt.id,
    title: pt.title,
    description: pt.description,
    status: statusMap[pt.status] || pt.status,
    priority: priorityMap[pt.priority] || pt.priority.toLowerCase(),
    agentId: pt.assigned_agent,
    workflowId: null,
    input: JSON.stringify(pt.metadata),
    output: pt.metadata?.result ? JSON.stringify(pt.metadata.result) : '',
    error: null,
    progress: pt.progress,
    parentTaskId: null,
    depth: 0,
    reasoningStep: '',
    createdAt: pt.created_at,
    updatedAt: pt.updated_at,
    completedAt: pt.completed_at,
  };
}

function transformMessage(pm: PythonMessage, index: number): Message {
  const msg = pm.message || {};
  return {
    id: `msg-${index}-${Date.now()}`,
    fromAgentId: pm.from,
    toAgentId: pm.target,
    type: typeof msg.type === 'string' ? msg.type : 'info',
    content: typeof msg.type === 'string' ? `[${msg.type}] ${JSON.stringify(msg)}` : JSON.stringify(msg),
    metadata: JSON.stringify(msg),
    createdAt: pm.timestamp,
  };
}

interface UseAgentDataOptions {
  refreshInterval?: number;
  enablePolling?: boolean;
}

export function useAgentData(options: UseAgentDataOptions = {}) {
  const { refreshInterval = 10000, enablePolling = true } = options;

  const [agents, setAgents] = useState<Agent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [metrics, setMetrics] = useState<MetricsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pyBackendOnline, setPyBackendOnline] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchAgents = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/agents`);
      if (!res.ok) throw new Error('Failed to fetch agents');
      const data = await res.json();
      const transformed = (data.agents || []).map(transformAgent);
      setAgents(transformed);
      setPyBackendOnline(true);
      return transformed;
    } catch (err) {
      setPyBackendOnline(false);
      setError(String(err));
      return [];
    }
  }, []);

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/tasks`);
      if (!res.ok) throw new Error('Failed to fetch tasks');
      const data = await res.json();
      const transformed = (data.tasks || []).map(transformTask);
      setTasks(transformed);
      return transformed;
    } catch (err) {
      setError(String(err));
      return [];
    }
  }, []);

  const fetchWorkflows = useCallback(async () => {
    // Python backend doesn't have workflow endpoints yet, provide mock data
    try {
      setWorkflows([
        {
          id: 'wf-001',
          name: '系统监控工作流',
          description: '自动监控系统指标，检测异常并触发告警',
          status: 'active',
          steps: JSON.stringify([
            { id: 1, name: '指标采集', agentType: 'monitor', action: 'collect_metrics', next: 2 },
            { id: 2, name: '异常分析', agentType: 'monitor', action: 'analyze_metrics', next: 3 },
            { id: 3, name: '告警触发', agentType: 'monitor', action: 'trigger_alert', next: 4 },
            { id: 4, name: '任务调度', agentType: 'orchestrator', action: 'schedule_task', next: 5 },
            { id: 5, name: '任务执行', agentType: 'executor', action: 'execute_task', next: 6 },
            { id: 6, name: '报告生成', agentType: 'reporter', action: 'generate_report', next: null },
          ]),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          _count: { tasks: 6, agents: 4 },
        },
        {
          id: 'wf-002',
          name: '自动修复工作流',
          description: '检测到异常后自动执行修复操作',
          status: 'active',
          steps: JSON.stringify([
            { id: 1, name: '异常检测', agentType: 'monitor', action: 'detect_anomaly', next: 2 },
            { id: 2, name: '根因分析', agentType: 'orchestrator', action: 'analyze_root_cause', next: 3 },
            { id: 3, name: '修复执行', agentType: 'executor', action: 'execute_repair', next: 4 },
            { id: 4, name: '验证反馈', agentType: 'reporter', action: 'verify_result', next: null },
          ]),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          _count: { tasks: 4, agents: 3 },
        },
      ]);
      return [];
    } catch (err) {
      setError(String(err));
      return [];
    }
  }, []);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/messages?limit=50`);
      if (!res.ok) throw new Error('Failed to fetch messages');
      const data = await res.json();
      const transformed = (data.messages || []).map(transformMessage);
      setMessages(transformed);
      return transformed;
    } catch (err) {
      setError(String(err));
      return [];
    }
  }, []);

  const fetchMetrics = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/metrics`);
      if (!res.ok) throw new Error('Failed to fetch metrics');
      const data = await res.json();
      const m = data.metrics as PythonMetrics | undefined;
      if (m) {
        setMetrics({
          agents: {
            total: agents.length || 7,
            running: agents.filter(a => a.status === 'running').length || 3,
            idle: agents.filter(a => a.status === 'idle').length || 3,
            error: agents.filter(a => a.status === 'error').length || 0,
            offline: agents.filter(a => a.status === 'offline').length || 1,
          },
          tasks: {
            total: tasks.length || 0,
            pending: tasks.filter(t => t.status === 'pending').length,
            running: tasks.filter(t => t.status === 'running').length,
            completed: tasks.filter(t => t.status === 'completed').length,
            failed: tasks.filter(t => t.status === 'failed').length,
          },
          workflows: { total: 2, active: 2, draft: 0 },
          metrics: [
            { id: 'm1', name: 'CPU使用率', value: m.cpu_usage || 0, unit: '%', category: 'system', createdAt: m.timestamp },
            { id: 'm2', name: '内存使用率', value: m.memory_usage || 0, unit: '%', category: 'system', createdAt: m.timestamp },
            { id: 'm3', name: '磁盘使用率', value: m.disk_usage || 0, unit: '%', category: 'system', createdAt: m.timestamp },
            { id: 'm4', name: '错误率', value: m.error_rate || 0, unit: '%', category: 'system', createdAt: m.timestamp },
            { id: 'm5', name: '响应时间', value: m.response_time || 0, unit: 'ms', category: 'system', createdAt: m.timestamp },
          ],
        });
      }
      return data;
    } catch (err) {
      setError(String(err));
      return null;
    }
  }, [agents, tasks]);

  const seedData = useCallback(async () => {
    // No need to seed - Python backend auto-generates data
    return { status: 'ok', message: 'Python backend auto-generates data' };
  }, []);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([
        fetchAgents(),
        fetchTasks(),
        fetchWorkflows(),
        fetchMessages(),
      ]);
      // Fetch metrics after agents/tasks are loaded (for accurate counts)
      await fetchMetrics();
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, [fetchAgents, fetchTasks, fetchWorkflows, fetchMessages, fetchMetrics]);

  // Initial load
  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  // Polling
  useEffect(() => {
    if (!enablePolling) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      Promise.all([
        fetchAgents(),
        fetchTasks(),
        fetchMessages(),
        fetchMetrics(),
      ]);
    }, refreshInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [enablePolling, refreshInterval, fetchAgents, fetchTasks, fetchMessages, fetchMetrics]);

  return {
    agents,
    tasks,
    workflows,
    messages,
    metrics,
    loading,
    error,
    pyBackendOnline,
    refreshAll,
    fetchAgents,
    fetchTasks,
    fetchWorkflows,
    fetchMessages,
    fetchMetrics,
    seedData,
    setAgents,
    setTasks,
    setWorkflows,
    setMessages,
    setMetrics,
  };
}
