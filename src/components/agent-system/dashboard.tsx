'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Bot,
  Play,
  ListTodo,
  TrendingUp,
  Activity,
  AlertTriangle,
  Zap,
  RefreshCw,
  Cpu,
  HardDrive,
  MemoryStick,
  Clock,
  Server,
} from 'lucide-react';
import type { Agent, Task, Message, MetricsSummary } from '@/lib/types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  LineChart,
  Line,
} from 'recharts';

interface DashboardProps {
  agents: Agent[];
  tasks: Task[];
  messages: Message[];
  metrics: MetricsSummary | null;
  loading: boolean;
  onSeed: () => void;
  onRefresh: () => void;
}

const statusColors: Record<string, string> = {
  running: 'bg-emerald-500',
  idle: 'bg-yellow-500',
  error: 'bg-red-500',
  offline: 'bg-gray-400',
  paused: 'bg-orange-500',
};

const statusLabels: Record<string, string> = {
  running: '运行中',
  idle: '空闲',
  error: '错误',
  offline: '离线',
  paused: '暂停',
};

const typeColors: Record<string, string> = {
  coordinator: 'bg-purple-100 text-purple-700',
  executor: 'bg-emerald-100 text-emerald-700',
  monitor: 'bg-amber-100 text-amber-700',
  analyzer: 'bg-cyan-100 text-cyan-700',
  communicator: 'bg-rose-100 text-rose-700',
};

const typeLabels: Record<string, string> = {
  coordinator: '编排器',
  executor: '执行器',
  monitor: '监控器',
  analyzer: '分析器',
  communicator: '报告器',
};

const messageTypeColors: Record<string, string> = {
  command: 'bg-blue-100 text-blue-700',
  result: 'bg-emerald-100 text-emerald-700',
  error: 'bg-red-100 text-red-700',
  broadcast: 'bg-orange-100 text-orange-700',
  info: 'bg-gray-100 text-gray-700',
  agent_event: 'bg-purple-100 text-purple-700',
  metric_threshold: 'bg-amber-100 text-amber-700',
  task_update: 'bg-emerald-100 text-emerald-700',
};

const messageTypeLabels: Record<string, string> = {
  command: '命令',
  result: '结果',
  error: '错误',
  broadcast: '广播',
  info: '信息',
  agent_event: '事件',
  metric_threshold: '告警',
  task_update: '任务',
};

export default function Dashboard({
  agents,
  tasks,
  messages,
  metrics,
  loading,
  onSeed,
  onRefresh,
}: DashboardProps) {
  // Compute stats
  const totalAgents = agents.length;
  const runningAgents = agents.filter((a) => a.status === 'running').length;
  const idleAgents = agents.filter((a) => a.status === 'idle').length;
  const activeTasks = tasks.filter((t) => t.status === 'running' || t.status === 'pending').length;
  const completedTasks = tasks.filter((t) => t.status === 'completed').length;
  const failedTasks = tasks.filter((t) => t.status === 'failed').length;
  const totalTasks = tasks.length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // System metrics from Python backend
  const cpuUsage = metrics?.metrics?.find((m) => m.name === 'CPU使用率')?.value || 0;
  const memUsage = metrics?.metrics?.find((m) => m.name === '内存使用率')?.value || 0;
  const diskUsage = metrics?.metrics?.find((m) => m.name === '磁盘使用率')?.value || 0;
  const errorRate = metrics?.metrics?.find((m) => m.name === '错误率')?.value || 0;
  const responseTime = metrics?.metrics?.find((m) => m.name === '响应时间')?.value || 0;

  // Build chart data from system metrics
  const metricsChartData = useMemo(() => {
    return [
      { name: 'CPU', value: Math.round(cpuUsage), fill: cpuUsage > 80 ? '#ef4444' : '#10b981' },
      { name: '内存', value: Math.round(memUsage), fill: memUsage > 85 ? '#ef4444' : '#06b6d4' },
      { name: '磁盘', value: Math.round(diskUsage), fill: diskUsage > 90 ? '#ef4444' : '#8b5cf6' },
      { name: '错误率', value: Math.round(errorRate * 10), fill: errorRate > 5 ? '#ef4444' : '#f59e0b' },
    ];
  }, [cpuUsage, memUsage, diskUsage, errorRate]);

  // Task status distribution
  const taskChartData = useMemo(() => {
    const pending = tasks.filter((t) => t.status === 'pending').length;
    const running = tasks.filter((t) => t.status === 'running').length;
    const completed = tasks.filter((t) => t.status === 'completed').length;
    const failed = tasks.filter((t) => t.status === 'failed').length;
    return [
      { name: '待处理', value: pending, fill: '#f59e0b' },
      { name: '运行中', value: running, fill: '#10b981' },
      { name: '已完成', value: completed, fill: '#06b6d4' },
      { name: '失败', value: failed, fill: '#ef4444' },
    ];
  }, [tasks]);

  // Simulated trend data (since we get single-point metrics from Python backend)
  const trendData = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 12 }, (_, i) => {
      const time = new Date(now.getTime() - (11 - i) * 5 * 60000);
      const label = `${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}`;
      return {
        name: label,
        cpu: Math.max(0, Math.min(100, cpuUsage + (Math.random() - 0.5) * 20)),
        memory: Math.max(0, Math.min(100, memUsage + (Math.random() - 0.5) * 15)),
        response: Math.max(0, responseTime + (Math.random() - 0.5) * 500),
      };
    });
  }, [cpuUsage, memUsage, responseTime]);

  const recentMessages = messages.slice(0, 10);

  return (
    <div className="space-y-6">
      {/* Top Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Agent总数</p>
                <p className="text-3xl font-bold">{totalAgents}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center">
                <Bot className="h-6 w-6 text-emerald-600" />
              </div>
            </div>
            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> 运行 {runningAgents}
              </span>
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-yellow-500" /> 空闲 {idleAgents}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-teal-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">活跃任务</p>
                <p className="text-3xl font-bold">{activeTasks}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-teal-100 flex items-center justify-center">
                <ListTodo className="h-6 w-6 text-teal-600" />
              </div>
            </div>
            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
              <span>总计 {totalTasks} · 失败 {failedTasks}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">完成率</p>
                <p className="text-3xl font-bold">{completionRate}%</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-amber-600" />
              </div>
            </div>
            <Progress value={completionRate} className="mt-2 h-1.5" />
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-cyan-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">系统健康</p>
                <p className="text-3xl font-bold">
                  {cpuUsage < 80 && memUsage < 85 && errorRate < 5 ? '正常' : cpuUsage < 90 ? '告警' : '异常'}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-cyan-100 flex items-center justify-center">
                <Activity className="h-6 w-6 text-cyan-600" />
              </div>
            </div>
            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
              <span>CPU {cpuUsage.toFixed(0)}% · 内存 {memUsage.toFixed(0)}%</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Resource Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-3 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
              <Cpu className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">CPU使用率</p>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold">{cpuUsage.toFixed(1)}%</span>
                <Badge variant={cpuUsage > 80 ? 'destructive' : 'secondary'} className="text-[10px]">
                  {cpuUsage > 80 ? '高' : '正常'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
              <MemoryStick className="h-4 w-4 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">内存使用率</p>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold">{memUsage.toFixed(1)}%</span>
                <Badge variant={memUsage > 85 ? 'destructive' : 'secondary'} className="text-[10px]">
                  {memUsage > 85 ? '高' : '正常'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
              <HardDrive className="h-4 w-4 text-purple-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">磁盘使用率</p>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold">{diskUsage.toFixed(1)}%</span>
                <Badge variant={diskUsage > 90 ? 'destructive' : 'secondary'} className="text-[10px]">
                  {diskUsage > 90 ? '高' : '正常'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
              <Clock className="h-4 w-4 text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">响应时间</p>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold">{responseTime.toFixed(0)}ms</span>
                <Badge variant={responseTime > 2000 ? 'destructive' : 'secondary'} className="text-[10px]">
                  {responseTime > 2000 ? '慢' : '正常'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button
          onClick={onRefresh}
          variant="outline"
          className="gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          刷新数据
        </Button>
      </div>

      {loading && !agents.length ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Agent Status Grid */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Activity className="h-5 w-5 text-emerald-500" />
                  Agent实时状态
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {agents.map((agent) => (
                    <div
                      key={agent.id}
                      className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:shadow-md transition-shadow"
                    >
                      <div className="text-2xl flex-shrink-0">{agent.avatar || '🤖'}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm truncate">{agent.name}</span>
                          <span
                            className={`inline-flex h-2.5 w-2.5 rounded-full flex-shrink-0 ${
                              statusColors[agent.status] || 'bg-gray-400'
                            } ${agent.status === 'running' ? 'animate-pulse' : ''}`}
                          />
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge
                            variant="secondary"
                            className={`text-[10px] px-1.5 py-0 ${
                              typeColors[agent.type] || 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {typeLabels[agent.type] || agent.type}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {statusLabels[agent.status] || agent.status}
                          </span>
                          {agent._count && (
                            <span className="text-xs text-muted-foreground">
                              {agent._count.tasks}个任务
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {agents.length === 0 && (
                    <div className="col-span-2 flex flex-col items-center justify-center py-12 text-muted-foreground">
                      <Server className="h-10 w-10 mb-2 opacity-50" />
                      <p className="text-sm">Python后端未启动或无Agent数据</p>
                      <p className="text-xs mt-1">请确保Python后端运行在 localhost:8000</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Real-time Activity Feed */}
          <div>
            <Card className="h-full">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  实时动态
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[340px]">
                  <div className="space-y-3">
                    {recentMessages.map((msg, index) => (
                      <div
                        key={msg.id || index}
                        className="flex gap-2 p-2 rounded-lg bg-muted/50 text-sm"
                      >
                        <span className="text-lg flex-shrink-0">📡</span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="font-medium text-xs truncate">
                              {msg.fromAgentId || '系统'}
                            </span>
                            <Badge
                              variant="secondary"
                              className={`text-[9px] px-1 py-0 ${
                                messageTypeColors[msg.type] || messageTypeColors.info
                              }`}
                            >
                              {messageTypeLabels[msg.type] || msg.type}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {msg.content}
                          </p>
                          <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                            {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString('zh-CN') : ''}
                          </p>
                        </div>
                      </div>
                    ))}
                    {recentMessages.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        暂无消息
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* System Resource Trend */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-5 w-5 text-cyan-500" />
              系统资源趋势
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={trendData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                  }}
                />
                <Line type="monotone" dataKey="cpu" stroke="#10b981" strokeWidth={2} dot={false} name="CPU %" />
                <Line type="monotone" dataKey="memory" stroke="#06b6d4" strokeWidth={2} dot={false} name="内存 %" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Task Status Distribution */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <ListTodo className="h-5 w-5 text-emerald-500" />
              任务状态分布
            </CardTitle>
          </CardHeader>
          <CardContent>
            {taskChartData.some(d => d.value > 0) ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={taskChartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                    }}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]} name="任务数">
                    {taskChartData.map((entry, index) => (
                      <rect key={index} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[260px] flex items-center justify-center text-muted-foreground">
                <p className="text-sm">暂无任务数据</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
