'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageSquare, Filter, Wifi, WifiOff } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import type { Message } from '@/lib/types';

interface MessageViewProps {
  messages: Message[];
  onRefresh: () => void;
  wsEnabled: boolean;
}

const typeColors: Record<string, string> = {
  command: 'bg-blue-100 text-blue-700',
  result: 'bg-emerald-100 text-emerald-700',
  error: 'bg-red-100 text-red-700',
  broadcast: 'bg-orange-100 text-orange-700',
  info: 'bg-gray-100 text-gray-600',
};

const typeLabels: Record<string, string> = {
  command: '命令',
  result: '结果',
  error: '错误',
  broadcast: '广播',
  info: '信息',
};

const typeBorderColors: Record<string, string> = {
  command: 'border-l-blue-500',
  result: 'border-l-emerald-500',
  error: 'border-l-red-500',
  broadcast: 'border-l-orange-500',
  info: 'border-l-gray-400',
};

interface RealtimeMessage {
  type: string;
  from?: string;
  content?: string;
  level?: string;
  severity?: string;
  agentName?: string;
  error?: string;
  stepName?: string;
  status?: string;
  timestamp?: number;
}

export default function MessageView({ messages, onRefresh, wsEnabled }: MessageViewProps) {
  const [filterType, setFilterType] = useState<string>('all');
  const [realtimeMessages, setRealtimeMessages] = useState<RealtimeMessage[]>([]);
  const [socketConnected, setSocketConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // WebSocket connection
  useEffect(() => {
    if (!wsEnabled) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      const timer = setTimeout(() => setSocketConnected(false), 0);
      return () => clearTimeout(timer);
    }

    const socket = io('/?XTransformPort=3003', {
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setSocketConnected(true);
    });

    socket.on('disconnect', () => {
      setSocketConnected(false);
    });

    socket.on('agent:message', (data: RealtimeMessage) => {
      setRealtimeMessages((prev) => [
        { ...data, type: data.level || 'info', timestamp: data.timestamp || Date.now() },
        ...prev.slice(0, 49),
      ]);
    });

    socket.on('agent:alert', (data: RealtimeMessage) => {
      setRealtimeMessages((prev) => [
        { ...data, type: 'broadcast', content: data.message, timestamp: data.timestamp || Date.now() },
        ...prev.slice(0, 49),
      ]);
    });

    socket.on('task:progress', (data: { taskId: string; progress: number; timestamp?: number }) => {
      setRealtimeMessages((prev) => [
        { type: 'info', content: `任务 ${data.taskId} 进度更新: ${data.progress}%`, timestamp: data.timestamp || Date.now() },
        ...prev.slice(0, 49),
      ]);
    });

    socket.on('task:failed', (data: RealtimeMessage) => {
      setRealtimeMessages((prev) => [
        { ...data, type: 'error', content: data.error || '任务失败', timestamp: data.timestamp || Date.now() },
        ...prev.slice(0, 49),
      ]);
    });

    socket.on('workflow:step', (data: RealtimeMessage) => {
      setRealtimeMessages((prev) => [
        { ...data, type: 'command', content: `工作流步骤 ${data.stepName} 状态: ${data.status}`, timestamp: data.timestamp || Date.now() },
        ...prev.slice(0, 49),
      ]);
    });

    socket.on('system:status', (data: { online: boolean; timestamp?: number }) => {
      setRealtimeMessages((prev) => [
        { type: 'info', content: `系统状态: ${data.online ? '在线' : '离线'}`, timestamp: data.timestamp || Date.now() },
        ...prev.slice(0, 49),
      ]);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [wsEnabled]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const filteredMessages = messages.filter((m) => {
    if (filterType !== 'all' && m.type !== filterType) return false;
    return true;
  });

  const realtimeFiltered = realtimeMessages.filter((m) => {
    if (filterType !== 'all' && m.type !== filterType) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold">消息日志</h2>
          <p className="text-muted-foreground text-sm">Agent间的通信日志与实时消息</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-sm">
            {socketConnected && wsEnabled ? (
              <>
                <Wifi className="h-4 w-4 text-emerald-500" />
                <span className="text-emerald-600 text-xs">WebSocket已连接</span>
              </>
            ) : (
              <>
                <WifiOff className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground text-xs">
                  {wsEnabled ? '连接中...' : 'WebSocket未启用'}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <Card>
        <CardContent className="p-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Filter className="h-4 w-4" />
              <span>筛选：</span>
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[140px] h-8 text-xs">
                <SelectValue placeholder="消息类型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部类型</SelectItem>
                <SelectItem value="command">命令</SelectItem>
                <SelectItem value="result">结果</SelectItem>
                <SelectItem value="error">错误</SelectItem>
                <SelectItem value="broadcast">广播</SelectItem>
                <SelectItem value="info">信息</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-xs text-muted-foreground ml-auto">
              {filteredMessages.length} 条历史消息
              {realtimeFiltered.length > 0 && ` · ${realtimeFiltered.length} 条实时消息`}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Real-time Messages */}
      {wsEnabled && realtimeFiltered.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              实时消息
            </h3>
            <ScrollArea className="max-h-[200px]">
              <div className="space-y-2">
                {realtimeFiltered.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex gap-2 p-2 rounded-lg border-l-4 ${
                      typeBorderColors[msg.type] || 'border-l-gray-400'
                    } bg-muted/30`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <Badge
                          variant="secondary"
                          className={`text-[9px] px-1 py-0 ${
                            typeColors[msg.type] || typeColors.info
                          }`}
                        >
                          {typeLabels[msg.type] || msg.type}
                        </Badge>
                        {msg.from && (
                          <span className="text-xs font-medium">{msg.from}</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {msg.content || JSON.stringify(msg)}
                      </p>
                      <span className="text-[10px] text-muted-foreground/60">
                        {msg.timestamp
                          ? new Date(msg.timestamp).toLocaleTimeString('zh-CN')
                          : ''}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Message History Feed */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold mb-3">历史消息</h3>
          <div ref={scrollRef} className="space-y-2 max-h-[500px] overflow-y-auto custom-scrollbar pr-1">
            {filteredMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 p-3 rounded-lg border-l-4 ${
                  typeBorderColors[msg.type] || 'border-l-gray-400'
                } bg-card hover:bg-muted/30 transition-colors`}
              >
                {/* Avatar */}
                <div className="flex-shrink-0">
                  <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center text-lg">
                    {msg.fromAgent?.avatar || '📡'}
                  </div>
                </div>
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">
                      {msg.fromAgent?.name || '系统'}
                    </span>
                    <Badge
                      variant="secondary"
                      className={`text-[10px] px-1.5 py-0 ${
                        typeColors[msg.type] || typeColors.info
                      }`}
                    >
                      {typeLabels[msg.type] || msg.type}
                    </Badge>
                  </div>
                  <p className="text-sm text-foreground/90">{msg.content}</p>
                  <p className="text-[10px] text-muted-foreground/60 mt-1">
                    {new Date(msg.createdAt).toLocaleString('zh-CN')}
                  </p>
                </div>
              </div>
            ))}
            {filteredMessages.length === 0 && (
              <div className="py-12 text-center">
                <MessageSquare className="h-10 w-10 mx-auto text-muted-foreground/50" />
                <p className="text-muted-foreground mt-2">暂无消息</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
