import React from "react";
import {
  X,
  ShieldCheck,
  Clock,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Award,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { UserProfile } from "../types";

interface VerificationStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: UserProfile | null;
  onResubmit: () => void;
}

export const VerificationStatusModal: React.FC<VerificationStatusModalProps> = ({
  isOpen,
  onClose,
  userProfile,
  onResubmit,
}) => {
  if (!isOpen || !userProfile) return null;

  const status = userProfile.verificationStatus || "unsubmitted";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="w-full max-w-md rounded-[32px] liquid-glass-panel shadow-2xl p-6 sm:p-8 relative z-10 overflow-hidden specular-shine animate-in fade-in zoom-in-95 duration-300">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-full liquid-glass-btn text-white/70 hover:text-white cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* State 1: PENDING (Amber Tinted Glass) */}
        {status === "pending" && (
          <div className="space-y-6 text-center">
            <div className="w-16 h-16 rounded-[24px] bg-amber-500/20 border-2 border-amber-400/50 text-amber-300 flex items-center justify-center mx-auto shadow-xl">
              <Clock className="w-8 h-8 animate-spin" />
            </div>

            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-bold uppercase tracking-wider mb-2">
                Under Review
              </div>
              <h2 className="apple-title text-white">Verification in Progress</h2>
              <p className="apple-caption mt-1.5 max-w-xs mx-auto">
                Our Campus Trust audit team is verifying your student/staff ID. Average turnaround is under 24 hours.
              </p>
            </div>

            <div className="p-4 rounded-[20px] bg-amber-950/30 border border-amber-500/30 text-left text-xs space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-white/60">Selected Tier:</span>
                <span className="text-amber-300 font-semibold uppercase">
                  {userProfile.tier.replace("_", " ")}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/60">Institution:</span>
                <span className="text-white font-semibold">{userProfile.collegeName || "IIT Delhi"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/60">Current Trust Score:</span>
                <span className="text-amber-300 font-mono font-bold">{userProfile.trustScore}% (Provisional)</span>
              </div>
            </div>

            <p className="text-[11px] text-white/50">
              You can still book rides in Rider mode while verification completes.
            </p>
          </div>
        )}

        {/* State 2: APPROVED / VERIFIED (Green Tinted Glass) */}
        {status === "approved" && (
          <div className="space-y-6 text-center">
            <div className="w-16 h-16 rounded-[24px] bg-emerald-500/20 border-2 border-emerald-400/50 text-emerald-300 flex items-center justify-center mx-auto shadow-xl">
              <ShieldCheck className="w-8 h-8" />
            </div>

            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-bold uppercase tracking-wider mb-2">
                Verified Member
              </div>
              <h2 className="apple-title text-white">Trust Verified Account</h2>
              <p className="apple-caption mt-1.5 max-w-xs mx-auto">
                Your credentials are authentic. Driver mode and priority matching are fully unlocked!
              </p>
            </div>

            <div className="p-4 rounded-[20px] bg-emerald-950/30 border border-emerald-500/30 text-left text-xs space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-white/60">Trust Score:</span>
                <span className="text-emerald-300 font-mono font-bold text-sm">
                  {userProfile.trustScore}% (High Trust)
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/60">Campus Tier:</span>
                <span className="text-white font-semibold uppercase">
                  {userProfile.tier.replace("_", " ")}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/60">ID Verified:</span>
                <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Authenticated
                </span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full py-3.5 rounded-[18px] liquid-glass-emerald text-white font-bold text-xs shadow-xl cursor-pointer"
            >
              Done
            </button>
          </div>
        )}

        {/* State 3: REJECTED (Red Tinted Glass with Reason & Resubmit Button) */}
        {status === "rejected" && (
          <div className="space-y-6 text-center">
            <div className="w-16 h-16 rounded-[24px] bg-rose-500/20 border-2 border-rose-400/50 text-rose-300 flex items-center justify-center mx-auto shadow-xl">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/20 border border-rose-400/40 text-rose-300 text-xs font-bold uppercase tracking-wider mb-2">
                Verification Rejected
              </div>
              <h2 className="apple-title text-white">Action Required</h2>
              <p className="apple-caption mt-1.5 max-w-xs mx-auto">
                We were unable to approve your submission due to the reason below.
              </p>
            </div>

            {/* Rejection Note */}
            <div className="p-4 rounded-[20px] bg-rose-950/40 border border-rose-500/40 text-left text-xs space-y-2">
              <span className="text-rose-300 font-bold uppercase tracking-wider text-[10px]">
                Reason for Rejection:
              </span>
              <p className="text-white leading-relaxed">
                {userProfile.rejectionReason ||
                  "ID document was blurry or unreadable. Please capture a clear, glare-free photo of your official college card."}
              </p>
            </div>

            <button
              id="btn-resubmit-documents"
              onClick={() => {
                onClose();
                onResubmit();
              }}
              className="w-full py-4 rounded-[20px] liquid-glass-primary text-white font-bold text-xs shadow-xl flex items-center justify-center gap-2 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Resubmit Verification Documents</span>
            </button>
          </div>
        )}

        {/* State 4: UNSUBMITTED */}
        {status === "unsubmitted" && (
          <div className="space-y-6 text-center">
            <div className="w-16 h-16 rounded-[24px] bg-indigo-500/20 border-2 border-indigo-400/50 text-indigo-300 flex items-center justify-center mx-auto shadow-xl">
              <ShieldCheck className="w-8 h-8" />
            </div>

            <div>
              <h2 className="apple-title text-white">Get Verified</h2>
              <p className="apple-caption mt-1.5 max-w-xs mx-auto">
                Submit your University ID and selfie to unlock driver mode and higher trust scores.
              </p>
            </div>

            <button
              onClick={() => {
                onClose();
                onResubmit();
              }}
              className="w-full py-4 rounded-[20px] liquid-glass-primary text-white font-bold text-xs shadow-xl flex items-center justify-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Start Verification Now</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
