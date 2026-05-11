import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const status = req.nextUrl.searchParams.get('status');
    const agentId = req.nextUrl.searchParams.get('agentId');
    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (agentId) where.agentId = agentId;

    const tasks = await db.task.findMany({
      where,
      include: { agent: { select: { id: true, name: true, avatar: true } }, workflow: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(tasks);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const task = await db.task.create({
      data: {
        title: body.title,
        description: body.description || '',
        status: body.status || 'pending',
        priority: body.priority || 'medium',
        agentId: body.agentId || null,
        workflowId: body.workflowId || null,
        input: JSON.stringify(body.input || {}),
        output: JSON.stringify(body.output || {}),
        progress: body.progress || 0,
      },
      include: { agent: true, workflow: true },
    });
    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
