'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Settings,
  Wifi,
  WifiOff,
  RefreshCw,
  Bell,
  Moon,
  Monitor,
  Info,
} from 'lucide-react';

interface SettingsViewProps {
  wsEnabled: boolean;
  onToggleWs: (enabled: boolean) => void;
  refreshInterval: number;
  onRefreshIntervalChange: (ms: number) => void;
  notificationsEnabled: boolean;
  onToggleNotifications: (enabled: boolean) => void;
  darkMode: boolean;
  onToggleDarkMode: (enabled: boolean) => void;
  socketConnected: boolean;
}

export default function SettingsView({
  wsEnabled,
  onToggleWs,
  refreshInterval,
  onRefreshIntervalChange,
  notificationsEnabled,
  onToggleNotifications,
  darkMode,
  onToggleDarkMode,
  socketConnected,
}: SettingsViewProps) {
  const refreshOptions = [
    { value: '5000', label: '5秒' },
    { value: '10000', label: '10秒' },
    { value: '30000', label: '30秒' },
    { value: '60000', label: '60秒' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">系统设置</h2>
        <p className="text-muted-foreground text-sm">配置系统参数与偏好</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Real-time Settings */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Wifi className="h-5 w-5 text-emerald-500" />
              实时更新
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Switch
                  id="ws-toggle"
                  checked={wsEnabled}
                  onCheckedChange={onToggleWs}
                />
                <div>
                  <Label htmlFor="ws-toggle" className="font-medium">
                    WebSocket连接
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    启用实时数据推送
                  </p>
                </div>
              </div>
              <Badge
                variant="outline"
                className={`text-[10px] ${
                  wsEnabled && socketConnected
                    ? 'border-emerald-300 text-emerald-600'
                    : 'border-gray-300 text-gray-500'
                }`}
              >
                {wsEnabled && socketConnected
                  ? '已连接'
                  : wsEnabled
                  ? '连接中'
                  : '未启用'}
              </Badge>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label className="font-medium">自动刷新间隔</Label>
                <p className="text-xs text-muted-foreground">
                  设置数据轮询频率
                </p>
              </div>
              <Select
                value={String(refreshInterval)}
                onValueChange={(v) => onRefreshIntervalChange(Number(v))}
              >
                <SelectTrigger className="w-[100px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {refreshOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Switch
                  id="notifications-toggle"
                  checked={notificationsEnabled}
                  onCheckedChange={onToggleNotifications}
                />
                <div>
                  <Label htmlFor="notifications-toggle" className="font-medium">
                    消息通知
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    接收Agent告警与任务通知
                  </p>
                </div>
              </div>
              <Bell className={`h-4 w-4 ${notificationsEnabled ? 'text-emerald-500' : 'text-muted-foreground'}`} />
            </div>
          </CardContent>
        </Card>

        {/* Appearance Settings */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Monitor className="h-5 w-5 text-cyan-500" />
              外观
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Switch
                  id="dark-mode-toggle"
                  checked={darkMode}
                  onCheckedChange={onToggleDarkMode}
                />
                <div>
                  <Label htmlFor="dark-mode-toggle" className="font-medium">
                    深色模式
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    切换深色/浅色主题
                  </p>
                </div>
              </div>
              <Moon className={`h-4 w-4 ${darkMode ? 'text-amber-400' : 'text-muted-foreground'}`} />
            </div>
          </CardContent>
        </Card>

        {/* System Info */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Info className="h-5 w-5 text-muted-foreground" />
              系统信息
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground mb-1">系统版本</p>
                <p className="font-semibold text-sm">v1.0.0</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground mb-1">运行时间</p>
                <p className="font-semibold text-sm">
                  {Math.floor((Date.now() - new Date().getTime()) / 86400000) === 0
                    ? '今日启动'
                    : `${Math.floor((Date.now() - new Date().getTime()) / 86400000)}天`}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground mb-1">WebSocket状态</p>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      wsEnabled && socketConnected
                        ? 'bg-emerald-500 animate-pulse'
                        : 'bg-gray-400'
                    }`}
                  />
                  <p className="font-semibold text-sm">
                    {wsEnabled && socketConnected ? '已连接' : '未连接'}
                  </p>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground mb-1">刷新间隔</p>
                <p className="font-semibold text-sm">
                  {refreshInterval / 1000}秒
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
