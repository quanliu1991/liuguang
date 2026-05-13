import type { ServerTwin } from '../../../types';
import { motion } from 'framer-motion';

interface Props {
  servers: ServerTwin[];
}

export default function RequestFlowViz({ servers }: Props) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white/60 backdrop-blur-sm p-5">
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Request Flow</div>
      <div className="flex flex-col items-center gap-3">
        {/* Client */}
        <Node label="Client" color="#5B8CFF" />
        <Arrow />
        {/* Gateway */}
        <Node label="Gateway" color="#8B5CF6" />
        <Arrow />
        {/* Server nodes */}
        <div className="flex gap-4 flex-wrap justify-center">
          {servers.map((s) => (
            <ServerNode key={s.name} server={s} />
          ))}
        </div>
      </div>
    </div>
  );
}

function Node({ label, color }: { label: string; color: string }) {
  return (
    <motion.div
      className="px-6 py-2.5 rounded-full text-sm font-semibold text-white"
      style={{ background: `linear-gradient(135deg, ${color}, ${color}CC)` }}
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      {label}
    </motion.div>
  );
}

function Arrow() {
  return (
    <motion.div
      className="w-0.5 h-6 rounded-full"
      style={{
        background: 'linear-gradient(to bottom, transparent, #5B8CFF, transparent)',
      }}
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 24, opacity: 1 }}
      transition={{ duration: 0.4 }}
    />
  );
}

function ServerNode({ server }: { server: ServerTwin }) {
  return (
    <motion.div
      className="px-5 py-3 rounded-2xl border border-gray-100 bg-white/80 text-center"
      initial={{ y: 10, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <div className="text-xs font-bold text-gray-700 mb-1">{server.name}</div>
      <div className="text-[10px] text-gray-400">QPS: {server.current_qps}</div>
      <div className="flex gap-1 mt-1.5 justify-center">
        {server.gpus.map((g) => {
          const pct = Math.round((g.memory_used / g.memory_total) * 100);
          const clr = pct > 85 ? '#EF4444' : pct > 65 ? '#F59E0B' : '#10B981';
          return (
            <span
              key={g.index}
              className="w-4 h-1.5 rounded-full"
              style={{ background: clr, opacity: 0.7 }}
            />
          );
        })}
      </div>
    </motion.div>
  );
}
