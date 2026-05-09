import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Table, Button, Form, Select, Input, InputNumber, message, Space, Modal, Tag, Typography, Card } from 'antd';
import { Rocket, FileText, Trash2, Eye, Terminal, RefreshCw, Cpu, Server as ServerIcon, Layers, Clock } from 'lucide-react';
import { getServers, getModels, getDeployments, createDeployment, deleteDeployment, getDeployYaml, getServerGpuStatus, getImageVersions, getDeployLogsUrl } from '../../api';
import type { Server, Model, GpuInfo, Deployment } from '../../types';

const { Option } = Select;

interface ImageVersion {
  id: number;
  name: string;
  version: string;
  image_url: string;
  is_latest: number;
}

const statusColorMap: Record<string, { bg: string; text: string }> = {
  running: { bg: 'rgba(16,185,129,0.1)', text: '#059669' },
  failed: { bg: 'rgba(239,68,68,0.1)', text: '#DC2626' },
  pending: { bg: 'rgba(245,158,11,0.1)', text: '#D97706' },
};

const DeployPage: React.FC = () => {
  const [form] = Form.useForm();
  const [servers, setServers] = useState<Server[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [loading, setLoading] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [gpuList, setGpuList] = useState<GpuInfo[]>([]);
  const [yamlModalOpen, setYamlModalOpen] = useState(false);
  const [currentYaml, setCurrentYaml] = useState('');
  const [selectedServerId, setSelectedServerId] = useState<number | null>(null);
  const [imageVersions, setImageVersions] = useState<ImageVersion[]>([]);
  const [logModalOpen, setLogModalOpen] = useState(false);
  const [currentDeployId, setCurrentDeployId] = useState<number | null>(null);
  const [logLines, setLogLines] = useState<string[]>([]);
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
    try {
      const [serverRes, modelRes, deployRes, imageRes] = await Promise.all([
        getServers(),
        getModels(),
        getDeployments(),
        getImageVersions(),
      ]);
      setServers(serverRes.data);
      setModels(modelRes.data);
      setDeployments(deployRes.data);
      setImageVersions(imageRes.data || []);
    } catch (e) {
      message.error('获取数据失败');
    }
  };

  const handleServerChange = async (serverId: number) => {
    setSelectedServerId(serverId);
    try {
      const res = await getServerGpuStatus(serverId);
      setGpuList(res.data.gpus || []);
    } catch (e) {
      setGpuList([]);
      message.error('获取GPU状态失败');
    }
  };

  const handleImageChange = (imageId: number) => {
    const selected = imageVersions.find((img) => img.id === imageId);
    if (selected) {
      form.setFieldsValue({ image: selected.image_url });
    }
  };

  const handleDeploy = async () => {
    const values = await form.validateFields();
    const selectedGpus = values.gpus;

    if (!selectedGpus || selectedGpus.length === 0) {
      message.error('请选择GPU');
      return;
    }

    setDeploying(true);
    try {
      await createDeployment({
        service_name: values.service_name,
        server_id: values.server_id,
        model_id: values.model_id,
        image: values.image,
        port: values.port,
        gpus: selectedGpus.join(','),
      });
      message.success('部署成功');
      fetchData();
      form.resetFields();
    } catch (e: any) {
      message.error(e.response?.data?.detail || '部署失败');
    }
    setDeploying(false);
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
    setCurrentDeployId(id);
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

  const latestImage = imageVersions.find((img) => img.is_latest === 1);

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
            <Rocket size={20} className="text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold" style={{ color: '#111827' }}>
              创建部署
            </h1>
            <p className="text-sm" style={{ color: '#9CA3AF' }}>
              配置部署参数，快速部署您的 AI 模型服务
            </p>
          </div>
        </div>
      </div>

      {/* Deploy Form Card */}
      <motion.div
        whileHover={{ y: -2 }}
        transition={{ duration: 0.2 }}
        className="mb-10"
      >
        <Card
          className="border border-border"
          style={{
            borderRadius: '24px',
            background: 'rgba(255,255,255,0.9)',
            boxShadow: '0 2px 12px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.03)',
          }}
        >
          <Form form={form} layout="vertical" style={{ maxWidth: 720 }} initialValues={{ image_id: latestImage?.id }}>
            <div className="grid grid-cols-2 gap-x-6">
              <Form.Item name="service_name" label="服务名" rules={[{ required: true, message: '请输入服务名' }]}>
                <Input placeholder="例: hn-chat-v4" />
              </Form.Item>

              <Form.Item name="server_id" label="目标服务器" rules={[{ required: true, message: '请选择服务器' }]}>
                <Select placeholder="选择服务器" onChange={handleServerChange}>
                  {servers.map((s) => (
                    <Option key={s.id} value={s.id}>{s.name} ({s.ip})</Option>
                  ))}
                </Select>
              </Form.Item>
            </div>

            <div className="grid grid-cols-2 gap-x-6">
              <Form.Item name="model_id" label="模型" rules={[{ required: true, message: '请选择模型' }]}>
                <Select placeholder="选择模型">
                  {models.map((m) => (
                    <Option key={m.id} value={m.id}>{m.name} ({m.size}, 需要 {m.gpu_required} 卡)</Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item name="image_id" label="选择镜像">
                <Select placeholder="选择镜像版本" onChange={handleImageChange}>
                  {imageVersions.map((img) => (
                    <Option key={img.id} value={img.id}>
                      {img.name} ({img.version}){img.is_latest ? ' [最新]' : ''}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </div>

            <Form.Item name="image" label="镜像地址" rules={[{ required: true, message: '请输入镜像地址' }]}>
              <Input placeholder="选择镜像版本或手动输入地址" />
            </Form.Item>

            <Form.Item name="gpus" label="GPU 选择">
              <Select
                mode="multiple"
                placeholder={selectedServerId ? '选择GPU' : '请先选择服务器'}
                disabled={!selectedServerId}
              >
                {gpuList.map((g) => (
                  <Option key={g.gpu} value={g.gpu} disabled={!g.free}>
                    GPU {g.gpu} - 已用 {g.used}MiB / {g.total}MiB {g.free ? '(空闲)' : '(占用)'}
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item name="port" label="Port" rules={[{ required: true, message: '请输入端口号' }]}>
              <InputNumber min={10000} max={65535} style={{ width: '100%' }} placeholder="例: 34001" />
            </Form.Item>

            <Form.Item>
              <Button type="primary" onClick={handleDeploy} loading={deploying} className="!px-8">
                部署
              </Button>
            </Form.Item>
          </Form>
        </Card>
      </motion.div>

      {/* Deployments Table */}
      <div>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <Layers size={18} className="text-text-muted" />
            <h2 className="text-lg font-semibold" style={{ color: '#111827' }}>
              部署列表
            </h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/[0.08] text-primary font-medium">
              {deployments.length}
            </span>
          </div>
          <Button
            type="text"
            icon={<RefreshCw size={16} />}
            onClick={fetchData}
            loading={loading}
          >
            刷新
          </Button>
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
            dataSource={deployments}
            rowKey="id"
            loading={loading}
            pagination={false}
            className="!border-0"
          />
        </div>
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

export default DeployPage;
