import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const agent = await db.agent.findUnique({
      where: { id },
      include: {
        tasks: true,
        messages: { take: 20, orderBy: { createdAt: 'desc' } },
        workflows: { include: { workflow: true } },
      },
    });
    if (!agent) return NextResponse.json({ error: '未找到Agent' }, { status: 404 });
    return NextResponse.json(agent);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const agent = await db.agent.update({
      where: { id },
      data: {
        ...(body.name && { name: body.name }),
        ...(body.type && { type: body.type }),
        ...(body.status && { status: body.status }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.avatar && { avatar: body.avatar }),
        ...(body.capabilities && { capabilities: JSON.stringify(body.capabilities) }),
        ...(body.config && { config: JSON.stringify(body.config) }),
      },
    });
    return NextResponse.json(agent);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await db.agent.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
