import React, { useState } from "react";
import { X, Settings, Bell, Shield, Navigation, Moon, Volume2 } from "lucide-react";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [highAccuracyGps, setHighAccuracyGps] = useState(true);
  const [audioAlerts, setAudioAlerts] = useState(true);
  const [tripShareAuto, setTripShareAuto] = useState(true);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md" onClick={onClose} />
      <div className="w-full max-w-md rounded-[32px] liquid-glass-panel shadow-2xl p-6 relative z-10 overflow-hidden specular-shine animate-in fade-in zoom-in-95 duration-300">
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-[14px] bg-indigo-600/30 text-indigo-300 flex items-center justify-center">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="apple-headline text-white">App Settings</h3>
              <p className="apple-caption">Preferences & Safety Options</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full liquid-glass-btn text-white/70 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="py-4 space-y-3.5">
          <div className="flex items-center justify-between p-3.5 rounded-[18px] liquid-glass-subtle">
            <div className="flex items-center gap-3">
              <Navigation className="w-4 h-4 text-indigo-300" />
              <div>
                <p className="font-bold text-xs text-white">High Precision GPS</p>
                <p className="text-[10px] text-white/60">Sub-meter accuracy for campus gates</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={highAccuracyGps}
              onChange={(e) => setHighAccuracyGps(e.target.checked)}
              className="w-4 h-4 accent-indigo-500 rounded cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-[18px] liquid-glass-subtle">
            <div className="flex items-center gap-3">
              <Volume2 className="w-4 h-4 text-emerald-300" />
              <div>
                <p className="font-bold text-xs text-white">Audio Trip Alerts</p>
                <p className="text-[10px] text-white/60">Sound on driver arrival & PIN prompt</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={audioAlerts}
              onChange={(e) => setAudioAlerts(e.target.checked)}
              className="w-4 h-4 accent-indigo-500 rounded cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-[18px] liquid-glass-subtle">
            <div className="flex items-center gap-3">
              <Shield className="w-4 h-4 text-amber-300" />
              <div>
                <p className="font-bold text-xs text-white">Auto-Share Live Trips</p>
                <p className="text-[10px] text-white/60">Broadcast link to saved emergency contact</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={tripShareAuto}
              onChange={(e) => setTripShareAuto(e.target.checked)}
              className="w-4 h-4 accent-indigo-500 rounded cursor-pointer"
            />
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-3.5 rounded-[18px] liquid-glass-primary text-white font-bold text-xs shadow-xl cursor-pointer"
        >
          Save Preferences
        </button>
      </div>
    </div>
  );
};
