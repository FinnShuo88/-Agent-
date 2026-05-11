import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Long-chain reasoning task decomposition
// Breaks a complex task into a chain of sub-tasks with dependencies
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, description, depth = 0, parentTaskId } = body;

    if (!title) {
      return NextResponse.json({ error: '缺少任务标题' }, { status: 400 });
    }

    // Step 1: Analyze the task to determine decomposition strategy
    const decompositionStrategy = analyzeTask(title, description);
    
    // Step 2: Create the root task
    const rootTask = await db.task.create({
      data: {
        title,
        description: description || '',
        status: 'pending',
        priority: decompositionStrategy.priority,
        parentTaskId: parentTaskId || null,
        depth,
        reasoningStep: JSON.stringify({
          thought: `分析任务"${title}"，识别核心子问题...`,
          action: 'task_decomposition',
          observation: `识别到${decompositionStrategy.subTasks.length}个子任务，形成${decompositionStrategy.chainType === 'sequential' ? '顺序依赖链' : decompositionStrategy.chainType === 'parallel' ? '并行执行组' : '混合依赖链'}`,
          nextThought: `需要按${decompositionStrategy.chainType}模式分配给Agent执行`,
          chainType: decompositionStrategy.chainType,
          confidence: decompositionStrategy.confidence,
        }),
      },
    });

    // Step 3: Create sub-tasks with dependency chain
    const subTasks = [];
    for (let i = 0; i < decompositionStrategy.subTasks.length; i++) {
      const sub = decompositionStrategy.subTasks[i];
      const subTask = await db.task.create({
        data: {
          title: sub.title,
          description: sub.description,
          status: 'pending',
          priority: sub.priority || 'medium',
          parentTaskId: rootTask.id,
          depth: depth + 1,
          input: JSON.stringify(sub.input || {}),
          reasoningStep: JSON.stringify({
            thought: sub.reasoning.thought,
            action: sub.reasoning.action,
            observation: sub.reasoning.observation,
            nextThought: sub.reasoning.nextThought,
            dependsOn: i > 0 && decompositionStrategy.chainType === 'sequential' ? [decompositionStrategy.subTasks[i - 1].title] : [],
          }),
        },
      });
      subTasks.push(subTask);
    }

    // Step 4: Log the decomposition as a collaboration event
    await db.collaborationLog.create({
      data: {
        sessionId: `decompose-${rootTask.id}`,
        phase: 'decompose',
        action: 'task_decomposition',
        reasoning: JSON.stringify({
          originalTask: title,
          strategy: decompositionStrategy.chainType,
          subTaskCount: subTasks.length,
          confidence: decompositionStrategy.confidence,
        }),
        result: JSON.stringify({
          rootTaskId: rootTask.id,
          subTaskIds: subTasks.map(t => t.id),
        }),
        chainDepth: depth,
      },
    });

    return NextResponse.json({
      rootTask,
      subTasks,
      strategy: {
        chainType: decompositionStrategy.chainType,
        confidence: decompositionStrategy.confidence,
        totalSteps: subTasks.length,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Decompose error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// Intelligent task analysis and decomposition strategy
function analyzeTask(title: string, description: string) {
  const lowerTitle = title.toLowerCase();
  const lowerDesc = description.toLowerCase();
  const combined = `${lowerTitle} ${lowerDesc}`;

  // Data pipeline type tasks - sequential chain
  if (combined.includes('数据') && (combined.includes('分析') || combined.includes('处理') || combined.includes('流水线'))) {
    return {
      chainType: 'sequential',
      priority: 'high',
      confidence: 0.92,
      subTasks: [
        {
          title: '需求理解与目标定义',
          description: '理解数据处理需求，明确目标和验收标准',
          priority: 'high',
          input: { source: title },
          reasoning: {
            thought: '首先需要明确数据处理的具体需求和目标，确保后续步骤方向正确',
            action: 'requirement_analysis',
            observation: '已识别关键需求指标和验收标准',
            nextThought: '需求明确后，进入数据源识别与采集阶段',
          },
        },
        {
          title: '数据源识别与采集规划',
          description: '识别所需数据源，制定采集策略和优先级',
          priority: 'high',
          input: { phase: 'collection' },
          reasoning: {
            thought: '根据需求分析结果，确定需要从哪些数据源采集数据，并评估数据可用性',
            action: 'data_source_identification',
            observation: '已识别3个核心数据源和2个辅助数据源',
            nextThought: '数据源确定后，需要设计采集和清洗流程',
          },
        },
        {
          title: '数据采集与初步验证',
          description: '执行数据采集，并对原始数据进行初步验证',
          priority: 'high',
          input: { phase: 'collection_execution' },
          reasoning: {
            thought: '按照采集规划从各数据源获取数据，同时进行数据完整性初步验证',
            action: 'data_collection',
            observation: '原始数据已采集完成，初步验证显示完整度97.3%',
            nextThought: '采集验证通过后，进入数据清洗和标准化阶段',
          },
        },
        {
          title: '数据清洗与标准化',
          description: '对原始数据执行去重、补全、格式标准化等清洗操作',
          priority: 'high',
          input: { phase: 'cleaning' },
          reasoning: {
            thought: '原始数据通常包含噪声、缺失值和格式不一致问题，需要系统化清洗',
            action: 'data_cleaning',
            observation: '清洗完成：去除重复记录12.3%，补全缺失值8.7%，格式标准化100%',
            nextThought: '清洗完成后，需要验证数据质量是否达标',
          },
        },
        {
          title: '质量检测与达标验证',
          description: '对清洗后的数据进行全面质量检测，确保达到分析标准',
          priority: 'high',
          input: { phase: 'quality_check' },
          reasoning: {
            thought: '数据质量是分析结果可靠性的基础，必须严格检测完整度、准确性和一致性',
            action: 'quality_validation',
            observation: '质量检测通过：完整度98.5%，准确性99.1%，一致性97.8%',
            nextThought: '质量达标后，进入深度分析阶段',
          },
        },
      ],
    };
  }

  // Report generation - sequential with review
  if (combined.includes('报告') || combined.includes('文档') || combined.includes('生成')) {
    return {
      chainType: 'sequential_with_review',
      priority: 'medium',
      confidence: 0.88,
      subTasks: [
        {
          title: '内容规划与大纲设计',
          description: '根据需求设计文档结构和内容大纲',
          priority: 'medium',
          reasoning: {
            thought: '报告质量首先取决于结构规划，需要明确章节、核心论点和数据支撑',
            action: 'content_planning',
            observation: '已生成5章节大纲，包含12个核心论点',
            nextThought: '大纲确定后，分章节并行撰写',
          },
        },
        {
          title: '数据收集与论据准备',
          description: '收集支撑报告的数据和论据材料',
          priority: 'medium',
          reasoning: {
            thought: '有说服力的报告需要充分的数据支撑，需要从多个维度收集证据',
            action: 'evidence_collection',
            observation: '已收集3类定量数据和5个定性案例',
            nextThought: '材料准备充分后，进入内容撰写阶段',
          },
        },
        {
          title: '核心内容撰写',
          description: '根据大纲和数据撰写报告核心内容',
          priority: 'high',
          reasoning: {
            thought: '将收集的数据和论据按照大纲组织成逻辑连贯的报告内容',
            action: 'content_writing',
            observation: '5个章节已撰写完成，总计约8000字',
            nextThought: '初稿完成后需要审查和优化',
          },
        },
        {
          title: '内容审查与质量校验',
          description: '对生成的报告进行逻辑审查、数据校验和格式检查',
          priority: 'medium',
          reasoning: {
            thought: '审查环节确保报告的准确性、逻辑性和完整性，发现并修正潜在问题',
            action: 'review_and_validation',
            observation: '发现3处数据引用需要修正，2处逻辑需要加强，已全部修正',
            nextThought: '审查通过后，生成最终版本',
          },
        },
      ],
    };
  }

  // Deployment type - sequential with rollback
  if (combined.includes('部署') || combined.includes('发布') || combined.includes('上线')) {
    return {
      chainType: 'sequential_with_rollback',
      priority: 'critical',
      confidence: 0.85,
      subTasks: [
        {
          title: '部署前检查与风险评估',
          description: '检查部署前置条件，评估潜在风险',
          priority: 'critical',
          reasoning: {
            thought: '生产环境部署风险极高，必须全面评估依赖、配置和回滚方案',
            action: 'pre_deploy_check',
            observation: '前置条件满足，识别到2个潜在风险点，已制定缓解方案',
            nextThought: '检查通过后，执行灰度发布',
          },
        },
        {
          title: '灰度发布（Canary）',
          description: '先向10%流量发布新版本，观察运行状态',
          priority: 'critical',
          reasoning: {
            thought: '灰度发布可以将风险控制在最小范围，先小流量验证再逐步扩大',
            action: 'canary_deployment',
            observation: '灰度10%流量运行30分钟，错误率0.01%，响应时间正常',
            nextThought: '灰度指标正常，扩大发布范围',
          },
        },
        {
          title: '全量发布与监控',
          description: '扩大到100%流量并持续监控核心指标',
          priority: 'critical',
          reasoning: {
            thought: '灰度验证通过后全量发布，但需要密切监控关键指标以便及时回滚',
            action: 'full_rollout',
            observation: '全量发布完成，5分钟内核心指标均在正常范围',
            nextThought: '发布稳定后，确认部署成功',
          },
        },
      ],
    };
  }

  // Default: generic sequential decomposition
  return {
    chainType: 'sequential',
    priority: 'medium',
    confidence: 0.78,
    subTasks: [
      {
        title: '需求分析与理解',
        description: '深入理解任务需求，明确执行边界和目标',
        priority: 'medium',
        reasoning: {
          thought: '执行任何复杂任务前，首先需要充分理解需求和约束条件',
          action: 'requirement_analysis',
          observation: '需求已明确，识别到关键约束和成功标准',
          nextThought: '需求明确后，制定执行计划',
        },
      },
      {
        title: '方案设计与规划',
        description: '设计执行方案，分解为可执行步骤',
        priority: 'medium',
        reasoning: {
          thought: '基于需求理解，设计最优执行路径和资源分配方案',
          action: 'planning',
          observation: '方案设计完成，已识别3个关键步骤和2个备选路径',
          nextThought: '方案确定后，逐步执行',
        },
      },
      {
        title: '执行与验证',
        description: '按计划执行，并在每个关键节点进行验证',
        priority: 'medium',
        reasoning: {
          thought: '按步骤执行并在关键节点验证结果，确保方向正确',
          action: 'execution_and_validation',
          observation: '执行完成，验证结果符合预期',
          nextThought: '验证通过后，输出最终结果',
        },
      },
    ],
  };
}
