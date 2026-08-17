import React, { useState } from "react";
import { X, Bookmark, MapPin, Plus, Trash2, Home, Briefcase, School } from "lucide-react";

interface SavedPlacesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPlace?: (place: { name: string; lat: number; lng: number }) => void;
}

export const SavedPlacesModal: React.FC<SavedPlacesModalProps> = ({
  isOpen,
  onClose,
  onSelectPlace,
}) => {
  const [places, setPlaces] = useState([
    { id: "1", label: "Hostel (Girnar)", name: "Girnar Hostel Gate", lat: 28.5432, lng: 77.1901, icon: Home },
    { id: "2", label: "Central Library", name: "Central Library Quad", lat: 28.5456, lng: 77.1926, icon: School },
    { id: "3", label: "Computer Science Dept", name: "Bharti Building (CSE)", lat: 28.5471, lng: 77.1945, icon: Briefcase },
    { id: "4", label: "Main Campus Gate", name: "IIT Main Gate #1", lat: 28.5492, lng: 77.1968, icon: MapPin },
  ]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md" onClick={onClose} />
      <div className="w-full max-w-md rounded-[32px] liquid-glass-panel shadow-2xl p-6 relative z-10 overflow-hidden specular-shine animate-in fade-in zoom-in-95 duration-300">
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-[14px] bg-indigo-600/30 text-indigo-300 flex items-center justify-center">
              <Bookmark className="w-5 h-5" />
            </div>
            <div>
              <h3 className="apple-headline text-white">Saved Places</h3>
              <p className="apple-caption">Fast 1-tap destination pickers</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full liquid-glass-btn text-white/70 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="py-4 space-y-2.5">
          {places.map((p) => {
            const Icon = p.icon;
            return (
              <div
                key={p.id}
                onClick={() => {
                  if (onSelectPlace) {
                    onSelectPlace({ name: p.name, lat: p.lat, lng: p.lng });
                    onClose();
                  }
                }}
                className="p-3.5 rounded-[18px] liquid-glass-subtle flex items-center justify-between hover:border-indigo-400/50 hover:bg-indigo-950/30 cursor-pointer transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-[12px] bg-indigo-500/20 text-indigo-300 flex items-center justify-center">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-white">{p.label}</h4>
                    <p className="text-[11px] text-white/60">{p.name}</p>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-indigo-300 px-2 py-1 rounded-full liquid-glass-btn">
                  Select
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
