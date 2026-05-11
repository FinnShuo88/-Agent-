'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Plus,
  Play,
  CheckCircle,
  XCircle,
  RotateCcw,
  ChevronDown,
  ChevronRight,
  ListTodo,
  Filter,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Agent, Task } from '@/lib/types';

interface TaskViewProps {
  tasks: Task[];
  agents: Agent[];
  onRefresh: () => void;
}

const priorityColors: Record<string, string> = {
  critical: 'bg-red-100 text-red-700 border-red-200',
  high: 'bg-orange-100 text-orange-700 border-orange-200',
  medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  low: 'bg-emerald-100 text-emerald-700 border-emerald-200',
};

const priorityLabels: Record<string, string> = {
  critical: '紧急',
  high: '高',
  medium: '中',
  low: '低',
};

const statusColors: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-600 border-gray-200',
  running: 'bg-blue-100 text-blue-700 border-blue-200',
  completed: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  failed: 'bg-red-100 text-red-700 border-red-200',
  cancelled: 'bg-gray-100 text-gray-500 border-gray-200',
};

const statusLabels: Record<string, string> = {
  pending: '待执行',
  running: '运行中',
  completed: '已完成',
  failed: '失败',
  cancelled: '已取消',
};

const progressColors: Record<string, string> = {
  pending: '[&>div]:bg-gray-400',
  running: '[&>div]:bg-blue-500',
  completed: '[&>div]:bg-emerald-500',
  failed: '[&>div]:bg-red-500',
  cancelled: '[&>div]:bg-gray-400',
};

export default function TaskView({ tasks, agents, onRefresh }: TaskViewProps) {
  const { toast } = useToast();
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  // Create form state
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formPriority, setFormPriority] = useState('medium');
  const [formAgentId, setFormAgentId] = useState('');
  const [creating, setCreating] = useState(false);

  const filteredTasks = tasks.filter((t) => {
    if (filterStatus !== 'all' && t.status !== filterStatus) return false;
    if (filterPriority !== 'all' && t.priority !== filterPriority) return false;
    return true;
  });

  const handleCreate = async () => {
    if (!formTitle.trim()) {
      toast({ title: '请输入任务标题', variant: 'destructive' });
      return;
    }
    setCreating(true);
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formTitle,
          description: formDesc,
          priority: formPriority,
          agentId: formAgentId || null,
        }),
      });
      if (!res.ok) throw new Error('创建失败');
      toast({ title: '任务创建成功' });
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
    setFormTitle('');
    setFormDesc('');
    setFormPriority('medium');
    setFormAgentId('');
  };

  const handleExecute = async (taskId: string, action: string) => {
    try {
      if (action === 'start') {
        const res = await fetch('/api/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ taskId, action: 'start' }),
        });
        if (!res.ok) throw new Error('操作失败');
        toast({ title: '任务已启动' });
      } else if (action === 'complete') {
        const res = await fetch('/api/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ taskId, action: 'complete' }),
        });
        if (!res.ok) throw new Error('操作失败');
        toast({ title: '任务已完成' });
      } else if (action === 'fail') {
        const res = await fetch('/api/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ taskId, action: 'fail' }),
        });
        if (!res.ok) throw new Error('操作失败');
        toast({ title: '任务已标记为失败' });
      } else if (action === 'retry') {
        const res = await fetch('/api/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ taskId, action: 'retry' }),
        });
        if (!res.ok) throw new Error('操作失败');
        toast({ title: '任务已重置，等待重试' });
      }
      onRefresh();
    } catch {
      toast({ title: '操作失败', variant: 'destructive' });
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
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold">任务中心</h2>
          <p className="text-muted-foreground text-sm">管理和监控所有任务</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700">
              <Plus className="h-4 w-4" />
              新建任务
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
              <DialogTitle>新建任务</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>标题 *</Label>
                <Input
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="输入任务标题"
                />
              </div>
              <div className="space-y-2">
                <Label>描述</Label>
                <Textarea
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="输入任务描述"
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>优先级</Label>
                <Select value={formPriority} onValueChange={setFormPriority}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">低</SelectItem>
                    <SelectItem value="medium">中</SelectItem>
                    <SelectItem value="high">高</SelectItem>
                    <SelectItem value="critical">紧急</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>分配Agent</Label>
                <Select value={formAgentId} onValueChange={setFormAgentId}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择Agent（可选）" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">不指定</SelectItem>
                    {agents.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.avatar} {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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

      {/* Filter Bar */}
      <Card>
        <CardContent className="p-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Filter className="h-4 w-4" />
              <span>筛选：</span>
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[140px] h-8 text-xs">
                <SelectValue placeholder="状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="pending">待执行</SelectItem>
                <SelectItem value="running">运行中</SelectItem>
                <SelectItem value="completed">已完成</SelectItem>
                <SelectItem value="failed">失败</SelectItem>
                <SelectItem value="cancelled">已取消</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger className="w-[140px] h-8 text-xs">
                <SelectValue placeholder="优先级" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部优先级</SelectItem>
                <SelectItem value="critical">紧急</SelectItem>
                <SelectItem value="high">高</SelectItem>
                <SelectItem value="medium">中</SelectItem>
                <SelectItem value="low">低</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-xs text-muted-foreground ml-auto">
              共 {filteredTasks.length} 个任务
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Task Table */}
      <Card>
        <ScrollArea className="max-h-[600px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8"></TableHead>
                <TableHead>标题</TableHead>
                <TableHead>执行Agent</TableHead>
                <TableHead>优先级</TableHead>
                <TableHead>状态</TableHead>
                <TableHead className="w-[140px]">进度</TableHead>
                <TableHead>创建时间</TableHead>
                <TableHead className="w-[140px]">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTasks.map((task) => {
                const isExpanded = expandedTask === task.id;
                return (
                  <Collapsible
                    key={task.id}
                    open={isExpanded}
                    onOpenChange={() => setExpandedTask(isExpanded ? null : task.id)}
                  >
                    <TableRow className="cursor-pointer hover:bg-muted/50">
                      <TableCell>
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                            {isExpanded ? (
                              <ChevronDown className="h-3.5 w-3.5" />
                            ) : (
                              <ChevronRight className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        </CollapsibleTrigger>
                      </TableCell>
                      <TableCell className="font-medium text-sm">
                        {task.title}
                      </TableCell>
                      <TableCell>
                        {task.agent ? (
                          <span className="flex items-center gap-1 text-sm">
                            <span>{task.agent.avatar}</span>
                            <span className="truncate max-w-[100px]">{task.agent.name}</span>
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs">未分配</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${priorityColors[task.priority] || ''}`}
                        >
                          {priorityLabels[task.priority] || task.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${statusColors[task.status] || ''}`}
                        >
                          {statusLabels[task.status] || task.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress
                            value={task.progress}
                            className={`h-1.5 flex-1 ${progressColors[task.status] || ''}`}
                          />
                          <span className="text-xs text-muted-foreground w-8 text-right">
                            {task.progress}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(task.createdAt).toLocaleDateString('zh-CN')}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {task.status === 'pending' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs"
                              onClick={() => handleExecute(task.id, 'start')}
                            >
                              <Play className="h-3 w-3 mr-1" />
                              启动
                            </Button>
                          )}
                          {task.status === 'running' && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs text-emerald-600"
                                onClick={() => handleExecute(task.id, 'complete')}
                              >
                                <CheckCircle className="h-3 w-3 mr-1" />
                                完成
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs text-red-500"
                                onClick={() => handleExecute(task.id, 'fail')}
                              >
                                <XCircle className="h-3 w-3 mr-1" />
                                失败
                              </Button>
                            </>
                          )}
                          {(task.status === 'failed' || task.status === 'cancelled') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs text-amber-600"
                              onClick={() => handleExecute(task.id, 'retry')}
                            >
                              <RotateCcw className="h-3 w-3 mr-1" />
                              重试
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                    <CollapsibleContent>
                      <TableRow>
                        <TableCell colSpan={8} className="bg-muted/30 p-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <h5 className="text-xs font-semibold text-muted-foreground mb-1">
                                描述
                              </h5>
                              <p className="text-sm">
                                {task.description || '暂无描述'}
                              </p>
                            </div>
                            {task.error && (
                              <div>
                                <h5 className="text-xs font-semibold text-red-500 mb-1">
                                  错误信息
                                </h5>
                                <p className="text-sm text-red-600 bg-red-50 p-2 rounded">
                                  {task.error}
                                </p>
                              </div>
                            )}
                            <div>
                              <h5 className="text-xs font-semibold text-muted-foreground mb-1">
                                输入数据
                              </h5>
                              <pre className="text-xs bg-muted p-2 rounded max-h-32 overflow-auto">
                                {JSON.stringify(parseJSON(task.input, {}), null, 2)}
                              </pre>
                            </div>
                            <div>
                              <h5 className="text-xs font-semibold text-muted-foreground mb-1">
                                输出数据
                              </h5>
                              <pre className="text-xs bg-muted p-2 rounded max-h-32 overflow-auto">
                                {JSON.stringify(parseJSON(task.output, {}), null, 2)}
                              </pre>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
              {filteredTasks.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                    <ListTodo className="h-10 w-10 mx-auto mb-2 opacity-50" />
                    <p>暂无匹配的任务</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </Card>
    </div>
  );
}
