import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Table, Button, Space, Modal, message } from 'antd';
import { FileText, Trash2, Terminal, RefreshCw, Layers, Server as ServerIcon, Cpu } from 'lucide-react';
import { getDeployments, deleteDeployment, getDeployYaml, getDeployLogsUrl } from '../../api';
import type { Server, Deployment } from '../../types';
import { getServers } from '../../api';

const statusColorMap: Record<string, { bg: string; text: string }> = {
  running: { bg: 'rgba(16,185,129,0.1)', text: '#059669' },
  failed: { bg: 'rgba(239,68,68,0.1)', text: '#DC2626' },
  pending: { bg: 'rgba(245,158,11,0.1)', text: '#D97706' },
};

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
          <Button
            type="text"
            icon={<RefreshCw size={16} />}
            onClick={fetchData}
            loading={loading}
          >
            刷新
          </Button>
        </div>
      </div>

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
