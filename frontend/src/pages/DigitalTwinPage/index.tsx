import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { getDigitalTwin } from '../../api';
import { useDigitalTwinStore } from '../../stores/digitalTwinStore';
import type { FragmentAlert, ScheduleSuggestion } from '../../types';
import ResourceOverview from './components/ResourceOverview';
import ServerNodeList from './components/ServerNodeList';
import GpuCard from './components/GpuCard';
import ModelServiceDetail from './components/ModelServiceDetail';
import GpuTopology from './components/GpuTopology';
import ComputeResourceFlow from './components/ComputeResourceFlow';
import ResourceFlowTooltips from './components/ResourceFlowTooltips';
import ResourceAnalysisPanel from './components/ResourceAnalysisPanel';
import { Cpu, RefreshCw, AlertTriangle, Lightbulb } from 'lucide-react';

export default function DigitalTwinPage() {
  const {
    twinData, setTwinData, summary, setSummary,
    selectedServerIndex, setSelectedServer, selectedGpuIndex, setSelectedGpu,
    selectedService, setSelectedService, loading, setLoading,
    showFragmentPanel, showSuggestionsPanel,
    setShowFragmentPanel, setShowSuggestionsPanel,
  } = useDigitalTwinStore();

  const [allAlerts, setAllAlerts] = useState<FragmentAlert[]>([]);
  const [allSuggestions, setAllSuggestions] = useState<ScheduleSuggestion[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getDigitalTwin();
      setTwinData(res.data.data);
      setSummary(res.data.summary);
      setAllAlerts(res.data.fragment_alerts || []);
      setAllSuggestions(res.data.schedule_suggestions || []);
    } catch {
      // error handled silently
    }
    setLoading(false);
  }, [setLoading, setTwinData, setSummary]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const selectedServer = selectedServerIndex !== null && twinData ? twinData.servers[selectedServerIndex] : null;
  const selectedGpu = selectedServer && selectedGpuIndex !== null ? selectedServer.gpus[selectedGpuIndex] : null;
  const selectedServiceData = selectedGpu && selectedService
    ? selectedGpu.services.find(s => s.service_name === selectedService.service_name)
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="min-h-screen"
      style={{ background: 'linear-gradient(180deg, #F5F7FB 0%, #EEF1F8 100%)' }}
    >
      {/* Header */}
      <div className="px-6 pt-5 pb-3">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #5B8CFF, #8B5CF6)' }}>
                <Cpu size={18} className="text-white" />
              </div>
              算力数字孪生
            </h1>
            <p className="text-xs text-gray-400 mt-1 ml-11">实时感知模型、请求与算力的流动</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFragmentPanel(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors hover:bg-amber-50"
              style={{ color: '#F59E0B', background: 'rgba(245,158,11,0.06)' }}
            >
              <AlertTriangle size={13} />
              碎片
              {allAlerts.length > 0 && (
                <span className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ background: '#F59E0B' }}>
                  {allAlerts.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setShowSuggestionsPanel(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors hover:bg-blue-50"
              style={{ color: '#5B8CFF', background: 'rgba(91,140,255,0.06)' }}
            >
              <Lightbulb size={13} />
              建议
              {allSuggestions.length > 0 && (
                <span className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ background: '#5B8CFF' }}>
                  {allSuggestions.length}
                </span>
              )}
            </button>
            <button
              onClick={fetchData}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors hover:bg-gray-100"
              style={{ color: '#6B7280', background: 'rgba(0,0,0,0.03)' }}
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              刷新
            </button>
          </div>
        </div>

        {/* Resource Summary */}
        {summary && <ResourceOverview summary={summary} />}

        {/* Compute Resource Flow — AI 算力资源总览 */}
        {twinData && <ComputeResourceFlow servers={twinData.servers} />}
      </div>

      {/* Main Content */}
      <div className="px-6 pb-6 flex gap-5" style={{ minHeight: 'calc(100vh - 520px)' }}>
        {/* Left: Server List */}
        <div className="w-72 flex-shrink-0">
          <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-3">算力节点</div>
          {twinData ? (
            <ServerNodeList
              servers={twinData.servers}
              selectedIndex={selectedServerIndex}
              onSelect={setSelectedServer}
            />
          ) : (
            <div className="flex items-center justify-center h-40 text-sm text-gray-400">加载中...</div>
          )}
        </div>

        {/* Right: GPU Twin Area */}
        <div className="flex-1 min-w-0">
          {selectedServer ? (
            <div className="space-y-5">
              {/* GPU Topology */}
              <GpuTopology server={selectedServer} />

              {/* GPU Cards Grid */}
              <div>
                <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  GPU 芯片矩阵 — {selectedServer.name}
                </div>
                <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
                  {selectedServer.gpus.map((gpu, idx) => (
                    <GpuCard
                      key={gpu.index}
                      gpu={gpu}
                      gpuIndex={idx}
                      isSelected={selectedGpuIndex === idx}
                      onSelect={() => setSelectedGpu(idx === selectedGpuIndex ? null : idx)}
                      onServiceClick={(svc) => setSelectedService(svc)}
                    />
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
              <Cpu size={48} className="mb-3" style={{ opacity: 0.3 }} />
              <span className="text-sm">点击算力资源流中的服务器节点以查看 GPU 拓扑</span>
            </div>
          )}
        </div>
      </div>
      {selectedServiceData && (
        <ModelServiceDetail
          service={selectedServiceData}
          onClose={() => setSelectedService(null)}
        />
      )}

      {showFragmentPanel && (
        <ResourceAnalysisPanel
          alerts={allAlerts}
          suggestions={allSuggestions}
          onClose={() => setShowFragmentPanel(false)}
        />
      )}

      {showSuggestionsPanel && (
        <ResourceAnalysisPanel
          alerts={allAlerts}
          suggestions={allSuggestions}
          onClose={() => setShowSuggestionsPanel(false)}
        />
      )}

      {twinData && <ResourceFlowTooltips servers={twinData.servers} />}
    </motion.div>
  );
}
