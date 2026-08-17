import React from "react";
import {
  Shield,
  ShieldCheck,
  AlertOctagon,
  Wallet,
  Car,
  User,
  Sparkles,
  GraduationCap,
  Users,
  Settings,
  Compass,
  Menu,
  Bell,
} from "lucide-react";
import { motion } from "motion/react";
import { useAuth } from "../context/AuthContext";
import { UserRole } from "../types";

interface NavbarProps {
  onOpenDrawer: () => void;
  onOpenSos: () => void;
  onOpenWallet?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenDrawer,
  onOpenSos,
  onOpenWallet,
}) => {
  const { currentUser, userProfile, activeRole, setActiveRole } = useAuth();
  const isVerified = userProfile?.verificationStatus === "approved";

  return (
    <header className="sticky top-0 z-40 w-full px-4 py-3 sm:px-6">
      <div className="max-w-7xl mx-auto rounded-[24px] liquid-glass-panel px-3 sm:px-4 py-2.5 flex items-center justify-between shadow-2xl backdrop-blur-2xl">
        {/* Left: Side Drawer Trigger & Brand */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          <button
            id="btn-nav-open-drawer"
            onClick={onOpenDrawer}
            title="Open Menu"
            className="p-2 rounded-[14px] liquid-glass-btn text-white/80 hover:text-white cursor-pointer"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 sm:gap-2.5">
            <div className="w-9 h-9 rounded-[14px] bg-gradient-to-tr from-indigo-500 via-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-600/30 text-white font-black text-sm border border-white/25">
              <Car className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-sm sm:text-base tracking-tight text-white font-sans">
                  CampusSathi
                </span>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-white/10 text-indigo-200 border border-white/20">
                  CAMPUS
                </span>
              </div>
              <p className="text-[10px] text-white/60 hidden md:block font-medium">
                Verified Peer Mobility Network
              </p>
            </div>
          </div>
        </div>

        {/* Center: Role Switcher (Rider vs Captain) */}
        <div className="relative flex items-center p-1 rounded-[16px] liquid-glass-subtle border border-white/15">
          {(["rider", "driver", "admin"] as UserRole[]).map((role) => {
            const isActive = activeRole === role;
            const labels: Record<UserRole, string> = {
              rider: "Rider",
              driver: "Captain",
              admin: "Admin",
            };
            const icons: Record<UserRole, React.ReactNode> = {
              rider: <Compass className="w-3.5 h-3.5" />,
              driver: <Car className="w-3.5 h-3.5" />,
              admin: <Settings className="w-3.5 h-3.5" />,
            };

            return (
              <button
                key={role}
                id={`nav-role-${role}`}
                onClick={() => {
                  setActiveRole(role);
                }}
                className={`relative px-2.5 sm:px-3.5 py-1.5 rounded-[12px] text-xs font-bold transition-colors z-10 flex items-center gap-1.5 cursor-pointer ${
                  isActive ? "text-white" : "text-white/60 hover:text-white"
                }`}
              >
                {icons[role]}
                <span className="hidden xs:inline sm:inline">{labels[role]}</span>
                {isActive && (
                  <motion.div
                    layoutId="activeRoleCapsule"
                    className="absolute inset-0 rounded-[12px] bg-gradient-to-r from-indigo-600 to-violet-600 shadow-md border border-white/30 -z-10"
                    transition={{ type: "spring", stiffness: 380, damping: 28 }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Right: SOS, Wallet, Profile Avatar */}
        <div className="flex items-center gap-2">
          {/* Emergency SOS Button */}
          <button
            id="btn-nav-sos"
            onClick={onOpenSos}
            title="Emergency SOS Broadcast"
            className="px-3 py-1.5 rounded-[14px] liquid-glass-sos text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shadow-lg"
          >
            <AlertOctagon className="w-4 h-4 animate-pulse text-white" />
            <span className="hidden sm:inline">SOS</span>
          </button>

          {/* Wallet Quick Balance */}
          {onOpenWallet && (
            <button
              id="btn-nav-wallet"
              onClick={onOpenWallet}
              className="px-2.5 sm:px-3 py-1.5 rounded-[14px] liquid-glass-btn text-xs font-bold text-emerald-300 flex items-center gap-1 cursor-pointer"
            >
              <Wallet className="w-3.5 h-3.5 text-emerald-400" />
              <span>₹{userProfile?.walletBalance || 0}</span>
            </button>
          )}

          {/* Profile Avatar Trigger for Side Drawer */}
          <button
            id="btn-nav-profile-avatar"
            onClick={onOpenDrawer}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-[14px] overflow-hidden border border-white/30 hover:border-indigo-400 transition-all cursor-pointer shadow-md relative"
          >
            <img
              src={
                userProfile?.photoURL ||
                currentUser?.photoURL ||
                `https://api.dicebear.com/7.x/avataaars/svg?seed=${userProfile?.uid || "user"}`
              }
              alt="avatar"
              className="w-full h-full object-cover"
            />
            {isVerified && (
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 border border-slate-900 rounded-full" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
