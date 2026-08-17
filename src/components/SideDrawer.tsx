import React, { useState } from "react";
import {
  X,
  User,
  ShieldCheck,
  Clock,
  CreditCard,
  Bookmark,
  ShieldAlert,
  Repeat,
  Settings,
  HelpCircle,
  LogOut,
  ChevronRight,
  Sparkles,
  AlertCircle,
  Car,
  Navigation,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { VerificationStatusModal } from "./VerificationStatusModal";
import { RideHistoryModal } from "./DrawerViews/RideHistoryModal";
import { WalletModal } from "./DrawerViews/WalletModal";
import { SavedPlacesModal } from "./DrawerViews/SavedPlacesModal";
import { EmergencyContactsModal } from "./DrawerViews/EmergencyContactsModal";
import { HelpSupportModal } from "./DrawerViews/HelpSupportModal";
import { SettingsModal } from "./DrawerViews/SettingsModal";

interface SideDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenVerificationFlow: () => void;
}

export const SideDrawer: React.FC<SideDrawerProps> = ({
  isOpen,
  onClose,
  onOpenVerificationFlow,
}) => {
  const { userProfile, activeRole, setActiveRole, signOut } = useAuth();

  // Modals inside drawer
  const [isVerifStatusOpen, setIsVerifStatusOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isWalletOpen, setIsWalletOpen] = useState(false);
  const [isPlacesOpen, setIsPlacesOpen] = useState(false);
  const [isContactsOpen, setIsContactsOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [roleSwitchNotice, setRoleSwitchNotice] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleRoleToggle = () => {
    if (activeRole === "rider") {
      // Switching to driver
      if (userProfile?.verificationStatus === "approved") {
        setActiveRole("driver");
        onClose();
      } else {
        setRoleSwitchNotice("Driver mode requires approved campus verification.");
        setTimeout(() => setRoleSwitchNotice(null), 3500);
        setIsVerifStatusOpen(true);
      }
    } else {
      // Switching to rider
      setActiveRole("rider");
      onClose();
    }
  };

  const status = userProfile?.verificationStatus || "unsubmitted";

  return (
    <>
      <div className="fixed inset-0 z-50 flex">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity duration-300"
          onClick={onClose}
        />

        {/* Drawer Panel */}
        <div className="relative w-80 max-w-[85vw] h-full liquid-glass-panel border-r border-white/20 shadow-2xl p-6 flex flex-col justify-between z-10 overflow-y-auto animate-in slide-in-from-left duration-300">
          {/* Top Section: User Header */}
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-300">
                Campus Account
              </span>
              <button
                onClick={onClose}
                className="p-1.5 rounded-full liquid-glass-btn text-white/70 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Profile Avatar & Trust Badge */}
            <div className="p-4 rounded-[22px] liquid-glass-subtle space-y-3">
              <div className="flex items-center gap-3">
                <img
                  src={
                    userProfile?.photoURL ||
                    `https://api.dicebear.com/7.x/avataaars/svg?seed=${userProfile?.uid || "user"}`
                  }
                  alt="Profile"
                  className="w-13 h-13 rounded-[18px] object-cover border-2 border-indigo-400/50 shadow"
                />
                <div className="space-y-0.5 truncate">
                  <h4 className="font-bold text-sm text-white truncate">
                    {userProfile?.displayName || "Campus Member"}
                  </h4>
                  <p className="text-[11px] text-white/60 truncate">{userProfile?.email}</p>
                </div>
              </div>

              {/* Status Pill & Trust Score */}
              <div className="flex items-center justify-between pt-2 border-t border-white/10">
                <button
                  onClick={() => setIsVerifStatusOpen(true)}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all ${
                    status === "approved"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/30"
                      : status === "pending"
                      ? "bg-amber-500/20 text-amber-300 border border-amber-400/30"
                      : "bg-indigo-500/20 text-indigo-300 border border-indigo-400/30"
                  }`}
                >
                  <ShieldCheck className="w-3 h-3" />
                  <span>{status === "approved" ? "Verified" : status === "pending" ? "Pending" : "Get Verified"}</span>
                </button>

                <span className="text-[11px] font-mono text-white/70">
                  Trust: <span className="text-emerald-400 font-bold">{userProfile?.trustScore || 45}%</span>
                </span>
              </div>
            </div>

            {roleSwitchNotice && (
              <div className="p-3 rounded-[14px] bg-amber-950/70 border border-amber-500/40 text-amber-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{roleSwitchNotice}</span>
              </div>
            )}

            {/* Menu Items */}
            <div className="space-y-1 text-xs">
              <button
                onClick={() => setIsVerifStatusOpen(true)}
                className="w-full p-3 rounded-[16px] flex items-center justify-between text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <ShieldCheck className="w-4 h-4 text-indigo-300" />
                  <span>Verification Status</span>
                </div>
                <ChevronRight className="w-4 h-4 text-white/40" />
              </button>

              <button
                onClick={() => setIsHistoryOpen(true)}
                className="w-full p-3 rounded-[16px] flex items-center justify-between text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-cyan-300" />
                  <span>Ride History</span>
                </div>
                <ChevronRight className="w-4 h-4 text-white/40" />
              </button>

              <button
                onClick={() => setIsWalletOpen(true)}
                className="w-full p-3 rounded-[16px] flex items-center justify-between text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <CreditCard className="w-4 h-4 text-emerald-300" />
                  <span>
                    {activeRole === "driver" ? "Earnings & Payouts" : "Wallet & UPI"} (₹{userProfile?.walletBalance || 0})
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-white/40" />
              </button>

              <button
                onClick={() => setIsPlacesOpen(true)}
                className="w-full p-3 rounded-[16px] flex items-center justify-between text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <Bookmark className="w-4 h-4 text-amber-300" />
                  <span>Saved Places</span>
                </div>
                <ChevronRight className="w-4 h-4 text-white/40" />
              </button>

              <button
                onClick={() => setIsContactsOpen(true)}
                className="w-full p-3 rounded-[16px] flex items-center justify-between text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <ShieldAlert className="w-4 h-4 text-rose-400" />
                  <span>Emergency Contacts</span>
                </div>
                <ChevronRight className="w-4 h-4 text-white/40" />
              </button>

              {/* Mode Switch Button */}
              <button
                onClick={handleRoleToggle}
                className="w-full p-3 rounded-[16px] flex items-center justify-between bg-indigo-950/40 border border-indigo-500/30 text-white hover:bg-indigo-900/40 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <Repeat className="w-4 h-4 text-indigo-400" />
                  <span>
                    Switch to {activeRole === "rider" ? "Driver Mode" : "Rider Mode"}
                  </span>
                </div>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-indigo-500/30 text-indigo-300">
                  {activeRole === "rider" ? "Driver" : "Rider"}
                </span>
              </button>

              <button
                onClick={() => setIsSettingsOpen(true)}
                className="w-full p-3 rounded-[16px] flex items-center justify-between text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <Settings className="w-4 h-4 text-slate-300" />
                  <span>Settings</span>
                </div>
                <ChevronRight className="w-4 h-4 text-white/40" />
              </button>

              <button
                onClick={() => setIsHelpOpen(true)}
                className="w-full p-3 rounded-[16px] flex items-center justify-between text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <HelpCircle className="w-4 h-4 text-slate-300" />
                  <span>Help & Campus Desk</span>
                </div>
                <ChevronRight className="w-4 h-4 text-white/40" />
              </button>
            </div>
          </div>

          {/* Bottom Section: Logout */}
          <div className="pt-4 border-t border-white/10">
            <button
              onClick={() => {
                signOut();
                onClose();
              }}
              className="w-full py-3 rounded-[16px] liquid-glass-btn text-rose-300 hover:text-rose-200 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Log Out</span>
            </button>
          </div>
        </div>
      </div>

      {/* Sub Modals */}
      <VerificationStatusModal
        isOpen={isVerifStatusOpen}
        onClose={() => setIsVerifStatusOpen(false)}
        userProfile={userProfile}
        onResubmit={() => {
          setIsVerifStatusOpen(false);
          onClose();
          onOpenVerificationFlow();
        }}
      />

      <RideHistoryModal isOpen={isHistoryOpen} onClose={() => setIsHistoryOpen(false)} />
      <WalletModal isOpen={isWalletOpen} onClose={() => setIsWalletOpen(false)} />
      <SavedPlacesModal isOpen={isPlacesOpen} onClose={() => setIsPlacesOpen(false)} />
      <EmergencyContactsModal isOpen={isContactsOpen} onClose={() => setIsContactsOpen(false)} />
      <HelpSupportModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </>
  );
};
