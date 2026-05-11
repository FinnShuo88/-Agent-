import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const category = req.nextUrl.searchParams.get('category');
    const hours = parseInt(req.nextUrl.searchParams.get('hours') || '24');
    const since = new Date(Date.now() - hours * 3600000);

    const where: Record<string, unknown> = { createdAt: { gte: since } };
    if (category) where.category = category;

    const metrics = await db.systemMetric.findMany({
      where,
      orderBy: { createdAt: 'asc' },
    });

    // Get summary
    const agents = await db.agent.findMany({ select: { status: true } });
    const tasks = await db.task.findMany({ select: { status: true } });
    const workflows = await db.workflow.findMany({ select: { status: true } });

    const summary = {
      agents: {
        total: agents.length,
        running: agents.filter(a => a.status === 'running').length,
        idle: agents.filter(a => a.status === 'idle').length,
        error: agents.filter(a => a.status === 'error').length,
        offline: agents.filter(a => a.status === 'offline').length,
      },
      tasks: {
        total: tasks.length,
        pending: tasks.filter(t => t.status === 'pending').length,
        running: tasks.filter(t => t.status === 'running').length,
        completed: tasks.filter(t => t.status === 'completed').length,
        failed: tasks.filter(t => t.status === 'failed').length,
      },
      workflows: {
        total: workflows.length,
        active: workflows.filter(w => w.status === 'active' || w.status === 'running').length,
        draft: workflows.filter(w => w.status === 'draft').length,
      },
      metrics,
    };

    return NextResponse.json(summary);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
