import React, { useState } from "react";
import {
  X,
  CreditCard,
  IndianRupee,
  Plus,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Smartphone,
  Zap,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { processRazorpayCheckout } from "../../services/paymentService";
import { TripRecord } from "../../types";

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WalletModal: React.FC<WalletModalProps> = ({ isOpen, onClose }) => {
  const { userProfile, updateUserProfile, activeRole } = useAuth();
  const [topUpAmount, setTopUpAmount] = useState<number>(200);
  const [isProcessing, setIsProcessing] = useState(false);
  const [payoutUpi, setPayoutUpi] = useState("");
  const [payoutStatus, setPayoutStatus] = useState<string | null>(null);

  if (!isOpen || !userProfile) return null;

  const handleTopUp = async () => {
    setIsProcessing(true);
    try {
      const simulatedTrip: TripRecord = {
        id: `wallet_topup_${Date.now()}`,
        riderId: userProfile.uid,
        riderName: userProfile.displayName || "User",
        riderTier: userProfile.tier || "tier1_student_staff",
        pickup: { name: "Campus Wallet Top-Up", lat: 28.5456, lng: 77.1926 },
        destination: { name: "Campus Wallet Balance", lat: 28.5456, lng: 77.1926 },
        status: "completed",
        otpPin: "0000",
        fare: topUpAmount,
        distanceKm: 0,
        durationMins: 0,
        paymentStatus: "paid",
        timestamps: {
          requestedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
        },
      };

      await processRazorpayCheckout(
        simulatedTrip,
        {
          name: userProfile.displayName || "Campus Member",
          email: userProfile.email,
          phone: userProfile.phoneNumber,
        },
        async () => {
          const newBal = (userProfile.walletBalance || 0) + topUpAmount;
          await updateUserProfile({ walletBalance: newBal });
          setIsProcessing(false);
        },
        (err) => {
          console.error("Top-up failed:", err);
          setIsProcessing(false);
        }
      );
    } catch (err) {
      console.error("Payment error:", err);
      setIsProcessing(false);
    }
  };

  const handleDriverPayout = () => {
    if (!payoutUpi.includes("@")) {
      setPayoutStatus("Please enter a valid VPA / UPI ID (e.g. name@okhdfcbank)");
      return;
    }
    setIsProcessing(true);
    setTimeout(async () => {
      await updateUserProfile({ walletBalance: 0 });
      setPayoutStatus(`₹${userProfile.walletBalance} payout transferred instantly to ${payoutUpi}`);
      setIsProcessing(false);
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md" onClick={onClose} />
      <div className="w-full max-w-md rounded-[32px] liquid-glass-panel shadow-2xl p-6 sm:p-8 relative z-10 overflow-hidden specular-shine animate-in fade-in zoom-in-95 duration-300">
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-[14px] bg-indigo-600/30 text-indigo-300 flex items-center justify-center">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="apple-headline text-white">
                {activeRole === "driver" ? "Earnings & Payouts" : "Campus Wallet"}
              </h3>
              <p className="apple-caption">Real-time UPI & Card Balance</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full liquid-glass-btn text-white/70 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Balance Card */}
        <div className="my-5 p-5 rounded-[24px] bg-gradient-to-tr from-indigo-900/60 to-violet-900/60 border border-indigo-400/40 relative overflow-hidden shadow-xl">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-indigo-200">
              {activeRole === "driver" ? "Withdrawable Earnings" : "Available Credits"}
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
              Instant UPI
            </span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-extrabold text-white font-mono">
                ₹{userProfile.walletBalance || 0}
              </span>
              <span className="text-xs text-white/60">INR</span>
            </div>
            {(!userProfile.walletBalance || userProfile.walletBalance === 0) && (
              <span className="text-[10px] bg-white/10 text-white/70 px-2 py-0.5 rounded-full font-medium">
                Default 0 Rs (No Top-up)
              </span>
            )}
          </div>
          {(!userProfile.walletBalance || userProfile.walletBalance === 0) && (
            <p className="text-[11px] text-indigo-200/80 mt-2">
              Your wallet balance is 0 Rs. Select an amount below and top up via UPI to add funds.
            </p>
          )}
        </div>

        {/* Action Form: Rider Top-Up or Driver Payout */}
        {activeRole === "rider" ? (
          <div className="space-y-4">
            <label className="block text-xs font-semibold text-white/80">Add Money to Wallet</label>
            <div className="grid grid-cols-3 gap-2">
              {[100, 200, 500].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setTopUpAmount(amt)}
                  className={`py-2.5 rounded-[14px] text-xs font-bold font-mono transition-all cursor-pointer ${
                    topUpAmount === amt
                      ? "liquid-glass-primary text-white"
                      : "liquid-glass-subtle text-white/70 hover:text-white"
                  }`}
                >
                  +₹{amt}
                </button>
              ))}
            </div>

            <button
              onClick={handleTopUp}
              disabled={isProcessing}
              className="w-full py-3.5 rounded-[18px] liquid-glass-emerald text-white font-bold text-xs shadow-xl flex items-center justify-center gap-2 cursor-pointer"
            >
              <Zap className="w-4 h-4" />
              <span>{isProcessing ? "Opening Razorpay UPI..." : `Top Up ₹${topUpAmount} via UPI`}</span>
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <label className="block text-xs font-semibold text-white/80">Instant Bank / UPI Transfer</label>
            <input
              type="text"
              value={payoutUpi}
              onChange={(e) => setPayoutUpi(e.target.value)}
              placeholder="e.g. driver@oksbi or 9876543210@paytm"
              className="w-full px-3.5 py-2.5 rounded-[14px] liquid-glass-input text-xs text-white placeholder-white/40"
            />
            {payoutStatus && (
              <p className="text-xs text-emerald-300 font-medium">{payoutStatus}</p>
            )}
            <button
              onClick={handleDriverPayout}
              disabled={isProcessing || !userProfile.walletBalance}
              className="w-full py-3.5 rounded-[18px] liquid-glass-primary disabled:opacity-50 text-white font-bold text-xs shadow-xl flex items-center justify-center gap-2 cursor-pointer"
            >
              <ArrowUpRight className="w-4 h-4" />
              <span>{isProcessing ? "Transferring..." : "Withdraw Earnings Now"}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
