import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Table, Button, Form, Input, InputNumber, message, Space, Tag, Popconfirm, Modal, Card } from 'antd';
import { Plus, Pencil, Trash2, RefreshCw, Settings, Activity, Cpu, Server, Shield } from 'lucide-react';
import { getServers, createServer, updateServer, deleteServer, serverHealthCheck, serverDetectGpu, serverAutoSetup } from '../../api';
import type { Server as ServerType } from '../../types';

const ServerPage: React.FC = () => {
  const [servers, setServers] = useState<ServerType[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingServer, setEditingServer] = useState<ServerType | null>(null);
  const [autoSetupVisible, setAutoSetupVisible] = useState(false);
  const [autoSetupServer, setAutoSetupServer] = useState<ServerType | null>(null);
  const [autoSetupForm] = Form.useForm();
  const [form] = Form.useForm();

  const fetchServers = async () => {
    setLoading(true);
    try {
      const res = await getServers();
      setServers(res.data);
    } catch (e: any) {
      message.error('获取服务器列表失败');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchServers();
  }, []);

  const handleSubmit = async () => {
    const values = await form.validateFields();
    try {
      if (editingServer) {
        await updateServer(editingServer.id, values);
        message.success('更新成功');
      } else {
        await createServer(values);
        message.success('添加成功');
      }
      setModalOpen(false);
      setEditingServer(null);
      form.resetFields();
      fetchServers();
    } catch (e: any) {
      message.error('操作失败');
    }
  };

  const handleEdit = (record: ServerType) => {
    setEditingServer(record);
    form.setFieldsValue(record);
    setModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteServer(id);
      message.success('删除成功');
      fetchServers();
    } catch (e: any) {
      message.error('删除失败');
    }
  };

  const handleHealthCheck = async (id: number) => {
    try {
      const res = await serverHealthCheck(id);
      message.success(res.data.message);
      fetchServers();
    } catch (e: any) {
      message.error(e.response?.data?.detail || '健康检查失败');
      fetchServers();
    }
  };

  const handleDetectGpu = async (id: number) => {
    try {
      const res = await serverDetectGpu(id);
      message.success(`GPU 检测完成: 共 ${res.data.total} 卡，可用 ${res.data.available} 卡`);
      fetchServers();
    } catch (e: any) {
      message.error(e.response?.data?.detail || 'GPU 检测失败');
    }
  };

  const handleAutoSetup = async (id: number) => {
    try {
      const values = await autoSetupForm.validateFields();
      const res = await serverAutoSetup(id, { ssh_password: values.password, ssh_port: values.port || 22 });
      message.success(res.data.message);
      setAutoSetupVisible(false);
      fetchServers();
    } catch (e: any) {
      message.error(e.response?.data?.detail || '自动配置失败');
    }
  };

  const columns = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => (
        <span className="flex items-center gap-2">
          <Server size={16} className="text-text-muted" />
          <span className="font-medium" style={{ color: '#111827' }}>{text}</span>
        </span>
      ),
    },
    { title: 'IP', dataIndex: 'ip', key: 'ip', render: (v: string) => <span className="font-mono text-sm">{v}</span> },
    { title: 'SSH 用户', dataIndex: 'ssh_user', key: 'ssh_user' },
    { title: '端口', dataIndex: 'ssh_port', key: 'ssh_port' },
    {
      title: 'GPU',
      key: 'gpu',
      render: (_: any, record: ServerType) => (
        <span className="flex items-center gap-1.5">
          <Cpu size={14} className="text-text-muted" />
          <span>{record.gpu_available}/{record.gpu_count} 卡</span>
        </span>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const isOnline = status === 'online';
        return (
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium"
            style={{
              background: isOnline ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
              color: isOnline ? '#059669' : '#DC2626',
            }}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
            {status}
          </span>
        );
      },
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: ServerType) => (
        <Space size={4}>
          <Button type="text" size="small" icon={<Settings size={14} />} onClick={() => { setAutoSetupServer(record); setAutoSetupVisible(true); autoSetupForm.setFieldsValue({ port: record.ssh_port || 22 }); }}>
            配置
          </Button>
          <Button type="text" size="small" icon={<Activity size={14} />} onClick={() => handleHealthCheck(record.id)}>
            检查
          </Button>
          <Button type="text" size="small" icon={<Cpu size={14} />} onClick={() => handleDetectGpu(record.id)}>
            GPU
          </Button>
          <Button type="text" size="small" icon={<Pencil size={14} />} onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Popconfirm title="确认删除?" onConfirm={() => handleDelete(record.id)}>
            <Button type="text" size="small" danger icon={<Trash2 size={14} />} />
          </Popconfirm>
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
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/[0.10] flex items-center justify-center">
            <Server size={20} className="text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold" style={{ color: '#111827' }}>
              服务器管理
            </h1>
            <p className="text-sm" style={{ color: '#9CA3AF' }}>
              管理异构算力服务器，支持 GPU/NPU 节点
            </p>
          </div>
        </div>
        <Space size={8}>
          <Button
            type="text"
            icon={<RefreshCw size={16} />}
            onClick={fetchServers}
            loading={loading}
          >
            刷新
          </Button>
          <Button
            type="primary"
            icon={<Plus size={16} />}
            onClick={() => { setEditingServer(null); form.resetFields(); setModalOpen(true); }}
          >
            添加服务器
          </Button>
        </Space>
      </div>

      {/* Table Card */}
      <div
        className="overflow-hidden"
        style={{
          borderRadius: '20px',
          background: 'rgba(255,255,255,0.9)',
          border: '1px solid rgba(0,0,0,0.06)',
          boxShadow: '0 2px 12px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.03)',
        }}
      >
        <Table columns={columns} dataSource={servers} rowKey="id" loading={loading} pagination={false} />
      </div>

      {/* Add/Edit Modal */}
      <Modal
        title={
          <div className="flex items-center gap-2">
            <Shield size={18} className="text-primary" />
            <span>{editingServer ? '编辑服务器' : '添加服务器'}</span>
          </div>
        }
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => { setModalOpen(false); setEditingServer(null); }}
      >
        <Form form={form} layout="vertical" className="mt-4">
          <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入名称' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="ip" label="IP" rules={[{ required: true, message: '请输入IP' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="ssh_user" label="SSH 用户" rules={[{ required: true, message: '请输入SSH用户' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="ssh_port" label="SSH 端口">
            <InputNumber min={1} max={65535} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="ssh_key" label="SSH 密钥">
            <Input.TextArea rows={4} placeholder="可选，留空可稍后通过配置按钮自动获取" className="!rounded-xl" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Auto Setup Modal */}
      <Modal
        title={
          <div className="flex items-center gap-2">
            <Cpu size={18} className="text-primary" />
            <span>自动配置服务器</span>
          </div>
        }
        open={autoSetupVisible}
        onOk={() => autoSetupServer && handleAutoSetup(autoSetupServer.id)}
        onCancel={() => { setAutoSetupVisible(false); }}
      >
        <div className="text-sm mt-1 mb-4" style={{ color: '#6B7280' }}>
          使用密码登录目标服务器，自动获取私钥并发送主服务器公钥
        </div>
        <Form form={autoSetupForm} layout="vertical">
          <Form.Item name="port" label="SSH 端口" rules={[{ required: true, message: '请输入SSH端口' }]}>
            <InputNumber min={1} max={65535} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="password" label="登录密码" rules={[{ required: true, message: '请输入登录密码' }]}>
            <Input.Password />
          </Form.Item>
        </Form>
      </Modal>
    </motion.div>
  );
};

export default ServerPage;
