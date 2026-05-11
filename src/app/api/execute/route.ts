import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Simulate agent execution - updates task progress and agent status
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { taskId, action } = body;

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

    if (action === 'start') {
      // Start task execution
      const updated = await db.task.update({
        where: { id: taskId },
        data: { status: 'running', progress: 5 },
        include: { agent: true },
      });
      if (task.agent) {
        await db.agent.update({ where: { id: task.agent.id }, data: { status: 'running' } });
      }
      return NextResponse.json({ task: updated, message: '任务已开始执行' });
    }

    if (action === 'complete') {
      const updated = await db.task.update({
        where: { id: taskId },
        data: { status: 'completed', progress: 100, completedAt: new Date(), output: JSON.stringify({ result: 'success', timestamp: new Date().toISOString() }) },
        include: { agent: true },
      });
      // Check if agent has other running tasks
      if (task.agent) {
        const otherRunning = await db.task.count({
          where: { agentId: task.agent.id, status: 'running', id: { not: taskId } },
        });
        if (otherRunning === 0) {
          await db.agent.update({ where: { id: task.agent.id }, data: { status: 'idle' } });
        }
      }
      return NextResponse.json({ task: updated, message: '任务已完成' });
    }

    if (action === 'progress') {
      const newProgress = Math.min((task.progress || 0) + Math.floor(10 + Math.random() * 20), 99);
      const updated = await db.task.update({
        where: { id: taskId },
        data: { progress: newProgress },
        include: { agent: true },
      });
      return NextResponse.json({ task: updated, progress: newProgress });
    }

    if (action === 'fail') {
      const updated = await db.task.update({
        where: { id: taskId },
        data: { status: 'failed', error: '执行过程中发生异常' },
        include: { agent: true },
      });
      return NextResponse.json({ task: updated, message: '任务已标记为失败' });
    }

    if (action === 'retry') {
      const updated = await db.task.update({
        where: { id: taskId },
        data: { status: 'pending', progress: 0, error: null },
        include: { agent: true },
      });
      return NextResponse.json({ task: updated, message: '任务已重置等待重试' });
    }

    return NextResponse.json({ error: '未知操作' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
