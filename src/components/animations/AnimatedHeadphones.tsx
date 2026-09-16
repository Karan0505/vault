import React from "react";

interface AnimatedHeadphonesProps {
  size?: number;
  className?: string;
  strokeWidth?: number;
}

export function AnimatedHeadphones({
  size = 20,
  className = "",
  strokeWidth = 1.75,
}: AnimatedHeadphonesProps) {
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
        className="transition-transform duration-300 ease-out group-hover:scale-110 group-hover:-translate-y-0.5"
        aria-hidden="true"
      >
        <path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3" />
      </svg>
    </div>
  );
}
