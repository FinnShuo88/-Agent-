import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const agents = await db.agent.findMany({
      include: {
        tasks: { select: { id: true, status: true, title: true } },
        _count: { select: { tasks: true, messages: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(agents);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const agent = await db.agent.create({
      data: {
        name: body.name,
        type: body.type || 'executor',
        status: body.status || 'idle',
        description: body.description || '',
        avatar: body.avatar || '🤖',
        capabilities: JSON.stringify(body.capabilities || []),
        config: JSON.stringify(body.config || {}),
      },
    });
    return NextResponse.json(agent, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
