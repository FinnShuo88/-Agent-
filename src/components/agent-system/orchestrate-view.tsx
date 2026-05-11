'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Brain,
  GitBranch,
  ArrowRight,
  Play,
  CheckCircle2,
  Circle,
  Loader2,
  Lightbulb,
  Eye,
  Network,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CollaborationLogEntry {
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
  fromAgent?: { id: string; name: string; avatar: string } | null;
  toAgent?: { id: string; name: string; avatar: string } | null;
}

interface ReasoningStep {
  thought: string;
  action: string;
  observation: string;
  nextThought: string;
  chainType?: string;
  confidence?: number;
  currentStep?: number;
  totalSteps?: number;
  isLastStep?: boolean;
  dependsOn?: string[];
  executionLog?: Array<{ step: number; thought: string; timestamp: string; progress: number }>;
}

const phaseColors: Record<string, string> = {
  decompose: 'bg-purple-100 text-purple-700 border-purple-200',
  reason: 'bg-violet-100 text-violet-700 border-violet-200',
  assign: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  execute: 'bg-teal-100 text-teal-700 border-teal-200',
  review: 'bg-amber-100 text-amber-700 border-amber-200',
  merge: 'bg-cyan-100 text-cyan-700 border-cyan-200',
};

const phaseLabels: Record<string, string> = {
  decompose: '任务分解',
  reason: '推理决策',
  assign: '智能分配',
  execute: '链式执行',
  review: '质量审查',
  merge: '结果汇聚',
};

const phaseIcons: Record<string, React.ReactNode> = {
  decompose: <GitBranch className="h-3.5 w-3.5" />,
  reason: <Brain className="h-3.5 w-3.5" />,
  assign: <Network className="h-3.5 w-3.5" />,
  execute: <Play className="h-3.5 w-3.5" />,
  review: <Eye className="h-3.5 w-3.5" />,
  merge: <CheckCircle2 className="h-3.5 w-3.5" />,
};

export default function OrchestrateView() {
  const { toast } = useToast();
  const [decomposeResult, setDecomposeResult] = useState<Record<string, unknown> | null>(null);
  const [collaborateResult, setCollaborateResult] = useState<Record<string, unknown> | null>(null);
  const [reasoningChain, setReasoningChain] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [decomposeTitle, setDecomposeTitle] = useState('季度数据分析与报告生成');
  const [decomposeDesc, setDecomposeDesc] = useState('从多个数据源采集数据，进行清洗、质量检测、深度分析，最终生成季度业务报告');

  const handleDecompose = async () => {
    setLoading('decompose');
    try {
      const res = await fetch('/api/orchestrate/decompose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: decomposeTitle, description: decomposeDesc }),
      });
      if (!res.ok) throw new Error('分解失败');
      const data = await res.json();
      setDecomposeResult(data);
      toast({ title: '任务分解完成', description: `已拆解为${data.strategy?.totalSteps || 0}个子任务` });
    } catch {
      toast({ title: '分解失败', variant: 'destructive' });
    } finally {
      setLoading(null);
    }
  };

  const handleCollaborate = async () => {
    setLoading('collaborate');
    try {
      const res = await fetch('/api/orchestrate/collaborate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskTitle: decomposeTitle, taskDescription: decomposeDesc }),
      });
      if (!res.ok) throw new Error('协作模拟失败');
      const data = await res.json();
      setCollaborateResult(data);
      toast({ title: '协作模拟完成', description: `${data.summary?.agentsInvolved || 0}个Agent参与协作` });
    } catch {
      toast({ title: '协作模拟失败', variant: 'destructive' });
    } finally {
      setLoading(null);
    }
  };

  const handleReasoning = async (taskId: string) => {
    setLoading('reason');
    try {
      // Get chain status
      const res = await fetch('/api/orchestrate/reason', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, step: 'chain_status' }),
      });
      if (!res.ok) throw new Error('获取推理链失败');
      const data = await res.json();
      setReasoningChain(data);
      toast({ title: '推理链状态已加载' });
    } catch {
      toast({ title: '获取推理链失败', variant: 'destructive' });
    } finally {
      setLoading(null);
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
      <div>
        <h2 className="text-2xl font-bold">编排引擎</h2>
        <p className="text-muted-foreground text-sm">长链推理 + 多Agent协作编排演示</p>
      </div>

      {/* Task Input */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Brain className="h-5 w-5 text-purple-500" />
            任务输入
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium mb-1 block">任务标题</label>
              <input
                type="text"
                value={decomposeTitle}
                onChange={(e) => setDecomposeTitle(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="输入复杂任务标题"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">任务描述</label>
              <textarea
                value={decomposeDesc}
                onChange={(e) => setDecomposeDesc(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                rows={2}
                placeholder="描述任务的详细需求"
              />
            </div>
            <div className="flex gap-3">
              <Button
                onClick={handleDecompose}
                disabled={loading === 'decompose'}
                className="gap-2 bg-purple-600 hover:bg-purple-700"
              >
                {loading === 'decompose' ? <Loader2 className="h-4 w-4 animate-spin" /> : <GitBranch className="h-4 w-4" />}
                长链推理分解
              </Button>
              <Button
                onClick={handleCollaborate}
                disabled={loading === 'collaborate'}
                className="gap-2 bg-emerald-600 hover:bg-emerald-700"
              >
                {loading === 'collaborate' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Network className="h-4 w-4" />}
                多Agent协作模拟
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Decomposition Result */}
      {decomposeResult && (
        <Card className="border-purple-200">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <GitBranch className="h-5 w-5 text-purple-500" />
              推理分解结果
              <Badge variant="outline" className="text-xs border-purple-200 text-purple-600">
                {(decomposeResult.strategy as Record<string, unknown>)?.chainType as string === 'sequential' ? '顺序依赖链' : '混合依赖链'}
              </Badge>
              <Badge variant="outline" className="text-xs border-emerald-200 text-emerald-600">
                置信度 {((decomposeResult.strategy as Record<string, unknown>)?.confidence as number * 100).toFixed(0)}%
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Root Task */}
            {(() => {
              const rootTask = decomposeResult.rootTask as Record<string, unknown>;
              const rootReasoning = parseJSON(rootTask?.reasoningStep as string || '{}') as ReasoningStep;
              return (
                <div className="mb-4 p-3 rounded-lg bg-purple-50 border border-purple-200">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">🧠</span>
                    <h4 className="font-semibold text-sm">{rootTask?.title as string}</h4>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-start gap-2">
                      <Badge className="bg-purple-100 text-purple-700 text-[9px] px-1 py-0">Thought</Badge>
                      <span className="text-muted-foreground">{rootReasoning.thought}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Badge className="bg-emerald-100 text-emerald-700 text-[9px] px-1 py-0">Action</Badge>
                      <span className="text-muted-foreground">{rootReasoning.action}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Badge className="bg-amber-100 text-amber-700 text-[9px] px-1 py-0">Observation</Badge>
                      <span className="text-muted-foreground">{rootReasoning.observation}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Badge className="bg-cyan-100 text-cyan-700 text-[9px] px-1 py-0">Next</Badge>
                      <span className="text-muted-foreground">{rootReasoning.nextThought}</span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Sub-task Chain */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-muted-foreground">推理链子任务</h4>
              {((decomposeResult.subTasks as Record<string, unknown>[]) || []).map((sub, index) => {
                const reasoning = parseJSON(sub?.reasoningStep as string || '{}') as ReasoningStep;
                return (
                  <div key={sub?.id as string} className="relative">
                    {/* Connector line */}
                    {index > 0 && (
                      <div className="absolute left-5 -top-3 w-0.5 h-3 bg-purple-300" />
                    )}
                    <div className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:shadow-sm transition-shadow">
                      <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-bold text-sm flex-shrink-0">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h5 className="font-semibold text-sm">{sub?.title as string}</h5>
                        <p className="text-xs text-muted-foreground mt-0.5">{sub?.description as string}</p>
                        
                        {/* Reasoning steps */}
                        <div className="mt-2 space-y-1 text-xs">
                          <div className="flex items-start gap-1.5">
                            <span className="px-1 py-0.5 rounded bg-purple-50 text-purple-600 font-medium text-[10px]">思考</span>
                            <span className="text-muted-foreground line-clamp-2">{reasoning.thought}</span>
                          </div>
                          <div className="flex items-start gap-1.5">
                            <span className="px-1 py-0.5 rounded bg-emerald-50 text-emerald-600 font-medium text-[10px]">行动</span>
                            <span className="text-muted-foreground">{reasoning.action}</span>
                          </div>
                          <div className="flex items-start gap-1.5">
                            <span className="px-1 py-0.5 rounded bg-amber-50 text-amber-600 font-medium text-[10px]">观察</span>
                            <span className="text-muted-foreground line-clamp-2">{reasoning.observation}</span>
                          </div>
                          <div className="flex items-start gap-1.5">
                            <span className="px-1 py-0.5 rounded bg-cyan-50 text-cyan-600 font-medium text-[10px]">下一步</span>
                            <span className="text-muted-foreground line-clamp-2">{reasoning.nextThought}</span>
                          </div>
                          {reasoning.dependsOn && reasoning.dependsOn.length > 0 && (
                            <div className="flex items-center gap-1 mt-1">
                              <ArrowRight className="h-3 w-3 text-muted-foreground" />
                              <span className="text-[10px] text-muted-foreground">依赖: {reasoning.dependsOn.join(', ')}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge variant="outline" className="text-[10px]">
                          {sub?.priority as string === 'high' ? '高优' : sub?.priority as string === 'critical' ? '紧急' : '中优'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Load reasoning chain button */}
            {(decomposeResult.rootTask as Record<string, unknown>)?.id && (
              <div className="mt-4">
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => handleReasoning((decomposeResult.rootTask as Record<string, unknown>).id as string)}
                >
                  <Lightbulb className="h-4 w-4" />
                  查看推理链状态
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Collaboration Result */}
      {collaborateResult && (
        <Card className="border-emerald-200">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Network className="h-5 w-5 text-emerald-500" />
              多Agent协作流程
              <Badge variant="outline" className="text-xs border-emerald-200 text-emerald-600">
                {(collaborateResult.summary as Record<string, unknown>)?.agentsInvolved as number}个Agent参与
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Collaboration Timeline */}
            <ScrollArea className="max-h-[500px]">
              <div className="space-y-3">
                {((collaborateResult.collaborationFlow as Record<string, unknown>[]) || []).map((log, index) => {
                  const reasoning = parseJSON(log?.reasoning as string || '{}') as Record<string, unknown>;
                  const result = parseJSON(log?.result as string || '{}') as Record<string, unknown>;
                  const fromAgent = log?.fromAgent as Record<string, string> | null;
                  const toAgent = log?.toAgent as Record<string, string> | null;
                  const phase = log?.phase as string;

                  return (
                    <div key={log?.id as string} className="relative">
                      {/* Phase connector */}
                      {index > 0 && (
                        <div className="absolute left-[19px] -top-1.5 w-0.5 h-1.5 bg-slate-300" />
                      )}
                      <div className="flex items-start gap-3 p-3 rounded-lg border bg-card">
                        {/* Phase indicator */}
                        <div className="flex-shrink-0">
                          <div className={`h-10 w-10 rounded-full flex items-center justify-center border ${phaseColors[phase] || 'bg-gray-100 border-gray-200'}`}>
                            {phaseIcons[phase] || <Circle className="h-3.5 w-3.5" />}
                          </div>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="secondary" className={`text-[10px] ${phaseColors[phase] || ''}`}>
                              {phaseLabels[phase] || phase}
                            </Badge>
                            <span className="text-sm font-medium">{log?.action as string}</span>
                          </div>

                          {/* Agent communication */}
                          <div className="flex items-center gap-2 text-xs mb-2">
                            {fromAgent && (
                              <span className="flex items-center gap-1">
                                <span>{fromAgent.avatar}</span>
                                <span className="font-medium">{fromAgent.name}</span>
                              </span>
                            )}
                            {fromAgent && toAgent && (
                              <ArrowRight className="h-3 w-3 text-muted-foreground" />
                            )}
                            {toAgent && (
                              <span className="flex items-center gap-1">
                                <span>{toAgent.avatar}</span>
                                <span className="font-medium">{toAgent.name}</span>
                              </span>
                            )}
                          </div>

                          {/* Reasoning display */}
                          {reasoning.thought && (
                            <div className="p-2 rounded bg-purple-50 border border-purple-100 text-xs mb-2">
                              <div className="flex items-center gap-1 mb-1">
                                <Brain className="h-3 w-3 text-purple-500" />
                                <span className="font-semibold text-purple-700">推理过程</span>
                              </div>
                              <p className="text-purple-800/80">{reasoning.thought as string}</p>
                              {reasoning.analysis && (
                                <p className="text-purple-800/60 mt-1">分析: {reasoning.analysis as string}</p>
                              )}
                              {reasoning.considerations && (
                                <p className="text-purple-800/60 mt-1">
                                  考量: {(reasoning.considerations as string[]).join(', ')}
                                </p>
                              )}
                              {reasoning.checks && (
                                <p className="text-purple-800/60 mt-1">
                                  检查: {(reasoning.checks as string[]).join(' | ')}
                                </p>
                              )}
                              {reasoning.keyFindings && (
                                <p className="text-purple-800/60 mt-1">
                                  发现: {(reasoning.keyFindings as string[]).join(' | ')}
                                </p>
                              )}
                            </div>
                          )}

                          {/* Result */}
                          <div className="text-xs text-muted-foreground">
                            <span className="font-medium">结果: </span>
                            {JSON.stringify(result)}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>

            {/* Assignment Plan */}
            {((collaborateResult.assignmentPlan as Record<string, unknown>[]) || []).length > 0 && (
              <div className="mt-4">
                <Separator className="mb-4" />
                <h4 className="text-sm font-semibold mb-2">Agent分配方案</h4>
                <div className="flex flex-wrap gap-2">
                  {(collaborateResult.assignmentPlan as Record<string, unknown>[]).map((plan, i) => (
                    <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-muted/30">
                      <span className="text-lg">{plan?.agentAvatar as string}</span>
                      <div>
                        <p className="text-xs font-medium">{plan?.agentName as string}</p>
                        <p className="text-[10px] text-muted-foreground">{(plan?.steps as string[])?.join(' → ')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Reasoning Chain Status */}
      {reasoningChain && (
        <Card className="border-cyan-200">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Lightbulb className="h-5 w-5 text-cyan-500" />
              推理链实时状态
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Chain Progress */}
            <div className="mb-4 p-3 rounded-lg bg-cyan-50 border border-cyan-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-cyan-700">链路总进度</span>
                <span className="text-sm font-bold text-cyan-700">{(reasoningChain as Record<string, unknown>).chainProgress as number}%</span>
              </div>
              <Progress value={(reasoningChain as Record<string, unknown>).chainProgress as number} className="h-2 [&>div]:bg-cyan-500" />
            </div>

            {/* Chain Steps */}
            {(((reasoningChain as Record<string, unknown>).chain as Record<string, unknown>[]) || []).map((step, index) => {
              const reasoning = parseJSON(step?.reasoning as string || '{}') as ReasoningStep;
              const stepStatus = step?.status as string;
              const statusIcon = stepStatus === 'completed'
                ? <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                : stepStatus === 'running'
                ? <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
                : <Circle className="h-4 w-4 text-gray-400" />;

              return (
                <div key={step?.id as string} className="flex items-start gap-3 mb-3">
                  <div className="flex flex-col items-center">
                    {statusIcon}
                    {index < (((reasoningChain as Record<string, unknown>).chain as Record<string, unknown>[]).length - 1) && (
                      <div className="w-0.5 h-8 bg-gray-200 mt-1" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{step?.title as string}</span>
                      <Badge variant="outline" className={`text-[10px] ${
                        stepStatus === 'completed' ? 'border-emerald-300 text-emerald-600' :
                        stepStatus === 'running' ? 'border-blue-300 text-blue-600' :
                        'border-gray-300 text-gray-500'
                      }`}>
                        {stepStatus === 'completed' ? '已完成' : stepStatus === 'running' ? '执行中' : '待执行'}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{step?.progress as number}%</span>
                    </div>
                    {reasoning.thought && (
                      <p className="text-xs text-muted-foreground mt-0.5">{reasoning.thought}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
