import React, { useState, useEffect } from "react";
import { motion } from "motion/react";

export type BackgroundTheme =
  | "idle"
  | "searching"
  | "matched"
  | "in_progress"
  | "wallet"
  | "sos";

interface DynamicBackgroundProps {
  theme: BackgroundTheme;
  children?: React.ReactNode;
}

interface ThemeVisualConfig {
  gradient: string;
  blob1Color: string;
  blob2Color: string;
  blob3Color: string;
  blob4Color: string;
  accentGlow: string;
}

const THEME_CONFIGS: Record<BackgroundTheme, ThemeVisualConfig> = {
  idle: {
    gradient: "from-[#080B14] via-[#0E1326] to-[#080B14]",
    blob1Color: "bg-[#4B4ACF]/35", // Indigo
    blob2Color: "bg-[#8B5CF6]/30", // Violet
    blob3Color: "bg-[#3B82F6]/25", // Blue
    blob4Color: "bg-[#6366F1]/20",
    accentGlow: "rgba(99, 102, 241, 0.2)",
  },
  searching: {
    gradient: "from-[#051118] via-[#081F2C] to-[#051118]",
    blob1Color: "bg-[#14B8A6]/40", // Teal
    blob2Color: "bg-[#06B6D4]/35", // Cyan
    blob3Color: "bg-[#3B82F6]/30", // Blue
    blob4Color: "bg-[#0D9488]/25",
    accentGlow: "rgba(20, 184, 166, 0.25)",
  },
  matched: {
    gradient: "from-[#140C07] via-[#24150D] to-[#140C07]",
    blob1Color: "bg-[#F59E0B]/35", // Amber
    blob2Color: "bg-[#F97316]/30", // Coral / Orange
    blob3Color: "bg-[#FB7185]/25", // Rose
    blob4Color: "bg-[#D97706]/20",
    accentGlow: "rgba(245, 158, 11, 0.25)",
  },
  in_progress: {
    gradient: "from-[#061410] via-[#0A231C] to-[#061410]",
    blob1Color: "bg-[#10B981]/35", // Emerald
    blob2Color: "bg-[#14B8A6]/30", // Teal
    blob3Color: "bg-[#059669]/25",
    blob4Color: "bg-[#34D399]/20",
    accentGlow: "rgba(16, 185, 129, 0.25)",
  },
  wallet: {
    gradient: "from-[#12071A] via-[#1E0B2B] to-[#12071A]",
    blob1Color: "bg-[#7C3AED]/40", // Purple
    blob2Color: "bg-[#D946EF]/35", // Magenta / Fuchsia
    blob3Color: "bg-[#A855F7]/30",
    blob4Color: "bg-[#EC4899]/20",
    accentGlow: "rgba(168, 85, 247, 0.25)",
  },
  sos: {
    gradient: "from-[#1C0505] via-[#300A0A] to-[#1C0505]",
    blob1Color: "bg-[#EF4444]/55", // Red
    blob2Color: "bg-[#F87171]/45", // Coral Red
    blob3Color: "bg-[#DC2626]/40",
    blob4Color: "bg-[#B91C1C]/35",
    accentGlow: "rgba(239, 68, 68, 0.45)",
  },
};

export const DynamicBackground: React.FC<DynamicBackgroundProps> = ({
  theme,
  children,
}) => {
  const current = THEME_CONFIGS[theme] || THEME_CONFIGS.idle;
  const [mousePos, setMousePos] = useState({ x: 50, y: 30 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const x = Math.round((e.clientX / window.innerWidth) * 100);
      const y = Math.round((e.clientY / window.innerHeight) * 100);
      setMousePos({ x, y });
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-[#06080F] text-slate-100 transition-colors duration-1000">
      {/* 1. Base Gradient Canvas */}
      <motion.div
        key={theme}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.9, ease: [0.34, 1.56, 0.64, 1] }}
        className={`fixed inset-0 pointer-events-none bg-gradient-to-b ${current.gradient}`}
      />

      {/* 2. Floating Animated GPU Mesh Blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        {/* Blob 1 - Top Left */}
        <div
          className={`absolute -top-36 -left-36 w-[34rem] h-[34rem] rounded-full blur-[100px] ${current.blob1Color} animate-blob-1 transition-colors duration-1000`}
        />
        {/* Blob 2 - Top Right */}
        <div
          className={`absolute top-[15%] -right-40 w-[38rem] h-[38rem] rounded-full blur-[120px] ${current.blob2Color} animate-blob-2 transition-colors duration-1000`}
        />
        {/* Blob 3 - Bottom Center */}
        <div
          className={`absolute -bottom-40 left-[25%] w-[42rem] h-[42rem] rounded-full blur-[130px] ${current.blob3Color} animate-blob-3 transition-colors duration-1000`}
        />
        {/* Blob 4 - Center Accent Floating Blob */}
        <div
          className={`absolute top-1/2 left-1/4 w-[26rem] h-[26rem] rounded-full blur-[90px] ${current.blob4Color} animate-blob-1 transition-colors duration-1000`}
          style={{ animationDelay: "5s" }}
        />

        {/* 3. Subtle Interactive Specular Cursor Glow Layer */}
        <div
          className="absolute inset-0 pointer-events-none transition-opacity duration-500 opacity-60"
          style={{
            background: `radial-gradient(600px circle at ${mousePos.x}% ${mousePos.y}%, ${current.accentGlow}, transparent 70%)`,
          }}
        />

        {/* 4. Film Grain / SVG Noise Overlay for Tactile Glass Texture */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.035] mix-blend-overlay"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          }}
        />

        {/* 5. SOS Urgent Emergency Pulse Overlay */}
        {theme === "sos" && (
          <motion.div
            animate={{ opacity: [0.15, 0.45, 0.15] }}
            transition={{ repeat: Infinity, duration: 2.0, ease: "easeInOut" }}
            className="absolute inset-0 bg-red-950/40 pointer-events-none border-[6px] border-red-500/50"
          />
        )}
      </div>

      {/* Main Content Layer */}
      <div className="relative z-10 flex flex-col min-h-screen">
        {children}
      </div>
    </div>
  );
};
