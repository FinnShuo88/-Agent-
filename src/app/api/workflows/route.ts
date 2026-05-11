import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const workflows = await db.workflow.findMany({
      include: {
        agents: { include: { agent: { select: { id: true, name: true, avatar: true, status: true } } } },
        tasks: { select: { id: true, title: true, status: true } },
        _count: { select: { tasks: true, agents: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(workflows);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const workflow = await db.workflow.create({
      data: {
        name: body.name,
        description: body.description || '',
        status: body.status || 'draft',
        steps: JSON.stringify(body.steps || []),
      },
    });
    if (body.agentIds && body.agentIds.length > 0) {
      await db.workflowAgent.createMany({
        data: body.agentIds.map((agentId: string, index: number) => ({
          workflowId: workflow.id,
          agentId,
          role: index === 0 ? 'leader' : 'participant',
          step: index,
        })),
      });
    }
    const result = await db.workflow.findUnique({
      where: { id: workflow.id },
      include: { agents: { include: { agent: true } }, tasks: true },
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
