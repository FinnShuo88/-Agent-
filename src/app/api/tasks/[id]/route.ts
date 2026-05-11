import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const task = await db.task.update({
      where: { id },
      data: {
        ...(body.title && { title: body.title }),
        ...(body.status && { status: body.status, ...(body.status === 'completed' && { completedAt: new Date(), progress: 100 }) }),
        ...(body.priority && { priority: body.priority }),
        ...(body.agentId !== undefined && { agentId: body.agentId }),
        ...(body.progress !== undefined && { progress: body.progress }),
        ...(body.output && { output: JSON.stringify(body.output) }),
        ...(body.error !== undefined && { error: body.error }),
      },
      include: { agent: true, workflow: true },
    });
    return NextResponse.json(task);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await db.task.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
