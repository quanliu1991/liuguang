import type { ResourceSummary } from '../../../types';
import { motion } from 'framer-motion';
import { Cpu, Zap, Database, ArrowUpRight, Activity, BarChart3, Clock, Layers, Rocket } from 'lucide-react';

interface Props {
  summary: ResourceSummary;
}

const MetricCard = ({ icon: Icon, label, value, unit, color, delay }: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  unit?: string;
  color: string;
  delay: number;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.4 }}
    className="relative overflow-hidden rounded-2xl bg-white/70 backdrop-blur-md border border-[rgba(0,0,0,0.05)] px-4 py-3.5 hover:shadow-md transition-shadow duration-300"
    style={{ minWidth: 0 }}
  >
    <div className="absolute top-0 right-0 w-20 h-20 -mr-6 -mt-6 rounded-full opacity-[0.06]" style={{ background: color }} />
    <div className="flex items-center gap-2.5 mb-1.5">
      <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${color}15` }}>
        <Icon size={14} style={{ color }} />
      </div>
      <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">{label}</span>
    </div>
    <div className="flex items-baseline gap-1">
      <span className="text-xl font-bold tracking-tight" style={{ color: '#111827' }}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </span>
      {unit && <span className="text-xs text-gray-400 font-medium">{unit}</span>}
    </div>
  </motion.div>
);

export default function ResourceOverview({ summary }: Props) {
  return (
    <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-3 mb-5">
      <MetricCard icon={Cpu} label="GPU" value={summary.total_gpus} color="#5B8CFF" delay={0} />
      <MetricCard icon={Zap} label="利用率" value={summary.gpu_utilization} unit="%" color="#10B981" delay={0.05} />
      <MetricCard icon={Database} label="显存" value={`${summary.total_memory_used}/${summary.total_memory}`} unit="GB" color="#8B5CF6" delay={0.1} />
      <MetricCard icon={ArrowUpRight} label="QPS" value={summary.current_qps} color="#F59E0B" delay={0.15} />
      <MetricCard icon={Activity} label="TPS" value={summary.current_tps} color="#EF4444" delay={0.2} />
      <MetricCard icon={BarChart3} label="并发" value={summary.current_concurrency} color="#EC4899" delay={0.25} />
      <MetricCard icon={Clock} label="请求" value={summary.current_requests} color="#6366F1" delay={0.3} />
      <MetricCard icon={Rocket} label="Token/s" value={summary.token_output_speed} color="#14B8A6" delay={0.35} />
      <MetricCard icon={Layers} label="模型" value={summary.online_models} color="#F97316" delay={0.4} />
    </div>
  );
}
