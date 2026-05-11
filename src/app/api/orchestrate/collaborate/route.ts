import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Multi-Agent collaboration simulation
// Simulates the collaboration protocol between agents for a given task
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { taskTitle, taskDescription } = body;

    if (!taskTitle) {
      return NextResponse.json({ error: '缺少任务标题' }, { status: 400 });
    }

    // Get all available agents
    const agents = await db.agent.findMany({
      where: { status: { in: ['running', 'idle'] } },
    });

    if (agents.length === 0) {
      return NextResponse.json({ error: '没有可用的Agent' }, { status: 400 });
    }

    const coordinator = agents.find(a => a.type === 'coordinator');
    const sessionId = `collab-${Date.now()}`;

    // Phase 1: Coordinator receives and analyzes the task
    const phase1Log = await db.collaborationLog.create({
      data: {
        sessionId,
        phase: 'decompose',
        fromAgentId: coordinator?.id || agents[0].id,
        action: 'task_analysis',
        reasoning: JSON.stringify({
          thought: `收到新任务"${taskTitle}"，分析任务复杂度和所需Agent能力...`,
          analysis: '识别到该任务需要多步骤协作，涉及数据采集、处理和验证',
          requiredCapabilities: ['数据处理', '质量监控', '分析推理'],
          estimatedSteps: 5,
        }),
        result: JSON.stringify({ status: 'analyzed', complexity: 'high' }),
        chainDepth: 0,
      },
    });

    // Phase 2: Coordinator decomposes and assigns
    const availableExecutors = agents.filter(a => a.type === 'executor');
    const availableMonitors = agents.filter(a => a.type === 'monitor');
    const availableAnalyzers = agents.filter(a => a.type === 'analyzer');
    const communicator = agents.find(a => a.type === 'communicator');

    const assignmentPlan = [];
    
    // Assign executors for data steps
    if (availableExecutors.length > 0) {
      assignmentPlan.push({
        agentId: availableExecutors[0].id,
        agentName: availableExecutors[0].name,
        agentAvatar: availableExecutors[0].avatar,
        role: 'data_processor',
        steps: ['数据采集', '数据清洗'],
      });
    }

    // Assign monitor for quality check
    if (availableMonitors.length > 0) {
      assignmentPlan.push({
        agentId: availableMonitors[0].id,
        agentName: availableMonitors[0].name,
        agentAvatar: availableMonitors[0].avatar,
        role: 'quality_checker',
        steps: ['质量检测', '异常告警'],
      });
    }

    // Assign analyzer for insight
    if (availableAnalyzers.length > 0) {
      assignmentPlan.push({
        agentId: availableAnalyzers[0].id,
        agentName: availableAnalyzers[0].name,
        agentAvatar: availableAnalyzers[0].avatar,
        role: 'analyst',
        steps: ['数据分析', '报告生成'],
      });
    }

    const phase2Log = await db.collaborationLog.create({
      data: {
        sessionId,
        phase: 'assign',
        fromAgentId: coordinator?.id || agents[0].id,
        action: 'agent_assignment',
        reasoning: JSON.stringify({
          thought: `根据任务需求和能力匹配，将任务分配给${assignmentPlan.length}个Agent`,
          assignmentStrategy: 'capability_matching',
          considerations: ['Agent当前负载', '能力匹配度', '历史成功率'],
        }),
        result: JSON.stringify({ assignments: assignmentPlan }),
        chainDepth: 0,
      },
    });

    // Phase 3: Communication protocol establishment
    if (communicator) {
      await db.collaborationLog.create({
        data: {
          sessionId,
          phase: 'reason',
          fromAgentId: coordinator?.id || agents[0].id,
          toAgentId: communicator.id,
          action: 'protocol_establishment',
          reasoning: JSON.stringify({
            thought: '建立Agent间通信协议，确保消息有序传递和状态同步',
            protocol: 'request-response',
            channels: ['task_channel', 'alert_channel', 'result_channel'],
          }),
          result: JSON.stringify({ channels: 3, protocol: 'established' }),
          chainDepth: 0,
        },
      });
    }

    // Phase 4: Simulate execution chain with agent interactions
    const executionPhases = [
      {
        phase: 'execute',
        fromAgentId: availableExecutors[0]?.id,
        toAgentId: availableMonitors[0]?.id,
        action: 'data_handoff',
        reasoning: {
          thought: '数据处理Agent完成采集与清洗，将结果传递给质量监控Agent进行检测',
          dataQuality: 0.97,
          recordsProcessed: 15420,
        },
        result: { status: 'handed_off', dataSize: '2.3GB' },
        chainDepth: 1,
      },
      {
        phase: 'review',
        fromAgentId: availableMonitors[0]?.id,
        toAgentId: availableAnalyzers[0]?.id,
        action: 'quality_gate',
        reasoning: {
          thought: '质量监控Agent完成检测，数据质量达标，放行至分析阶段',
          checks: ['完整性检查✓', '准确性检查✓', '一致性检查✓'],
          qualityScore: 0.96,
        },
        result: { passed: true, qualityScore: 0.96 },
        chainDepth: 1,
      },
      {
        phase: 'merge',
        fromAgentId: availableAnalyzers[0]?.id,
        toAgentId: coordinator?.id || agents[0].id,
        action: 'result_report',
        reasoning: {
          thought: '分析Agent完成深度分析，将结果汇总报告给中央调度器',
          keyFindings: ['销售趋势上升12%', '客户留存率下降3%', '新增市场机会2个'],
          confidence: 0.91,
        },
        result: { analysisComplete: true, findings: 3, confidence: 0.91 },
        chainDepth: 1,
      },
    ];

    const executionLogs = [];
    for (const phase of executionPhases) {
      const log = await db.collaborationLog.create({
        data: {
          sessionId,
          phase: phase.phase,
          fromAgentId: phase.fromAgentId || null,
          toAgentId: phase.toAgentId || null,
          action: phase.action,
          reasoning: JSON.stringify(phase.reasoning),
          result: JSON.stringify(phase.result),
          chainDepth: phase.chainDepth,
        },
      });
      executionLogs.push(log);
    }

    // Get all logs for this session
    const allLogs = await db.collaborationLog.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
      include: {
        // We'll manually join agent info
      },
    });

    // Enrich logs with agent info
    const agentMap = new Map(agents.map(a => [a.id, a]));
    const enrichedLogs = allLogs.map(log => ({
      ...log,
      fromAgent: log.fromAgentId ? agentMap.get(log.fromAgentId) : null,
      toAgent: log.toAgentId ? agentMap.get(log.toAgentId) : null,
    }));

    return NextResponse.json({
      sessionId,
      collaborationFlow: enrichedLogs,
      assignmentPlan,
      summary: {
        totalPhases: enrichedLogs.length,
        agentsInvolved: assignmentPlan.length + (coordinator ? 1 : 0) + (communicator ? 1 : 0),
        chainType: 'sequential_with_handoff',
        estimatedSteps: 5,
        confidence: 0.89,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Collaborate error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
