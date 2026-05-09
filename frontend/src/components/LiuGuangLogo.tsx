import React from 'react';

const LiuGuangLogo: React.FC<{ size?: number }> = ({ size = 48 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Outer orbit */}
    <circle cx="24" cy="24" r="20" stroke="url(#grad1)" strokeWidth="1.5" opacity="0.6" />

    {/* Middle orbit */}
    <circle cx="24" cy="24" r="14" stroke="url(#grad1)" strokeWidth="1.5" opacity="0.8" />

    {/* Inner orbit */}
    <circle cx="24" cy="24" r="8" stroke="url(#grad1)" strokeWidth="1.5" />

    {/* Center node */}
    <circle cx="24" cy="24" r="3" fill="url(#grad1)" />

    {/* Orbital nodes - like a star constellation / neural network */}
    <circle cx="24" cy="4" r="2" fill="#5B8CFF" />
    <circle cx="38" cy="17" r="1.5" fill="#7AA2FF" />
    <circle cx="10" cy="17" r="1.5" fill="#7AA2FF" />
    <circle cx="38" cy="31" r="1.5" fill="#7AA2FF" />
    <circle cx="10" cy="31" r="1.5" fill="#7AA2FF" />

    {/* Connection lines - neural network style */}
    <line x1="24" y1="4" x2="38" y2="17" stroke="#5B8CFF" strokeWidth="0.8" opacity="0.5" />
    <line x1="24" y1="4" x2="10" y2="17" stroke="#5B8CFF" strokeWidth="0.8" opacity="0.5" />
    <line x1="38" y1="17" x2="38" y2="31" stroke="#5B8CFF" strokeWidth="0.8" opacity="0.4" />
    <line x1="10" y1="17" x2="10" y2="31" stroke="#5B8CFF" strokeWidth="0.8" opacity="0.4" />
    <line x1="38" y1="31" x2="24" y2="40" stroke="#5B8CFF" strokeWidth="0.8" opacity="0.3" />
    <line x1="10" y1="31" x2="24" y2="40" stroke="#5B8CFF" strokeWidth="0.8" opacity="0.3" />
    <line x1="10" y1="17" x2="38" y2="31" stroke="#5B8CFF" strokeWidth="0.6" opacity="0.25" />
    <line x1="38" y1="17" x2="10" y2="31" stroke="#5B8CFF" strokeWidth="0.6" opacity="0.25" />

    {/* Center connections */}
    <line x1="24" y1="24" x2="24" y2="4" stroke="#5B8CFF" strokeWidth="0.8" opacity="0.4" />
    <line x1="24" y1="24" x2="38" y2="17" stroke="#5B8CFF" strokeWidth="0.8" opacity="0.4" />
    <line x1="24" y1="24" x2="10" y2="17" stroke="#5B8CFF" strokeWidth="0.8" opacity="0.4" />

    {/* Bottom node */}
    <circle cx="24" cy="44" r="1.5" fill="#7AA2FF" opacity="0.7" />

    <defs>
      <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#5B8CFF" />
        <stop offset="100%" stopColor="#7AA2FF" />
      </linearGradient>
    </defs>
  </svg>
);

export default LiuGuangLogo;
