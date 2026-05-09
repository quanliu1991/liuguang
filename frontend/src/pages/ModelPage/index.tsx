import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Table, Button, Form, Input, InputNumber, message, Space, Popconfirm, Modal } from 'antd';
import { Plus, Pencil, Trash2, RefreshCw, Brain } from 'lucide-react';
import { getModels, createModel, updateModel, deleteModel } from '../../api';
import type { Model as ModelType } from '../../types';

const ModelPage: React.FC = () => {
  const [models, setModels] = useState<ModelType[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<ModelType | null>(null);
  const [form] = Form.useForm();

  const fetchModels = async () => {
    setLoading(true);
    try {
      const res = await getModels();
      setModels(res.data);
    } catch (e: any) {
      message.error('获取模型列表失败');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchModels();
  }, []);

  const handleSubmit = async () => {
    const values = await form.validateFields();
    try {
      if (editingModel) {
        await updateModel(editingModel.id, values);
        message.success('更新成功');
      } else {
        await createModel(values);
        message.success('添加成功');
      }
      setModalOpen(false);
      setEditingModel(null);
      form.resetFields();
      fetchModels();
    } catch (e: any) {
      message.error('操作失败');
    }
  };

  const handleEdit = (record: ModelType) => {
    setEditingModel(record);
    form.setFieldsValue(record);
    setModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteModel(id);
      message.success('删除成功');
      fetchModels();
    } catch (e: any) {
      message.error('删除失败');
    }
  };

  const columns = [
    {
      title: '模型名',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => (
        <span className="flex items-center gap-2">
          <Brain size={16} className="text-text-muted" />
          <span className="font-medium" style={{ color: '#111827' }}>{text}</span>
        </span>
      ),
    },
    {
      title: '模型目录',
      dataIndex: 'path',
      key: 'path',
      ellipsis: true,
      render: (v: string) => <span className="font-mono text-sm">{v}</span>,
    },
    {
      title: 'GPU 需求',
      dataIndex: 'gpu_required',
      key: 'gpu_required',
      render: (v: number) => <span className="text-sm font-medium">{v} 卡</span>,
    },
    { title: '模型大小', dataIndex: 'size', key: 'size' },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: ModelType) => (
        <Space size={4}>
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
            <Brain size={20} className="text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold" style={{ color: '#111827' }}>
              模型管理
            </h1>
            <p className="text-sm" style={{ color: '#9CA3AF' }}>
              管理 AI 模型库，配置模型参数与 GPU 需求
            </p>
          </div>
        </div>
        <Space size={8}>
          <Button
            type="text"
            icon={<RefreshCw size={16} />}
            onClick={fetchModels}
            loading={loading}
          >
            刷新
          </Button>
          <Button
            type="primary"
            icon={<Plus size={16} />}
            onClick={() => { setEditingModel(null); form.resetFields(); setModalOpen(true); }}
          >
            添加模型
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
        <Table columns={columns} dataSource={models} rowKey="id" loading={loading} pagination={false} />
      </div>

      {/* Modal */}
      <Modal
        title={
          <div className="flex items-center gap-2">
            <Brain size={18} className="text-primary" />
            <span>{editingModel ? '编辑模型' : '添加模型'}</span>
          </div>
        }
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => { setModalOpen(false); setEditingModel(null); }}
      >
        <Form form={form} layout="vertical" className="mt-4">
          <Form.Item name="name" label="模型名" rules={[{ required: true, message: '请输入模型名' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="path" label="模型目录" rules={[{ required: true, message: '请输入模型目录' }]}>
            <Input placeholder="/models/xxx" />
          </Form.Item>
          <Form.Item name="key_path" label="Key 文件路径">
            <Input placeholder="例: /Users/liuquan/keylist/key-5years" />
          </Form.Item>
          <Form.Item name="gpu_required" label="GPU 需求" rules={[{ required: true, message: '请输入GPU需求' }]}>
            <InputNumber min={1} style={{ width: '100%' }} placeholder="所需 GPU 卡数" />
          </Form.Item>
          <Form.Item name="size" label="模型大小">
            <Input placeholder="例: 35B" />
          </Form.Item>
        </Form>
      </Modal>
    </motion.div>
  );
};

export default ModelPage;
