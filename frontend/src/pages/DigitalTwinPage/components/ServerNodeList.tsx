import type { ServerTwin } from '../../../types';
import { motion } from 'framer-motion';
import { Server, Cpu, Zap, Layers } from 'lucide-react';

interface Props {
  servers: ServerTwin[];
  selectedIndex: number | null;
  onSelect: (index: number) => void;
}

function statusColor(status: string) {
  switch (status) {
    case 'online': return '#10B981';
    case 'warning': return '#F59E0B';
    case 'offline': return '#EF4444';
    default: return '#9CA3AF';
  }
}

export default function ServerNodeList({ servers, selectedIndex, onSelect }: Props) {
  return (
    <div className="flex flex-col gap-3 overflow-y-auto pr-1" style={{ maxHeight: 'calc(100vh - 280px)' }}>
      {servers.map((server, idx) => {
        const selected = selectedIndex === idx;
        const statusClr = statusColor(server.status);
        return (
          <motion.button
            key={server.name}
            onClick={() => onSelect(idx)}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.08, duration: 0.35 }}
            whileHover={{ y: -2, transition: { duration: 0.15 } }}
            className="relative w-full text-left rounded-2xl p-4 transition-all duration-300"
            style={{
              background: selected
                ? 'linear-gradient(135deg, rgba(91,140,255,0.08) 0%, rgba(91,140,255,0.03) 100%)'
                : 'rgba(255,255,255,0.65)',
              border: selected ? '1.5px solid rgba(91,140,255,0.35)' : '1px solid rgba(0,0,0,0.05)',
              backdropFilter: 'blur(12px)',
              boxShadow: selected ? '0 4px 20px rgba(91,140,255,0.12)' : '0 1px 6px rgba(0,0,0,0.02)',
            }}
          >
            {selected && (
              <motion.div
                layoutId="selected-ring"
                className="absolute inset-0 rounded-2xl pointer-events-none"
                style={{ boxShadow: '0 0 0 1px rgba(91,140,255,0.15)' }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              />
            )}

            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: 'rgba(91,140,255,0.08)' }}>
                  <Server size={15} style={{ color: '#5B8CFF' }} />
                </div>
                <span className="text-sm font-semibold text-gray-800">{server.name}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ background: statusClr, boxShadow: `0 0 6px ${statusClr}60` }} />
                <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: statusClr }}>
                  {server.status}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="flex items-center gap-1.5">
                <Cpu size={12} className="text-gray-400" />
                <span className="text-xs text-gray-600 font-medium">{server.gpu_online}/{server.gpu_count}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Zap size={12} className="text-gray-400" />
                <span className="text-xs text-gray-600 font-medium">{server.memory_used}/{server.memory_total}GB</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-3">
              <div>
                <span className="text-[10px] text-gray-400 uppercase tracking-wider">QPS</span>
                <div className="text-sm font-bold text-gray-800">{server.current_qps.toLocaleString()}</div>
              </div>
              <div>
                <span className="text-[10px] text-gray-400 uppercase tracking-wider">TPS</span>
                <div className="text-sm font-bold text-gray-800">{server.current_tps.toLocaleString()}</div>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <Layers size={11} className="text-gray-400" />
              <div className="flex gap-1.5 flex-wrap">
                {server.models.map((m) => (
                  <span
                    key={m}
                    className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                    style={{ background: 'rgba(91,140,255,0.07)', color: '#5B8CFF' }}
                  >
                    {m}
                  </span>
                ))}
              </div>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}
