# 多Agent协同运营自动化系统

> Multi-Agent Collaborative Operations Automation System

一个基于多Agent协作模式的智能运营自动化平台，采用中央编排（Orchestrator）架构，通过消息总线实现Agent间通信，支持长链推理与闭环反馈，实现从监控、分析、决策到执行、反馈的全链路自动化运营。

---

## 目录

- [系统架构](#系统架构)
- [核心设计](#核心设计)
- [功能模块](#功能模块)
- [技术栈](#技术栈)
- [项目结构](#项目结构)
- [快速开始](#快速开始)
- [API文档](#api文档)
- [Agent体系](#agent体系)
- [数据模型](#数据模型)
- [配置说明](#配置说明)

---

## 系统架构

```
┌──────────────────────────────────────────────────────────────────┐
│                         前端 (Next.js 16)                        │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐│
│  │总览  │ │仪表盘│ │Agent │ │任务  │ │工作流│ │消息  │ │编排  ││
│  │View  │ │View  │ │View  │ │View  │ │View  │ │View  │ │View  ││
│  └──┬───┘ └──┬───┘ └──┬───┘ └──┬───┘ └──┬───┘ └──┬───┘ └──┬───┘│
│     └─────────┴────────┴────────┴────────┴────────┴────────┘   │
│                           │ REST API / WebSocket                │
├───────────────────────────┼────────────────────────────────────┤
│                    Caddy 反向代理 (:81)                          │
│          /api/* → Python:8000  /  → Next.js:3000               │
│          /py-ws → Python:8000/ws                                │
├───────────────────────────┼────────────────────────────────────┤
│            Python 后端 (FastAPI :8000)                           │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                   AgentCoordinator                          ││
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      ││
│  │  │监控Agent │ │编排Agent │ │执行Agent │ │报告Agent │      ││
│  │  │Monitor   │ │Orchestr. │ │Executor  │ │Reporter  │      ││
│  │  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘     ││
│  │       └─────────────┴────────────┴────────────┘            ││
│  │                    MessageBus                                ││
│  │              (asyncio.Queue 消息路由)                        ││
│  └─────────────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────────┤
│              Next.js API Routes + Prisma ORM (SQLite)           │
│              Socket.io WebSocket Service (:3003)                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 核心设计

### 多Agent协作模式

系统采用**中央编排模式（Orchestrator Pattern）**，由 `AgentCoordinator` 统一管理所有Agent的生命周期、消息路由和任务调度。

```
监控Agent ──采集指标──→ 分析阈值 ──触发告警──→ 编排Agent ──分配任务──→ 执行Agent
    ↑                                                          │
    └──────────────── 反馈结果 ←──────── 执行完成 ←──────────────┘
```

### 闭环反馈设计

系统核心运行流程为**监控→分析→决策→执行→反馈→监控**的闭环：

1. **监控Agent** 每30秒采集系统指标（CPU/内存/磁盘/错误率/响应时间）
2. 指标超阈值时自动触发告警事件，推送到消息总线
3. **编排Agent** 接收告警/任务请求，按优先级排序、依赖检查、能力匹配后分配执行
4. **执行Agent** 按类型（database/api/file/general）执行任务，支持并发限制（Semaphore(5)）和失败重试（max_retries=3）
5. 执行结果通过事件回调反馈到消息总线和WebSocket客户端
6. **报告Agent** 基于历史数据生成日报/性能报告/事件报告

### 长链推理

任务数据模型内置 `parentTaskId`、`depth`、`reasoningStep` 字段，支持多步推理链的追踪与可视化，编排引擎可进行任务分解与依赖编排。

---

## 功能模块

### 前端8大视图

| 视图 | 说明 |
|------|------|
| **系统总览** | 全局状态一览，快速导航到各功能模块，展示系统健康度与关键指标 |
| **仪表盘** | 实时数据看板，Agent状态统计、任务进度、系统指标图表（Recharts） |
| **Agent管理** | 查看/启停Agent实例，查看Agent能力、状态、活跃任务数 |
| **任务中心** | 任务CRUD，状态筛选，优先级管理，进度追踪，任务详情 |
| **工作流** | 工作流定义与管理，步骤编排，Agent角色分配（leader/participant/reviewer） |
| **消息日志** | Agent间通信记录，事件流查看，消息类型筛选 |
| **编排引擎** | 长链推理可视化，任务分解，推理步骤追踪，协作日志 |
| **系统设置** | WebSocket开关、轮询间隔、通知开关、暗色模式、监控阈值配置 |

### 后端API

| 类别 | 端点 | 说明 |
|------|------|------|
| Agent | `GET /api/agents` | 获取所有Agent状态 |
| Agent | `GET /api/agents/{id}` | 获取单个Agent详情 |
| Agent | `POST /api/agents/{id}/command` | 发送Agent控制命令 |
| Task | `GET /api/tasks` | 获取任务列表（支持状态筛选） |
| Task | `POST /api/tasks` | 创建新任务 |
| Task | `GET /api/tasks/{id}` | 获取任务详情 |
| Metrics | `GET /api/metrics` | 获取当前系统指标 |
| Metrics | `GET /api/metrics/history` | 获取指标历史 |
| Metrics | `POST /api/metrics/thresholds` | 更新监控阈值 |
| Report | `POST /api/reports` | 生成报告 |
| Report | `GET /api/reports` | 获取近期报告 |
| Message | `GET /api/messages` | 获取消息日志 |
| Dashboard | `GET /api/dashboard` | 仪表盘聚合数据 |
| System | `GET /api/system/status` | 系统整体状态 |
| WebSocket | `ws://host:8000/ws` | 实时事件推送 |

---

## 技术栈

### 前端

| 技术 | 版本 | 用途 |
|------|------|------|
| Next.js | 16 | React全栈框架 |
| React | 19 | UI框架 |
| TypeScript | 5 | 类型安全 |
| Tailwind CSS | 4 | 原子化样式 |
| shadcn/ui | - | UI组件库（Radix UI + CVA） |
| Recharts | 2.15 | 数据可视化图表 |
| Zustand | 5 | 状态管理 |
| Socket.io Client | 4.8 | WebSocket客户端 |
| TanStack Query | 5 | 数据请求与缓存 |
| Framer Motion | 12 | 动画 |

### Python后端

| 技术 | 版本 | 用途 |
|------|------|------|
| FastAPI | 0.128+ | 高性能异步Web框架 |
| Uvicorn | 0.44+ | ASGI服务器 |
| Pydantic | 2.12+ | 数据校验与序列化 |
| WebSockets | 16+ | WebSocket支持 |
| asyncio | 内置 | 异步事件循环与消息队列 |

### 数据层

| 技术 | 用途 |
|------|------|
| Prisma ORM | Next.js端数据库ORM |
| SQLite | 轻量级关系数据库 |
| Socket.io | Node.js WebSocket服务（端口3003） |

### 基础设施

| 技术 | 用途 |
|------|------|
| Caddy | 反向代理，统一入口（端口81） |
| Bun | JavaScript运行时与包管理 |

---

## 项目结构

```
/home/z/my-project/
├── src/                          # Next.js前端源码
│   ├── app/
│   │   ├── page.tsx              # 主页面（8视图路由 + WebSocket连接）
│   │   ├── layout.tsx            # 根布局
│   │   ├── globals.css           # 全局样式
│   │   └── api/                  # Next.js API Routes
│   │       ├── agents/           # Agent CRUD接口
│   │       ├── tasks/            # Task CRUD接口
│   │       ├── workflows/        # Workflow CRUD接口
│   │       ├── messages/         # Message查询接口
│   │       ├── metrics/          # Metrics查询接口
│   │       ├── execute/          # 任务执行接口
│   │       ├── orchestrate/      # 编排引擎接口
│   │       ├── seed/             # 数据初始化
│   │       └── py-proxy/         # Python后端代理
│   │           ├── agents/       # 代理→Python /api/agents
│   │           ├── tasks/        # 代理→Python /api/tasks
│   │           ├── metrics/      # 代理→Python /api/metrics
│   │           ├── messages/     # 代理→Python /api/messages
│   │           ├── dashboard/    # 代理→Python /api/dashboard
│   │           ├── reports/      # 代理→Python /api/reports
│   │           └── [...path]/   # 通用代理兜底
│   ├── components/
│   │   └── agent-system/         # 业务组件
│   │       ├── overview-view.tsx  # 系统总览
│   │       ├── dashboard.tsx      # 仪表盘
│   │       ├── agent-view.tsx     # Agent管理
│   │       ├── task-view.tsx      # 任务中心
│   │       ├── workflow-view.tsx  # 工作流
│   │       ├── message-view.tsx   # 消息日志
│   │       ├── orchestrate-view.tsx # 编排引擎
│   │       └── settings-view.tsx  # 系统设置
│   ├── hooks/
│   │   ├── use-agent-data.ts     # Agent数据Hook（REST轮询+代理）
│   │   ├── use-mobile.ts         # 移动端检测
│   │   └── use-toast.ts          # Toast通知
│   └── lib/
│       ├── types.ts              # TypeScript类型定义
│       ├── db.ts                 # Prisma客户端
│       └── utils.ts              # 工具函数
├── python-backend/               # Python多Agent后端
│   ├── agents.py                 # 核心Agent实现（4类Agent + 协调器 + 消息总线）
│   ├── server.py                 # FastAPI服务（REST + WebSocket + 事件回调）
│   └── requirements.txt          # Python依赖
├── mini-services/
│   └── agent-ws/
│       └── index.ts              # Socket.io WebSocket服务（端口3003，模拟事件）
├── prisma/
│   └── schema.prisma             # 数据库Schema（Agent/Task/Workflow/Message/Metric/CollaborationLog）
├── db/                           # SQLite数据库文件
├── Caddyfile                     # Caddy反向代理配置
├── start.sh                      # 一键启动脚本
├── package.json                  # Node.js依赖
├── next.config.ts                # Next.js配置
├── tailwind.config.ts            # Tailwind配置
├── tsconfig.json                 # TypeScript配置
└── .env                          # 环境变量
```

---

## 快速开始

### 环境要求

- **Python** 3.10+
- **Bun** 1.0+ 或 **Node.js** 18+
- 操作系统：Linux / macOS / Windows WSL

### 一键启动

```bash
cd /home/z/my-project
bash start.sh
```

启动脚本将自动完成以下操作：

1. 检查 Python3 和 Bun/Node 环境
2. 启动 Python 后端（FastAPI，端口8000）
3. 启动 Next.js 前端（端口3000）
4. 通过 Caddy 反向代理统一入口（端口81）

### 手动分步启动

```bash
# 1. 安装Python依赖
cd /home/z/my-project/python-backend
pip install -r requirements.txt

# 2. 启动Python后端
python3 server.py
# 后端运行在 http://localhost:8000

# 3. 安装前端依赖
cd /home/z/my-project
bun install

# 4. 初始化数据库
bun run db:push

# 5. 启动前端
bun run dev
# 前端运行在 http://localhost:3000
```

### 访问地址

| 服务 | 地址 | 说明 |
|------|------|------|
| 前端界面 | http://localhost:3000 | Next.js Web应用 |
| Python API | http://localhost:8000 | FastAPI REST服务 |
| API文档 | http://localhost:8000/docs | Swagger交互式文档 |
| WebSocket | ws://localhost:8000/ws | 实时事件推送 |
| 统一入口 | http://localhost:81 | Caddy反向代理 |

---

## API文档

### WebSocket实时通信

连接到 `ws://localhost:8000/ws` 后，可接收以下事件类型：

**服务端推送事件：**

| 事件类型 | 说明 |
|----------|------|
| `system_status` | 连接时发送的初始系统状态 |
| `agent_event` | Agent事件（告警、任务更新、心跳等） |
| `periodic_update` | 每5秒广播的周期性状态更新 |

**客户端发送事件：**

| 事件类型 | 参数 | 说明 |
|----------|------|------|
| `create_task` | `{title, description, priority, tags}` | 通过WebSocket创建任务 |
| `get_status` | - | 请求当前系统状态 |
| `ping` | - | 心跳检测 |

### 告警事件示例

当监控指标超过阈值时，系统自动推送告警：

```json
{
  "type": "agent_event",
  "data": {
    "type": "metric_threshold",
    "data": {
      "type": "CPU_HIGH",
      "value": 92.3,
      "threshold": 80.0,
      "severity": "high",
      "message": "CPU使用率 92.3% 超过阈值 80%"
    }
  }
}
```

### 任务执行流程

```
POST /api/tasks                → 创建任务（pending）
    ↓ 编排Agent调度
    → 任务分配（assigned）→ 匹配能力最合适的执行Agent
    ↓ 执行Agent执行
    → 执行中（in_progress）→ 实时推送进度 25%→50%→75%→100%
    ↓ 执行完成
    → 完成（completed）/ 失败（failed，自动重试最多3次）
```

---

## Agent体系

### 预置Agent列表

| Agent ID | 名称 | 类型 | 专业化能力 |
|----------|------|------|-----------|
| `monitor_001` | 监控Agent | monitor | 系统监控、指标采集、告警生成、健康检查 |
| `orchestrator_001` | 任务编排Agent | orchestrator | 任务调度、资源分配、工作流管理、任务分解 |
| `exec_001` | 通用执行Agent | executor | 通用任务执行 |
| `exec_002` | 数据库执行Agent | executor | 数据库任务执行 |
| `exec_003` | API执行Agent | executor | API调用任务执行 |
| `exec_004` | 文件执行Agent | executor | 文件操作任务执行 |
| `reporter_001` | 报告Agent | reporter | 报告生成、数据分析、可视化、趋势预测 |

### Agent状态流转

```
IDLE ──→ ACTIVE ──→ BUSY ──→ IDLE    （正常流程）
  │                      │
  └──→ OFFLINE           └──→ ERROR ──→ IDLE （恢复）
```

### 监控告警阈值

| 指标 | 默认阈值 | 告警级别 |
|------|---------|---------|
| CPU使用率 | > 80% | HIGH |
| 内存使用率 | > 85% | HIGH |
| 磁盘使用率 | > 90% | HIGH |
| 错误率 | > 5% | CRITICAL |
| 响应时间 | > 2000ms | HIGH |

健康评分规则：基准100分，CPU超阈值-20分，内存超阈值-20分，错误率超阈值-30分。>70分健康，40-70分降级，<40分危急。

---

## 数据模型

### Prisma Schema（SQLite）

- **Agent** - Agent实例，含类型、状态、能力、配置
- **Task** - 任务，含优先级、状态、进度、推理链（parentTaskId/depth/reasoningStep）
- **Workflow** - 工作流，含步骤定义和关联Agent
- **WorkflowAgent** - 工作流-Agent关联，含角色（leader/participant/reviewer）
- **Message** - Agent间消息，含类型（info/command/result/error/broadcast）
- **SystemMetric** - 系统指标记录
- **CollaborationLog** - 协作日志，追踪推理链深度与决策过程

### Python数据模型

- **Task** - dataclass，含优先级（CRITICAL/HIGH/MEDIUM/LOW）、依赖关系、重试机制、预估/实际耗时
- **Event** - dataclass，含事件类型（7种）和优先级
- **SystemMetrics** - dataclass，含CPU/内存/磁盘/错误率/响应时间

---

## 配置说明

### 环境变量（.env）

```env
DATABASE_URL="file:./dev.db"
```

### Caddy反向代理

Caddy配置将Python后端API和Next.js前端统一到端口81：

- `/py-api/*` → Python后端（去除前缀）
- `/py-ws` → Python WebSocket
- `/api/agents*` `/api/tasks*` `/api/metrics*` 等 → Python后端
- 其他路径 → Next.js前端

### 运行参数

| 参数 | 默认值 | 说明 |
|------|--------|------|
| 监控采集间隔 | 30秒 | MonitoringAgent采集系统指标的周期 |
| 调度循环间隔 | 15秒 | TaskOrchestratorAgent调度任务的周期 |
| 消息总线轮询间隔 | 100ms | MessageBus路由消息的频率 |
| WebSocket广播间隔 | 5秒 | 向所有客户端推送周期性更新的频率 |
| 执行并发限制 | 5 | 每个ExecutionAgent的Semaphore并发上限 |
| 最大重试次数 | 3 | 任务失败后自动重试的上限 |
| 指标历史容量 | 1000条 | MonitoringAgent保留的最近指标记录数 |

---

## 许可证

私有项目，仅限内部使用。
