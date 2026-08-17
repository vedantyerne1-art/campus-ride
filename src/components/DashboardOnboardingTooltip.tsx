import React, { useState, useEffect } from "react";
import { Sparkles, X, CheckCircle, Navigation, Shield, Menu } from "lucide-react";

interface DashboardOnboardingTooltipProps {
  onDismiss: () => void;
}

export const DashboardOnboardingTooltip: React.FC<DashboardOnboardingTooltipProps> = ({
  onDismiss,
}) => {
  const [step, setStep] = useState<number>(0);

  const tips = [
    {
      title: "Tap to Open Side Drawer",
      description: "Access your verified profile, ride history, wallet, and settings anytime.",
      icon: Menu,
      position: "top-20 left-4",
    },
    {
      title: "Instant Emergency SOS",
      description: "Direct 1-tap beacon to Campus Security & your emergency contacts.",
      icon: Shield,
      position: "top-20 right-4",
    },
    {
      title: "Quick Campus Booking",
      description: "Search destinations or tap popular pickup points like Hostel Gates & Library.",
      icon: Navigation,
      position: "bottom-44 left-1/2 -translate-x-1/2",
    },
  ];

  const handleNext = () => {
    if (step < tips.length - 1) {
      setStep((prev) => prev + 1);
    } else {
      localStorage.setItem("campussathi_dashboard_guided", "true");
      onDismiss();
    }
  };

  const currentTip = tips[step];
  const IconComponent = currentTip.icon;

  return (
    <div className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div
        className={`absolute ${currentTip.position} w-80 max-w-[90vw] rounded-[24px] liquid-glass-panel shadow-2xl p-5 border border-indigo-400/50 specular-shine animate-in fade-in zoom-in-95 duration-300 z-50`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-[12px] bg-indigo-600/40 text-indigo-300 flex items-center justify-center">
              <IconComponent className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider">
              Campus Tour {step + 1}/{tips.length}
            </span>
          </div>
          <button
            onClick={() => {
              localStorage.setItem("campussathi_dashboard_guided", "true");
              onDismiss();
            }}
            className="p-1 rounded-full text-white/50 hover:text-white cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="mt-3">
          <h4 className="font-bold text-sm text-white">{currentTip.title}</h4>
          <p className="text-xs text-white/70 mt-1 leading-relaxed">{currentTip.description}</p>
        </div>

        <div className="mt-4 flex items-center justify-between pt-3 border-t border-white/10">
          <div className="flex gap-1.5">
            {tips.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === step ? "w-5 bg-indigo-400" : "w-1.5 bg-white/20"
                }`}
              />
            ))}
          </div>
          <button
            onClick={handleNext}
            className="px-3.5 py-1.5 rounded-[12px] liquid-glass-primary text-white text-xs font-bold shadow cursor-pointer"
          >
            {step === tips.length - 1 ? "Got it!" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
};
