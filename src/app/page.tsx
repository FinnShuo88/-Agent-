'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Toaster } from '@/components/ui/toaster';
import {
  LayoutDashboard,
  Bot,
  ListTodo,
  Workflow,
  MessageSquare,
  Settings,
  Menu,
  X,
  ChevronLeft,
  Brain,
  Eye,
  Server,
} from 'lucide-react';
import { useAgentData } from '@/hooks/use-agent-data';
import { useToast } from '@/hooks/use-toast';
import type { ViewType } from '@/lib/types';

import OverviewView from '@/components/agent-system/overview-view';
import Dashboard from '@/components/agent-system/dashboard';
import AgentView from '@/components/agent-system/agent-view';
import TaskView from '@/components/agent-system/task-view';
import WorkflowView from '@/components/agent-system/workflow-view';
import MessageView from '@/components/agent-system/message-view';
import SettingsView from '@/components/agent-system/settings-view';
import OrchestrateView from '@/components/agent-system/orchestrate-view';

const navItems: { key: ViewType; label: string; icon: React.ReactNode; group?: string }[] = [
  { key: 'overview', label: '系统总览', icon: <Eye className="h-5 w-5" />, group: 'core' },
  { key: 'dashboard', label: '仪表盘', icon: <LayoutDashboard className="h-5 w-5" />, group: 'core' },
  { key: 'agents', label: 'Agent管理', icon: <Bot className="h-5 w-5" />, group: 'manage' },
  { key: 'tasks', label: '任务中心', icon: <ListTodo className="h-5 w-5" />, group: 'manage' },
  { key: 'workflows', label: '工作流', icon: <Workflow className="h-5 w-5" />, group: 'manage' },
  { key: 'messages', label: '消息日志', icon: <MessageSquare className="h-5 w-5" />, group: 'manage' },
  { key: 'orchestrate', label: '编排引擎', icon: <Brain className="h-5 w-5" />, group: 'engine' },
  { key: 'settings', label: '系统设置', icon: <Settings className="h-5 w-5" />, group: 'other' },
];

const groupLabels: Record<string, string> = {
  core: '核心',
  manage: '管理',
  engine: '引擎',
  other: '其他',
};

const PY_WS_URL = 'ws://localhost:8000/ws';

export default function HomePage() {
  const [activeView, setActiveView] = useState<ViewType>('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [wsEnabled, setWsEnabled] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(10000);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const [pyBackendOnline, setPyBackendOnline] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  const {
    agents,
    tasks,
    workflows,
    messages,
    metrics,
    loading,
    pyBackendOnline: dataPyOnline,
    refreshAll,
    fetchAgents,
    seedData,
  } = useAgentData({
    refreshInterval,
    enablePolling: true,
  });

  // Sync py backend status
  useEffect(() => {
    setPyBackendOnline(dataPyOnline);
  }, [dataPyOnline]);

  // Native WebSocket connection to Python backend
  const connectWebSocket = useCallback(() => {
    if (!wsEnabled) return;
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) return;

    try {
      const ws = new WebSocket(PY_WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        setSocketConnected(true);
        setPyBackendOnline(true);
        if (notificationsEnabled) {
          toast({
            title: '后端已连接',
            description: 'Python多Agent后端WebSocket连接成功',
          });
        }
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const msgType = data.type;

          if (msgType === 'agent_event') {
            const eventData = data.data;
            if (eventData?.type === 'metric_threshold' && notificationsEnabled) {
              const alertData = eventData.data;
              if (alertData?.severity === 'critical') {
                toast({
                  title: '🚨 系统告警',
                  description: alertData.message || `检测到异常: ${alertData.type}`,
                  variant: 'destructive',
                });
              } else if (alertData?.severity === 'high') {
                toast({
                  title: '⚠️ 性能告警',
                  description: alertData.message || `指标异常: ${alertData.type}`,
                });
              }
            } else if (eventData?.type === 'task_update' && notificationsEnabled) {
              const taskData = eventData.data;
              if (taskData?.status === 'completed') {
                toast({
                  title: '✅ 任务完成',
                  description: `${taskData.title || taskData.task_id} - ${taskData.agent_name || ''}`,
                });
              } else if (taskData?.status === 'failed') {
                toast({
                  title: '❌ 任务失败',
                  description: `${taskData.title || taskData.task_id}`,
                  variant: 'destructive',
                });
              }
            }
          } else if (msgType === 'periodic_update') {
            // Auto refresh data on periodic updates
            setPyBackendOnline(true);
          }
        } catch {
          // ignore parse errors
        }
      };

      ws.onclose = () => {
        setSocketConnected(false);
        wsRef.current = null;
        // Auto reconnect after 3 seconds
        if (wsEnabled) {
          reconnectTimerRef.current = setTimeout(() => {
            connectWebSocket();
          }, 3000);
        }
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch {
      setSocketConnected(false);
    }
  }, [wsEnabled, notificationsEnabled, toast]);

  // WebSocket connection lifecycle
  useEffect(() => {
    if (!wsEnabled) {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      setSocketConnected(false);
      return;
    }

    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
    };
  }, [wsEnabled, connectWebSocket]);

  // Dark mode
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Handle mobile menu
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  const handleSeed = async () => {
    await seedData();
    await refreshAll();
    toast({ title: '数据已就绪', description: 'Python后端自动生成运行数据' });
  };

  const handleRefreshIntervalChange = (ms: number) => {
    setRefreshInterval(ms);
  };

  const renderContent = () => {
    switch (activeView) {
      case 'overview':
        return (
          <OverviewView
            onNavigate={(view) => setActiveView(view)}
          />
        );
      case 'dashboard':
        return (
          <Dashboard
            agents={agents}
            tasks={tasks}
            messages={messages}
            metrics={metrics}
            loading={loading}
            onSeed={handleSeed}
            onRefresh={refreshAll}
          />
        );
      case 'agents':
        return (
          <AgentView
            agents={agents}
            onRefresh={refreshAll}
            fetchAgents={fetchAgents}
          />
        );
      case 'tasks':
        return (
          <TaskView
            tasks={tasks}
            agents={agents}
            onRefresh={refreshAll}
          />
        );
      case 'workflows':
        return (
          <WorkflowView
            workflows={workflows}
            agents={agents}
            onRefresh={refreshAll}
          />
        );
      case 'messages':
        return (
          <MessageView
            messages={messages}
            onRefresh={refreshAll}
            wsEnabled={wsEnabled}
          />
        );
      case 'orchestrate':
        return <OrchestrateView />;
      case 'settings':
        return (
          <SettingsView
            wsEnabled={wsEnabled}
            onToggleWs={setWsEnabled}
            refreshInterval={refreshInterval}
            onRefreshIntervalChange={handleRefreshIntervalChange}
            notificationsEnabled={notificationsEnabled}
            onToggleNotifications={setNotificationsEnabled}
            darkMode={darkMode}
            onToggleDarkMode={setDarkMode}
            socketConnected={socketConnected}
          />
        );
      default:
        return null;
    }
  };

  const activeLabel = navItems.find((n) => n.key === activeView)?.label || '';

  // Group nav items
  const groupedNav = navItems.reduce<Record<string, typeof navItems>>((acc, item) => {
    const group = item.group || 'other';
    if (!acc[group]) acc[group] = [];
    acc[group].push(item);
    return acc;
  }, {});

  return (
    <div className={`flex h-screen overflow-hidden ${darkMode ? 'dark' : ''}`}>
      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:relative z-50 h-full
          bg-slate-900 text-white
          transition-all duration-300 ease-in-out
          flex flex-col
          ${sidebarCollapsed ? 'w-16' : 'w-64'}
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between p-4 h-14">
          {!sidebarCollapsed && (
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-emerald-500 flex items-center justify-center font-bold text-sm">
                MA
              </div>
              <span className="font-bold text-sm">多Agent协同系统</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-white/70 hover:text-white hover:bg-white/10 hidden lg:flex"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          >
            <ChevronLeft
              className={`h-4 w-4 transition-transform ${
                sidebarCollapsed ? 'rotate-180' : ''
              }`}
            />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-white/70 hover:text-white hover:bg-white/10 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <Separator className="bg-white/10" />

        {/* Nav Items with groups */}
        <ScrollArea className="flex-1 py-2">
          <nav className="space-y-1 px-2">
            {Object.entries(groupedNav).map(([group, items]) => (
              <div key={group}>
                {!sidebarCollapsed && items.length > 0 && (
                  <div className="px-3 py-1.5 text-[10px] font-semibold text-white/30 uppercase tracking-wider">
                    {groupLabels[group] || group}
                  </div>
                )}
                {sidebarCollapsed && <div className="my-1 border-t border-white/5" />}
                {items.map((item) => {
                  const isActive = activeView === item.key;
                  return (
                    <button
                      key={item.key}
                      onClick={() => {
                        setActiveView(item.key);
                        setMobileMenuOpen(false);
                      }}
                      className={`
                        w-full flex items-center gap-3 px-3 py-2 rounded-lg
                        text-sm font-medium transition-colors
                        ${
                          isActive
                            ? item.key === 'orchestrate'
                              ? 'bg-purple-600 text-white'
                              : 'bg-emerald-600 text-white'
                            : item.key === 'orchestrate'
                            ? 'text-purple-300/70 hover:text-purple-200 hover:bg-purple-900/30'
                            : 'text-white/70 hover:text-white hover:bg-white/10'
                        }
                        ${sidebarCollapsed ? 'justify-center px-0' : ''}
                      `}
                      title={sidebarCollapsed ? item.label : undefined}
                    >
                      <span className="flex-shrink-0">{item.icon}</span>
                      {!sidebarCollapsed && <span>{item.label}</span>}
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>
        </ScrollArea>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-white/10 space-y-2">
          {!sidebarCollapsed && (
            <>
              {/* Python Backend Status */}
              <div className="flex items-center gap-2 px-2">
                <Server className="h-3 w-3 text-white/40" />
                <span
                  className={`h-2 w-2 rounded-full ${
                    pyBackendOnline ? 'bg-emerald-400' : 'bg-red-400'
                  } ${pyBackendOnline ? 'animate-pulse' : ''}`}
                />
                <span className="text-xs text-white/50">
                  Python后端 {pyBackendOnline ? '在线' : '离线'}
                </span>
              </div>
              {/* WebSocket Status */}
              <div className="flex items-center gap-2 px-2">
                <span
                  className={`h-2 w-2 rounded-full ${
                    socketConnected ? 'bg-emerald-400 animate-pulse' : 'bg-gray-500'
                  }`}
                />
                <span className="text-xs text-white/50">
                  {socketConnected ? 'WebSocket已连接' : 'WebSocket未连接'}
                </span>
              </div>
            </>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="h-14 border-b bg-background flex items-center justify-between px-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 lg:hidden"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <h1 className="font-semibold text-lg">{activeLabel}</h1>
          </div>
          <div className="flex items-center gap-3">
            {/* Python Backend Badge */}
            <div className="flex items-center gap-1.5 text-xs">
              <span
                className={`h-2 w-2 rounded-full ${
                  pyBackendOnline ? 'bg-emerald-500' : 'bg-red-400'
                } ${pyBackendOnline ? 'animate-pulse' : ''}`}
              />
              <span className={`hidden sm:inline ${pyBackendOnline ? 'text-emerald-600' : 'text-red-500'}`}>
                {pyBackendOnline ? '后端在线' : '后端离线'}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span
                className={`h-2 w-2 rounded-full ${
                  socketConnected ? 'bg-emerald-500' : 'bg-gray-400'
                } ${socketConnected ? 'animate-pulse' : ''}`}
              />
              <span className="hidden sm:inline">
                {socketConnected ? '实时' : '轮询'}
              </span>
            </div>
            <span className="text-xs text-muted-foreground hidden sm:inline">
              {agents.length} Agent · {tasks.filter((t) => t.status === 'running').length} 任务
            </span>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-auto">
          <div className="p-4 md:p-6 max-w-[1400px] mx-auto">
            {renderContent()}
          </div>
        </main>
      </div>

      <Toaster />
    </div>
  );
}
