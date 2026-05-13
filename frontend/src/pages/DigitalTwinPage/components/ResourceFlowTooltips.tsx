import type { ServerTwin, GpuTwin } from '../../../types';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useRef, useEffect } from 'react';
import { useDigitalTwinStore } from '../../../stores/digitalTwinStore';
import { Cpu, Zap, HardDrive } from 'lucide-react';

interface Props {
  servers: ServerTwin[];
}

export default function ResourceFlowTooltips({ servers }: Props) {
  const hoveredServerIdx = useDigitalTwinStore((s) => s.hoveredServerIndex);
  const hoveredGpuInfo = useDigitalTwinStore((s) => s.hoveredGpuInfo);

  const hoveredServer = hoveredServerIdx !== null ? servers[hoveredServerIdx] : null;
  const hoveredGpu = hoveredGpuInfo
    ? servers[hoveredGpuInfo.serverIdx]?.gpus[hoveredGpuInfo.gpuIdx]
    : null;

  return (
    <>
      <AnimatePresence>
        {hoveredServerIdx !== null && hoveredServer && hoveredGpuInfo === null && (
          <ServerTooltip
            server={hoveredServer}
            serverIdx={hoveredServerIdx}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {hoveredGpuInfo !== null && hoveredGpu && (
          <GpuTooltip
            gpu={hoveredGpu}
            serverIdx={hoveredGpuInfo.serverIdx}
            gpuIdx={hoveredGpuInfo.gpuIdx}
          />
        )}
      </AnimatePresence>
    </>
  );
}

// ── Server hover tooltip ──

function ServerTooltip({ server, serverIdx }: {
  server: ServerTwin;
  serverIdx: number;
}) {
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const els = document.querySelectorAll('[data-server-idx]');
    const target = els[serverIdx] as HTMLElement | undefined;
    if (target) {
      const rect = target.getBoundingClientRect();
      setPos({ x: rect.left + rect.width / 2, y: rect.bottom + 12 });
    }
  }, [serverIdx]);

  const svcCount = server.gpus.reduce((a, g) => a + g.services.length, 0);

  return (
    <motion.div
      ref={tooltipRef}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.2 }}
      className="fixed z-[200] w-56 rounded-xl overflow-hidden pointer-events-none"
      style={{
        left: Math.min(Math.max(pos.x - 112, 8), window.innerWidth - 240),
        top: pos.y,
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(0,0,0,0.06)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
      }}
    >
      <div className="px-4 py-3 border-b border-gray-100/60">
        <div className="text-sm font-bold text-gray-800">{server.name}</div>
        <div className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> ONLINE
        </div>
      </div>
      <div className="px-4 py-3 space-y-2">
        <TooltipRow icon={Cpu} label="GPU" value={`${server.gpu_online} / ${server.gpu_count}`} />
        <TooltipRow icon={HardDrive} label="Memory" value={`${server.memory_used} / ${server.memory_total} GB`} />
        <TooltipRow icon={Zap} label="QPS" value={server.current_qps.toLocaleString()} />
        <TooltipRow icon={Cpu} label="TPS" value={server.current_tps.toLocaleString()} />
      </div>
      <div className="px-4 pb-3">
        <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Models</div>
        <div className="flex gap-1.5 flex-wrap">
          {server.models.map((m) => (
            <span key={m} className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: 'rgba(91,140,255,0.07)', color: '#5B8CFF' }}>
              {m}
            </span>
          ))}
        </div>
      </div>
      <div className="px-4 pb-3">
        <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Services</div>
        <div className="text-xs text-gray-600">{svcCount} running</div>
      </div>
    </motion.div>
  );
}

// ── GPU hover tooltip ──

function GpuTooltip({ gpu, serverIdx, gpuIdx }: { gpu: GpuTwin; serverIdx: number; gpuIdx: number }) {
  const memPct = Math.round((gpu.memory_used / Math.max(gpu.memory_total, 1)) * 100);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const target = document.querySelector(
      `[data-flow-gpu="${serverIdx}-${gpuIdx}"]`,
    ) as HTMLElement | null;
    if (target) {
      const rect = target.getBoundingClientRect();
      const w = 256;
      const h = 200;
      const left = Math.min(Math.max(rect.left + rect.width / 2 - w / 2, 8), window.innerWidth - w - 8);
      const top = Math.min(rect.bottom + 10, window.innerHeight - h - 8);
      setPos({ x: left, y: Math.max(8, top) });
    }
  }, [serverIdx, gpuIdx]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.15 }}
      className="fixed z-[210] w-64 rounded-xl overflow-hidden pointer-events-none"
      style={{
        left: pos.x,
        top: pos.y,
        background: 'rgba(255,255,255,0.95)',
        backdropFilter: 'blur(16px)',
        border: `1.5px solid ${getHeatColor(memPct)}30`,
        boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
      }}
    >
      {/* GPU header */}
      <div className="px-4 py-3 border-b border-gray-100/60">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-gray-800">GPU {gpu.index}</span>
          <span className="text-[10px] font-semibold text-gray-400">{gpu.name}</span>
        </div>
        {/* Memory bar */}
        <div className="mt-2">
          <div className="flex items-center justify-between text-[10px] text-gray-400 mb-1">
            <span>Memory</span>
            <span style={{ color: getHeatColor(memPct), fontWeight: 700 }}>{gpu.memory_used} / {gpu.memory_total} GB</span>
          </div>
          <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ background: getHeatGradient(memPct), width: `${memPct}%` }}
              initial={{ width: 0 }}
              animate={{ width: `${memPct}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="px-4 py-2.5 grid grid-cols-3 gap-2">
        <TooltipMetric label="Util" value={`${gpu.gpu_util}%`} />
        <TooltipMetric label="Temp" value={`${gpu.temperature}°C`} />
        <TooltipMetric label="Power" value={`${gpu.power}W`} />
      </div>

      {/* Services */}
      {gpu.services.length > 0 && (
        <div className="px-4 pb-3">
          <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Running Services</div>
          {gpu.services.map((svc, si) => (
            <div key={si} className="mb-2 last:mb-0">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#5B8CFF' }} />
                <span className="text-xs font-semibold text-gray-700">{svc.service_name}</span>
              </div>
              <div className="ml-3.5 text-[10px] text-gray-400">{svc.model}</div>
              <div className="ml-3.5 flex gap-2 text-[10px] text-gray-400">
                <span>QPS: <b className="text-gray-600">{svc.qps}</b></span>
                <span>TPS: <b className="text-gray-600">{svc.tps.toLocaleString()}</b></span>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

function getHeatColor(pct: number): string {
  if (pct >= 90) return '#EF4444';
  if (pct >= 70) return '#F59E0B';
  if (pct >= 40) return '#3B82F6';
  return '#10B981';
}

function getHeatGradient(pct: number): string {
  const clr = getHeatColor(pct);
  return `linear-gradient(90deg, ${clr}, ${clr}CC)`;
}

function TooltipRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-1.5 text-[11px] text-gray-500">
        <Icon size={12} /> {label}
      </span>
      <span className="text-xs font-bold text-gray-700">{value}</span>
    </div>
  );
}

function TooltipMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <div className="text-[10px] text-gray-400">{label}</div>
      <div className="text-sm font-bold text-gray-700">{value}</div>
    </div>
  );
}
