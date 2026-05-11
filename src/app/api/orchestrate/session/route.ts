import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Get collaboration session details
export async function GET(req: Request) {
  try {
    const sessionId = new URL(req.url).searchParams.get('sessionId');
    
    if (sessionId) {
      const logs = await db.collaborationLog.findMany({
        where: { sessionId },
        orderBy: { createdAt: 'asc' },
      });
      return NextResponse.json({ sessionId, logs });
    }

    // Get all recent collaboration sessions
    const recentSessions = await db.collaborationLog.groupBy({
      by: ['sessionId'],
      _max: { createdAt: true },
      _count: true,
      orderBy: { _max: { createdAt: 'desc' } },
      take: 20,
    });

    // Get detailed logs for each session
    const sessions = [];
    for (const session of recentSessions) {
      const logs = await db.collaborationLog.findMany({
        where: { sessionId: session.sessionId },
        orderBy: { createdAt: 'asc' },
      });
      sessions.push({
        sessionId: session.sessionId,
        logCount: session._count,
        lastActivity: session._max.createdAt,
        phases: [...new Set(logs.map(l => l.phase))],
        logs,
      });
    }

    // Get all reasoning chains (tasks with sub-tasks)
    const rootTasks = await db.task.findMany({
      where: { parentTaskId: null, depth: 0 },
      include: {
        agent: { select: { id: true, name: true, avatar: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    const chains = [];
    for (const root of rootTasks) {
      const subTasks = await db.task.findMany({
        where: { parentTaskId: root.id },
        orderBy: { createdAt: 'asc' },
        include: { agent: { select: { id: true, name: true, avatar: true } } },
      });
      if (subTasks.length > 0) {
        chains.push({
          rootTask: root,
          subTasks,
          chainProgress: Math.round(subTasks.reduce((acc, t) => acc + t.progress, 0) / subTasks.length),
          chainType: JSON.parse(root.reasoningStep || '{}').chainType || 'sequential',
        });
      }
    }

    return NextResponse.json({ sessions, chains });
  } catch (error) {
    console.error('Session error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
