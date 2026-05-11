import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Long-chain reasoning execution
// Simulates step-by-step reasoning through a multi-step chain
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { taskId, step } = body;

    if (!taskId) {
      return NextResponse.json({ error: '缺少taskId' }, { status: 400 });
    }

    const task = await db.task.findUnique({
      where: { id: taskId },
      include: { agent: true },
    });

    if (!task) {
      return NextResponse.json({ error: '未找到任务' }, { status: 404 });
    }

    // Get all sub-tasks for this chain
    const chainTasks = await db.task.findMany({
      where: { parentTaskId: taskId },
      orderBy: { createdAt: 'asc' },
    });

    // If this task is a sub-task, get siblings
    const siblings = task.parentTaskId
      ? await db.task.findMany({
          where: { parentTaskId: task.parentTaskId },
          orderBy: { createdAt: 'asc' },
        })
      : chainTasks;

    // Execute reasoning step
    if (step === 'execute') {
      // Execute the next step in the reasoning chain
      const currentReasoning = JSON.parse(task.reasoningStep || '{}');
      const nextStepIndex = siblings.findIndex(s => s.id === task.id) + 1;
      const isLastStep = nextStepIndex >= siblings.length;

      // Update task with reasoning progress
      const newProgress = Math.min(task.progress + Math.floor(15 + Math.random() * 25), isLastStep ? 100 : 95);
      const updatedTask = await db.task.update({
        where: { id: taskId },
        data: {
          status: isLastStep && newProgress >= 100 ? 'completed' : 'running',
          progress: newProgress,
          reasoningStep: JSON.stringify({
            ...currentReasoning,
            currentStep: nextStepIndex,
            totalSteps: siblings.length,
            isLastStep,
            executionLog: [
              ...(currentReasoning.executionLog || []),
              {
                step: nextStepIndex,
                thought: generateThought(currentReasoning, nextStepIndex, siblings.length),
                timestamp: new Date().toISOString(),
                progress: newProgress,
              },
            ],
          }),
          ...(isLastStep && newProgress >= 100 ? { completedAt: new Date() } : {}),
        },
      });

      // Log the reasoning step
      await db.collaborationLog.create({
        data: {
          sessionId: `reason-${task.parentTaskId || taskId}`,
          phase: 'reason',
          fromAgentId: task.agentId,
          action: `reasoning_step_${nextStepIndex}`,
          reasoning: JSON.stringify({
            step: nextStepIndex,
            totalSteps: siblings.length,
            thought: currentReasoning.thought,
            progress: newProgress,
          }),
          result: JSON.stringify({ taskId, progress: newProgress }),
          chainDepth: task.depth,
        },
      });

      return NextResponse.json({
        task: updatedTask,
        reasoning: {
          currentStep: nextStepIndex,
          totalSteps: siblings.length,
          isLastStep,
          thought: currentReasoning.thought,
          progress: newProgress,
        },
      });
    }

    if (step === 'chain_status') {
      // Get the full reasoning chain status
      const rootTask = task.parentTaskId
        ? await db.task.findUnique({ where: { id: task.parentTaskId } })
        : task;
      
      const allChainTasks = rootTask
        ? await db.task.findMany({
            where: { parentTaskId: rootTask.id },
            orderBy: { createdAt: 'asc' },
            include: { agent: { select: { id: true, name: true, avatar: true } } },
          })
        : [];

      return NextResponse.json({
        rootTask,
        chain: allChainTasks.map((t, i) => ({
          id: t.id,
          title: t.title,
          status: t.status,
          progress: t.progress,
          step: i + 1,
          totalSteps: allChainTasks.length,
          agent: t.agent,
          reasoning: JSON.parse(t.reasoningStep || '{}'),
        })),
        chainProgress: allChainTasks.length > 0
          ? Math.round(allChainTasks.reduce((acc, t) => acc + t.progress, 0) / allChainTasks.length)
          : 0,
      });
    }

    return NextResponse.json({ error: '未知步骤' }, { status: 400 });
  } catch (error) {
    console.error('Reason error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

function generateThought(currentReasoning: Record<string, unknown>, step: number, total: number): string {
  const thoughts = [
    `正在执行第${step}/${total}步推理，基于前序结果继续分析...`,
    `推理链第${step}步：综合已有信息，推导下一阶段结论...`,
    `第${step}步推理完成，正在验证推理结果的一致性...`,
    `深度推理进行中（${step}/${total}），交叉验证多个假设...`,
    `推理即将完成（${step}/${total}），汇总分析结果...`,
  ];
  return thoughts[Math.min(step - 1, thoughts.length - 1)] || thoughts[0];
}
