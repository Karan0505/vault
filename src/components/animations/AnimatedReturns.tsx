import React from "react";

interface AnimatedReturnsProps {
  size?: number;
  className?: string;
  strokeWidth?: number;
}

export function AnimatedReturns({
  size = 20,
  className = "",
  strokeWidth = 1.75,
}: AnimatedReturnsProps) {
  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
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
        className="transition-transform duration-500 ease-out group-hover:-rotate-180 group-hover:scale-110"
        aria-hidden="true"
      >
        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
        <path d="M3 3v5h5" />
      </svg>
    </div>
  );
}
