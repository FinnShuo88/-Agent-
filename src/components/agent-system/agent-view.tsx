'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Plus,
  Play,
  Square,
  Trash2,
  Eye,
  Bot,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Agent, Task, Message } from '@/lib/types';

interface AgentViewProps {
  agents: Agent[];
  onRefresh: () => void;
  fetchAgents: () => Promise<Agent[]>;
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

const statusBadgeColors: Record<string, string> = {
  running: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  idle: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  error: 'bg-red-100 text-red-700 border-red-200',
  offline: 'bg-gray-100 text-gray-500 border-gray-200',
  paused: 'bg-orange-100 text-orange-700 border-orange-200',
};

const typeColors: Record<string, string> = {
  coordinator: 'bg-purple-100 text-purple-700',
  executor: 'bg-emerald-100 text-emerald-700',
  monitor: 'bg-amber-100 text-amber-700',
  analyzer: 'bg-cyan-100 text-cyan-700',
  communicator: 'bg-rose-100 text-rose-700',
};

const typeLabels: Record<string, string> = {
  coordinator: '协调器',
  executor: '执行器',
  monitor: '监控器',
  analyzer: '分析器',
  communicator: '通信器',
};

const agentTypes = [
  { value: 'coordinator', label: '协调器 (coordinator)' },
  { value: 'executor', label: '执行器 (executor)' },
  { value: 'monitor', label: '监控器 (monitor)' },
  { value: 'analyzer', label: '分析器 (analyzer)' },
  { value: 'communicator', label: '通信器 (communicator)' },
];

const defaultAvatars = ['🤖', '🧠', '⚙️', '✍️', '🔍', '📊', '📡', '🧪', '🚀', '💡', '🎯', '🛡️'];

export default function AgentView({ agents, onRefresh, fetchAgents }: AgentViewProps) {
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [agentDetail, setAgentDetail] = useState<Agent & { tasks?: Task[]; messages?: Message[] } | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Create form state
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState('executor');
  const [formDesc, setFormDesc] = useState('');
  const [formCapabilities, setFormCapabilities] = useState('');
  const [formAvatar, setFormAvatar] = useState('🤖');
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!formName.trim()) {
      toast({ title: '请输入Agent名称', variant: 'destructive' });
      return;
    }
    setCreating(true);
    try {
      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName,
          type: formType,
          description: formDesc,
          capabilities: formCapabilities
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
          avatar: formAvatar,
        }),
      });
      if (!res.ok) throw new Error('创建失败');
      toast({ title: 'Agent创建成功', description: `${formName} 已添加` });
      setCreateOpen(false);
      resetForm();
      onRefresh();
    } catch {
      toast({ title: '创建失败', variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  const resetForm = () => {
    setFormName('');
    setFormType('executor');
    setFormDesc('');
    setFormCapabilities('');
    setFormAvatar('🤖');
  };

  const handleStatusChange = async (agentId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/agents/${agentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error('操作失败');
      toast({
        title: newStatus === 'running' ? 'Agent已启动' : 'Agent已停止',
      });
      onRefresh();
    } catch {
      toast({ title: '操作失败', variant: 'destructive' });
    }
  };

  const handleDelete = async (agentId: string, agentName: string) => {
    try {
      const res = await fetch(`/api/agents/${agentId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('删除失败');
      toast({ title: 'Agent已删除', description: agentName });
      setDetailOpen(false);
      onRefresh();
    } catch {
      toast({ title: '删除失败', variant: 'destructive' });
    }
  };

  const handleViewDetail = async (agent: Agent) => {
    setSelectedAgent(agent);
    setDetailOpen(true);
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/agents/${agent.id}`);
      if (res.ok) {
        const data = await res.json();
        setAgentDetail(data);
      }
    } catch {
      // Fallback to list data
      setAgentDetail(agent);
    } finally {
      setDetailLoading(false);
    }
  };

  const parseJSON = (jsonStr: string, fallback: unknown = {}) => {
    try {
      return JSON.parse(jsonStr);
    } catch {
      return fallback;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Agent管理</h2>
          <p className="text-muted-foreground text-sm">管理系统中的所有智能体</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700">
              <Plus className="h-4 w-4" />
              新建Agent
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
              <DialogTitle>新建Agent</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>头像</Label>
                <div className="flex gap-2 flex-wrap">
                  {defaultAvatars.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setFormAvatar(emoji)}
                      className={`text-2xl p-1.5 rounded-lg border-2 transition-colors ${
                        formAvatar === emoji
                          ? 'border-emerald-500 bg-emerald-50'
                          : 'border-transparent hover:border-gray-300'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
                <Input
                  value={formAvatar}
                  onChange={(e) => setFormAvatar(e.target.value)}
                  placeholder="输入emoji或文字"
                  className="w-24"
                />
              </div>
              <div className="space-y-2">
                <Label>名称 *</Label>
                <Input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="输入Agent名称"
                />
              </div>
              <div className="space-y-2">
                <Label>类型</Label>
                <Select value={formType} onValueChange={setFormType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {agentTypes.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>描述</Label>
                <Textarea
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="输入Agent描述"
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>能力标签（逗号分隔）</Label>
                <Input
                  value={formCapabilities}
                  onChange={(e) => setFormCapabilities(e.target.value)}
                  placeholder="如: 数据采集, 数据清洗, ETL转换"
                />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">取消</Button>
              </DialogClose>
              <Button
                onClick={handleCreate}
                disabled={creating}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {creating ? '创建中...' : '创建'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Agent Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {agents.map((agent) => {
          const capabilities: string[] = parseJSON(agent.capabilities, []);
          const taskCount = agent._count?.tasks || 0;

          return (
            <Card
              key={agent.id}
              className="hover:shadow-lg transition-all cursor-pointer group"
              onClick={() => handleViewDetail(agent)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="text-3xl flex-shrink-0">{agent.avatar || '🤖'}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm truncate">{agent.name}</span>
                      <span
                        className={`inline-flex h-2.5 w-2.5 rounded-full flex-shrink-0 ${
                          statusColors[agent.status] || 'bg-gray-400'
                        } ${agent.status === 'running' ? 'animate-pulse' : ''}`}
                      />
                    </div>
                    <div className="flex items-center gap-1.5 mt-1">
                      <Badge
                        variant="secondary"
                        className={`text-[10px] px-1.5 py-0 ${
                          typeColors[agent.type] || 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {typeLabels[agent.type] || agent.type}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={`text-[10px] px-1.5 py-0 ${
                          statusBadgeColors[agent.status] || ''
                        }`}
                      >
                        {statusLabels[agent.status] || agent.status}
                      </Badge>
                    </div>
                  </div>
                </div>

                {agent.description && (
                  <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                    {agent.description}
                  </p>
                )}

                {capabilities.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {capabilities.slice(0, 3).map((cap) => (
                      <span
                        key={cap}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground"
                      >
                        {cap}
                      </span>
                    ))}
                    {capabilities.length > 3 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                        +{capabilities.length - 3}
                      </span>
                    )}
                  </div>
                )}

                <Separator className="my-2" />

                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    <Bot className="h-3 w-3 inline mr-1" />
                    {taskCount}个任务
                  </span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {agent.status === 'running' ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStatusChange(agent.id, 'idle');
                        }}
                      >
                        <Square className="h-3.5 w-3.5 text-orange-500" />
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStatusChange(agent.id, 'running');
                        }}
                      >
                        <Play className="h-3.5 w-3.5 text-emerald-500" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewDetail(agent);
                      }}
                    >
                      <Eye className="h-3.5 w-3.5 text-blue-500" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(agent.id, agent.name);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-red-500" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {agents.length === 0 && (
          <div className="col-span-full py-16 text-center">
            <Bot className="h-12 w-12 mx-auto text-muted-foreground/50" />
            <p className="text-muted-foreground mt-3">暂无Agent，点击"新建Agent"添加</p>
          </div>
        )}
      </div>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-2xl">{selectedAgent?.avatar || '🤖'}</span>
              {selectedAgent?.name}
            </DialogTitle>
          </DialogHeader>
          {detailLoading ? (
            <div className="py-8 text-center text-muted-foreground">加载中...</div>
          ) : agentDetail ? (
            <ScrollArea className="max-h-[60vh] pr-4">
              <div className="space-y-4">
                {/* Basic Info */}
                <div>
                  <h4 className="font-semibold text-sm mb-2">基本信息</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">类型：</span>
                      <Badge
                        variant="secondary"
                        className={typeColors[agentDetail.type] || ''}
                      >
                        {typeLabels[agentDetail.type] || agentDetail.type}
                      </Badge>
                    </div>
                    <div>
                      <span className="text-muted-foreground">状态：</span>
                      <Badge
                        variant="outline"
                        className={statusBadgeColors[agentDetail.status] || ''}
                      >
                        {statusLabels[agentDetail.status] || agentDetail.status}
                      </Badge>
                    </div>
                  </div>
                  {agentDetail.description && (
                    <p className="text-sm text-muted-foreground mt-2">
                      {agentDetail.description}
                    </p>
                  )}
                </div>

                <Separator />

                {/* Capabilities */}
                <div>
                  <h4 className="font-semibold text-sm mb-2">能力标签</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {(parseJSON(agentDetail.capabilities, []) as string[]).map((cap: string) => (
                      <Badge key={cap} variant="secondary" className="text-xs">
                        {cap}
                      </Badge>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Config */}
                <div>
                  <h4 className="font-semibold text-sm mb-2">配置信息</h4>
                  <pre className="text-xs bg-muted p-3 rounded-lg overflow-auto max-h-40">
                    {JSON.stringify(parseJSON(agentDetail.config, {}), null, 2)}
                  </pre>
                </div>

                <Separator />

                {/* Assigned Tasks */}
                <div>
                  <h4 className="font-semibold text-sm mb-2">
                    分配任务 ({agentDetail.tasks?.length || 0})
                  </h4>
                  {agentDetail.tasks && agentDetail.tasks.length > 0 ? (
                    <div className="space-y-1.5">
                      {agentDetail.tasks.slice(0, 10).map((task) => (
                        <div
                          key={task.id}
                          className="flex items-center justify-between text-xs p-2 bg-muted/50 rounded"
                        >
                          <span className="truncate">{task.title}</span>
                          <Badge
                            variant="outline"
                            className={`text-[10px] ml-2 ${
                              task.status === 'completed'
                                ? 'border-emerald-300 text-emerald-600'
                                : task.status === 'running'
                                ? 'border-blue-300 text-blue-600'
                                : task.status === 'failed'
                                ? 'border-red-300 text-red-600'
                                : ''
                            }`}
                          >
                            {task.status === 'completed'
                              ? '已完成'
                              : task.status === 'running'
                              ? '运行中'
                              : task.status === 'failed'
                              ? '失败'
                              : task.status === 'pending'
                              ? '待执行'
                              : task.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">暂无分配任务</p>
                  )}
                </div>

                <Separator />

                {/* Recent Messages */}
                <div>
                  <h4 className="font-semibold text-sm mb-2">
                    最近消息 ({agentDetail.messages?.length || 0})
                  </h4>
                  {agentDetail.messages && agentDetail.messages.length > 0 ? (
                    <div className="space-y-1.5">
                      {agentDetail.messages.slice(0, 5).map((msg) => (
                        <div
                          key={msg.id}
                          className="text-xs p-2 bg-muted/50 rounded"
                        >
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <Badge
                              variant="secondary"
                              className={`text-[9px] px-1 py-0 ${
                                msg.type === 'error'
                                  ? 'bg-red-100 text-red-700'
                                  : msg.type === 'command'
                                  ? 'bg-blue-100 text-blue-700'
                                  : msg.type === 'result'
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-gray-100 text-gray-700'
                              }`}
                            >
                              {msg.type === 'error'
                                ? '错误'
                                : msg.type === 'command'
                                ? '命令'
                                : msg.type === 'result'
                                ? '结果'
                                : msg.type === 'broadcast'
                                ? '广播'
                                : '信息'}
                            </Badge>
                            <span className="text-muted-foreground">
                              {new Date(msg.createdAt).toLocaleString('zh-CN')}
                            </span>
                          </div>
                          <p className="text-muted-foreground line-clamp-2">{msg.content}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">暂无消息</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  {agentDetail.status === 'running' ? (
                    <Button
                      variant="outline"
                      className="gap-1"
                      onClick={() => {
                        handleStatusChange(agentDetail.id, 'idle');
                        setDetailOpen(false);
                      }}
                    >
                      <Square className="h-3.5 w-3.5" />
                      停止
                    </Button>
                  ) : (
                    <Button
                      className="gap-1 bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => {
                        handleStatusChange(agentDetail.id, 'running');
                        setDetailOpen(false);
                      }}
                    >
                      <Play className="h-3.5 w-3.5" />
                      启动
                    </Button>
                  )}
                  <Button
                    variant="destructive"
                    className="gap-1"
                    onClick={() => handleDelete(agentDetail.id, agentDetail.name)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    删除
                  </Button>
                </div>
              </div>
            </ScrollArea>
          ) : (
            <div className="py-8 text-center text-muted-foreground">无法加载详情</div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
