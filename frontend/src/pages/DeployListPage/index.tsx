import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Table, Button, Space, Modal, message, Checkbox, Popover } from 'antd';
import { FileText, Trash2, Terminal, RefreshCw, Layers, Server as ServerIcon, Cpu, CheckCircle, XCircle, Loader2, Clock, ChevronDown } from 'lucide-react';
import { getDeployments, scanSingleServer, deleteDeployment, getDeployYaml, getDeployLogsUrl, getServers } from '../../api';
import type { Server, Deployment } from '../../types';

const statusColorMap: Record<string, { bg: string; text: string }> = {
  running: { bg: 'rgba(16,185,129,0.1)', text: '#059669' },
  failed: { bg: 'rgba(239,68,68,0.1)', text: '#DC2626' },
  pending: { bg: 'rgba(245,158,11,0.1)', text: '#D97706' },
};

type ServerScanStatus = 'idle' | 'scanning' | 'done' | 'error';

interface ScanProgress {
  serverId: number;
  serverName: string;
  status: ServerScanStatus;
  result?: { scanned: number; added: number; synced: number; skipped: number; removed: number; errors: string[] };
}

const DeployListPage: React.FC = () => {
  const [servers, setServers] = useState<Server[]>([]);
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [loading, setLoading] = useState(false);
  const [yamlModalOpen, setYamlModalOpen] = useState(false);
  const [currentYaml, setCurrentYaml] = useState('');
  const [logModalOpen, setLogModalOpen] = useState(false);
  const [logLines, setLogLines] = useState<string[]>([]);
  const [filterServerId, setFilterServerId] = useState<number | undefined>(undefined);
  const [filterModelName, setFilterModelName] = useState<string>('');
  const [scanProgress, setScanProgress] = useState<ScanProgress[]>([]);
  const [scanPopoverOpen, setScanPopoverOpen] = useState(false);
  const [selectedServerIds, setSelectedServerIds] = useState<number[]>([]);
  const [scanMode, setScanMode] = useState<'quick' | 'scan'>('quick');
  const [lastScanTime, setLastScanTime] = useState<string>('');
  const logEventSource = useRef<EventSource | null>(null);
  const logEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logLines]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [serverRes, deployRes] = await Promise.all([
        getServers(),
        getDeployments(),
      ]);
      setServers(serverRes.data);
      setDeployments(deployRes.data);
    } catch (e) {
      message.error('获取数据失败');
    } finally {
      setLoading(false);
    }
  };

  // Collect unique model names from deployments
  const modelNames = Array.from(
    new Set(
      deployments
        .map((d) => d.model_name || d.detected_model_name)
        .filter(Boolean),
    ),
  );

  // Filtered deployments
  const filteredDeployments = deployments.filter((d) => {
    if (filterServerId !== undefined && d.server_id !== filterServerId) return false;
    if (filterModelName) {
      const dModel = d.model_name || d.detected_model_name || '';
      if (!dModel.toLowerCase().includes(filterModelName.toLowerCase())) return false;
    }
    return true;
  });

  // Quick refresh: just fetch current data from DB (instant)
  const handleQuickRefresh = async () => {
    setLoading(true);
    try {
      const [serverRes, deployRes] = await Promise.all([
        getServers(),
        getDeployments(),
      ]);
      setServers(serverRes.data);
      setDeployments(deployRes.data);
      const now = new Date();
      setLastScanTime(now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }));
      message.success('刷新成功');
    } catch (e) {
      message.error('刷新失败');
    } finally {
      setLoading(false);
    }
  };

  // Progressive scan: scan selected servers one by one
  const handleProgressiveScan = async () => {
    if (selectedServerIds.length === 0) {
      message.warning('请至少选择一台服务器');
      return;
    }

    setLoading(true);
    setScanPopoverOpen(false);

    // Initialize progress tracking for selected servers
    const progress: ScanProgress[] = selectedServerIds.map((sid) => {
      const srv = servers.find((s) => s.id === sid);
      return { serverId: sid, serverName: srv?.name || `Server ${sid}`, status: 'idle' };
    });
    setScanProgress(progress);

    let totalScanned = 0;
    let totalAdded = 0;
    let totalSynced = 0;

    // Scan each server sequentially
    for (let i = 0; i < progress.length; i++) {
      // Update current server to scanning
      setScanProgress((prev) => prev.map((p, idx) => idx === i ? { ...p, status: 'scanning' } : p));

      try {
        const res = await scanSingleServer(progress[i].serverId);
        const result = res.data;

        setScanProgress((prev) => prev.map((p, idx) => idx === i ? {
          ...p,
          status: 'done',
          result,
        } : p));

        totalScanned += result.scanned || 0;
        totalAdded += result.added || 0;
        totalSynced += result.synced || 0;

        // Update deployments after each server completes
        const deployRes = await getDeployments();
        setDeployments(deployRes.data);
      } catch (e) {
        setScanProgress((prev) => prev.map((p, idx) => idx === i ? { ...p, status: 'error' } : p));
      }
    }

    const now = new Date();
    setLastScanTime(now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }));
    message.success(`扫描完成: 扫描${totalScanned}个, 新增${totalAdded}个, 同步${totalSynced}个`);
    setLoading(false);

    // Auto-clear progress after 5 seconds
    setTimeout(() => {
      setScanProgress([]);
      setSelectedServerIds([]);
    }, 5000);
  };

  const handleToggleServerSelection = (serverId: number) => {
    setSelectedServerIds((prev) =>
      prev.includes(serverId)
        ? prev.filter((id) => id !== serverId)
        : [...prev, serverId]
    );
  };

  const handleSelectAllServers = () => {
    if (selectedServerIds.length === servers.length) {
      setSelectedServerIds([]);
    } else {
      setSelectedServerIds(servers.map((s) => s.id));
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteDeployment(id);
      message.success('删除成功');
      fetchData();
    } catch (e) {
      message.error('删除失败');
    }
  };

  const handleViewYaml = async (id: number) => {
    try {
      const res = await getDeployYaml(id);
      setCurrentYaml(res.data.yaml || '无YAML内容');
      setYamlModalOpen(true);
    } catch (e) {
      message.error('获取YAML失败');
    }
  };

  const handleViewLogs = (id: number) => {
    setLogLines([]);
    setLogModalOpen(true);
    connectToLogStream(id);
  };

  const connectToLogStream = (id: number) => {
    if (logEventSource.current) {
      logEventSource.current.close();
    }
    const url = getDeployLogsUrl(id);
    const evtSource = new EventSource(url);
    logEventSource.current = evtSource;

    evtSource.onmessage = (event) => {
      setLogLines((prev) => [...prev, event.data]);
    };

    evtSource.onerror = () => {
      setLogLines((prev) => [...prev, '[ERROR] 连接断开']);
      evtSource.close();
    };
  };

  const handleCloseLogModal = () => {
    if (logEventSource.current) {
      logEventSource.current.close();
      logEventSource.current = null;
    }
    setLogModalOpen(false);
  };

  const columns = [
    {
      title: '服务名',
      dataIndex: 'service_name',
      key: 'service_name',
      render: (text: string) => <span className="font-medium" style={{ color: '#111827' }}>{text}</span>,
    },
    {
      title: '服务器',
      dataIndex: 'server_id',
      key: 'server_id',
      render: (id: number) => {
        const server = servers.find((s) => s.id === id);
        return server ? (
          <span className="flex items-center gap-1.5">
            <ServerIcon size={14} className="text-text-muted" />
            {server.name}
          </span>
        ) : id;
      },
    },
    {
      title: '模型名',
      dataIndex: 'model_name',
      key: 'model_name',
      render: (text: string, record: Deployment) => {
        const label = text || record.detected_model_name || '-';
        return (
          <span className="flex items-center gap-1.5" style={{ color: '#374151' }}>
            {label}
          </span>
        );
      },
    },
    {
      title: 'GPU',
      dataIndex: 'gpus',
      key: 'gpus',
      render: (text: string) => (
        <span className="flex items-center gap-1.5">
          <Cpu size={14} className="text-text-muted" />
          {text}
        </span>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const colors = statusColorMap[status] || { bg: 'rgba(107,114,128,0.1)', text: '#6B7280' };
        return (
          <span
            className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium"
            style={{ background: colors.bg, color: colors.text }}
          >
            {status}
          </span>
        );
      },
    },
    { title: 'Port', dataIndex: 'port', key: 'port' },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Deployment) => (
        <Space size={4}>
          <Button type="text" size="small" icon={<FileText size={14} />} onClick={() => handleViewYaml(record.id)}>
            YAML
          </Button>
          <Button type="text" size="small" icon={<Terminal size={14} />} onClick={() => handleViewLogs(record.id)}>
            日志
          </Button>
          <Button type="text" size="small" danger icon={<Trash2 size={14} />} onClick={() => handleDelete(record.id)} />
        </Space>
      ),
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="page-fade-in"
    >
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-primary/[0.10] flex items-center justify-center">
            <Layers size={20} className="text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold" style={{ color: '#111827' }}>
              部署列表
            </h1>
            <p className="text-sm" style={{ color: '#9CA3AF' }}>
              查看和管理所有部署实例
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <Layers size={18} className="text-text-muted" />
          <span className="text-xs px-2 py-0.5 rounded-full bg-primary/[0.08] text-primary font-medium">
            {filteredDeployments.length} / {deployments.length}
          </span>
          {lastScanTime && (
            <span className="flex items-center gap-1 text-xs" style={{ color: '#9CA3AF' }}>
              <Clock size={12} />
              最后更新 {lastScanTime}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {/* Server filter */}
          <select
            className="px-3 py-1.5 rounded-lg text-sm border"
            style={{
              background: '#fff',
              borderColor: 'rgba(0,0,0,0.1)',
              color: '#374151',
              minWidth: 160,
            }}
            value={filterServerId !== undefined ? filterServerId : ''}
            onChange={(e) => setFilterServerId(e.target.value ? Number(e.target.value) : undefined)}
          >
            <option value="">全部服务器</option>
            {servers.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          {/* Model name filter */}
          <select
            className="px-3 py-1.5 rounded-lg text-sm border"
            style={{
              background: '#fff',
              borderColor: 'rgba(0,0,0,0.1)',
              color: '#374151',
              minWidth: 180,
            }}
            value={filterModelName}
            onChange={(e) => setFilterModelName(e.target.value)}
          >
            <option value="">全部模型</option>
            {modelNames.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>

          {/* Scan mode toggle */}
          <div className="flex items-center rounded-lg border overflow-hidden" style={{ borderColor: 'rgba(0,0,0,0.1)' }}>
            <button
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${scanMode === 'quick' ? 'bg-primary text-white' : 'bg-white'}`}
              style={{ color: scanMode === 'quick' ? '#fff' : '#374151' }}
              onClick={() => setScanMode('quick')}
            >
              快速
            </button>
            <button
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${scanMode === 'scan' ? 'bg-primary text-white' : 'bg-white'}`}
              style={{ color: scanMode === 'scan' ? '#fff' : '#374151' }}
              onClick={() => setScanMode('scan')}
            >
              扫描
            </button>
          </div>

          {/* Scan popover (only shown in scan mode) */}
          {scanMode === 'scan' && (
            <Popover
              open={scanPopoverOpen}
              onOpenChange={setScanPopoverOpen}
              trigger="click"
              placement="bottomRight"
              title={
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">选择要扫描的服务器</span>
                  <Button type="link" size="small" onClick={handleSelectAllServers}>
                    {selectedServerIds.length === servers.length ? '取消全选' : '全选'}
                  </Button>
                </div>
              }
              content={
                <div className="min-w-[200px]">
                  <div className="space-y-1">
                    {servers.map((s) => {
                      const progress = scanProgress.find((p) => p.serverId === s.id);
                      return (
                        <label
                          key={s.id}
                          className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 cursor-pointer"
                          style={{ color: progress?.status === 'scanning' ? '#3B82F6' : progress?.status === 'done' ? '#10B981' : progress?.status === 'error' ? '#EF4444' : '#374151' }}
                        >
                          <Checkbox
                            checked={selectedServerIds.includes(s.id)}
                            onChange={() => handleToggleServerSelection(s.id)}
                          />
                          {progress?.status === 'scanning' && <Loader2 size={14} className="animate-spin" />}
                          {progress?.status === 'done' && <CheckCircle size={14} />}
                          {progress?.status === 'error' && <XCircle size={14} />}
                          <span className="text-sm">{s.name}</span>
                          {progress?.result && (
                            <span className="text-xs ml-auto" style={{ color: '#9CA3AF' }}>
                              {progress.result.added > 0 && `+${progress.result.added}`}
                              {progress.result.synced > 0 && ` · ${progress.result.synced}`}
                            </span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                  <div className="mt-3 pt-2 border-t" style={{ borderColor: 'rgba(0,0,0,0.08)' }}>
                    <Button
                      type="primary"
                      size="small"
                      block
                      loading={loading}
                      disabled={selectedServerIds.length === 0}
                      onClick={handleProgressiveScan}
                    >
                      开始扫描 ({selectedServerIds.length})
                    </Button>
                  </div>
                </div>
              }
            >
              <Button
                type="text"
                icon={<ChevronDown size={14} />}
                loading={loading}
                disabled={scanProgress.some((p) => p.status === 'scanning')}
              >
                选择服务器
              </Button>
            </Popover>
          )}

          {/* Quick refresh button */}
          {scanMode === 'quick' && (
            <Button
              type="text"
              icon={<RefreshCw size={16} />}
              onClick={handleQuickRefresh}
              loading={loading}
            >
              刷新
            </Button>
          )}
        </div>
      </div>

      {/* Scan progress bar */}
      {scanProgress.length > 0 && (
        <div className="mb-4 px-4 py-3 rounded-xl border" style={{ background: 'rgba(255,255,255,0.7)', borderColor: 'rgba(0,0,0,0.06)' }}>
          <div className="flex items-center gap-2 mb-2">
            <Loader2 size={14} className={scanProgress.some((p) => p.status === 'scanning') ? 'animate-spin text-blue-500' : 'text-gray-400'} />
            <span className="text-sm font-medium" style={{ color: '#374151' }}>
              扫描进度
            </span>
            <span className="text-xs ml-auto" style={{ color: '#9CA3AF' }}>
              {scanProgress.filter((p) => p.status === 'done').length}/{scanProgress.length} 已完成
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {scanProgress.map((p) => (
              <span
                key={p.serverId}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium"
                style={{
                  background: p.status === 'scanning' ? 'rgba(59,130,246,0.1)' : p.status === 'done' ? 'rgba(16,185,129,0.1)' : p.status === 'error' ? 'rgba(239,68,68,0.1)' : 'rgba(107,114,128,0.1)',
                  color: p.status === 'scanning' ? '#3B82F6' : p.status === 'done' ? '#059669' : p.status === 'error' ? '#DC2626' : '#6B7280',
                }}
              >
                {p.status === 'scanning' && <Loader2 size={12} className="animate-spin" />}
                {p.status === 'done' && <CheckCircle size={12} />}
                {p.status === 'error' && <XCircle size={12} />}
                {p.serverName}
                {p.result && p.result.added > 0 && (
                  <span className="ml-1">(+{p.result.added})</span>
                )}
              </span>
            ))}
          </div>
        </div>
      )}

      <div
        className="overflow-hidden"
        style={{
          borderRadius: '20px',
          background: 'rgba(255,255,255,0.9)',
          border: '1px solid rgba(0,0,0,0.06)',
          boxShadow: '0 2px 12px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.03)',
        }}
      >
        <Table
          columns={columns}
          dataSource={filteredDeployments}
          rowKey="id"
          loading={loading}
          pagination={false}
          className="!border-0"
        />
      </div>

      {/* YAML Modal */}
      <Modal
        title={
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-primary" />
            <span>deploy_chat.yaml</span>
          </div>
        }
        open={yamlModalOpen}
        onCancel={() => setYamlModalOpen(false)}
        footer={null}
        width={640}
      >
        <pre
          className="mt-4 p-4 rounded-xl overflow-auto"
          style={{
            background: '#F5F7FB',
            fontFamily: 'SF Mono, JetBrains Mono, Consolas, monospace',
            fontSize: '13px',
            lineHeight: '1.7',
            color: '#374151',
            maxHeight: '500px',
          }}
        >
          {currentYaml}
        </pre>
      </Modal>

      {/* Log Modal */}
      <Modal
        title={
          <div className="flex items-center gap-2">
            <Terminal size={18} className="text-primary" />
            <span>部署日志</span>
          </div>
        }
        open={logModalOpen}
        onCancel={handleCloseLogModal}
        footer={null}
        width={760}
      >
        <div
          className="mt-4 p-4 rounded-xl overflow-auto"
          style={{
            background: '#1E1E2E',
            fontFamily: 'SF Mono, JetBrains Mono, Consolas, monospace',
            fontSize: '13px',
            lineHeight: '1.7',
            maxHeight: '500px',
          }}
        >
          {logLines.map((line, i) => {
            const isError = line.includes('[ERROR]') || line.includes('[ALERT]') || line.includes('Error') || line.includes('error') || line.includes('Exception');
            return (
              <div key={i} style={{ color: isError ? '#F87171' : '#C9D1D9' }}>
                {line}
              </div>
            );
          })}
          <div ref={logEndRef} />
        </div>
      </Modal>
    </motion.div>
  );
};

export default DeployListPage;
