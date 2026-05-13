import type { FragmentAlert, ScheduleSuggestion } from '../../../types';
import { motion } from 'framer-motion';
import { AlertTriangle, Lightbulb, ArrowRight } from 'lucide-react';

interface Props {
  alerts: FragmentAlert[];
  suggestions: ScheduleSuggestion[];
  onClose: () => void;
}

const impactColor: Record<string, string> = {
  high: '#EF4444',
  medium: '#F59E0B',
  low: '#10B981',
};

export default function ResourceAnalysisPanel({ alerts, suggestions, onClose }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="w-full max-w-2xl mx-4 rounded-3xl overflow-hidden bg-white shadow-2xl max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-800">Resource Analysis</h3>
          <p className="text-xs text-gray-400 mt-0.5">Fragmentation & Optimization Insights</p>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-5">
          {/* Fragment Alerts */}
          {alerts.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle size={16} className="text-F59E0B" style={{ color: '#F59E0B' }} />
                <span className="text-sm font-semibold text-gray-700">Fragmentation Alerts</span>
                <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ background: '#F59E0B15', color: '#F59E0B' }}>
                  {alerts.length}
                </span>
              </div>
              <div className="space-y-2">
                {alerts.map((a, i) => (
                  <motion.div
                    key={i}
                    initial={{ x: -10, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center gap-3 p-3 rounded-xl bg-amber-50/60 border border-amber-100/60"
                  >
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-amber-100">
                      <span className="text-xs font-bold text-amber-600">{a.memory_remaining}GB</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-gray-700">{a.server_name} GPU{a.gpu_index}</div>
                      <div className="text-[11px] text-gray-400">{a.suggestion}</div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Schedule Suggestions */}
          {suggestions.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb size={16} style={{ color: '#5B8CFF' }} />
                <span className="text-sm font-semibold text-gray-700">Optimization Suggestions</span>
                <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ background: '#5B8CFF15', color: '#5B8CFF' }}>
                  {suggestions.length}
                </span>
              </div>
              <div className="space-y-2">
                {suggestions.map((s, i) => (
                  <motion.div
                    key={i}
                    initial={{ x: -10, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.1 + i * 0.05 }}
                    className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100"
                  >
                    <div className="w-1.5 h-10 rounded-full" style={{ background: impactColor[s.impact] }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-gray-700">{s.title}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: `${impactColor[s.impact]}15`, color: impactColor[s.impact] }}>
                          {s.impact}
                        </span>
                      </div>
                      <div className="text-[11px] text-gray-400 mt-0.5">{s.description}</div>
                    </div>
                    <ArrowRight size={14} className="text-gray-300" />
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {alerts.length === 0 && suggestions.length === 0 && (
            <div className="text-center py-12">
              <div className="text-sm text-gray-400">No issues detected</div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
