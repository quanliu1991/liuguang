import ReactECharts from 'echarts-for-react';
import type { ModelService } from '../../../types';
import { motion } from 'framer-motion';
import { X, TrendingUp, Activity, Clock, Gauge, Zap } from 'lucide-react';

interface Props {
  service: ModelService;
  onClose: () => void;
}

export default function ModelServiceDetail({ service, onClose }: Props) {
  const qpsOption = {
    tooltip: { trigger: 'axis' },
    grid: { top: 10, right: 10, bottom: 20, left: 40 },
    xAxis: {
      type: 'category',
      data: service.history.timestamps,
      axisLine: { lineStyle: { color: '#E5E7EB' } },
      axisLabel: { color: '#9CA3AF', fontSize: 10 },
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: '#F3F4F6' } },
      axisLabel: { color: '#9CA3AF', fontSize: 10 },
    },
    series: [{
      name: 'QPS',
      type: 'line',
      data: service.history.qps,
      smooth: true,
      showSymbol: false,
      lineStyle: { width: 2, color: '#5B8CFF' },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(91,140,255,0.2)' },
            { offset: 1, color: 'rgba(91,140,255,0.02)' },
          ],
        },
      },
    }],
  };

  const tpsOption = {
    ...qpsOption,
    yAxis: {
      ...qpsOption.yAxis,
    },
    series: [{
      ...qpsOption.series[0],
      name: 'TPS',
      data: service.history.tps,
      lineStyle: { width: 2, color: '#10B981' },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(16,185,129,0.2)' },
            { offset: 1, color: 'rgba(16,185,129,0.02)' },
          ],
        },
      },
    }],
  };

  const concOption = {
    ...qpsOption,
    series: [{
      ...qpsOption.series[0],
      name: '并发',
      data: service.history.concurrency,
      lineStyle: { width: 2, color: '#F59E0B' },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(245,158,11,0.2)' },
            { offset: 1, color: 'rgba(245,158,11,0.02)' },
          ],
        },
      },
    }],
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-3xl mx-4 rounded-3xl overflow-hidden bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h3 className="text-lg font-bold text-gray-800">{service.service_name}</h3>
            <p className="text-sm text-gray-400">{service.model}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors">
            <X size={16} className="text-gray-400" />
          </button>
        </div>

        {/* Metrics */}
        <div className="px-6 py-4 grid grid-cols-4 gap-4">
          <MetricItem icon={TrendingUp} label="QPS" value={service.qps} color="#5B8CFF" />
          <MetricItem icon={Activity} label="TPS" value={service.tps.toLocaleString()} color="#10B981" />
          <MetricItem icon={Clock} label="P95 延迟" value={`${service.p95_latency}s`} color="#F59E0B" />
          <MetricItem icon={Gauge} label="Token/s" value={service.token_speed.toLocaleString()} color="#8B5CF6" />
          <MetricItem icon={Zap} label="并发" value={service.concurrency} color="#EF4444" />
          <MetricItem icon={Activity} label="请求总量" value={service.request_count.toLocaleString()} color="#EC4899" />
          <MetricItem icon={TrendingUp} label="生成速度" value={`${service.avg_generate_speed} tok/s`} color="#14B8A6" />
          <MetricItem icon={Gauge} label="KV Cache" value={`${service.kv_cache}%`} color="#6366F1" />
        </div>

        {/* Charts */}
        <div className="px-6 pb-4 grid grid-cols-3 gap-4">
          <ChartCard title="QPS 趋势" option={qpsOption} />
          <ChartCard title="TPS 趋势" option={tpsOption} />
          <ChartCard title="并发趋势" option={concOption} />
        </div>
      </motion.div>
    </motion.div>
  );
}

function MetricItem({ icon: Icon, label, value, color }: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}12` }}>
        <Icon size={14} style={{ color }} />
      </div>
      <div>
        <div className="text-[10px] text-gray-400 uppercase tracking-wider">{label}</div>
        <div className="text-sm font-bold text-gray-700">{value}</div>
      </div>
    </div>
  );
}

function ChartCard({ title, option }: { title: string; option: any }) {
  return (
    <div className="rounded-2xl border border-gray-100 p-3 bg-gray-50/50">
      <div className="text-xs font-semibold text-gray-500 mb-2">{title}</div>
      <ReactECharts option={option} style={{ height: 140 }} />
    </div>
  );
}
