import React, { useState } from "react";
import {
  X,
  Tag,
  Check,
  Sparkles,
  Info,
  TrendingDown,
  ShieldCheck,
  Coins,
} from "lucide-react";
import { CustomPricing } from "../types";
import { useAuth } from "../context/AuthContext";
import { updateCaptainPricing } from "../services/tripService";

interface CaptainPricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPricing?: CustomPricing;
  onSaved?: (pricing: CustomPricing) => void;
}

const PRICING_PRESETS = [
  {
    name: "Student Friendly (Subsidized)",
    baseFare: 10,
    perKm: 5,
    minFare: 15,
    desc: "Lowest cost for fellow campus hostelers & daily commuters",
  },
  {
    name: "Campus Standard",
    baseFare: 15,
    perKm: 7,
    minFare: 20,
    desc: "Fair compensation covering petrol & bike maintenance",
  },
  {
    name: "Express / Heavy Traffic",
    baseFare: 20,
    perKm: 9,
    minFare: 25,
    desc: "For peak hours, heavy rain, or off-campus trips",
  },
];

export const CaptainPricingModal: React.FC<CaptainPricingModalProps> = ({
  isOpen,
  onClose,
  currentPricing,
  onSaved,
}) => {
  const { currentUser, userProfile, updateUserProfile } = useAuth();

  const [baseFare, setBaseFare] = useState(
    currentPricing?.baseFare ?? userProfile?.customPricing?.baseFare ?? 15
  );
  const [perKm, setPerKm] = useState(
    currentPricing?.perKm ?? userProfile?.customPricing?.perKm ?? 7
  );
  const [minFare, setMinFare] = useState(
    currentPricing?.minFare ?? userProfile?.customPricing?.minFare ?? 20
  );
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  if (!isOpen) return null;

  const handleSelectPreset = (preset: typeof PRICING_PRESETS[0]) => {
    setBaseFare(preset.baseFare);
    setPerKm(preset.perKm);
    setMinFare(preset.minFare);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    setIsSaving(true);
    const newPricing: CustomPricing = {
      baseFare: Number(baseFare),
      perKm: Number(perKm),
      minFare: Number(minFare),
    };

    try {
      await updateCaptainPricing(currentUser.uid, newPricing);
      await updateUserProfile({
        customPricing: newPricing,
      });

      setSuccessMsg("Your custom captain travel rates updated successfully!");
      if (onSaved) onSaved(newPricing);

      setTimeout(() => {
        setSuccessMsg("");
        onClose();
      }, 1200);
    } catch (err) {
      console.error("Error saving captain pricing:", err);
    } finally {
      setIsSaving(false);
    }
  };

  // Sample estimated calculation for a typical 3.5 km campus ride
  const sampleDistance = 3.5;
  const sampleSubtotal = Math.max(minFare, Math.round(baseFare + sampleDistance * perKm));
  const sampleCommission = Math.round(sampleSubtotal * 0.10 * 10) / 10;
  const sampleTotal = Math.round(sampleSubtotal + sampleCommission * 0.05);
  const sampleNetEarnings = Math.round(sampleTotal - sampleCommission);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-xl flex flex-col rounded-[32px] liquid-glass-panel shadow-2xl border border-white/20 overflow-hidden specular-shine animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-slate-950/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[14px] bg-indigo-600/30 border border-indigo-400/40 text-indigo-300 flex items-center justify-center shadow-lg">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Set Your Travel Rate (Captain Rates)</span>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                  Rider-Set
                </span>
              </h2>
              <p className="text-[11px] text-white/60">
                You control the travel rate. Students can bargain, and you approve the final amount.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white flex items-center justify-center transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSave} className="p-6 space-y-5 overflow-y-auto max-h-[80vh]">
          {successMsg && (
            <div className="p-3.5 rounded-[16px] bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-xs font-bold flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Quick Presets */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-white flex items-center justify-between">
              <span>⚡ Quick Rate Presets</span>
              <span className="text-[10px] text-indigo-300">Tap to auto-fill</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {PRICING_PRESETS.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectPreset(p)}
                  className={`p-3 rounded-[16px] text-left transition-all border cursor-pointer space-y-1 ${
                    baseFare === p.baseFare && perKm === p.perKm
                      ? "bg-indigo-600/30 border-indigo-400 text-white shadow-lg ring-1 ring-indigo-400"
                      : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <p className="text-xs font-bold truncate">{p.name}</p>
                  <p className="text-[11px] font-mono text-emerald-400 font-extrabold">
                    ₹{p.baseFare} base + ₹{p.perKm}/km
                  </p>
                  <p className="text-[9px] text-white/50 leading-tight">{p.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Fare Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-white">
                Base Pickup Fare (₹)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs text-white/50 font-bold">₹</span>
                <input
                  type="number"
                  min={5}
                  max={100}
                  value={baseFare}
                  onChange={(e) => setBaseFare(Number(e.target.value))}
                  required
                  className="w-full pl-7 pr-3 py-2.5 rounded-[12px] bg-slate-950/80 border border-white/20 text-xs text-white font-mono font-bold focus:outline-none focus:border-indigo-400"
                />
              </div>
              <p className="text-[10px] text-white/40">Initial pickup fee</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-white">
                Per-Kilometer Rate (₹)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs text-white/50 font-bold">₹</span>
                <input
                  type="number"
                  min={3}
                  max={50}
                  value={perKm}
                  onChange={(e) => setPerKm(Number(e.target.value))}
                  required
                  className="w-full pl-7 pr-3 py-2.5 rounded-[12px] bg-slate-950/80 border border-white/20 text-xs text-white font-mono font-bold focus:outline-none focus:border-indigo-400"
                />
              </div>
              <p className="text-[10px] text-white/40">Travel distance rate</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-white">
                Minimum Fare (₹)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs text-white/50 font-bold">₹</span>
                <input
                  type="number"
                  min={10}
                  max={150}
                  value={minFare}
                  onChange={(e) => setMinFare(Number(e.target.value))}
                  required
                  className="w-full pl-7 pr-3 py-2.5 rounded-[12px] bg-slate-950/80 border border-white/20 text-xs text-white font-mono font-bold focus:outline-none focus:border-indigo-400"
                />
              </div>
              <p className="text-[10px] text-white/40">Minimum trip charge</p>
            </div>
          </div>

          {/* Live Fare Estimation Card */}
          <div className="p-4 rounded-[20px] bg-slate-950/60 border border-white/10 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-white/70 flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5 text-amber-400" />
                Sample 3.5 km Campus Ride Estimate
              </span>
              <span className="font-mono font-bold text-emerald-400 text-sm">₹{sampleTotal}</span>
            </div>

            <div className="flex items-center justify-between text-[11px] text-white/50 pt-1 border-t border-white/10">
              <span>Your Estimated Net Earnings</span>
              <span className="font-mono font-bold text-white">₹{sampleNetEarnings} (90%)</span>
            </div>

            <div className="p-2.5 rounded-[10px] bg-indigo-950/40 border border-indigo-500/20 text-[10px] text-indigo-200 flex items-center gap-2">
              <Info className="w-3.5 h-3.5 text-indigo-300 shrink-0" />
              <span>Students will see this exact rate when booking with you, and can send bargain offers if they wish.</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="py-3 px-5 rounded-[16px] liquid-glass-btn text-white/70 hover:text-white text-xs font-bold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 py-3.5 rounded-[18px] liquid-glass-primary text-white text-xs font-black shadow-xl flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.01] transition-all"
            >
              <Check className="w-4 h-4 text-emerald-300" />
              <span>{isSaving ? "Saving Rates..." : "Save My Travel Rates"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
