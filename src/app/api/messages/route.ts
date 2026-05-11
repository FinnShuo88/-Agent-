import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const limit = parseInt(req.nextUrl.searchParams.get('limit') || '50');
    const type = req.nextUrl.searchParams.get('type');
    const where: Record<string, unknown> = {};
    if (type) where.type = type;

    const messages = await db.message.findMany({
      where,
      include: { fromAgent: { select: { id: true, name: true, avatar: true } } },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return NextResponse.json(messages);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const message = await db.message.create({
      data: {
        fromAgentId: body.fromAgentId || null,
        toAgentId: body.toAgentId || null,
        type: body.type || 'info',
        content: body.content,
        metadata: JSON.stringify(body.metadata || {}),
      },
      include: { fromAgent: { select: { id: true, name: true, avatar: true } } },
    });
    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
