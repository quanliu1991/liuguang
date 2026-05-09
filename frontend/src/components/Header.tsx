import React from 'react';
import { motion } from 'framer-motion';
import { Bell, User, ChevronDown } from 'lucide-react';

const Header: React.FC = () => {
  return (
    <motion.div
      initial={{ y: -10, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="fixed top-0 left-sidebar right-0 h-header bg-white/[0.8] backdrop-blur-xl border-b border-border z-40 flex items-center justify-between px-8"
    >
      {/* Left: Breadcrumb-like area (reserved for page title in children) */}
      <div className="flex-1" />

      {/* Right: Actions */}
      <div className="flex items-center gap-4">
        {/* Notification */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="relative w-10 h-10 rounded-full flex items-center justify-center text-text-secondary hover:bg-primary/[0.04] hover:text-primary transition-colors"
        >
          <Bell size={18} strokeWidth={1.5} />
          <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full" />
        </motion.button>

        {/* User Avatar */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="flex items-center gap-3 pl-4 pr-2 py-1.5 rounded-full cursor-pointer hover:bg-primary/[0.04] transition-colors"
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary-light flex items-center justify-center text-white text-xs font-semibold">
            LG
          </div>
          <ChevronDown size={14} className="text-text-muted" />
        </motion.div>
      </div>
    </motion.div>
  );
};

export default Header;
