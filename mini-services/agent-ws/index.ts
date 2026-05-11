import { Server } from 'socket.io';

const io = new Server(3003, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

console.log('🚀 Agent WebSocket Server running on port 3003');

// Simulated agent events
const agentEvents = [
  { type: 'agent:heartbeat', payload: { agentId: 'all', timestamp: Date.now() } },
  { type: 'task:progress', payload: { taskId: 'sim-1', progress: Math.floor(Math.random() * 100) } },
  { type: 'agent:message', payload: { from: '调度器', content: '系统运行正常', level: 'info' } },
];

const alertEvents = [
  { type: 'agent:alert', payload: { agentId: 'monitor', message: 'API响应延迟异常', severity: 'warning' } },
  { type: 'task:failed', payload: { taskId: 'sim-fail', error: '执行超时', agentName: '自动化测试Agent' } },
  { type: 'workflow:step', payload: { workflowId: 'wf-1', step: 3, stepName: '质量检测', status: 'running' } },
];

io.on('connection', (socket) => {
  console.log(`✅ Client connected: ${socket.id}`);

  // Send initial status
  socket.emit('system:status', {
    online: true,
    agents: 8,
    activeTasks: 3,
    timestamp: Date.now(),
  });

  // Handle client events
  socket.on('agent:command', (data) => {
    console.log('Received command:', data);
    // Broadcast to all clients
    io.emit('agent:command_ack', {
      ...data,
      acknowledged: true,
      timestamp: Date.now(),
    });
  });

  socket.on('task:update', (data) => {
    io.emit('task:updated', {
      ...data,
      timestamp: Date.now(),
    });
  });

  socket.on('disconnect', () => {
    console.log(`❌ Client disconnected: ${socket.id}`);
  });
});

// Simulate periodic events
setInterval(() => {
  const event = agentEvents[Math.floor(Math.random() * agentEvents.length)];
  io.emit(event.type, {
    ...event.payload,
    timestamp: Date.now(),
  });
}, 8000);

setInterval(() => {
  const event = alertEvents[Math.floor(Math.random() * alertEvents.length)];
  io.emit(event.type, {
    ...event.payload,
    timestamp: Date.now(),
  });
}, 20000);

// Task progress simulation
setInterval(() => {
  const progress = Math.floor(Math.random() * 100);
  io.emit('task:progress', {
    taskId: `task-${Math.floor(Math.random() * 10)}`,
    progress,
    timestamp: Date.now(),
  });
}, 12000);
