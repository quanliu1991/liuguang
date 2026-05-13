import type { ServerTwin } from '../../../types';
import { motion } from 'framer-motion';
import { useDigitalTwinStore } from '../../../stores/digitalTwinStore';
import { Cpu, HardDrive } from 'lucide-react';

interface Props {
  servers: ServerTwin[];
}

export default function ComputeResourceFlow({ servers }: Props) {
  const setSelectedServer = useDigitalTwinStore((s) => s.setSelectedServer);
  const setHoveredServer = useDigitalTwinStore((s) => s.setHoveredServer);
  const setHoveredGpu = useDigitalTwinStore((s) => s.setHoveredGpu);

  return (
    <div className="rounded-2xl border border-gray-100 bg-white/50 backdrop-blur-md">
      {/* Header */}
      <div className="px-5 py-3 border-b border-gray-100/80 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #5B8CFF15, #8B5CF610)' }}>
            <Cpu size={14} style={{ color: '#5B8CFF' }} />
          </div>
          <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">算力资源流</span>
          <span className="text-[10px] text-gray-400 ml-1">Compute Resource Flow</span>
        </div>
        <span className="text-[10px] text-gray-400">{servers.length} 台服务器 · {servers.reduce((a, s) => a + s.gpu_count, 0)} GPUs</span>
      </div>

      {/* Server constellation */}
      <div className="p-5">
        <div className="flex gap-6 flex-wrap justify-center">
          {servers.map((server, idx) => (
            <ServerCluster
              key={server.name}
              server={server}
              serverIdx={idx}
              onHover={(v) => setHoveredServer(v)}
              onGpuHover={(v) => setHoveredGpu(v)}
              onClick={() => setSelectedServer(idx)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Server cluster (server card + GPU mini-grid) ──

function ServerCluster({
  server, serverIdx, onHover, onGpuHover, onClick,
}: {
  server: ServerTwin;
  serverIdx: number;
  onHover: (v: number | null) => void;
  onGpuHover: (v: { serverIdx: number; gpuIdx: number } | null) => void;
  onClick: () => void;
}) {
  const hoveredServer = useDigitalTwinStore((s) => s.hoveredServerIndex);
  const hoveredGpu = useDigitalTwinStore((s) => s.hoveredGpuInfo);
  const isHovered = hoveredServer === serverIdx;
  const hoveredGpuIdx = hoveredGpu?.serverIdx === serverIdx ? hoveredGpu.gpuIdx : null;
  const memPct = Math.round((server.memory_used / Math.max(server.memory_total, 1)) * 100);
  const memColor = memPct > 85 ? '#EF4444' : memPct > 65 ? '#F59E0B' : '#10B981';

  return (
    <motion.div
      data-server-idx={serverIdx}
      onMouseEnter={() => onHover(serverIdx)}
      onMouseLeave={() => onHover(null)}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      className="relative cursor-pointer group"
      onClick={onClick}
    >
      {/* Server card */}
      <div
        className="rounded-xl px-4 py-3 text-center transition-all duration-300"
        style={{
          background: isHovered ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.6)',
          border: isHovered ? '1.5px solid rgba(91,140,255,0.3)' : '1px solid rgba(0,0,0,0.06)',
          backdropFilter: 'blur(12px)',
          boxShadow: isHovered ? '0 4px 20px rgba(91,140,255,0.1)' : '0 1px 6px rgba(0,0,0,0.02)',
          minWidth: 140,
        }}
      >
        {/* Status dot + name */}
        <div className="flex items-center justify-center gap-1.5 mb-2">
          <span className="w-2 h-2 rounded-full" style={{ background: '#10B981', boxShadow: '0 0 6px rgba(16,185,129,0.4)' }} />
          <span className="text-xs font-bold text-gray-700">{server.name}</span>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-center gap-3 mb-2 text-[10px] text-gray-400">
          <span className="flex items-center gap-1">
            <Cpu size={10} /> {server.gpu_online}/{server.gpu_count}
          </span>
          <span className="flex items-center gap-1">
            <HardDrive size={10} /> {server.memory_used}/{server.memory_total}GB
          </span>
        </div>

        {/* Memory bar */}
        <div className="h-1 rounded-full bg-gray-100 mb-3 overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ background: memColor, width: `${memPct}%` }}
            initial={{ width: 0 }}
            animate={{ width: `${memPct}%` }}
            transition={{ duration: 0.6 }}
          />
        </div>

        {/* GPU mini grid */}
        <div className="flex gap-1 flex-wrap justify-center">
          {server.gpus.map((gpu, gIdx) => {
            const pct = Math.round((gpu.memory_used / Math.max(gpu.memory_total, 1)) * 100);
            const clr = getHeatColor(pct);
            const isHovGpu = hoveredGpuIdx === gIdx;
            return (
              <motion.div
                key={gIdx}
                data-flow-gpu={`${serverIdx}-${gIdx}`}
                onMouseEnter={(e) => { e.stopPropagation(); onGpuHover({ serverIdx, gpuIdx: gIdx }); }}
                onMouseLeave={(e) => { e.stopPropagation(); onGpuHover(null); }}
                whileHover={{ scale: 1.15, y: -2 }}
                className="w-5 h-5 rounded-md flex items-center justify-center text-[8px] font-bold"
                style={{
                  background: isHovGpu ? `${clr}30` : `${clr}18`,
                  border: `1px solid ${clr}40`,
                  color: clr,
                }}
              >
                {gpu.index}
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

function getHeatColor(pct: number): string {
  if (pct >= 90) return '#EF4444';
  if (pct >= 70) return '#F59E0B';
  if (pct >= 40) return '#3B82F6';
  return '#10B981';
}
