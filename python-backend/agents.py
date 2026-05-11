"""
多Agent协同运营自动化系统 - 核心Agent实现
包含监控Agent、任务编排Agent、执行Agent和报告Agent
"""

import asyncio
import json
import logging
import random
import uuid
from abc import ABC, abstractmethod
from datetime import datetime, timedelta
from enum import Enum
from typing import Dict, List, Any, Optional, Callable
from dataclasses import dataclass, field, asdict
from collections import deque
from queue import PriorityQueue

logger = logging.getLogger(__name__)


# ==================== 数据模型 ====================

class TaskPriority(Enum):
    CRITICAL = 1
    HIGH = 2
    MEDIUM = 3
    LOW = 4


class TaskStatus(Enum):
    PENDING = "pending"
    ASSIGNED = "assigned"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class AgentStatus(Enum):
    ACTIVE = "active"
    IDLE = "idle"
    BUSY = "busy"
    ERROR = "error"
    OFFLINE = "offline"


class EventType(Enum):
    SYSTEM_ALERT = "system_alert"
    METRIC_THRESHOLD = "metric_threshold"
    SCHEDULED_TASK = "scheduled_task"
    USER_REQUEST = "user_request"
    ERROR_EVENT = "error_event"
    AGENT_MESSAGE = "agent_message"
    TASK_UPDATE = "task_update"


@dataclass
class Task:
    """任务数据模型"""
    id: str = field(default_factory=lambda: str(uuid.uuid4())[:8])
    title: str = ""
    description: str = ""
    priority: TaskPriority = TaskPriority.MEDIUM
    status: TaskStatus = TaskStatus.PENDING
    assigned_agent: Optional[str] = None
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    updated_at: str = field(default_factory=lambda: datetime.now().isoformat())
    completed_at: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    retry_count: int = 0
    max_retries: int = 3
    dependencies: List[str] = field(default_factory=list)
    estimated_duration: int = 60
    actual_duration: Optional[int] = None
    progress: int = 0

    def to_dict(self):
        d = asdict(self)
        d['priority'] = self.priority.name
        d['status'] = self.status.value
        return d


@dataclass
class Event:
    """事件数据模型"""
    id: str = field(default_factory=lambda: str(uuid.uuid4())[:8])
    type: EventType = EventType.SYSTEM_ALERT
    source: str = ""
    data: Dict[str, Any] = field(default_factory=dict)
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())
    priority: TaskPriority = TaskPriority.MEDIUM

    def to_dict(self):
        d = asdict(self)
        d['type'] = self.type.value
        d['priority'] = self.priority.name
        return d


@dataclass
class SystemMetrics:
    """系统指标"""
    cpu_usage: float = 0.0
    memory_usage: float = 0.0
    disk_usage: float = 0.0
    active_tasks: int = 0
    error_rate: float = 0.0
    response_time: float = 0.0
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())

    def to_dict(self):
        return asdict(self)


# ==================== Agent 基类 ====================

class BaseAgent(ABC):
    """Agent基类"""

    def __init__(self, agent_id: str, name: str, agent_type: str = "generic"):
        self.agent_id = agent_id
        self.name = name
        self.agent_type = agent_type
        self.status = AgentStatus.IDLE
        self.message_queue: asyncio.Queue = asyncio.Queue()
        self.tasks: Dict[str, Task] = {}
        self.capabilities: List[str] = []
        self.metrics: Dict[str, Any] = {}
        self.heartbeat_interval = 30
        self.event_callback: Optional[Callable] = None
        self.task_callback: Optional[Callable] = None

    @abstractmethod
    async def process_message(self, message: Dict[str, Any]):
        pass

    @abstractmethod
    async def execute_task(self, task: Task) -> bool:
        pass

    async def send_message(self, target_agent: str, message: Dict[str, Any]):
        message['from'] = self.agent_id
        message['from_name'] = self.name
        message['timestamp'] = datetime.now().isoformat()
        await self.message_queue.put({
            'target': target_agent,
            'message': message
        })

    async def heartbeat(self):
        while self.status != AgentStatus.OFFLINE:
            if self.event_callback:
                await self.event_callback(Event(
                    type=EventType.AGENT_MESSAGE,
                    source=self.agent_id,
                    data={
                        'agent_name': self.name,
                        'agent_type': self.agent_type,
                        'status': self.status.value,
                        'active_tasks': len(self.tasks),
                        'heartbeat': True
                    },
                    priority=TaskPriority.LOW
                ))
            await asyncio.sleep(self.heartbeat_interval)

    def get_status(self) -> Dict[str, Any]:
        return {
            'agent_id': self.agent_id,
            'name': self.name,
            'type': self.agent_type,
            'status': self.status.value,
            'active_tasks': len(self.tasks),
            'capabilities': self.capabilities,
            'metrics': self.metrics,
            'last_heartbeat': datetime.now().isoformat()
        }


# ==================== 具体Agent实现 ====================

class MonitoringAgent(BaseAgent):
    """监控Agent - 负责监控系统状态和指标"""

    def __init__(self):
        super().__init__("monitor_001", "监控Agent", "monitor")
        self.capabilities = ["system_monitoring", "metric_collection", "alert_generation", "health_check"]
        self.metrics_history: deque = deque(maxlen=1000)
        self.thresholds = {
            'cpu_usage': 80.0,
            'memory_usage': 85.0,
            'disk_usage': 90.0,
            'error_rate': 5.0,
            'response_time': 2000
        }
        self.alert_callbacks: List[Callable] = []

    async def process_message(self, message: Dict[str, Any]):
        msg_type = message.get('type')

        if msg_type == 'collect_metrics':
            metrics = await self.collect_metrics()
            await self.analyze_metrics(metrics)
            return metrics.to_dict()

        elif msg_type == 'update_thresholds':
            self.thresholds.update(message.get('thresholds', {}))
            logger.info(f"Thresholds updated: {self.thresholds}")

        elif msg_type == 'get_metrics':
            return self.get_current_metrics()

        elif msg_type == 'get_history':
            return [m.to_dict() for m in self.metrics_history]

    async def execute_task(self, task: Task) -> bool:
        try:
            self.status = AgentStatus.BUSY
            logger.info(f"MonitorAgent executing task: {task.title}")

            if task.title == "system_health_check":
                metrics = await self.collect_metrics()
                health_status = self.evaluate_health(metrics)
                task.metadata['health_status'] = health_status
                task.status = TaskStatus.COMPLETED

            elif task.title == "performance_analysis":
                analysis = self.analyze_performance_trends()
                task.metadata['analysis'] = analysis
                task.status = TaskStatus.COMPLETED

            elif task.title == "threshold_check":
                metrics = await self.collect_metrics()
                await self.analyze_metrics(metrics)
                task.status = TaskStatus.COMPLETED

            else:
                metrics = await self.collect_metrics()
                task.metadata['metrics'] = metrics.to_dict()
                task.status = TaskStatus.COMPLETED

            task.completed_at = datetime.now().isoformat()
            self.status = AgentStatus.IDLE
            return True

        except Exception as e:
            logger.error(f"MonitorAgent task execution failed: {e}")
            task.status = TaskStatus.FAILED
            self.status = AgentStatus.ERROR
            return False

    async def collect_metrics(self) -> SystemMetrics:
        metrics = SystemMetrics(
            cpu_usage=round(random.uniform(10, 95), 1),
            memory_usage=round(random.uniform(30, 90), 1),
            disk_usage=round(random.uniform(40, 85), 1),
            active_tasks=random.randint(0, 50),
            error_rate=round(random.uniform(0, 10), 2),
            response_time=round(random.uniform(100, 3000), 0)
        )

        self.metrics_history.append(metrics)
        self.metrics = metrics.to_dict()

        if self.event_callback:
            await self.event_callback(Event(
                type=EventType.METRIC_THRESHOLD,
                source=self.agent_id,
                data=metrics.to_dict(),
                priority=TaskPriority.MEDIUM
            ))

        return metrics

    async def analyze_metrics(self, metrics: SystemMetrics):
        alerts = []

        if metrics.cpu_usage > self.thresholds['cpu_usage']:
            alerts.append({
                'type': 'CPU_HIGH',
                'value': metrics.cpu_usage,
                'threshold': self.thresholds['cpu_usage'],
                'severity': 'high',
                'message': f'CPU使用率 {metrics.cpu_usage}% 超过阈值 {self.thresholds["cpu_usage"]}%'
            })

        if metrics.memory_usage > self.thresholds['memory_usage']:
            alerts.append({
                'type': 'MEMORY_HIGH',
                'value': metrics.memory_usage,
                'threshold': self.thresholds['memory_usage'],
                'severity': 'high',
                'message': f'内存使用率 {metrics.memory_usage}% 超过阈值 {self.thresholds["memory_usage"]}%'
            })

        if metrics.error_rate > self.thresholds['error_rate']:
            alerts.append({
                'type': 'ERROR_RATE_HIGH',
                'value': metrics.error_rate,
                'threshold': self.thresholds['error_rate'],
                'severity': 'critical',
                'message': f'错误率 {metrics.error_rate}% 超过阈值 {self.thresholds["error_rate"]}%'
            })

        for alert in alerts:
            event = Event(
                type=EventType.METRIC_THRESHOLD,
                source=self.agent_id,
                data=alert,
                priority=TaskPriority.CRITICAL if alert['severity'] == 'critical'
                         else TaskPriority.HIGH
            )
            await self.trigger_alert(event)

    async def trigger_alert(self, event: Event):
        logger.warning(f"ALERT: {event.data}")
        for callback in self.alert_callbacks:
            await callback(event)
        if self.event_callback:
            await self.event_callback(event)

    def evaluate_health(self, metrics: SystemMetrics) -> Dict[str, Any]:
        health_score = 100
        issues = []

        if metrics.cpu_usage > self.thresholds['cpu_usage']:
            health_score -= 20
            issues.append("High CPU usage")
        if metrics.memory_usage > self.thresholds['memory_usage']:
            health_score -= 20
            issues.append("High memory usage")
        if metrics.error_rate > self.thresholds['error_rate']:
            health_score -= 30
            issues.append("High error rate")

        return {
            'score': max(0, health_score),
            'status': 'healthy' if health_score > 70 else 'degraded' if health_score > 40 else 'critical',
            'issues': issues
        }

    def analyze_performance_trends(self) -> Dict[str, Any]:
        if len(self.metrics_history) < 2:
            return {'trend': 'insufficient_data'}

        recent = list(self.metrics_history)[-10:]
        avg_cpu = sum(m.cpu_usage for m in recent) / len(recent)
        avg_memory = sum(m.memory_usage for m in recent) / len(recent)

        return {
            'avg_cpu_usage': round(avg_cpu, 1),
            'avg_memory_usage': round(avg_memory, 1),
            'trend': 'increasing' if avg_cpu > 70 else 'stable',
            'sample_size': len(recent)
        }

    def get_current_metrics(self) -> Dict[str, Any]:
        return self.metrics

    def register_alert_callback(self, callback: Callable):
        self.alert_callbacks.append(callback)


class TaskOrchestratorAgent(BaseAgent):
    """任务编排Agent - 负责任务分配和调度"""

    def __init__(self):
        super().__init__("orchestrator_001", "任务编排Agent", "orchestrator")
        self.capabilities = ["task_scheduling", "resource_allocation", "workflow_management", "task_decomposition"]
        self.task_queue: List[Task] = []
        self.available_agents: Dict[str, Dict] = {}
        self.task_history: List[Task] = []

    async def process_message(self, message: Dict[str, Any]):
        msg_type = message.get('type')

        if msg_type == 'new_task':
            task_data = message.get('task', {})
            task = self._create_task_from_dict(task_data)
            await self.schedule_task(task)
            return task.to_dict()

        elif msg_type == 'task_completed':
            task_id = message.get('task_id')
            result = message.get('result')
            await self.handle_task_completion(task_id, result)

        elif msg_type == 'register_agent':
            agent_info = message.get('agent', {})
            self.available_agents[agent_info.get('agent_id', '')] = agent_info

        elif msg_type == 'get_queue_status':
            return self.get_queue_status()

        elif msg_type == 'get_all_tasks':
            all_tasks = self.task_history + self.task_queue
            return [t.to_dict() for t in all_tasks]

    def _create_task_from_dict(self, data: Dict) -> Task:
        priority = TaskPriority.MEDIUM
        if isinstance(data.get('priority'), str):
            try:
                priority = TaskPriority[data['priority']]
            except KeyError:
                pass
        elif isinstance(data.get('priority'), int):
            try:
                priority = TaskPriority(data['priority'])
            except ValueError:
                pass

        return Task(
            title=data.get('title', 'Untitled'),
            description=data.get('description', ''),
            priority=priority,
            metadata=data.get('metadata', {}),
            dependencies=data.get('dependencies', []),
            estimated_duration=data.get('estimated_duration', 60),
        )

    async def execute_task(self, task: Task) -> bool:
        try:
            self.status = AgentStatus.BUSY
            if task.title == "optimize_schedule":
                await self.optimize_scheduling()
                task.status = TaskStatus.COMPLETED
            elif task.title == "rebalance_load":
                await self.rebalance_workload()
                task.status = TaskStatus.COMPLETED
            else:
                await self.schedule_task(task)

            self.status = AgentStatus.IDLE
            return True
        except Exception as e:
            logger.error(f"Orchestrator task failed: {e}")
            self.status = AgentStatus.ERROR
            return False

    async def schedule_task(self, task: Task):
        logger.info(f"Scheduling task: {task.title} (Priority: {task.priority.name})")

        # Check dependencies
        if task.dependencies:
            pending_deps = [
                dep for dep in task.dependencies
                if dep not in [t.id for t in self.task_history if t.status == TaskStatus.COMPLETED]
            ]
            if pending_deps:
                logger.info(f"Task {task.id} has pending dependencies, queuing")
                self.task_queue.append(task)
                return

        # Assign agent
        assigned_agent = self.select_best_agent(task)
        if assigned_agent:
            task.assigned_agent = assigned_agent
            task.status = TaskStatus.ASSIGNED
            task.updated_at = datetime.now().isoformat()

            if self.event_callback:
                await self.event_callback(Event(
                    type=EventType.TASK_UPDATE,
                    source=self.agent_id,
                    data={
                        'task_id': task.id,
                        'title': task.title,
                        'status': task.status.value,
                        'assigned_agent': assigned_agent,
                        'action': 'assigned'
                    },
                    priority=task.priority
                ))

            self.task_history.append(task)
        else:
            logger.warning(f"No available agent for task {task.id}, queuing")
            self.task_queue.append(task)

    def select_best_agent(self, task: Task) -> Optional[str]:
        available = []
        for agent_id, agent_info in self.available_agents.items():
            if agent_info.get('status') in ['active', 'idle', 'busy']:
                required_capabilities = task.metadata.get('required_capabilities', [])
                agent_capabilities = agent_info.get('capabilities', [])

                if not required_capabilities or \
                   all(cap in agent_capabilities for cap in required_capabilities):
                    available.append(agent_id)

        if not available:
            return None
        return random.choice(available)

    async def handle_task_completion(self, task_id: str, result: Any):
        logger.info(f"Task {task_id} completed with result: {result}")

        for task in self.task_history:
            if task.id == task_id:
                task.status = TaskStatus.COMPLETED
                task.completed_at = datetime.now().isoformat()
                break

        if self.task_queue:
            next_task = self.task_queue.pop(0)
            await self.schedule_task(next_task)

    async def optimize_scheduling(self):
        logger.info("Optimizing task scheduling...")
        # Sort queue by priority
        self.task_queue.sort(key=lambda t: t.priority.value)

    async def rebalance_workload(self):
        logger.info("Rebalancing workload across agents...")

    def get_queue_status(self) -> Dict[str, Any]:
        return {
            'queue_size': len(self.task_queue),
            'available_agents': len(self.available_agents),
            'completed_tasks': len([t for t in self.task_history if t.status == TaskStatus.COMPLETED]),
            'failed_tasks': len([t for t in self.task_history if t.status == TaskStatus.FAILED]),
        }


class ExecutionAgent(BaseAgent):
    """执行Agent - 负责执行具体任务"""

    def __init__(self, agent_id: str, name: str, specializations: List[str]):
        super().__init__(agent_id, name, "executor")
        self.capabilities = ["task_execution"] + specializations
        self.specializations = specializations
        self.active_tasks: Dict[str, Task] = {}
        self.execution_pool = asyncio.Semaphore(5)
        self.completed_count = 0
        self.failed_count = 0

    async def process_message(self, message: Dict[str, Any]):
        msg_type = message.get('type')

        if msg_type == 'execute_task':
            task_data = message.get('task', {})
            task = Task(
                id=task_data.get('id', str(uuid.uuid4())[:8]),
                title=task_data.get('title', 'Untitled'),
                description=task_data.get('description', ''),
                priority=TaskPriority[task_data.get('priority', 'MEDIUM')],
                status=TaskStatus(task_data.get('status', 'pending')),
                metadata=task_data.get('metadata', {}),
            )
            await self.execute_task(task)
            return task.to_dict()

        elif msg_type == 'cancel_task':
            task_id = message.get('task_id')
            await self.cancel_task(task_id)

        elif msg_type == 'get_status':
            return self.get_status()

    async def execute_task(self, task: Task) -> bool:
        async with self.execution_pool:
            try:
                self.status = AgentStatus.BUSY
                logger.info(f"ExecutionAgent {self.name} executing: {task.title}")
                task.status = TaskStatus.IN_PROGRESS
                task.updated_at = datetime.now().isoformat()
                self.active_tasks[task.id] = task

                start_time = datetime.now()

                # Simulate progress updates
                for progress in [25, 50, 75, 100]:
                    await asyncio.sleep(random.uniform(0.3, 0.8))
                    task.progress = progress

                    if self.event_callback:
                        await self.event_callback(Event(
                            type=EventType.TASK_UPDATE,
                            source=self.agent_id,
                            data={
                                'task_id': task.id,
                                'title': task.title,
                                'progress': progress,
                                'status': 'in_progress' if progress < 100 else 'completed',
                                'agent_name': self.name
                            },
                            priority=TaskPriority.MEDIUM
                        ))

                # Execute based on type
                if "database" in task.metadata.get('tags', []):
                    result = await self.execute_database_task(task)
                elif "api" in task.metadata.get('tags', []):
                    result = await self.execute_api_task(task)
                elif "file" in task.metadata.get('tags', []):
                    result = await self.execute_file_task(task)
                else:
                    result = await self.execute_general_task(task)

                task.status = TaskStatus.COMPLETED
                task.completed_at = datetime.now().isoformat()
                task.actual_duration = (datetime.now() - start_time).seconds
                task.metadata['result'] = result
                self.completed_count += 1

                if self.event_callback:
                    await self.event_callback(Event(
                        type=EventType.TASK_UPDATE,
                        source=self.agent_id,
                        data={
                            'task_id': task.id,
                            'title': task.title,
                            'status': 'completed',
                            'result': result,
                            'agent_name': self.name,
                            'duration': task.actual_duration
                        },
                        priority=TaskPriority.MEDIUM
                    ))

                del self.active_tasks[task.id]
                self.status = AgentStatus.IDLE if not self.active_tasks else AgentStatus.BUSY
                return True

            except Exception as e:
                logger.error(f"Task execution failed: {e}")
                task.status = TaskStatus.FAILED
                self.failed_count += 1

                if task.retry_count < task.max_retries:
                    task.retry_count += 1
                    task.status = TaskStatus.PENDING
                    logger.info(f"Retrying task {task.id} (attempt {task.retry_count})")
                    await asyncio.sleep(2)
                    return await self.execute_task(task)

                self.status = AgentStatus.IDLE
                return False

    async def execute_database_task(self, task: Task) -> Dict[str, Any]:
        await asyncio.sleep(random.uniform(0.5, 2.0))
        return {
            'operation': task.metadata.get('operation', 'query'),
            'rows_affected': random.randint(1, 1000),
            'execution_time': round(random.uniform(0.1, 1.0), 3)
        }

    async def execute_api_task(self, task: Task) -> Dict[str, Any]:
        await asyncio.sleep(random.uniform(0.3, 1.5))
        return {
            'endpoint': task.metadata.get('endpoint', '/api/v1/data'),
            'status_code': random.choice([200, 201, 204]),
            'response_time': round(random.uniform(50, 500), 1)
        }

    async def execute_file_task(self, task: Task) -> Dict[str, Any]:
        await asyncio.sleep(random.uniform(0.2, 1.0))
        return {
            'operation': task.metadata.get('operation', 'read'),
            'file_size': random.randint(1024, 1048576),
            'path': task.metadata.get('path', '/data/default.txt')
        }

    async def execute_general_task(self, task: Task) -> Dict[str, Any]:
        await asyncio.sleep(random.uniform(0.5, 3.0))
        return {
            'status': 'completed',
            'message': f'Task {task.title} executed successfully',
            'timestamp': datetime.now().isoformat()
        }

    async def cancel_task(self, task_id: str):
        if task_id in self.active_tasks:
            task = self.active_tasks[task_id]
            task.status = TaskStatus.CANCELLED
            del self.active_tasks[task_id]
            logger.info(f"Task {task_id} cancelled")

    def get_status(self) -> Dict[str, Any]:
        status = super().get_status()
        status['completed_count'] = self.completed_count
        status['failed_count'] = self.failed_count
        status['specializations'] = self.specializations
        return status


class ReportingAgent(BaseAgent):
    """报告Agent - 负责生成报告和分析"""

    def __init__(self):
        super().__init__("reporter_001", "报告Agent", "reporter")
        self.capabilities = ["report_generation", "data_analysis", "visualization", "trend_prediction"]
        self.reports: List[Dict[str, Any]] = []

    async def process_message(self, message: Dict[str, Any]):
        msg_type = message.get('type')

        if msg_type == 'generate_report':
            report_config = message.get('config', {})
            report = await self.generate_report(report_config)
            return report

        elif msg_type == 'get_analytics':
            time_range = message.get('time_range', '24h')
            analytics = await self.get_analytics(time_range)
            return analytics

        elif msg_type == 'get_reports':
            return self.reports[-20:]

    async def execute_task(self, task: Task) -> bool:
        try:
            self.status = AgentStatus.BUSY
            if task.title == "daily_report":
                report = await self.generate_daily_report()
                task.metadata['report'] = report
            elif task.title == "performance_report":
                report = await self.generate_performance_report()
                task.metadata['report'] = report
            elif task.title == "incident_report":
                report = await self.generate_incident_report(
                    task.metadata.get('incident_id', 'unknown')
                )
                task.metadata['report'] = report
            else:
                report = await self.generate_report({'type': 'summary', 'time_range': '24h'})
                task.metadata['report'] = report

            task.status = TaskStatus.COMPLETED
            task.completed_at = datetime.now().isoformat()
            self.status = AgentStatus.IDLE
            return True
        except Exception as e:
            logger.error(f"Report generation failed: {e}")
            self.status = AgentStatus.ERROR
            return False

    async def generate_report(self, config: Dict[str, Any]) -> Dict[str, Any]:
        report_type = config.get('type', 'summary')
        time_range = config.get('time_range', '24h')

        report = {
            'id': str(uuid.uuid4())[:8],
            'type': report_type,
            'generated_at': datetime.now().isoformat(),
            'time_range': time_range,
            'data': await self.collect_report_data(report_type, time_range)
        }

        self.reports.append(report)

        if self.event_callback:
            await self.event_callback(Event(
                type=EventType.AGENT_MESSAGE,
                source=self.agent_id,
                data={
                    'report_id': report['id'],
                    'report_type': report_type,
                    'status': 'generated',
                    'agent_name': self.name
                },
                priority=TaskPriority.LOW
            ))

        return report

    async def collect_report_data(self, report_type: str, time_range: str) -> Dict[str, Any]:
        return {
            'tasks_completed': random.randint(50, 200),
            'tasks_failed': random.randint(0, 10),
            'average_response_time': round(random.uniform(100, 500), 1),
            'system_uptime': round(random.uniform(99.0, 99.99), 2),
            'alerts_generated': random.randint(0, 20),
            'resource_utilization': {
                'cpu': round(random.uniform(30, 80), 1),
                'memory': round(random.uniform(40, 75), 1),
                'disk': round(random.uniform(50, 85), 1)
            }
        }

    async def generate_daily_report(self) -> Dict[str, Any]:
        return await self.generate_report({'type': 'daily', 'time_range': '24h'})

    async def generate_performance_report(self) -> Dict[str, Any]:
        return await self.generate_report({'type': 'performance', 'time_range': '7d'})

    async def generate_incident_report(self, incident_id: str) -> Dict[str, Any]:
        return {
            'incident_id': incident_id,
            'status': 'resolved',
            'resolution_time': '45 minutes',
            'impact': 'medium',
            'root_cause': 'Database connection timeout',
            'actions_taken': [
                'Restarted database service',
                'Increased connection pool size',
                'Added monitoring alerts'
            ]
        }

    async def get_analytics(self, time_range: str) -> Dict[str, Any]:
        return {
            'trends': {
                'task_completion': 'increasing',
                'error_rate': 'decreasing',
                'response_time': 'stable'
            },
            'predictions': {
                'next_24h_tasks': random.randint(100, 500),
                'peak_hours': ['10:00-12:00', '14:00-16:00']
            }
        }


# ==================== 协调器 ====================

class AgentCoordinator:
    """Agent协调器 - 管理所有Agent的协同工作"""

    def __init__(self):
        self.agents: Dict[str, BaseAgent] = {}
        self.event_log: List[Dict] = []
        self.message_log: List[Dict] = []
        self.task_registry: Dict[str, Task] = {}
        self.event_callback: Optional[Callable] = None
        self._running = False

    def register_agent(self, agent: BaseAgent):
        self.agents[agent.agent_id] = agent
        # Register agent with orchestrator
        orchestrator = self.agents.get("orchestrator_001")
        if orchestrator and isinstance(orchestrator, TaskOrchestratorAgent):
            orchestrator.available_agents[agent.agent_id] = agent.get_status()
        logger.info(f"Agent registered: {agent.name} ({agent.agent_id})")

    def set_event_callback(self, callback: Callable):
        self.event_callback = callback
        for agent in self.agents.values():
            agent.event_callback = callback

    async def start(self):
        """启动所有Agent"""
        logger.info("Starting Agent Coordinator...")
        self._running = True

        # Register default agents
        monitor = MonitoringAgent()
        orchestrator = TaskOrchestratorAgent()
        executor_general = ExecutionAgent("exec_001", "通用执行Agent", ["general"])
        executor_db = ExecutionAgent("exec_002", "数据库执行Agent", ["database"])
        executor_api = ExecutionAgent("exec_003", "API执行Agent", ["api"])
        executor_file = ExecutionAgent("exec_004", "文件执行Agent", ["file"])
        reporter = ReportingAgent()

        self.register_agent(monitor)
        self.register_agent(orchestrator)
        self.register_agent(executor_general)
        self.register_agent(executor_db)
        self.register_agent(executor_api)
        self.register_agent(executor_file)
        self.register_agent(reporter)

        # Set event callbacks
        if self.event_callback:
            for agent in self.agents.values():
                agent.event_callback = self.event_callback

    async def start_background_tasks(self):
        """启动后台任务"""
        tasks = []
        tasks.append(asyncio.create_task(self._monitoring_loop()))
        tasks.append(asyncio.create_task(self._scheduling_loop()))
        tasks.append(asyncio.create_task(self._message_bus_loop()))
        return tasks

    async def _monitoring_loop(self):
        """监控循环 - 每30秒收集一次指标"""
        while self._running:
            try:
                monitor = self.agents.get("monitor_001")
                if monitor and isinstance(monitor, MonitoringAgent):
                    metrics = await monitor.collect_metrics()
                    await monitor.analyze_metrics(metrics)
                await asyncio.sleep(30)
            except Exception as e:
                logger.error(f"Monitoring loop error: {e}")
                await asyncio.sleep(10)

    async def _scheduling_loop(self):
        """调度循环 - 定期生成和调度任务"""
        while self._running:
            try:
                orchestrator = self.agents.get("orchestrator_001")
                if orchestrator and isinstance(orchestrator, TaskOrchestratorAgent):
                    if random.random() < 0.5:
                        task = Task(
                            title=f"auto_task_{datetime.now().strftime('%H%M%S')}",
                            description="自动生成的定时任务",
                            priority=random.choice(list(TaskPriority)),
                            metadata={'tags': [random.choice(['database', 'api', 'file', 'general'])]}
                        )
                        self.task_registry[task.id] = task
                        await orchestrator.schedule_task(task)

                        # Auto-execute if assigned
                        if task.assigned_agent and task.assigned_agent in self.agents:
                            executor = self.agents[task.assigned_agent]
                            asyncio.create_task(executor.execute_task(task))

                await asyncio.sleep(15)
            except Exception as e:
                logger.error(f"Scheduling loop error: {e}")
                await asyncio.sleep(5)

    async def _message_bus_loop(self):
        """消息总线循环"""
        while self._running:
            try:
                for agent in self.agents.values():
                    while not agent.message_queue.empty():
                        try:
                            msg_data = agent.message_queue.get_nowait()
                            target_id = msg_data['target']
                            message = msg_data['message']

                            self.message_log.append({
                                'from': agent.agent_id,
                                'from_name': agent.name,
                                'target': target_id,
                                'message': message,
                                'timestamp': datetime.now().isoformat()
                            })

                            if target_id in self.agents:
                                await self.agents[target_id].process_message(message)
                        except asyncio.QueueEmpty:
                            break

                await asyncio.sleep(0.1)
            except Exception as e:
                logger.error(f"Message bus error: {e}")
                await asyncio.sleep(1)

    def get_all_agents_status(self) -> List[Dict]:
        return [agent.get_status() for agent in self.agents.values()]

    def get_all_tasks(self) -> List[Dict]:
        orchestrator = self.agents.get("orchestrator_001")
        tasks = list(self.task_registry.values())
        if orchestrator:
            tasks.extend(orchestrator.task_history)
            tasks.extend(orchestrator.task_queue)
        # Deduplicate by id
        seen = set()
        unique_tasks = []
        for t in tasks:
            if t.id not in seen:
                seen.add(t.id)
                unique_tasks.append(t.to_dict())
        return unique_tasks

    def get_messages(self, limit: int = 50) -> List[Dict]:
        return self.message_log[-limit:]

    def get_metrics(self) -> Dict:
        monitor = self.agents.get("monitor_001")
        if monitor and isinstance(monitor, MonitoringAgent):
            return monitor.get_current_metrics()
        return {}

    def get_metrics_history(self, limit: int = 100) -> List[Dict]:
        monitor = self.agents.get("monitor_001")
        if monitor and isinstance(monitor, MonitoringAgent):
            return [m.to_dict() for m in list(monitor.metrics_history)[-limit:]]
        return []

    async def create_task(self, title: str, description: str = "", priority: str = "MEDIUM",
                          tags: List[str] = None, metadata: Dict = None) -> Dict:
        task = Task(
            title=title,
            description=description,
            priority=TaskPriority[priority],
            metadata={
                'tags': tags or ['general'],
                **(metadata or {})
            }
        )
        self.task_registry[task.id] = task

        orchestrator = self.agents.get("orchestrator_001")
        if orchestrator:
            await orchestrator.schedule_task(task)

            # Auto-execute
            if task.assigned_agent and task.assigned_agent in self.agents:
                executor = self.agents[task.assigned_agent]
                asyncio.create_task(executor.execute_task(task))

        return task.to_dict()

    async def generate_report(self, report_type: str = "daily") -> Dict:
        reporter = self.agents.get("reporter_001")
        if reporter and isinstance(reporter, ReportingAgent):
            return await reporter.generate_report({'type': report_type, 'time_range': '24h'})
        return {}

    def stop(self):
        self._running = False
        for agent in self.agents.values():
            agent.status = AgentStatus.OFFLINE
