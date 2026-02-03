'use client';
import { cn } from "@/lib/utils";
import { FormStatus } from "@/hooks/useGeminiSession";

interface SkeletonOverlayProps {
  status: FormStatus;
}

const statusConfig: Record<FormStatus, { strokeColor: string; jointColor: string; strokeWidth: number; opacity: number; className?: string }> = {
    idle: { strokeColor: "#00FFFF", jointColor: "#FFFFFF", strokeWidth: 2, opacity: 0.8 },
    good: { strokeColor: "#00FF00", jointColor: "#FFFFFF", strokeWidth: 2, opacity: 0.9 },
    yellow: { strokeColor: "#FFFF00", jointColor: "#FFFFFF", strokeWidth: 3, opacity: 1 },
    bad: { strokeColor: "#FF0000", jointColor: "#FFFFFF", strokeWidth: 4, opacity: 1, className: "animate-pulse" },
    waiting: { strokeColor: "#00FFFF", jointColor: "#FFFFFF", strokeWidth: 2, opacity: 0.3 },
};


export function SkeletonOverlay({ status }: SkeletonOverlayProps) {
  const config = statusConfig[status];
  
  return (
    <div className={cn("absolute inset-0 z-10 flex items-center justify-center pointer-events-none", config.className)} style={{ filter: `drop-shadow(0 0 8px ${config.strokeColor}B3)` }}>
      <svg
        className="w-full h-full"
        viewBox="0 0 360 640"
        preserveAspectRatio="xMidYMid slice"
      >
        <g stroke={config.strokeColor} strokeWidth={config.strokeWidth} strokeLinecap="round" opacity={config.opacity} className="transition-all duration-300">
          {/* Head */}
          <circle cx="180" cy="160" r="15" fill="none" />
          {/* Spine */}
          <line x1="180" y1="175" x2="180" y2="320" />
          {/* Shoulders */}
          <line x1="140" y1="200" x2="220" y2="200" />
          {/* Left Arm */}
          <line x1="140" y1="200" x2="120" y2="280" />
          <line x1="120" y1="280" x2="100" y2="360" />
          {/* Right Arm */}
          <line x1="220" y1="200" x2="240" y2="280" />
          <line x1="240" y1="280" x2="260" y2="360" />
          {/* Pelvis */}
          <line x1="160" y1="320" x2="200" y2="320" />
          {/* Left Leg */}
          <line x1="160" y1="320" x2="150" y2="420" />
          <line x1="150" y1="420" x2="140" y2="520" />
          {/* Right Leg */}
          <line x1="200" y1="320" x2="210" y2="420" />
          <line x1="210" y1="420" x2="220" y2="520" />

          {/* Joints */}
          <g fill={config.jointColor}>
            <circle cx="180" cy="175" r="3" /> {/* Neck */}
            <circle cx="140" cy="200" r="3" /> {/* L Shoulder */}
            <circle cx="220" cy="200" r="3" /> {/* R Shoulder */}
            <circle cx="120" cy="280" r="3" /> {/* L Elbow */}
            <circle cx="240" cy="280" r="3" /> {/* R Elbow */}
            <circle cx="100" cy="360" r="3" /> {/* L Wrist */}
            <circle cx="260" cy="360" r="3" /> {/* R Wrist */}
            <circle cx="160" cy="320" r="3" /> {/* L Hip */}
            <circle cx="200" cy="320" r="3" /> {/* R Hip */}
            <circle cx="150" cy="420" r="3" /> {/* L Knee */}
            <circle cx="210" cy="420" r="3" /> {/* R Knee */}
            <circle cx="140" cy="520" r="3" /> {/* L Ankle */}
            <circle cx="220" cy="520" r="3" /> {/* R Ankle */}
          </g>
        </g>
      </svg>
    </div>
  );
}

    