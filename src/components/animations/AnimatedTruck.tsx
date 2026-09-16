import React from "react";

interface AnimatedTruckProps {
  size?: number;
  className?: string;
  strokeWidth?: number;
}

export function AnimatedTruck({
  size = 20,
  className = "",
  strokeWidth = 1.75,
}: AnimatedTruckProps) {
  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <style>{`
        @keyframes truck-drive {
          0%, 100% {
            transform: translate3d(0, 0, 0);
          }
          25% {
            transform: translate3d(1px, -1px, 0);
          }
          50% {
            transform: translate3d(2.5px, 0, 0);
          }
          75% {
            transform: translate3d(1px, -0.5px, 0);
          }
        }

        @keyframes wheel-rotate {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes exhaust-puff {
          0% {
            opacity: 0;
            transform: translate3d(0, 0, 0) scale(0.6);
          }
          40% {
            opacity: 0.7;
          }
          100% {
            opacity: 0;
            transform: translate3d(-5px, -2px, 0) scale(1.2);
          }
        }

        .truck-motion-body {
          animation: truck-drive 1.6s ease-in-out infinite;
          transform-origin: center bottom;
        }

        .truck-wheel-back {
          transform-origin: 7px 18.5px;
          animation: wheel-rotate 0.8s linear infinite;
        }

        .truck-wheel-front {
          transform-origin: 17px 18.5px;
          animation: wheel-rotate 0.8s linear infinite;
        }

        .truck-exhaust-1 {
          animation: exhaust-puff 1.6s ease-out infinite;
          transform-origin: center;
        }

        .truck-exhaust-2 {
          animation: exhaust-puff 1.6s ease-out infinite 0.4s;
          transform-origin: center;
        }
      `}</style>

      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="overflow-visible"
        aria-hidden="true"
      >
        {/* Exhaust / Speed dust trails */}
        <line
          x1="1.5"
          y1="14"
          x2="0"
          y2="14"
          strokeWidth="1.5"
          strokeDasharray="1.5 1.5"
          className="truck-exhaust-1 text-gray-400 opacity-60"
        />
        <line
          x1="1.5"
          y1="16.5"
          x2="-1"
          y2="16.5"
          strokeWidth="1.5"
          strokeDasharray="1.5 1.5"
          className="truck-exhaust-2 text-gray-400 opacity-60"
        />

        {/* Animated truck assembly */}
        <g className="truck-motion-body">
          {/* Cargo Container & Cab Outline */}
          <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" />
          <path d="M15 18H9" />
          <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14" />

          {/* Cab Window */}
          <path d="M14 9h3.2l2.3 3H14V9z" strokeWidth="1.2" opacity="0.85" />

          {/* Rear Wheel with Rotating Crosshairs */}
          <g className="truck-wheel-back">
            <circle cx="7" cy="18.5" r="2.5" />
            <line x1="7" y1="16.5" x2="7" y2="20.5" strokeWidth="1" />
            <line x1="5" y1="18.5" x2="9" y2="18.5" strokeWidth="1" />
          </g>

          {/* Front Wheel with Rotating Crosshairs */}
          <g className="truck-wheel-front">
            <circle cx="17" cy="18.5" r="2.5" />
            <line x1="17" y1="16.5" x2="17" y2="20.5" strokeWidth="1" />
            <line x1="15" y1="18.5" x2="19" y2="18.5" strokeWidth="1" />
          </g>
        </g>
      </svg>
    </div>
  );
}
