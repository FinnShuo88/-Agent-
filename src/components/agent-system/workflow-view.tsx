'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  Play,
  Pause,
  Trash2,
  Plus,
  Workflow as WorkflowIcon,
  ArrowRight,
  X,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Agent, Workflow, WorkflowStep } from '@/lib/types';

interface WorkflowViewProps {
  workflows: Workflow[];
  agents: Agent[];
  onRefresh: () => void;
}

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600 border-gray-200',
  active: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  running: 'bg-blue-100 text-blue-700 border-blue-200',
  paused: 'bg-orange-100 text-orange-700 border-orange-200',
  completed: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  failed: 'bg-red-100 text-red-700 border-red-200',
};

const statusLabels: Record<string, string> = {
  draft: '草稿',
  active: '已激活',
  running: '运行中',
  paused: '已暂停',
  completed: '已完成',
  failed: '失败',
};

const stepTypeColors: Record<string, string> = {
  coordinator: 'border-purple-400 bg-purple-50',
  executor: 'border-emerald-400 bg-emerald-50',
  monitor: 'border-amber-400 bg-amber-50',
  analyzer: 'border-cyan-400 bg-cyan-50',
  communicator: 'border-rose-400 bg-rose-50',
};

const stepTypeLabels: Record<string, string> = {
  coordinator: '协调器',
  executor: '执行器',
  monitor: '监控器',
  analyzer: '分析器',
  communicator: '通信器',
};

const roleLabels: Record<string, string> = {
  leader: '领导',
  participant: '参与',
  reviewer: '审查',
};

export default function WorkflowView({ workflows, agents, onRefresh }: WorkflowViewProps) {
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [expandedWorkflow, setExpandedWorkflow] = useState<string | null>(null);

  // Create form state
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formSteps, setFormSteps] = useState<{ name: string; agentType: string; action: string }[]>([
    { name: '', agentType: 'executor', action: '' },
  ]);
  const [formAgentIds, setFormAgentIds] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

  const addStep = () => {
    setFormSteps([...formSteps, { name: '', agentType: 'executor', action: '' }]);
  };

  const removeStep = (index: number) => {
    setFormSteps(formSteps.filter((_, i) => i !== index));
  };

  const updateStep = (index: number, field: string, value: string) => {
    const newSteps = [...formSteps];
    newSteps[index] = { ...newSteps[index], [field]: value };
    setFormSteps(newSteps);
  };

  const handleCreate = async () => {
    if (!formName.trim()) {
      toast({ title: '请输入工作流名称', variant: 'destructive' });
      return;
    }
    if (formSteps.some((s) => !s.name.trim())) {
      toast({ title: '请填写所有步骤名称', variant: 'destructive' });
      return;
    }
    setCreating(true);
    try {
      const steps = formSteps.map((s, i) => ({
        id: i + 1,
        name: s.name,
        agentType: s.agentType,
        action: s.action,
        next: i < formSteps.length - 1 ? i + 2 : null,
      }));
      const res = await fetch('/api/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName,
          description: formDesc,
          steps,
          agentIds: formAgentIds,
        }),
      });
      if (!res.ok) throw new Error('创建失败');
      toast({ title: '工作流创建成功' });
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
    setFormDesc('');
    setFormSteps([{ name: '', agentType: 'executor', action: '' }]);
    setFormAgentIds([]);
  };

  const handleStatusChange = async (workflowId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/workflows/${workflowId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error('操作失败');
      toast({
        title: newStatus === 'running' ? '工作流已启动' : '工作流已暂停',
      });
      onRefresh();
    } catch {
      toast({ title: '操作失败', variant: 'destructive' });
    }
  };

  const handleDelete = async (workflowId: string) => {
    try {
      const res = await fetch(`/api/workflows/${workflowId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('删除失败');
      toast({ title: '工作流已删除' });
      onRefresh();
    } catch {
      toast({ title: '删除失败', variant: 'destructive' });
    }
  };

  const parseSteps = (stepsStr: string): WorkflowStep[] => {
    try {
      return JSON.parse(stepsStr);
    } catch {
      return [];
    }
  };

  const toggleAgentSelection = (agentId: string) => {
    setFormAgentIds((prev) =>
      prev.includes(agentId) ? prev.filter((id) => id !== agentId) : [...prev, agentId]
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">工作流</h2>
          <p className="text-muted-foreground text-sm">管理自动化工作流编排</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700">
              <Plus className="h-4 w-4" />
              新建工作流
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] max-h-[85vh]">
            <DialogHeader>
              <DialogTitle>新建工作流</DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[65vh] pr-4">
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label>名称 *</Label>
                  <Input
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="输入工作流名称"
                  />
                </div>
                <div className="space-y-2">
                  <Label>描述</Label>
                  <Textarea
                    value={formDesc}
                    onChange={(e) => setFormDesc(e.target.value)}
                    placeholder="输入工作流描述"
                    rows={2}
                  />
                </div>

                <Separator />

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>流程步骤</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs gap-1"
                      onClick={addStep}
                    >
                      <Plus className="h-3 w-3" />
                      添加步骤
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {formSteps.map((step, index) => (
                      <div
                        key={index}
                        className="flex items-start gap-2 p-3 border rounded-lg bg-muted/30"
                      >
                        <span className="text-xs font-bold text-muted-foreground mt-2">
                          {index + 1}
                        </span>
                        <div className="flex-1 grid grid-cols-1 gap-2">
                          <Input
                            value={step.name}
                            onChange={(e) => updateStep(index, 'name', e.target.value)}
                            placeholder="步骤名称"
                            className="h-8 text-sm"
                          />
                          <div className="flex gap-2">
                            <Select
                              value={step.agentType}
                              onValueChange={(v) => updateStep(index, 'agentType', v)}
                            >
                              <SelectTrigger className="h-8 text-xs flex-1">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="coordinator">协调器</SelectItem>
                                <SelectItem value="executor">执行器</SelectItem>
                                <SelectItem value="monitor">监控器</SelectItem>
                                <SelectItem value="analyzer">分析器</SelectItem>
                                <SelectItem value="communicator">通信器</SelectItem>
                              </SelectContent>
                            </Select>
                            <Input
                              value={step.action}
                              onChange={(e) => updateStep(index, 'action', e.target.value)}
                              placeholder="动作 (如: collect_data)"
                              className="h-8 text-xs flex-1"
                            />
                          </div>
                        </div>
                        {formSteps.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 mt-1"
                            onClick={() => removeStep(index)}
                          >
                            <X className="h-3.5 w-3.5 text-red-500" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                <div>
                  <Label className="mb-2 block">分配Agent</Label>
                  <div className="flex flex-wrap gap-2">
                    {agents.map((agent) => (
                      <button
                        key={agent.id}
                        type="button"
                        onClick={() => toggleAgentSelection(agent.id)}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs transition-colors ${
                          formAgentIds.includes(agent.id)
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                            : 'border-gray-200 hover:border-gray-300 text-muted-foreground'
                        }`}
                      >
                        <span>{agent.avatar}</span>
                        <span>{agent.name}</span>
                      </button>
                    ))}
                    {agents.length === 0 && (
                      <p className="text-xs text-muted-foreground">暂无可选Agent</p>
                    )}
                  </div>
                </div>
              </div>
            </ScrollArea>
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

      {/* Workflow Cards */}
      <div className="space-y-4">
        {workflows.map((workflow) => {
          const steps = parseSteps(workflow.steps);
          const isExpanded = expandedWorkflow === workflow.id;
          const workflowAgents = workflow.agents || [];

          return (
            <Card key={workflow.id} className="overflow-hidden">
              <CardContent className="p-0">
                {/* Workflow Header */}
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30"
                  onClick={() => setExpandedWorkflow(isExpanded ? null : workflow.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                      <WorkflowIcon className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{workflow.name}</h3>
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${statusColors[workflow.status] || ''}`}
                        >
                          {statusLabels[workflow.status] || workflow.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {workflow.description || '暂无描述'} · {steps.length}个步骤 · {workflowAgents.length}个Agent
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {(workflow.status === 'active' || workflow.status === 'draft') && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs gap-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStatusChange(workflow.id, 'running');
                        }}
                      >
                        <Play className="h-3 w-3" />
                        启动
                      </Button>
                    )}
                    {workflow.status === 'running' && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs gap-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStatusChange(workflow.id, 'paused');
                        }}
                      >
                        <Pause className="h-3 w-3" />
                        暂停
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(workflow.id);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-red-500" />
                    </Button>
                  </div>
                </div>

                {/* Step Flow (always visible) */}
                <div className="px-4 pb-3">
                  <div className="flex items-center gap-1 overflow-x-auto py-2">
                    {steps.map((step, idx) => (
                      <div key={step.id} className="flex items-center flex-shrink-0">
                        <div
                          className={`px-3 py-2 rounded-lg border-2 min-w-[100px] text-center ${
                            stepTypeColors[step.agentType] || 'border-gray-400 bg-gray-50'
                          }`}
                        >
                          <p className="text-xs font-semibold">{step.name}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {stepTypeLabels[step.agentType] || step.agentType}
                          </p>
                          {step.action && (
                            <p className="text-[9px] text-muted-foreground font-mono">
                              {step.action}
                            </p>
                          )}
                        </div>
                        {idx < steps.length - 1 && (
                          <ArrowRight className="h-4 w-4 text-muted-foreground mx-1 flex-shrink-0" />
                        )}
                      </div>
                    ))}
                    {steps.length === 0 && (
                      <p className="text-xs text-muted-foreground">暂无步骤定义</p>
                    )}
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="border-t p-4 bg-muted/20">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Assigned Agents */}
                      <div>
                        <h4 className="text-xs font-semibold text-muted-foreground mb-2">
                          分配的Agent
                        </h4>
                        {workflowAgents.length > 0 ? (
                          <div className="space-y-1.5">
                            {workflowAgents.map((wa) => (
                              <div
                                key={wa.id}
                                className="flex items-center gap-2 text-sm p-2 bg-background rounded"
                              >
                                <span>{wa.agent?.avatar || '🤖'}</span>
                                <span className="font-medium">{wa.agent?.name}</span>
                                <Badge variant="secondary" className="text-[10px]">
                                  {roleLabels[wa.role] || wa.role}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  步骤 {wa.step}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground">暂无分配Agent</p>
                        )}
                      </div>

                      {/* Tasks */}
                      <div>
                        <h4 className="text-xs font-semibold text-muted-foreground mb-2">
                          关联任务
                        </h4>
                        {workflow.tasks && workflow.tasks.length > 0 ? (
                          <div className="space-y-1.5">
                            {workflow.tasks.map((task) => (
                              <div
                                key={task.id}
                                className="flex items-center justify-between text-sm p-2 bg-background rounded"
                              >
                                <span className="truncate">{task.title}</span>
                                <Badge
                                  variant="outline"
                                  className={`text-[10px] ${
                                    task.status === 'completed'
                                      ? 'border-emerald-300 text-emerald-600'
                                      : task.status === 'running'
                                      ? 'border-blue-300 text-blue-600'
                                      : task.status === 'failed'
                                      ? 'border-red-300 text-red-600'
                                      : ''
                                  }`}
                                >
                                  {statusLabels[task.status] || task.status}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground">暂无关联任务</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}

        {workflows.length === 0 && (
          <Card>
            <CardContent className="py-16 text-center">
              <WorkflowIcon className="h-12 w-12 mx-auto text-muted-foreground/50" />
              <p className="text-muted-foreground mt-3">暂无工作流，点击"新建工作流"添加</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
