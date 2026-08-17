import React, { useState } from "react";
import { X, ShieldAlert, Phone, Plus, CheckCircle2, User, Heart } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

interface EmergencyContactsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EmergencyContactsModal: React.FC<EmergencyContactsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { userProfile, updateUserProfile } = useAuth();
  const [name, setName] = useState(userProfile?.emergencyContact?.name || "Dr. Rajesh Sharma (Guardian)");
  const [phone, setPhone] = useState(userProfile?.emergencyContact?.phone || "+91 98101 23456");
  const [relation, setRelation] = useState(userProfile?.emergencyContact?.relation || "Parent / Guardian");
  const [saved, setSaved] = useState(false);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateUserProfile({
      emergencyContact: { name, phone, relation },
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md" onClick={onClose} />
      <div className="w-full max-w-md rounded-[32px] liquid-glass-panel shadow-2xl p-6 relative z-10 overflow-hidden specular-shine animate-in fade-in zoom-in-95 duration-300">
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-[14px] bg-red-600/30 text-red-300 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="apple-headline text-white">Emergency Contacts</h3>
              <p className="apple-caption">Alerted instantly when SOS is triggered</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full liquid-glass-btn text-white/70 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Campus Security Hotline Banner */}
        <div className="my-4 p-3.5 rounded-[18px] bg-red-950/40 border border-red-500/30 flex items-center justify-between">
          <div className="space-y-0.5">
            <p className="text-[11px] font-bold text-red-300 uppercase tracking-wider">Campus Security Desk</p>
            <p className="text-xs font-mono text-white font-bold">+91 (011) 2659-1000 / Ext 100</p>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 text-[10px] font-bold">
            24x7 Active
          </span>
        </div>

        <form onSubmit={handleSave} className="space-y-3.5">
          <div>
            <label className="block text-xs font-medium text-white/80 mb-1">Contact Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-[14px] liquid-glass-input text-xs text-white"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-white/80 mb-1">Phone Number</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-[14px] liquid-glass-input text-xs text-white font-mono"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-white/80 mb-1">Relationship</label>
            <input
              type="text"
              value={relation}
              onChange={(e) => setRelation(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-[14px] liquid-glass-input text-xs text-white"
              required
            />
          </div>

          {saved && (
            <div className="p-2.5 rounded-[12px] bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-1.5 justify-center">
              <CheckCircle2 className="w-3.5 h-3.5" /> Emergency contact updated!
            </div>
          )}

          <button
            type="submit"
            className="w-full py-3.5 rounded-[18px] liquid-glass-primary text-white font-bold text-xs shadow-xl cursor-pointer"
          >
            Save Emergency Contact
          </button>
        </form>
      </div>
    </div>
  );
};
