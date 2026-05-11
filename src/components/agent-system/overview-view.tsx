'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  AlertTriangle,
  Zap,
  GitBranch,
  Brain,
  Network,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Target,
  Layers,
  Workflow,
  Lightbulb,
  RefreshCw,
} from 'lucide-react';

interface OverviewViewProps {
  onNavigate: (view: 'dashboard' | 'agents' | 'tasks' | 'workflows') => void;
}

const painPoints = [
  {
    icon: <AlertTriangle className="h-6 w-6 text-red-500" />,
    title: '单点故障，缺乏容错',
    description: '传统自动化脚本一旦某个环节失败，整个流程中断，缺乏自动重试和异常恢复机制。单节点执行无法应对复杂多步骤任务的容错需求，导致运营效率低下，人工介入频繁。',
    solution: '多Agent协作架构中，每个Agent独立运行，监控Agent实时检测异常并触发告警，调度器自动重新分配任务，确保系统具备自愈能力。',
    solutionIcon: <Network className="h-5 w-5 text-emerald-500" />,
    pain: '系统可靠性低于99.5%',
    gain: '可靠性提升至99.95%',
  },
  {
    icon: <Zap className="h-6 w-6 text-amber-500" />,
    title: '任务编排复杂度高',
    description: '手动编排多步骤任务耗时且容易出错，步骤间的依赖关系难以管理。当任务规模增长时，线性脚本的维护成本呈指数级上升，修改一个步骤可能引发连锁反应。',
    solution: '智能任务分解引擎自动将复杂任务拆解为有序依赖链，支持顺序执行、并行执行和混合模式，每个步骤独立管理、可追踪、可回溯。',
    solutionIcon: <GitBranch className="h-5 w-5 text-emerald-500" />,
    pain: '编排时间>2小时/流程',
    gain: '编排时间<5分钟/流程',
  },
  {
    icon: <Brain className="h-6 w-6 text-purple-500" />,
    title: '缺乏深度推理能力',
    description: '传统自动化系统只能执行预设规则，无法根据上下文动态调整策略。面对异常场景时缺乏"思考"能力，只能按固定逻辑运行或直接报错，无法进行多步推理决策。',
    solution: '长链推理引擎支持多步骤链式推理（Chain-of-Thought），每个步骤包含Thought-Action-Observation循环，Agent能根据中间结果动态调整后续策略。',
    solutionIcon: <Lightbulb className="h-5 w-5 text-emerald-500" />,
    pain: '异常处理需人工介入',
    gain: '80%异常自动处理',
  },
  {
    icon: <Layers className="h-6 w-6 text-blue-500" />,
    title: '信息孤岛，协作低效',
    description: '不同系统、工具之间缺乏统一的通信协议，数据在传递过程中需要人工桥接。Agent之间无法直接交换状态和结果，导致协作效率低下，信息传递延迟高。',
    solution: '统一的Agent通信协议支持点对点消息、广播通知和状态同步，通信协调Agent负责消息路由和协议转换，消除信息孤岛。',
    solutionIcon: <Workflow className="h-5 w-5 text-emerald-500" />,
    pain: '信息传递延迟>30分钟',
    gain: '实时同步<1秒',
  },
  {
    icon: <Target className="h-6 w-6 text-teal-500" />,
    title: '质量不可控，缺乏闭环验证',
    description: '自动化流程执行后缺乏质量检测环节，错误结果可能被传递到下游，产生级联效应。没有内置的质量门禁机制，无法在关键节点进行自动校验和拦截。',
    solution: '质量监控Agent在每个关键节点执行自动检测，设置质量门禁（Quality Gate），只有通过验证的中间结果才能传递到下一阶段，形成完整的质量闭环。',
    solutionIcon: <CheckCircle2 className="h-5 w-5 text-emerald-500" />,
    pain: '错误发现延迟>2小时',
    gain: '错误即时拦截',
  },
];

const coreLogicFlow = [
  {
    step: 1,
    title: '任务接入',
    subtitle: 'Task Intake',
    description: '中央调度器接收复杂任务，进行需求理解和复杂度评估',
    agent: '🧠 调度器',
    color: 'from-purple-500 to-purple-600',
  },
  {
    step: 2,
    title: '智能分解',
    subtitle: 'Intelligent Decomposition',
    description: '长链推理引擎分析任务结构，自动拆解为有序依赖子任务链',
    agent: '🧠 推理引擎',
    color: 'from-violet-500 to-violet-600',
  },
  {
    step: 3,
    title: '能力匹配',
    subtitle: 'Capability Matching',
    description: '根据子任务需求与Agent能力图谱，最优匹配执行Agent',
    agent: '🧠 调度器 + 📡 通信器',
    color: 'from-emerald-500 to-emerald-600',
  },
  {
    step: 4,
    title: '链式执行',
    subtitle: 'Chain Execution',
    description: '按依赖链顺序执行，每步包含Thought→Action→Observation推理循环',
    agent: '⚙️ 执行器集群',
    color: 'from-teal-500 to-teal-600',
  },
  {
    step: 5,
    title: '质量门禁',
    subtitle: 'Quality Gate',
    description: '每个关键节点自动进行质量检测，未通过则回退重试',
    agent: '🔍 监控器',
    color: 'from-amber-500 to-amber-600',
  },
  {
    step: 6,
    title: '结果汇聚',
    subtitle: 'Result Aggregation',
    description: '各Agent执行结果汇聚到调度器，进行最终验证和输出',
    agent: '🧠 调度器 + 📊 分析器',
    color: 'from-cyan-500 to-cyan-600',
  },
];

export default function OverviewView({ onNavigate }: OverviewViewProps) {
  const [expandedPain, setExpandedPain] = useState<number | null>(null);

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 p-8 text-white">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-teal-500/10 rounded-full translate-y-1/2 -translate-x-1/2" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-4">
            <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
              Multi-Agent Orchestration System
            </Badge>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-3">
            多Agent协同运营自动化系统
          </h1>
          <p className="text-white/70 text-lg max-w-2xl mb-6">
            基于长链推理与多Agent协作的智能运营自动化平台，实现从任务接入、智能分解、
            链式执行到质量闭环的全流程自动化编排。
          </p>
          <div className="flex gap-3 flex-wrap">
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 gap-2"
              onClick={() => onNavigate('dashboard')}
            >
              进入控制台
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="border-white/20 text-white hover:bg-white/10 gap-2"
              onClick={() => onNavigate('workflows')}
            >
              查看工作流
              <Workflow className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Core Pain Points */}
      <div>
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-xl bg-red-100 flex items-center justify-center">
            <AlertTriangle className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">核心痛点</h2>
            <p className="text-muted-foreground text-sm">系统解决的关键运营自动化难题</p>
          </div>
        </div>

        <div className="space-y-4">
          {painPoints.map((pain, index) => (
            <Card
              key={index}
              className={`overflow-hidden transition-all cursor-pointer hover:shadow-lg ${
                expandedPain === index ? 'ring-2 ring-emerald-500/30' : ''
              }`}
              onClick={() => setExpandedPain(expandedPain === index ? null : index)}
            >
              <CardContent className="p-0">
                <div className="flex items-start gap-4 p-5">
                  <div className="h-12 w-12 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
                    {pain.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-lg">{pain.title}</h3>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] border-red-200 text-red-600">
                          {pain.pain}
                        </Badge>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        <Badge variant="outline" className="text-[10px] border-emerald-200 text-emerald-600">
                          {pain.gain}
                        </Badge>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {pain.description}
                    </p>
                  </div>
                </div>
                {expandedPain === index && (
                  <div className="border-t bg-emerald-50/50 p-5">
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                        {pain.solutionIcon}
                      </div>
                      <div>
                        <h4 className="font-semibold text-emerald-700 mb-1">解决方案</h4>
                        <p className="text-sm text-emerald-900/80">{pain.solution}</p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Separator />

      {/* Core Logic Flow */}
      <div>
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-xl bg-emerald-100 flex items-center justify-center">
            <GitBranch className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">核心逻辑流</h2>
            <p className="text-muted-foreground text-sm">包含长链推理与多Agent协作的完整执行链路</p>
          </div>
        </div>

        {/* Logic Flow Diagram */}
        <div className="relative">
          {/* Vertical line connecting steps */}
          <div className="absolute left-[39px] top-0 bottom-0 w-0.5 bg-gradient-to-b from-purple-500 via-emerald-500 to-cyan-500 hidden md:block" />

          <div className="space-y-4">
            {coreLogicFlow.map((step, index) => (
              <div key={step.step} className="flex gap-4 items-start">
                {/* Step number with connecting line */}
                <div className="relative flex-shrink-0 hidden md:block">
                  <div className={`h-10 w-10 rounded-full bg-gradient-to-br ${step.color} flex items-center justify-center text-white font-bold text-sm shadow-lg z-10 relative`}>
                    {step.step}
                  </div>
                </div>

                {/* Step content */}
                <Card className="flex-1 hover:shadow-md transition-shadow">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-lg">{step.title}</h3>
                          <span className="text-xs text-muted-foreground font-mono">{step.subtitle}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">{step.description}</p>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <Badge variant="secondary" className="text-xs whitespace-nowrap">
                          {step.agent}
                        </Badge>
                      </div>
                    </div>

                    {/* Reasoning chain indicator for step 4 */}
                    {step.step === 4 && (
                      <div className="mt-4 p-3 rounded-lg bg-slate-50 border border-slate-200">
                        <p className="text-xs font-semibold text-slate-600 mb-2">长链推理循环 (Chain-of-Thought)</p>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="px-2 py-1 rounded bg-purple-100 text-purple-700 font-medium">Thought 思考</span>
                          <ArrowRight className="h-3 w-3 text-slate-400" />
                          <span className="px-2 py-1 rounded bg-emerald-100 text-emerald-700 font-medium">Action 行动</span>
                          <ArrowRight className="h-3 w-3 text-slate-400" />
                          <span className="px-2 py-1 rounded bg-amber-100 text-amber-700 font-medium">Observation 观察</span>
                          <ArrowRight className="h-3 w-3 text-slate-400" />
                          <span className="px-2 py-1 rounded bg-cyan-100 text-cyan-700 font-medium">Next 下一步</span>
                        </div>
                      </div>
                    )}

                    {/* Multi-agent collaboration indicator for step 3 */}
                    {step.step === 3 && (
                      <div className="mt-4 p-3 rounded-lg bg-slate-50 border border-slate-200">
                        <p className="text-xs font-semibold text-slate-600 mb-2">多Agent协作协议</p>
                        <div className="flex items-center gap-3 text-xs">
                          <div className="flex items-center gap-1">
                            <span className="h-2 w-2 rounded-full bg-emerald-500" />
                            <span className="text-slate-600">能力匹配</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="h-2 w-2 rounded-full bg-purple-500" />
                            <span className="text-slate-600">负载均衡</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="h-2 w-2 rounded-full bg-amber-500" />
                            <span className="text-slate-600">历史偏好</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="h-2 w-2 rounded-full bg-cyan-500" />
                            <span className="text-slate-600">亲和性调度</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Separator />

      {/* Architecture Summary */}
      <div>
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-xl bg-cyan-100 flex items-center justify-center">
            <Layers className="h-5 w-5 text-cyan-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">系统架构</h2>
            <p className="text-muted-foreground text-sm">三层架构：编排层 → 协作层 → 执行层</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-t-4 border-t-purple-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Brain className="h-4 w-4 text-purple-500" />
                编排层
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">
                负责任务接收、智能分解和全局调度。长链推理引擎在此层运行，将复杂任务拆解为可执行的依赖链。
              </p>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  <span>长链推理分解</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  <span>依赖链编排</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  <span>全局优先级调度</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  <span>异常恢复与重试</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-t-4 border-t-emerald-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Network className="h-4 w-4 text-emerald-500" />
                协作层
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">
                管理Agent间通信、状态同步和结果汇聚。支持点对点、广播和发布订阅三种通信模式。
              </p>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  <span>消息路由与协议转换</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  <span>状态同步与一致性</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  <span>质量门禁检测</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  <span>结果汇聚与验证</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-t-4 border-t-cyan-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="h-4 w-4 text-cyan-500" />
                执行层
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">
                各专业Agent独立执行具体任务，每个Agent具备特定能力集，支持并行和串行执行模式。
              </p>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  <span>专业Agent执行</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  <span>并行/串行执行</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  <span>进度实时上报</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  <span>结果质量自检</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
