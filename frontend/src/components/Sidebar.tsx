import React from 'react';
import { motion } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import LiuGuangLogo from './LiuGuangLogo';
import {
  Rocket,
  ListChecks,
  Server,
  Brain,
  Network,
  LayoutDashboard,
  Cpu,
} from 'lucide-react';

interface SidebarProps {
  collapsed?: boolean;
}

const menuItems = [
  { key: '/dashboard', icon: LayoutDashboard, label: '总览' },
  { key: '/twin', icon: Cpu, label: '算力数字孪生' },
  { key: '/deploy', icon: Rocket, label: '创建部署' },
  { key: '/status', icon: ListChecks, label: '部署列表' },
  { key: '/servers', icon: Server, label: '服务器管理' },
  { key: '/models', icon: Brain, label: '模型管理' },
  { key: '/images', icon: Network, label: '镜像版本' },
];

const Sidebar: React.FC<SidebarProps> = ({ }) => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="fixed left-0 top-0 h-full w-sidebar bg-white/[0.85] backdrop-blur-xl border-r border-border z-50 flex flex-col"
      style={{
        boxShadow: '2px 0 12px rgba(0,0,0,0.02)',
      }}
    >
      {/* Mountain/Cloud decorative background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-r-3xl">
        {/* Subtle cloud layer */}
        <svg className="absolute bottom-0 left-0 right-0" viewBox="0 0 280 200" fill="none">
          <path d="M0 180 Q70 140 140 160 Q210 180 280 150 V200 H0Z" fill="rgba(91,140,255,0.03)" />
          <path d="M0 170 Q50 150 100 165 Q160 180 220 155 Q260 145 280 160 V200 H0Z" fill="rgba(91,140,255,0.02)" />
          <path d="M0 190 Q100 170 180 185 Q240 195 280 175 V200 H0Z" fill="rgba(122,162,255,0.02)" />
        </svg>
        {/* Subtle star orbit lines */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.03]" viewBox="0 0 280 800">
          <ellipse cx="140" cy="400" rx="120" ry="300" stroke="#5B8CFF" strokeWidth="0.5" fill="none" />
          <ellipse cx="140" cy="400" rx="80" ry="200" stroke="#5B8CFF" strokeWidth="0.5" fill="none" />
        </svg>
      </div>

      {/* Logo Section */}
      <div className="relative px-6 pt-7 pb-5 border-b border-border">
        <div className="flex items-center gap-3">
          <LiuGuangLogo size={44} />
          <div>
            <div className="text-lg font-semibold tracking-[0.15em]" style={{ color: '#111827' }}>
              流光
            </div>
            <div className="text-[10px] font-medium tracking-[0.2em] uppercase" style={{ color: '#9CA3AF' }}>
              LIUGUANG
            </div>
          </div>
        </div>
        <div className="mt-3 text-[11px]" style={{ color: '#9CA3AF', letterSpacing: '0.05em' }}>
          AI 算力 · 模型 · 服务 中枢
        </div>
      </div>

      {/* Menu Items */}
      <nav className="relative flex-1 px-3 py-4 overflow-y-auto">
        <ul className="space-y-1">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.key;
            const Icon = item.icon;
            return (
              <motion.li
                key={item.key}
                whileHover={{ x: 4 }}
                transition={{ duration: 0.15 }}
              >
                <button
                  onClick={() => navigate(item.key)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-primary/[0.10] text-primary'
                      : 'text-text-secondary hover:bg-primary/[0.04] hover:text-text-primary'
                  }`}
                >
                  <Icon
                    size={18}
                    strokeWidth={isActive ? 2 : 1.5}
                    className="flex-shrink-0"
                  />
                  <span>{item.label}</span>
                </button>
              </motion.li>
            );
          })}
        </ul>
      </nav>

      {/* Bottom branding */}
      <div className="relative px-6 py-5 border-t border-border-light">
        <div className="text-[10px]" style={{ color: '#C4C9D4', letterSpacing: '0.05em' }}>
          让模型如流光般抵达每一处算力
        </div>
        <div className="mt-1 text-[10px] font-mono" style={{ color: '#D1D5DB', letterSpacing: '0.05em' }}>
          v0.0.2
        </div>
      </div>
    </motion.div>
  );
};

export default Sidebar;
