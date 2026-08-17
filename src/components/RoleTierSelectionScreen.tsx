import React, { useState } from "react";
import {
  Navigation,
  Car,
  GraduationCap,
  Users,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { UserRole, VerificationTier } from "../types";
import { useAuth } from "../context/AuthContext";

interface RoleTierSelectionScreenProps {
  onComplete: (selectedRole: UserRole, selectedTier: VerificationTier, skipVerification?: boolean) => void;
}

export const RoleTierSelectionScreen: React.FC<RoleTierSelectionScreenProps> = ({
  onComplete,
}) => {
  const { updateUserProfile, setActiveRole, submitVerification, userProfile } = useAuth();
  const [subStep, setSubStep] = useState<"role" | "tier">("role");
  const [chosenRole, setChosenRole] = useState<UserRole>("rider");
  const [chosenTier, setChosenTier] = useState<VerificationTier>("tier1_student_staff");
  const [isSaving, setIsSaving] = useState(false);

  const handleRoleSelect = (role: UserRole) => {
    setChosenRole(role);
    setSubStep("tier");
  };

  const handleTierSubmit = async () => {
    setIsSaving(true);
    try {
      await updateUserProfile({
        role: chosenRole,
        tier: chosenTier,
        hasCompletedRoleSelection: true,
      });
      setActiveRole(chosenRole);
      onComplete(chosenRole, chosenTier, false);
    } catch (err) {
      console.error("Error setting role/tier:", err);
      setActiveRole(chosenRole);
      onComplete(chosenRole, chosenTier, false);
    } finally {
      setIsSaving(false);
    }
  };

  // Instant 1-Click Auto Verification & Enter Dashboard directly
  const handleQuickDemoVerify = async () => {
    setIsSaving(true);
    try {
      await updateUserProfile({
        role: chosenRole,
        tier: chosenTier,
        hasCompletedRoleSelection: true,
      });
      setActiveRole(chosenRole);

      // Auto-submit authentic demo credentials
      if (chosenTier === "tier2_community") {
        await submitVerification({
          tier: "tier2_community",
          age: 24,
          gender: "female",
          collegeName: "Nagpur Resident / General Community",
          department: "IT & Tech Sector Specialist",
          studyYear: "Corporate / Business Professional",
          studentStaffId: "COMM-NGP-4019",
          idCardDocUrl: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600&q=80",
          govtIdType: "aadhaar",
          govtIdNumber: "5492 8812 4019",
          govtIdDocUrl: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600&q=80",
          drivingLicenseNumber: chosenRole === "driver" ? "MH31 20210049281" : undefined,
          drivingLicenseDocUrl: chosenRole === "driver" ? "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600&q=80" : undefined,
          vehicleDetails: chosenRole === "driver" ? {
            make: "Hero",
            model: "Splendor Plus",
            licensePlate: "MH 31 CP 2024",
            type: "bike",
            helmetProvided: true,
          } : undefined,
          safetyGuidelinesAccepted: true,
          emergencyContact: {
            name: "Suresh Deshmukh",
            phone: "+91 98223 99881",
            relation: "Family",
          },
          verificationStatus: "approved",
        });
      } else {
        await submitVerification({
          tier: "tier1_student_staff",
          age: 21,
          gender: "male",
          collegeName: "VNIT Nagpur (Visvesvaraya National Institute of Technology)",
          department: "Computer Science & Engineering",
          studyYear: "3rd Year (B.Tech)",
          studentStaffId: "2024VNIT1042",
          idCardDocUrl: "https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=600&q=80",
          govtIdType: "aadhaar",
          govtIdNumber: "5492 8812 4019",
          govtIdDocUrl: "https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=600&q=80",
          drivingLicenseNumber: chosenRole === "driver" ? "MH31 20210049281" : undefined,
          drivingLicenseDocUrl: chosenRole === "driver" ? "https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=600&q=80" : undefined,
          vehicleDetails: chosenRole === "driver" ? {
            make: "Hero",
            model: "Splendor Plus",
            licensePlate: "MH 31 CP 2024",
            type: "bike",
            helmetProvided: true,
          } : undefined,
          safetyGuidelinesAccepted: true,
          emergencyContact: {
            name: "Dr. Rajesh Sharma",
            phone: "+91 98230 45678",
            relation: "Parent",
          },
          verificationStatus: "approved",
        });
      }

      onComplete(chosenRole, chosenTier, true);
    } catch (err) {
      console.error("Error during quick verify:", err);
      onComplete(chosenRole, chosenTier, true);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSkipDirectlyToDashboard = async () => {
    setIsSaving(true);
    try {
      await updateUserProfile({
        role: chosenRole,
        tier: chosenTier,
        hasCompletedRoleSelection: true,
      });
      setActiveRole(chosenRole);
      onComplete(chosenRole, chosenTier, true);
    } catch (err) {
      console.error("Error setting role/tier:", err);
      setActiveRole(chosenRole);
      onComplete(chosenRole, chosenTier, true);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-[32px] liquid-glass-panel shadow-2xl p-6 sm:p-8 relative overflow-hidden specular-shine animate-in fade-in zoom-in-95 duration-400">
        {/* SUBSTEP 1: How will you use CampusSathi? */}
        {subStep === "role" && (
          <div className="space-y-6 text-center">
            <div className="w-14 h-14 rounded-[20px] bg-indigo-600/30 border border-indigo-400/40 text-indigo-300 flex items-center justify-center mx-auto shadow-lg">
              <Sparkles className="w-7 h-7" />
            </div>

            <div>
              <h2 className="apple-title text-white">How will you use CampusSathi?</h2>
              <p className="apple-caption mt-1.5 max-w-sm mx-auto">
                Choose your primary role. You can easily switch between riding and driving anytime.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
              {/* Option A: Rider */}
              <button
                id="btn-select-rider-role"
                onClick={() => handleRoleSelect("rider")}
                className="p-5 rounded-[24px] liquid-glass-subtle hover:border-indigo-400/70 hover:bg-indigo-950/40 text-left transition-all duration-300 hover:scale-[1.02] active:scale-98 cursor-pointer flex flex-col justify-between h-44 group"
              >
                <div className="w-12 h-12 rounded-[18px] bg-indigo-600/30 border border-indigo-400/40 text-indigo-300 flex items-center justify-center shadow">
                  <Navigation className="w-6 h-6 rotate-45 group-hover:scale-110 transition-transform" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">I need rides</h3>
                  <p className="text-[11px] text-white/60 mt-1 leading-snug">
                    Book peer rides, track GPS in real-time, and split fares effortlessly.
                  </p>
                </div>
              </button>

              {/* Option B: Driver */}
              <button
                id="btn-select-driver-role"
                onClick={() => handleRoleSelect("driver")}
                className="p-5 rounded-[24px] liquid-glass-subtle hover:border-emerald-400/70 hover:bg-emerald-950/40 text-left transition-all duration-300 hover:scale-[1.02] active:scale-98 cursor-pointer flex flex-col justify-between h-44 group"
              >
                <div className="w-12 h-12 rounded-[18px] bg-emerald-600/30 border border-emerald-400/40 text-emerald-300 flex items-center justify-center shadow">
                  <Car className="w-6 h-6 group-hover:scale-110 transition-transform" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">I want to give rides</h3>
                  <p className="text-[11px] text-white/60 mt-1 leading-snug">
                    Offer seats along your daily campus commute and earn verified pocket income.
                  </p>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* SUBSTEP 2: Who are you? (Tier 1 vs Tier 2) */}
        {subStep === "tier" && (
          <div className="space-y-6 text-center animate-in fade-in duration-300">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <button
                type="button"
                onClick={() => setSubStep("role")}
                className="p-2 rounded-[12px] liquid-glass-btn text-white/60 hover:text-white cursor-pointer flex items-center gap-1 text-xs"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <span className="text-xs font-semibold text-indigo-300">Campus Trust Tier</span>
            </div>

            <div>
              <h2 className="apple-title text-white">Who are you on campus?</h2>
              <p className="apple-caption mt-1 max-w-sm mx-auto">
                CampusSathi enforces verified trust tiers for rider and driver safety.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
              {/* Tier 1: Student / Staff */}
              <button
                id="btn-select-tier-1"
                onClick={() => setChosenTier("tier1_student_staff")}
                className={`p-5 rounded-[24px] text-left transition-all duration-300 cursor-pointer flex flex-col justify-between h-48 ${
                  chosenTier === "tier1_student_staff"
                    ? "bg-indigo-600/30 border-2 border-indigo-400 shadow-xl ring-2 ring-indigo-400/40"
                    : "liquid-glass-subtle text-white/70 hover:text-white hover:border-white/30"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="w-11 h-11 rounded-[16px] bg-indigo-500/20 text-indigo-300 flex items-center justify-center">
                    <GraduationCap className="w-6 h-6" />
                  </div>
                  {chosenTier === "tier1_student_staff" && (
                    <CheckCircle2 className="w-5 h-5 text-indigo-400" />
                  )}
                </div>
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-300 px-2 py-0.5 rounded-full bg-indigo-500/20">
                    Tier 1
                  </span>
                  <h3 className="font-bold text-sm text-white mt-1.5">Student / Staff</h3>
                  <p className="text-[11px] text-white/60 mt-1 leading-snug">
                    Requires: University ID card + live face selfie snapshot.
                  </p>
                </div>
              </button>

              {/* Tier 2: Community Member */}
              <button
                id="btn-select-tier-2"
                onClick={() => setChosenTier("tier2_community")}
                className={`p-5 rounded-[24px] text-left transition-all duration-300 cursor-pointer flex flex-col justify-between h-48 ${
                  chosenTier === "tier2_community"
                    ? "bg-cyan-600/30 border-2 border-cyan-400 shadow-xl ring-2 ring-cyan-400/40"
                    : "liquid-glass-subtle text-white/70 hover:text-white hover:border-white/30"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="w-11 h-11 rounded-[16px] bg-cyan-500/20 text-cyan-300 flex items-center justify-center">
                    <Users className="w-6 h-6" />
                  </div>
                  {chosenTier === "tier2_community" && (
                    <CheckCircle2 className="w-5 h-5 text-cyan-400" />
                  )}
                </div>
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-cyan-300 px-2 py-0.5 rounded-full bg-cyan-500/20">
                    Tier 2
                  </span>
                  <h3 className="font-bold text-sm text-white mt-1.5">Community Member</h3>
                  <p className="text-[11px] text-white/60 mt-1 leading-snug">
                    Requires: Government ID (Aadhaar/DL) + vehicle RC document.
                  </p>
                </div>
              </button>
            </div>

            <div className="space-y-2.5 pt-2">
              <button
                id="btn-confirm-tier-continue"
                onClick={handleTierSubmit}
                disabled={isSaving}
                className="w-full py-3.5 rounded-[18px] liquid-glass-primary disabled:opacity-50 text-white font-bold text-xs shadow-xl flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-[1.01]"
              >
                <span>{isSaving ? "Saving Selection..." : "Proceed to Verification Step"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                id="btn-quick-verify-enter"
                type="button"
                onClick={handleQuickDemoVerify}
                disabled={isSaving}
                className="w-full py-3 rounded-[16px] bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-400/40 text-emerald-300 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all hover:scale-[1.01]"
              >
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span>⚡ Instant Auto-Verify & Enter {chosenRole === "driver" ? "Captain" : "Rider"} Dashboard</span>
              </button>

              <div className="text-center pt-1">
                <button
                  id="btn-skip-to-dashboard"
                  type="button"
                  onClick={handleSkipDirectlyToDashboard}
                  disabled={isSaving}
                  className="text-[11px] text-white/50 hover:text-white underline cursor-pointer transition-colors"
                >
                  Skip verification for now & explore dashboard
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
