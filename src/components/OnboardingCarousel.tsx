import React, { useState } from "react";
import {
  ShieldCheck,
  Navigation,
  AlertOctagon,
  ChevronRight,
  GraduationCap,
  Sparkles,
  MapPin,
  Lock,
  ArrowRight,
} from "lucide-react";

interface OnboardingCarouselProps {
  onComplete: () => void;
}

const SLIDES = [
  {
    id: 1,
    title: "Rides within your campus, by people you can trust",
    description:
      "Every rider and driver is verified with an official university ID or community credential. Travel securely with peers and faculty.",
    icon: GraduationCap,
    badge: "Verified Community",
    colorGradient: "from-indigo-500/20 to-violet-500/20",
    iconBg: "bg-indigo-600/30 text-indigo-300 border-indigo-400/40",
    visual: (
      <div className="relative w-full h-44 rounded-[22px] liquid-glass-subtle flex items-center justify-center p-4 overflow-hidden">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-[18px] bg-indigo-600/40 border border-indigo-300/40 flex items-center justify-center text-white shadow-xl">
            <GraduationCap className="w-8 h-8 text-indigo-300" />
          </div>
          <div className="space-y-1.5 text-left">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[11px] font-semibold">
              <ShieldCheck className="w-3 h-3" /> Tier 1 Student Verified
            </div>
            <p className="font-bold text-sm text-white">Aditya Sharma</p>
            <p className="text-[11px] text-white/60">IIT Delhi • CS Dept • 98% Trust Score</p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 2,
    title: "Live tracked, every single second",
    description:
      "Real-time GPS tracking with corridor deviation safety alerts, instant ETA predictions, and transparent campus-capped fares.",
    icon: Navigation,
    badge: "Real-Time Corridor GPS",
    colorGradient: "from-cyan-500/20 to-blue-500/20",
    iconBg: "bg-cyan-600/30 text-cyan-300 border-cyan-400/40",
    visual: (
      <div className="relative w-full h-44 rounded-[22px] liquid-glass-subtle flex flex-col justify-between p-4 overflow-hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-xs font-mono text-emerald-300 font-semibold">Live GPS Active</span>
          </div>
          <span className="text-[11px] font-mono text-white/70 px-2 py-0.5 rounded-full liquid-glass-btn">
            2.4 km • 6 mins ETA
          </span>
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-white">
            <MapPin className="w-4 h-4 text-emerald-400" />
            <span className="font-semibold">Hostel Gate 2 → Central Library</span>
          </div>
          <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-500 to-cyan-400 h-full w-2/3 rounded-full" />
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 3,
    title: "Safety built in, not bolted on",
    description:
      "One-tap Emergency SOS direct to Campus Security, instant live trip share links, and masked in-app chat for 100% privacy.",
    icon: AlertOctagon,
    badge: "Zero-Compromise Safety",
    colorGradient: "from-rose-500/20 to-red-500/20",
    iconBg: "bg-red-600/30 text-red-300 border-red-400/40",
    visual: (
      <div className="relative w-full h-44 rounded-[22px] liquid-glass-subtle flex items-center justify-around p-4 overflow-hidden">
        <div className="text-center space-y-1.5">
          <div className="w-12 h-12 rounded-[16px] liquid-glass-sos flex items-center justify-center text-white mx-auto shadow-lg">
            <AlertOctagon className="w-6 h-6 animate-pulse" />
          </div>
          <p className="text-xs font-bold text-red-300">1-Tap SOS</p>
        </div>
        <div className="text-center space-y-1.5">
          <div className="w-12 h-12 rounded-[16px] liquid-glass-primary flex items-center justify-center text-white mx-auto shadow-lg">
            <Lock className="w-6 h-6" />
          </div>
          <p className="text-xs font-bold text-indigo-300">Masked Chat</p>
        </div>
        <div className="text-center space-y-1.5">
          <div className="w-12 h-12 rounded-[16px] liquid-glass-emerald flex items-center justify-center text-white mx-auto shadow-lg">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <p className="text-xs font-bold text-emerald-300">Secure OTP</p>
        </div>
      </div>
    ),
  },
];

export const OnboardingCarousel: React.FC<OnboardingCarouselProps> = ({ onComplete }) => {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  const handleFinish = () => {
    localStorage.setItem("campussathi_onboarded", "true");
    onComplete();
  };

  const handleNext = () => {
    if (currentSlideIndex < SLIDES.length - 1) {
      setCurrentSlideIndex((prev) => prev + 1);
    } else {
      handleFinish();
    }
  };

  const currentSlide = SLIDES[currentSlideIndex];
  const isLast = currentSlideIndex === SLIDES.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-[32px] liquid-glass-panel shadow-2xl p-6 sm:p-8 flex flex-col justify-between min-h-[580px] relative overflow-hidden specular-shine animate-in fade-in zoom-in-95 duration-500">
        {/* Top bar with slide badge and Skip button */}
        <div className="flex items-center justify-between">
          <span className="px-3 py-1 rounded-full liquid-glass-subtle text-[11px] font-bold text-indigo-300 uppercase tracking-wider">
            {currentSlide.badge}
          </span>
          <button
            id="btn-skip-onboarding"
            onClick={handleFinish}
            className="text-xs font-semibold text-white/60 hover:text-white px-3 py-1.5 rounded-[12px] liquid-glass-btn cursor-pointer"
          >
            Skip
          </button>
        </div>

        {/* Slide Visual Interactive Area */}
        <div className="my-6">{currentSlide.visual}</div>

        {/* Slide Copy */}
        <div className="space-y-3 text-center">
          <h2 className="apple-title text-white font-bold leading-snug">
            {currentSlide.title}
          </h2>
          <p className="apple-caption leading-relaxed max-w-xs mx-auto">
            {currentSlide.description}
          </p>
        </div>

        {/* Bottom Pagination Dots & Next Button */}
        <div className="pt-6 border-t border-white/10 flex items-center justify-between">
          {/* Progress Indicators */}
          <div className="flex items-center gap-2">
            {SLIDES.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentSlideIndex(idx)}
                aria-label={`Go to slide ${idx + 1}`}
                className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                  idx === currentSlideIndex
                    ? "w-7 bg-indigo-400 shadow-[0_0_10px_rgba(129,140,248,0.7)]"
                    : "w-2 bg-white/20 hover:bg-white/40"
                }`}
              />
            ))}
          </div>

          {/* Action Button */}
          <button
            id={isLast ? "btn-onboarding-get-started" : "btn-onboarding-next"}
            onClick={handleNext}
            className="px-6 py-3.5 rounded-[18px] liquid-glass-primary text-white font-bold text-xs shadow-xl flex items-center gap-2 cursor-pointer transition-transform active:scale-95"
          >
            <span>{isLast ? "Get Started" : "Next"}</span>
            {isLast ? <Sparkles className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
};
