import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

const SIDEBAR_WIDTH = 280;
const HEADER_HEIGHT = 72;

const Layout: React.FC = () => {
  return (
    <div className="min-h-screen" style={{ background: '#F5F7FB' }}>
      {/* Background texture */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <svg className="absolute inset-0 w-full h-full opacity-[0.015]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#5B8CFF" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      <Sidebar />
      <Header />

      {/* Main Content */}
      <main
        className="relative z-10 pt-header page-fade-in"
        style={{ marginLeft: SIDEBAR_WIDTH, paddingTop: HEADER_HEIGHT, minHeight: '100vh' }}
      >
        <div className="p-8 max-w-[1400px]">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;
