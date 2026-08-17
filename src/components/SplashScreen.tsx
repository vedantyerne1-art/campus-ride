import React, { useEffect, useState } from "react";
import { ShieldCheck, Sparkles, Navigation } from "lucide-react";

interface SplashScreenProps {
  onFinish: () => void;
  isLoadingBackend?: boolean;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onFinish,
  isLoadingBackend = false,
}) => {
  const [showSpinner, setShowSpinner] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    // Only show loading spinner if backend auth check takes more than 1.5s
    const spinnerTimer = setTimeout(() => {
      setShowSpinner(true);
    }, 1500);

    // Initial logo reveal duration (~600ms to 900ms)
    const minSplashTimer = setTimeout(() => {
      if (!isLoadingBackend) {
        setIsFadingOut(true);
        setTimeout(onFinish, 400);
      }
    }, 900);

    return () => {
      clearTimeout(spinnerTimer);
      clearTimeout(minSplashTimer);
    };
  }, [isLoadingBackend, onFinish]);

  // When backend finishes after min duration
  useEffect(() => {
    if (!isLoadingBackend && showSpinner) {
      setIsFadingOut(true);
      const timer = setTimeout(onFinish, 400);
      return () => clearTimeout(timer);
    }
  }, [isLoadingBackend, showSpinner, onFinish]);

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center transition-opacity duration-400 ${
        isFadingOut ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      <div className="flex flex-col items-center text-center space-y-6 animate-in fade-in zoom-in-95 duration-700 ease-out">
        {/* Animated Brand Emblem */}
        <div className="relative">
          <div className="absolute -inset-4 rounded-[36px] bg-gradient-to-tr from-indigo-500/30 to-violet-500/30 blur-xl animate-pulse" />
          <div className="w-24 h-24 rounded-[32px] liquid-glass-panel flex items-center justify-center text-white shadow-2xl relative border-2 border-white/30 specular-shine">
            <div className="w-16 h-16 rounded-[22px] bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center shadow-inner">
              <Navigation className="w-8 h-8 text-white rotate-45" />
            </div>
            <span className="absolute -bottom-2 -right-2 p-1.5 rounded-full bg-emerald-500 text-white shadow-lg border-2 border-slate-900">
              <ShieldCheck className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>

        {/* Brand Name & Tagline */}
        <div className="space-y-1.5">
          <h1 className="apple-large-title text-white tracking-tight flex items-center justify-center gap-2">
            Campus<span className="text-indigo-400 font-extrabold">Sathi</span>
          </h1>
          <p className="text-xs sm:text-sm text-indigo-200/80 font-medium tracking-wide">
            Verified • Safe • Campus Peer Rides
          </p>
        </div>

        {/* Spinner only if load > 1.5s */}
        {showSpinner && (
          <div className="pt-4 flex items-center gap-2 text-xs text-white/60 animate-in fade-in duration-300 font-mono">
            <div className="w-4 h-4 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" />
            <span>Connecting campus network...</span>
          </div>
        )}
      </div>

      {/* Subtle bottom credit */}
      <div className="absolute bottom-8 text-[11px] text-white/40 font-mono tracking-wider">
        SECURE CAMPUS MOBILITY PLATFORM
      </div>
    </div>
  );
};
