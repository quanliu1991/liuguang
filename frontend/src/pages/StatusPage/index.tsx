import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, Row, Col } from 'antd';
import { Server, Brain, CheckCircle, ArrowUpRight, Clock, Zap } from 'lucide-react';
import { getDeployments, getServers, getModels } from '../../api';

const StatusPage: React.FC = () => {
  const [stats, setStats] = useState({ servers: 0, models: 0, running: 0, total: 0 });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [serverRes, modelRes, deployRes] = await Promise.all([
          getServers(),
          getModels(),
          getDeployments(),
        ]);
        const runningCount = (deployRes.data || []).filter(
          (d: any) => d.status === 'running'
        ).length;
        setStats({
          servers: (serverRes.data || []).length,
          models: (modelRes.data || []).length,
          running: runningCount,
          total: (deployRes.data || []).length,
        });
      } catch (e) {
        // ignore
      }
    };
    fetchData();
  }, []);

  const statCards = [
    {
      title: '服务器',
      value: stats.servers,
      icon: Server,
      color: '#5B8CFF',
      bg: 'rgba(91,140,255,0.08)',
    },
    {
      title: '模型',
      value: stats.models,
      icon: Brain,
      color: '#8B5CF6',
      bg: 'rgba(139,92,246,0.08)',
    },
    {
      title: '运行中',
      value: stats.running,
      icon: Zap,
      color: '#10B981',
      bg: 'rgba(16,185,129,0.08)',
    },
    {
      title: '总部署',
      value: stats.total,
      icon: CheckCircle,
      color: '#F59E0B',
      bg: 'rgba(245,158,11,0.08)',
    },
  ];

  const deploySteps = [
    { label: '打开 Web 页面', status: 'done' },
    { label: '选择服务器', status: 'done' },
    { label: '选择 GPU', status: 'done' },
    { label: '选择模型', status: 'done' },
    { label: '点击部署', status: 'done' },
    { label: '自动同步模型', status: 'done' },
    { label: '自动生成 YAML', status: 'done' },
    { label: '自动执行 das-start', status: 'done' },
    { label: '服务启动成功', status: 'success' },
    { label: 'Consul 注册成功', status: 'success' },
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
        <h1 className="text-2xl font-semibold" style={{ color: '#111827' }}>
          平台总览
        </h1>
        <p className="text-sm mt-1" style={{ color: '#9CA3AF' }}>
          异构算力 AI 模型部署与编排平台
        </p>
      </div>

      {/* Stats Cards */}
      <Row gutter={[20, 20]} className="mb-10">
        {statCards.map((stat, i) => (
          <Col xs={24} sm={12} lg={6} key={stat.title}>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.08 }}
              whileHover={{ y: -3 }}
            >
              <Card
                className="border border-border cursor-pointer"
                style={{
                  borderRadius: '20px',
                  background: 'rgba(255,255,255,0.9)',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.03)',
                }}
                bodyStyle={{ padding: '24px' }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm mb-1" style={{ color: '#6B7280' }}>
                      {stat.title}
                    </div>
                    <div className="text-3xl font-semibold" style={{ color: '#111827' }}>
                      {stat.value}
                    </div>
                  </div>
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center"
                    style={{ background: stat.bg }}
                  >
                    <stat.icon size={22} style={{ color: stat.color }} strokeWidth={1.5} />
                  </div>
                </div>
              </Card>
            </motion.div>
          </Col>
        ))}
      </Row>

      {/* Deploy Flow */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.4 }}
      >
        <Card
          className="border border-border"
          style={{
            borderRadius: '24px',
            background: 'rgba(255,255,255,0.9)',
            boxShadow: '0 2px 12px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.03)',
          }}
          bodyStyle={{ padding: '32px' }}
        >
          <div className="flex items-center gap-2 mb-6">
            <Clock size={18} className="text-text-muted" />
            <h3 className="text-base font-semibold" style={{ color: '#111827' }}>
              MVP 部署流程
            </h3>
          </div>

          <div className="flex flex-wrap gap-3">
            {deploySteps.map((step, i) => (
              <div key={i} className="flex items-center gap-3">
                {i > 0 && (
                  <ArrowUpRight size={14} className="text-text-muted" style={{ opacity: 0.4 }} />
                )}
                <span
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium"
                  style={{
                    background: step.status === 'success' ? 'rgba(16,185,129,0.08)' : 'rgba(91,140,255,0.06)',
                    color: step.status === 'success' ? '#059669' : '#5B8CFF',
                  }}
                >
                  {step.status === 'success' ? (
                    <CheckCircle size={14} />
                  ) : (
                    <div className="w-3.5 h-3.5 rounded-full border-2 border-primary/40" />
                  )}
                  {step.label}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </motion.div>
    </motion.div>
  );
};

export default StatusPage;
