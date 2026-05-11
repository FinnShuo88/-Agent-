"""
多Agent协同运营自动化系统 - FastAPI后端服务
提供REST API和WebSocket实时通信
"""

import asyncio
import json
import logging
from datetime import datetime
from typing import Dict, List, Optional, Any
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from agents import (
    AgentCoordinator, MonitoringAgent, TaskOrchestratorAgent,
    ExecutionAgent, ReportingAgent, AgentStatus, TaskPriority
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Global coordinator
coordinator = AgentCoordinator()
websocket_connections: List[WebSocket] = []


# Pydantic models for API
class TaskCreate(BaseModel):
    title: str
    description: str = ""
    priority: str = "MEDIUM"  # CRITICAL, HIGH, MEDIUM, LOW
    tags: List[str] = ["general"]
    metadata: Dict[str, Any] = {}


class ReportRequest(BaseModel):
    report_type: str = "daily"  # daily, performance, incident, summary
    time_range: str = "24h"


class AgentCommand(BaseModel):
    agent_id: str
    command: str  # start, stop, restart
    params: Dict[str, Any] = {}


class ThresholdUpdate(BaseModel):
    cpu_usage: Optional[float] = None
    memory_usage: Optional[float] = None
    disk_usage: Optional[float] = None
    error_rate: Optional[float] = None
    response_time: Optional[float] = None


# Event callback to push to WebSocket clients
async def event_callback(event):
    """Forward agent events to all connected WebSocket clients"""
    event_data = event.to_dict()
    disconnected = []
    for ws in websocket_connections:
        try:
            await ws.send_json({
                'type': 'agent_event',
                'data': event_data
            })
        except Exception:
            disconnected.append(ws)
    for ws in disconnected:
        websocket_connections.remove(ws)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan - start/stop coordinator"""
    logger.info("Starting Multi-Agent System...")
    await coordinator.start()
    coordinator.set_event_callback(event_callback)

    # Start background tasks
    background_tasks = await coordinator.start_background_tasks()

    yield

    # Shutdown
    logger.info("Shutting down Multi-Agent System...")
    coordinator.stop()
    for task in background_tasks:
        task.cancel()


# Create FastAPI app
app = FastAPI(
    title="多Agent协同运营自动化系统",
    description="Multi-Agent Collaborative Operations Automation System API",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==================== REST API ====================

@app.get("/")
async def root():
    return {
        "system": "多Agent协同运营自动化系统",
        "version": "1.0.0",
        "status": "running",
        "agents": len(coordinator.agents),
        "timestamp": datetime.now().isoformat()
    }


# --- Agent APIs ---

@app.get("/api/agents")
async def get_agents():
    """Get all agents status"""
    return {
        "agents": coordinator.get_all_agents_status(),
        "total": len(coordinator.agents),
        "active": len([a for a in coordinator.agents.values() if a.status in [AgentStatus.ACTIVE, AgentStatus.BUSY]]),
        "timestamp": datetime.now().isoformat()
    }


@app.get("/api/agents/{agent_id}")
async def get_agent(agent_id: str):
    """Get specific agent status"""
    if agent_id not in coordinator.agents:
        raise HTTPException(status_code=404, detail="Agent not found")
    return coordinator.agents[agent_id].get_status()


@app.post("/api/agents/{agent_id}/command")
async def agent_command(agent_id: str, command: AgentCommand):
    """Send command to an agent"""
    if agent_id not in coordinator.agents:
        raise HTTPException(status_code=404, detail="Agent not found")

    agent = coordinator.agents[agent_id]
    if command.command == "stop":
        agent.status = AgentStatus.OFFLINE
    elif command.command == "start":
        agent.status = AgentStatus.IDLE
    elif command.command == "restart":
        agent.status = AgentStatus.IDLE
    else:
        raise HTTPException(status_code=400, detail=f"Unknown command: {command.command}")

    return {"status": "ok", "agent_id": agent_id, "new_status": agent.status.value}


# --- Task APIs ---

@app.get("/api/tasks")
async def get_tasks(status: Optional[str] = None):
    """Get all tasks"""
    tasks = coordinator.get_all_tasks()
    if status:
        tasks = [t for t in tasks if t.get('status') == status]
    return {
        "tasks": tasks,
        "total": len(tasks),
        "timestamp": datetime.now().isoformat()
    }


@app.post("/api/tasks")
async def create_task(task: TaskCreate):
    """Create a new task"""
    try:
        priority = TaskPriority[task.priority.upper()]
    except KeyError:
        raise HTTPException(status_code=400, detail=f"Invalid priority: {task.priority}")

    result = await coordinator.create_task(
        title=task.title,
        description=task.description,
        priority=task.priority.upper(),
        tags=task.tags,
        metadata=task.metadata
    )
    return {"status": "ok", "task": result}


@app.get("/api/tasks/{task_id}")
async def get_task(task_id: str):
    """Get specific task"""
    tasks = coordinator.get_all_tasks()
    for t in tasks:
        if t.get('id') == task_id:
            return t
    raise HTTPException(status_code=404, detail="Task not found")


# --- Metrics APIs ---

@app.get("/api/metrics")
async def get_metrics():
    """Get current system metrics"""
    metrics = coordinator.get_metrics()
    return {
        "metrics": metrics,
        "timestamp": datetime.now().isoformat()
    }


@app.get("/api/metrics/history")
async def get_metrics_history(limit: int = 100):
    """Get metrics history"""
    return {
        "history": coordinator.get_metrics_history(limit),
        "count": len(coordinator.get_metrics_history(limit)),
    }


@app.post("/api/metrics/thresholds")
async def update_thresholds(thresholds: ThresholdUpdate):
    """Update monitoring thresholds"""
    monitor = coordinator.agents.get("monitor_001")
    if not monitor or not isinstance(monitor, MonitoringAgent):
        raise HTTPException(status_code=404, detail="Monitor agent not found")

    update_data = {}
    if thresholds.cpu_usage is not None:
        update_data['cpu_usage'] = thresholds.cpu_usage
    if thresholds.memory_usage is not None:
        update_data['memory_usage'] = thresholds.memory_usage
    if thresholds.disk_usage is not None:
        update_data['disk_usage'] = thresholds.disk_usage
    if thresholds.error_rate is not None:
        update_data['error_rate'] = thresholds.error_rate
    if thresholds.response_time is not None:
        update_data['response_time'] = thresholds.response_time

    monitor.thresholds.update(update_data)
    return {"status": "ok", "thresholds": monitor.thresholds}


# --- Report APIs ---

@app.post("/api/reports")
async def generate_report(request: ReportRequest):
    """Generate a report"""
    report = await coordinator.generate_report(request.report_type)
    return {"status": "ok", "report": report}


@app.get("/api/reports")
async def get_reports():
    """Get recent reports"""
    reporter = coordinator.agents.get("reporter_001")
    if reporter and isinstance(reporter, ReportingAgent):
        return {"reports": reporter.reports[-20:]}
    return {"reports": []}


# --- Messages APIs ---

@app.get("/api/messages")
async def get_messages(limit: int = 50):
    """Get recent messages"""
    return {
        "messages": coordinator.get_messages(limit),
        "total": len(coordinator.get_messages(limit))
    }


# --- Dashboard Summary ---

@app.get("/api/dashboard")
async def get_dashboard():
    """Get dashboard summary data"""
    agents_status = coordinator.get_all_agents_status()
    tasks = coordinator.get_all_tasks()
    metrics = coordinator.get_metrics()
    messages = coordinator.get_messages(10)

    active_agents = len([a for a in agents_status if a['status'] in ['active', 'busy', 'idle']])
    running_tasks = len([t for t in tasks if t.get('status') in ['in_progress', 'assigned']])
    completed_tasks = len([t for t in tasks if t.get('status') == 'completed'])
    failed_tasks = len([t for t in tasks if t.get('status') == 'failed'])

    return {
        "summary": {
            "total_agents": len(agents_status),
            "active_agents": active_agents,
            "total_tasks": len(tasks),
            "running_tasks": running_tasks,
            "completed_tasks": completed_tasks,
            "failed_tasks": failed_tasks,
        },
        "agents": agents_status,
        "metrics": metrics,
        "recent_messages": messages,
        "recent_tasks": tasks[-10:],
        "timestamp": datetime.now().isoformat()
    }


# --- System APIs ---

@app.get("/api/system/status")
async def system_status():
    """Get overall system status"""
    agents_status = coordinator.get_all_agents_status()
    total = len(agents_status)
    active = len([a for a in agents_status if a['status'] in ['active', 'busy', 'idle']])

    return {
        "system": "多Agent协同运营自动化系统",
        "status": "healthy" if active > total // 2 else "degraded",
        "agents_online": active,
        "agents_total": total,
        "uptime": "running",
        "coordinator_running": coordinator._running,
        "timestamp": datetime.now().isoformat()
    }


# ==================== WebSocket ====================

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time updates"""
    await websocket.accept()
    websocket_connections.append(websocket)
    logger.info(f"WebSocket client connected. Total: {len(websocket_connections)}")

    try:
        # Send initial status
        await websocket.send_json({
            'type': 'system_status',
            'data': {
                'system': '多Agent协同运营自动化系统',
                'agents': coordinator.get_all_agents_status(),
                'metrics': coordinator.get_metrics(),
                'timestamp': datetime.now().isoformat()
            }
        })

        while True:
            # Receive messages from client
            data = await websocket.receive_text()
            try:
                message = json.loads(data)
                msg_type = message.get('type', '')

                if msg_type == 'create_task':
                    task = await coordinator.create_task(
                        title=message.get('title', 'WebSocket Task'),
                        description=message.get('description', ''),
                        priority=message.get('priority', 'MEDIUM'),
                        tags=message.get('tags', ['general']),
                    )
                    await websocket.send_json({
                        'type': 'task_created',
                        'data': task
                    })

                elif msg_type == 'get_status':
                    await websocket.send_json({
                        'type': 'status_update',
                        'data': {
                            'agents': coordinator.get_all_agents_status(),
                            'metrics': coordinator.get_metrics(),
                            'timestamp': datetime.now().isoformat()
                        }
                    })

                elif msg_type == 'ping':
                    await websocket.send_json({'type': 'pong'})

            except json.JSONDecodeError:
                await websocket.send_json({'type': 'error', 'message': 'Invalid JSON'})

    except WebSocketDisconnect:
        websocket_connections.remove(websocket)
        logger.info(f"WebSocket client disconnected. Total: {len(websocket_connections)}")
    except Exception as e:
        if websocket in websocket_connections:
            websocket_connections.remove(websocket)
        logger.error(f"WebSocket error: {e}")


# Periodic WebSocket broadcast
async def broadcast_loop():
    """Periodically broadcast status to all WebSocket clients"""
    while True:
        if websocket_connections:
            data = {
                'type': 'periodic_update',
                'data': {
                    'agents': coordinator.get_all_agents_status(),
                    'metrics': coordinator.get_metrics(),
                    'tasks_summary': {
                        'total': len(coordinator.get_all_tasks()),
                        'running': len([t for t in coordinator.get_all_tasks() if t.get('status') in ['in_progress', 'assigned']]),
                        'completed': len([t for t in coordinator.get_all_tasks() if t.get('status') == 'completed']),
                    },
                    'timestamp': datetime.now().isoformat()
                }
            }
            disconnected = []
            for ws in websocket_connections:
                try:
                    await ws.send_json(data)
                except Exception:
                    disconnected.append(ws)
            for ws in disconnected:
                websocket_connections.remove(ws)

        await asyncio.sleep(5)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "server:app",
        host="0.0.0.0",
        port=8000,
        reload=False,
        log_level="info"
    )
