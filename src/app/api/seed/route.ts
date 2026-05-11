import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST() {
  try {
    // Clear existing data
    await db.collaborationLog.deleteMany();
    await db.systemMetric.deleteMany();
    await db.message.deleteMany();
    await db.workflowAgent.deleteMany();
    await db.task.deleteMany();
    await db.workflow.deleteMany();
    await db.agent.deleteMany();

    // Create agents
    const coordinator = await db.agent.create({
      data: {
        name: '中央调度器',
        type: 'coordinator',
        status: 'running',
        description: '负责全局任务分配与协调，是系统核心调度节点。支持长链推理分解和依赖链编排。',
        avatar: '🧠',
        capabilities: JSON.stringify(['任务分配', '长链推理', '冲突解决', '资源调度', '依赖链编排']),
        config: JSON.stringify({ maxConcurrentTasks: 10, heartbeatInterval: 5000, reasoningDepth: 5 }),
      },
    });

    const executor1 = await db.agent.create({
      data: {
        name: '数据处理Agent',
        type: 'executor',
        status: 'running',
        description: '高效执行数据采集、清洗、转换等数据处理任务，支持批量并行处理',
        avatar: '⚙️',
        capabilities: JSON.stringify(['数据采集', '数据清洗', 'ETL转换', '批量处理']),
        config: JSON.stringify({ batchSize: 1000, timeout: 30000 }),
      },
    });

    const executor2 = await db.agent.create({
      data: {
        name: '内容生成Agent',
        type: 'executor',
        status: 'idle',
        description: '基于AI模型自动生成文案、报告、摘要等内容，支持多轮推理优化',
        avatar: '✍️',
        capabilities: JSON.stringify(['文案生成', '报告撰写', '摘要提取', '多语言翻译']),
        config: JSON.stringify({ model: 'gpt-4', maxTokens: 4096 }),
      },
    });

    const monitor = await db.agent.create({
      data: {
        name: '质量监控Agent',
        type: 'monitor',
        status: 'running',
        description: '实时监控系统运行状态，执行质量门禁检测，检测异常并触发告警',
        avatar: '🔍',
        capabilities: JSON.stringify(['质量检测', '异常告警', '性能监控', '质量门禁']),
        config: JSON.stringify({ checkInterval: 3000, alertThreshold: 0.85 }),
      },
    });

    const analyzer = await db.agent.create({
      data: {
        name: '数据分析Agent',
        type: 'analyzer',
        status: 'idle',
        description: '深度数据分析与洞察，支持多步推理和趋势预测，提供决策支持',
        avatar: '📊',
        capabilities: JSON.stringify(['统计分析', '趋势预测', '报表生成', '深度推理']),
        config: JSON.stringify({ analysisDepth: 'deep', outputFormat: 'chart' }),
      },
    });

    const communicator = await db.agent.create({
      data: {
        name: '通信协调Agent',
        type: 'communicator',
        status: 'running',
        description: '负责Agent之间的消息传递、协议转换与状态同步，消除信息孤岛',
        avatar: '📡',
        capabilities: JSON.stringify(['消息路由', '协议转换', '广播通知', '状态同步']),
        config: JSON.stringify({ protocol: 'websocket', retryCount: 3 }),
      },
    });

    const executor3 = await db.agent.create({
      data: {
        name: '自动化测试Agent',
        type: 'executor',
        status: 'error',
        description: '自动执行回归测试、接口测试、性能测试等质量保障任务',
        avatar: '🧪',
        capabilities: JSON.stringify(['单元测试', '接口测试', '性能测试', '回归测试']),
        config: JSON.stringify({ parallelWorkers: 4, testTimeout: 60000 }),
      },
    });

    const executor4 = await db.agent.create({
      data: {
        name: '部署运维Agent',
        type: 'executor',
        status: 'offline',
        description: '负责自动化部署、环境配置、灰度发布、运维巡检等DevOps任务',
        avatar: '🚀',
        capabilities: JSON.stringify(['自动部署', '灰度发布', '健康检查', '故障恢复']),
        config: JSON.stringify({ env: 'production', rollbackEnabled: true }),
      },
    });

    // === Create reasoning chain demo data ===
    // Root task: 季度数据分析与报告生成
    const rootTask = await db.task.create({
      data: {
        title: '季度数据分析与报告生成',
        description: '从多个数据源采集数据，进行清洗、质量检测、深度分析，最终生成季度业务报告',
        status: 'running',
        priority: 'high',
        agentId: coordinator.id,
        depth: 0,
        reasoningStep: JSON.stringify({
          thought: '分析任务"季度数据分析与报告生成"，识别核心子问题...',
          action: 'task_decomposition',
          observation: '识别到5个子任务，形成顺序依赖链',
          nextThought: '需要按sequential模式分配给Agent执行',
          chainType: 'sequential',
          confidence: 0.92,
        }),
      },
    });

    // Sub-tasks forming the reasoning chain
    const sub1 = await db.task.create({
      data: {
        title: '需求理解与目标定义',
        description: '理解数据处理需求，明确目标和验收标准',
        status: 'completed',
        priority: 'high',
        agentId: coordinator.id,
        parentTaskId: rootTask.id,
        depth: 1,
        progress: 100,
        completedAt: new Date(),
        input: JSON.stringify({ source: '季度数据分析与报告生成' }),
        output: JSON.stringify({ goals: ['销售趋势', '客户留存', '市场机会'], acceptance: ['完整度>95%', '准确度>98%'] }),
        reasoningStep: JSON.stringify({
          thought: '首先需要明确数据处理的具体需求和目标，确保后续步骤方向正确',
          action: 'requirement_analysis',
          observation: '已识别关键需求指标和验收标准',
          nextThought: '需求明确后，进入数据源识别与采集阶段',
          dependsOn: [],
        }),
      },
    });

    const sub2 = await db.task.create({
      data: {
        title: '数据源识别与采集规划',
        description: '识别所需数据源，制定采集策略和优先级',
        status: 'completed',
        priority: 'high',
        agentId: executor1.id,
        parentTaskId: rootTask.id,
        depth: 1,
        progress: 100,
        completedAt: new Date(),
        input: JSON.stringify({ phase: 'collection' }),
        output: JSON.stringify({ sources: 5, primarySources: ['CRM', 'ERP', '电商'], estimatedRecords: 15000 }),
        reasoningStep: JSON.stringify({
          thought: '根据需求分析结果，确定需要从哪些数据源采集数据，并评估数据可用性',
          action: 'data_source_identification',
          observation: '已识别3个核心数据源和2个辅助数据源',
          nextThought: '数据源确定后，需要设计采集和清洗流程',
          dependsOn: ['需求理解与目标定义'],
        }),
      },
    });

    const sub3 = await db.task.create({
      data: {
        title: '数据采集与初步验证',
        description: '执行数据采集，并对原始数据进行初步验证',
        status: 'running',
        priority: 'high',
        agentId: executor1.id,
        parentTaskId: rootTask.id,
        depth: 1,
        progress: 67,
        input: JSON.stringify({ phase: 'collection_execution' }),
        reasoningStep: JSON.stringify({
          thought: '按照采集规划从各数据源获取数据，同时进行数据完整性初步验证',
          action: 'data_collection',
          observation: '原始数据已采集完成，初步验证显示完整度97.3%',
          nextThought: '采集验证通过后，进入数据清洗和标准化阶段',
          dependsOn: ['数据源识别与采集规划'],
        }),
      },
    });

    const sub4 = await db.task.create({
      data: {
        title: '数据清洗与标准化',
        description: '对原始数据执行去重、补全、格式标准化等清洗操作',
        status: 'pending',
        priority: 'high',
        agentId: executor1.id,
        parentTaskId: rootTask.id,
        depth: 1,
        progress: 0,
        input: JSON.stringify({ phase: 'cleaning' }),
        reasoningStep: JSON.stringify({
          thought: '原始数据通常包含噪声、缺失值和格式不一致问题，需要系统化清洗',
          action: 'data_cleaning',
          observation: '清洗完成：去除重复记录12.3%，补全缺失值8.7%，格式标准化100%',
          nextThought: '清洗完成后，需要验证数据质量是否达标',
          dependsOn: ['数据采集与初步验证'],
        }),
      },
    });

    const sub5 = await db.task.create({
      data: {
        title: '质量检测与达标验证',
        description: '对清洗后的数据进行全面质量检测，确保达到分析标准',
        status: 'pending',
        priority: 'high',
        agentId: monitor.id,
        parentTaskId: rootTask.id,
        depth: 1,
        progress: 0,
        input: JSON.stringify({ phase: 'quality_check' }),
        reasoningStep: JSON.stringify({
          thought: '数据质量是分析结果可靠性的基础，必须严格检测完整度、准确性和一致性',
          action: 'quality_validation',
          observation: '质量检测通过：完整度98.5%，准确性99.1%，一致性97.8%',
          nextThought: '质量达标后，进入深度分析阶段',
          dependsOn: ['数据清洗与标准化'],
        }),
      },
    });

    // Collaboration logs for demo
    const collabSession = `collab-demo-${Date.now()}`;
    await db.collaborationLog.createMany({
      data: [
        {
          sessionId: collabSession,
          phase: 'decompose',
          fromAgentId: coordinator.id,
          action: 'task_analysis',
          reasoning: JSON.stringify({
            thought: '收到新任务"季度数据分析与报告生成"，分析任务复杂度和所需Agent能力...',
            analysis: '识别到该任务需要多步骤协作，涉及数据采集、处理和验证',
            requiredCapabilities: ['数据处理', '质量监控', '分析推理'],
            estimatedSteps: 5,
          }),
          result: JSON.stringify({ status: 'analyzed', complexity: 'high' }),
          chainDepth: 0,
        },
        {
          sessionId: collabSession,
          phase: 'assign',
          fromAgentId: coordinator.id,
          action: 'agent_assignment',
          reasoning: JSON.stringify({
            thought: '根据任务需求和能力匹配，将任务分配给3个Agent',
            assignmentStrategy: 'capability_matching',
            considerations: ['Agent当前负载', '能力匹配度', '历史成功率'],
          }),
          result: JSON.stringify({
            assignments: [
              { agentName: '数据处理Agent', role: 'data_processor', steps: ['数据采集', '数据清洗'] },
              { agentName: '质量监控Agent', role: 'quality_checker', steps: ['质量检测', '异常告警'] },
              { agentName: '数据分析Agent', role: 'analyst', steps: ['数据分析', '报告生成'] },
            ],
          }),
          chainDepth: 0,
        },
        {
          sessionId: collabSession,
          phase: 'execute',
          fromAgentId: executor1.id,
          toAgentId: monitor.id,
          action: 'data_handoff',
          reasoning: JSON.stringify({
            thought: '数据处理Agent完成采集与清洗，将结果传递给质量监控Agent进行检测',
            dataQuality: 0.97,
            recordsProcessed: 15420,
          }),
          result: JSON.stringify({ status: 'handed_off', dataSize: '2.3GB' }),
          chainDepth: 1,
        },
        {
          sessionId: collabSession,
          phase: 'review',
          fromAgentId: monitor.id,
          toAgentId: analyzer.id,
          action: 'quality_gate',
          reasoning: JSON.stringify({
            thought: '质量监控Agent完成检测，数据质量达标，放行至分析阶段',
            checks: ['完整性检查✓', '准确性检查✓', '一致性检查✓'],
            qualityScore: 0.96,
          }),
          result: JSON.stringify({ passed: true, qualityScore: 0.96 }),
          chainDepth: 1,
        },
        {
          sessionId: collabSession,
          phase: 'merge',
          fromAgentId: analyzer.id,
          toAgentId: coordinator.id,
          action: 'result_report',
          reasoning: JSON.stringify({
            thought: '分析Agent完成深度分析，将结果汇总报告给中央调度器',
            keyFindings: ['销售趋势上升12%', '客户留存率下降3%', '新增市场机会2个'],
            confidence: 0.91,
          }),
          result: JSON.stringify({ analysisComplete: true, findings: 3, confidence: 0.91 }),
          chainDepth: 1,
        },
      ],
    });

    // Create workflow
    const workflow = await db.workflow.create({
      data: {
        name: '数据处理流水线',
        description: '从数据采集到报告生成的完整自动化流水线（含长链推理）',
        status: 'running',
        steps: JSON.stringify([
          { id: 1, name: '需求理解', agentType: 'coordinator', action: 'requirement_analysis', next: 2 },
          { id: 2, name: '数据采集', agentType: 'executor', action: 'collect_data', next: 3 },
          { id: 3, name: '数据清洗', agentType: 'executor', action: 'clean_data', next: 4 },
          { id: 4, name: '质量门禁', agentType: 'monitor', action: 'quality_check', next: 5 },
          { id: 5, name: '深度分析', agentType: 'analyzer', action: 'analyze', next: 6 },
          { id: 6, name: '报告生成', agentType: 'executor', action: 'generate_report', next: null },
        ]),
      },
    });

    await db.workflowAgent.createMany({
      data: [
        { workflowId: workflow.id, agentId: coordinator.id, role: 'leader', step: 0 },
        { workflowId: workflow.id, agentId: executor1.id, role: 'participant', step: 1 },
        { workflowId: workflow.id, agentId: monitor.id, role: 'reviewer', step: 3 },
        { workflowId: workflow.id, agentId: analyzer.id, role: 'participant', step: 4 },
        { workflowId: workflow.id, agentId: executor2.id, role: 'participant', step: 5 },
      ],
    });

    // Create additional tasks
    await db.task.createMany({
      data: [
        {
          title: '采集Q1销售数据',
          description: '从多个数据源采集2025年第一季度销售数据',
          status: 'completed',
          priority: 'high',
          agentId: executor1.id,
          workflowId: workflow.id,
          input: JSON.stringify({ sources: ['CRM', 'ERP', '电商平台'], quarter: 'Q1-2025' }),
          output: JSON.stringify({ records: 15420, quality: 0.97 }),
          progress: 100,
          completedAt: new Date(),
          depth: 0,
        },
        {
          title: '清洗原始数据集',
          description: '对采集的原始数据进行去重、补全、格式标准化',
          status: 'running',
          priority: 'high',
          agentId: executor1.id,
          workflowId: workflow.id,
          input: JSON.stringify({ dataset: 'Q1-sales-raw', rules: ['dedup', 'fill_na', 'normalize'] }),
          progress: 67,
          depth: 0,
        },
        {
          title: '执行回归测试套件',
          description: '运行完整的回归测试套件验证系统稳定性',
          status: 'failed',
          priority: 'critical',
          agentId: executor3.id,
          input: JSON.stringify({ suite: 'regression-v2', parallel: true }),
          error: '测试用例 #247 执行超时，已超过60秒阈值',
          progress: 45,
          depth: 0,
        },
        {
          title: '监控API服务健康状态',
          description: '持续监控核心API服务的可用性和响应时间',
          status: 'running',
          priority: 'high',
          agentId: monitor.id,
          input: JSON.stringify({ endpoints: ['/api/health', '/api/metrics', '/api/status'], interval: 30 }),
          progress: 30,
          depth: 0,
        },
        {
          title: '预测下季度销售趋势',
          description: '基于历史数据进行趋势预测和建模',
          status: 'pending',
          priority: 'medium',
          agentId: analyzer.id,
          input: JSON.stringify({ model: 'ARIMA', historyMonths: 12 }),
          depth: 0,
        },
        {
          title: '部署v3.2.1版本到生产环境',
          description: '执行灰度发布流程，部署最新版本',
          status: 'pending',
          priority: 'critical',
          agentId: executor4.id,
          input: JSON.stringify({ version: 'v3.2.1', strategy: 'canary', rolloutPercent: 10 }),
          depth: 0,
        },
      ],
    });

    // Create messages
    await db.message.createMany({
      data: [
        { fromAgentId: coordinator.id, toAgentId: executor1.id, type: 'command', content: '请开始采集Q1销售数据，优先级已提升为高', metadata: JSON.stringify({ taskId: '1' }) },
        { fromAgentId: executor1.id, toAgentId: coordinator.id, type: 'result', content: '数据采集完成，共获取15420条记录，数据质量评分0.97', metadata: JSON.stringify({ taskId: '1', records: 15420 }) },
        { fromAgentId: coordinator.id, toAgentId: executor1.id, type: 'command', content: '开始执行数据清洗流程，请使用标准清洗规则', metadata: JSON.stringify({ taskId: '2' }) },
        { fromAgentId: monitor.id, type: 'broadcast', content: '检测到API响应延迟上升，平均响应时间从120ms上升至350ms', metadata: JSON.stringify({ severity: 'warning', metric: 'api_latency' }) },
        { fromAgentId: executor3.id, toAgentId: coordinator.id, type: 'error', content: '回归测试失败：测试用例 #247 执行超时', metadata: JSON.stringify({ taskId: '5', testCase: '#247' }) },
        { fromAgentId: communicator.id, type: 'broadcast', content: '消息队列同步已完成，3个队列已对齐', metadata: JSON.stringify({ queues: 3, status: 'aligned' }) },
        { fromAgentId: coordinator.id, type: 'info', content: '数据处理流水线进入第3阶段：质量门禁检测', metadata: JSON.stringify({ workflowStep: 4 }) },
        { fromAgentId: monitor.id, toAgentId: analyzer.id, type: 'command', content: '数据质量检测通过，放行至分析阶段', metadata: JSON.stringify({ qualityScore: 0.96, phase: 'quality_gate' }) },
      ],
    });

    // Create metrics
    const now = new Date();
    const metricsData = [];
    for (let i = 23; i >= 0; i--) {
      const time = new Date(now.getTime() - i * 3600000);
      metricsData.push(
        { name: 'task_throughput', value: Math.floor(30 + Math.random() * 50), unit: 'tasks/h', category: 'task', createdAt: time },
        { name: 'agent_cpu_usage', value: Math.floor(20 + Math.random() * 60), unit: '%', category: 'agent', createdAt: time },
        { name: 'message_rate', value: Math.floor(100 + Math.random() * 200), unit: 'msg/min', category: 'system', createdAt: time },
        { name: 'error_rate', value: Math.random() * 5, unit: '%', category: 'system', createdAt: time },
        { name: 'workflow_completion', value: Math.floor(60 + Math.random() * 40), unit: '%', category: 'workflow', createdAt: time },
      );
    }
    await db.systemMetric.createMany({ data: metricsData });

    return NextResponse.json({ success: true, message: '种子数据已创建（含长链推理演示数据）' });
  } catch (error) {
    console.error('Seed error:', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
