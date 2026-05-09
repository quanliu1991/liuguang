import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Table, Button, Form, Input, Switch, message, Space, Popconfirm, Modal, Tag } from 'antd';
import { Plus, Pencil, Trash2, RefreshCw, Package } from 'lucide-react';
import { getImageVersions, createImageVersion, updateImageVersion, deleteImageVersion } from '../../api';

interface ImageVersion {
  id: number;
  name: string;
  version: string;
  image_url: string;
  is_latest: number;
  created_at: string;
}

const ImagePage: React.FC = () => {
  const [images, setImages] = useState<ImageVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingImage, setEditingImage] = useState<ImageVersion | null>(null);
  const [form] = Form.useForm();

  const fetchImages = async () => {
    setLoading(true);
    try {
      const res = await getImageVersions();
      setImages(res.data);
    } catch (e: any) {
      message.error('获取镜像列表失败');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchImages();
  }, []);

  const handleSubmit = async () => {
    const values = await form.validateFields();
    try {
      if (editingImage) {
        await updateImageVersion(editingImage.id, values);
        message.success('更新成功');
      } else {
        await createImageVersion(values);
        message.success('添加成功');
      }
      setModalOpen(false);
      setEditingImage(null);
      form.resetFields();
      fetchImages();
    } catch (e: any) {
      message.error('操作失败');
    }
  };

  const handleEdit = (record: ImageVersion) => {
    setEditingImage(record);
    form.setFieldsValue(record);
    setModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteImageVersion(id);
      message.success('删除成功');
      fetchImages();
    } catch (e: any) {
      message.error('删除失败');
    }
  };

  const columns = [
    {
      title: '镜像名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => (
        <span className="flex items-center gap-2">
          <Package size={16} className="text-text-muted" />
          <span className="font-medium" style={{ color: '#111827' }}>{text}</span>
        </span>
      ),
    },
    {
      title: '版本',
      dataIndex: 'version',
      key: 'version',
      render: (v: string) => <span className="font-mono text-sm">{v}</span>,
    },
    {
      title: '镜像地址',
      dataIndex: 'image_url',
      key: 'image_url',
      ellipsis: true,
      render: (v: string) => <span className="font-mono text-xs">{v}</span>,
    },
    {
      title: '状态',
      dataIndex: 'is_latest',
      key: 'is_latest',
      render: (v: number) => (
        <span
          className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium"
          style={{
            background: v ? 'rgba(16,185,129,0.1)' : 'rgba(107,114,128,0.08)',
            color: v ? '#059669' : '#6B7280',
          }}
        >
          {v ? '最新' : '旧版'}
        </span>
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: ImageVersion) => (
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
            <Package size={20} className="text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold" style={{ color: '#111827' }}>
              镜像版本管理
            </h1>
            <p className="text-sm" style={{ color: '#9CA3AF' }}>
              管理服务镜像，跟踪版本更新与发布
            </p>
          </div>
        </div>
        <Space size={8}>
          <Button
            type="text"
            icon={<RefreshCw size={16} />}
            onClick={fetchImages}
            loading={loading}
          >
            刷新
          </Button>
          <Button
            type="primary"
            icon={<Plus size={16} />}
            onClick={() => { setEditingImage(null); form.resetFields(); setModalOpen(true); }}
          >
            添加镜像
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
        <Table columns={columns} dataSource={images} rowKey="id" loading={loading} pagination={false} />
      </div>

      {/* Modal */}
      <Modal
        title={
          <div className="flex items-center gap-2">
            <Package size={18} className="text-primary" />
            <span>{editingImage ? '编辑镜像' : '添加镜像'}</span>
          </div>
        }
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => { setModalOpen(false); setEditingImage(null); }}
      >
        <Form form={form} layout="vertical" className="mt-4">
          <Form.Item name="name" label="镜像名称" rules={[{ required: true, message: '请输入名称' }]}>
            <Input placeholder="例: hb-serve-chat" />
          </Form.Item>
          <Form.Item name="version" label="版本" rules={[{ required: true, message: '请输入版本' }]}>
            <Input placeholder="例: R26C10" />
          </Form.Item>
          <Form.Item name="image_url" label="镜像地址" rules={[{ required: true, message: '请输入镜像地址' }]}>
            <Input placeholder="例: docker.das-security.cn/hb/hb-serve-chat-gpu:..." />
          </Form.Item>
          <Form.Item name="is_latest" label="设为最新" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </motion.div>
  );
};

export default ImagePage;
