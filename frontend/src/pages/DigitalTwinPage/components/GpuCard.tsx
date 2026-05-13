import type { GpuTwin, ModelService } from '../../../types';
import { motion } from 'framer-motion';
import { Thermometer, Zap, Cpu, Gauge } from 'lucide-react';

interface Props {
  gpu: GpuTwin;
  gpuIndex: number;
  isSelected: boolean;
  onSelect: () => void;
  onServiceClick: (service: { service_name: string; model: string }) => void;
}

function memoryColor(used: number, total: number): string {
  const pct = used / total;
  if (pct > 0.85) return '#EF4444';
  if (pct > 0.65) return '#F59E0B';
  return '#10B981';
}

function memoryGradient(used: number, total: number): string {
  const clr = memoryColor(used, total);
  const pct = (used / total) * 100;
  return `linear-gradient(90deg, ${clr} 0%, ${clr}CC ${pct}%)`;
}

export default function GpuCard({ gpu, gpuIndex, isSelected, onSelect, onServiceClick }: Props) {
  const memPct = Math.round((gpu.memory_used / gpu.memory_total) * 100);
  const memClr = memoryColor(gpu.memory_used, gpu.memory_total);

  return (
    <motion.div
      onClick={onSelect}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: gpuIndex * 0.06, duration: 0.3 }}
      whileHover={{ y: -3, transition: { duration: 0.15 } }}
      className="cursor-pointer rounded-2xl overflow-hidden transition-all duration-300"
      style={{
        background: isSelected
          ? 'linear-gradient(135deg, rgba(91,140,255,0.06) 0%, rgba(255,255,255,0.85) 100%)'
          : 'rgba(255,255,255,0.8)',
        border: isSelected ? '1.5px solid rgba(91,140,255,0.3)' : '1px solid rgba(0,0,0,0.05)',
        backdropFilter: 'blur(12px)',
        boxShadow: isSelected ? '0 4px 24px rgba(91,140,255,0.1)' : '0 1px 8px rgba(0,0,0,0.02)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3.5 pb-2">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #5B8CFF15, #5B8CFF08)' }}>
            <Cpu size={16} style={{ color: '#5B8CFF' }} />
          </div>
          <div>
            <div className="text-sm font-bold text-gray-800">GPU {gpu.index}</div>
            <div className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">{gpu.name}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold" style={{ color: memClr }}>{memPct}%</div>
          <div className="text-[10px] text-gray-400">{gpu.memory_used}/{gpu.memory_total}GB</div>
        </div>
      </div>

      {/* Memory bar */}
      <div className="px-4 pb-2">
        <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ background: memoryGradient(gpu.memory_used, gpu.memory_total), width: `${memPct}%` }}
            initial={{ width: 0 }}
            animate={{ width: `${memPct}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Metrics row */}
      <div className="px-4 pb-3 grid grid-cols-3 gap-2">
        <div className="flex items-center gap-1.5">
          <Zap size={11} className="text-gray-400" />
          <div>
            <div className="text-[10px] text-gray-400">Util</div>
            <div className="text-xs font-bold text-gray-700">{gpu.gpu_util}%</div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Gauge size={11} className="text-gray-400" />
          <div>
            <div className="text-[10px] text-gray-400">KV</div>
            <div className="text-xs font-bold text-gray-700">{gpu.kv_cache}%</div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Thermometer size={11} className="text-gray-400" />
          <div>
            <div className="text-[10px] text-gray-400">Temp</div>
            <div className="text-xs font-bold text-gray-700">{gpu.temperature}°C</div>
          </div>
        </div>
      </div>

      <div className="px-4 pb-3">
        <div className="text-[10px] text-gray-400 mb-1">Power</div>
        <div className="text-xs font-bold text-gray-700">{gpu.power}W</div>
      </div>

      {/* Services */}
      {gpu.services.length > 0 && (
        <div className="border-t border-gray-100 px-4 py-2.5">
          <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Running Services</div>
          {gpu.services.map((svc, si) => (
            <ServiceItem key={si} service={svc} onClick={() => onServiceClick({ service_name: svc.service_name, model: svc.model })} />
          ))}
        </div>
      )}
    </motion.div>
  );
}

function ServiceItem({ service, onClick }: { service: ModelService; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full text-left mb-2 last:mb-0 p-2 rounded-lg hover:bg-blue-50/50 transition-colors cursor-pointer -mx-2">
      <div className="flex items-center gap-2 mb-1">
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#5B8CFF' }} />
        <span className="text-xs font-semibold text-gray-700">{service.service_name}</span>
      </div>
      <div className="ml-3.5 text-[10px] text-gray-400 mb-1">{service.model}</div>
      <div className="ml-3.5 flex gap-3">
        <span className="text-[11px] text-gray-500">QPS <b className="text-gray-700">{service.qps}</b></span>
        <span className="text-[11px] text-gray-500">TPS <b className="text-gray-700">{service.tps.toLocaleString()}</b></span>
        <span className="text-[11px] text-gray-500">C <b className="text-gray-700">{service.concurrency}</b></span>
      </div>
    </button>
  );
}
