import React, { useState } from "react";
import {
  Handshake,
  Check,
  X,
  Sparkles,
  ArrowRight,
  TrendingDown,
  Clock,
  CheckCircle2,
  AlertCircle,
  Coins,
  MessageSquare,
  ShieldCheck,
} from "lucide-react";
import { TripRecord, BargainOffer } from "../types";
import {
  proposeBargainOffer,
  approveBargainOffer,
  rejectBargainOffer,
  counterBargainOffer,
} from "../services/tripService";

interface BargainPanelProps {
  trip: TripRecord;
  userRole: "rider" | "driver";
  onUpdated?: () => void;
}

const QUICK_DISCOUNT_CHIPS = [5, 10, 15, 20];
const QUICK_NOTES = [
  "Student budget",
  "Exact cash ready",
  "Near campus gate",
  "Hostel route",
];

export const BargainPanel: React.FC<BargainPanelProps> = ({
  trip,
  userRole,
  onUpdated,
}) => {
  const currentFare = trip.fare;
  const originalFare = trip.originalFare || trip.fare;
  const bargain = trip.bargainOffer;

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [proposedAmount, setProposedAmount] = useState<number>(
    Math.max(15, currentFare - 10)
  );
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [counterInput, setCounterInput] = useState<number>(
    bargain ? Math.round((bargain.originalAmount + bargain.amount) / 2) : currentFare
  );
  const [isCountering, setIsCountering] = useState(false);

  // RIDER / STUDENT ACTIONS
  const handleSendBargain = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (proposedAmount <= 0 || proposedAmount >= currentFare) {
      alert(`Please enter a bargain amount less than the captain's rate (₹${currentFare}).`);
      return;
    }

    setIsSubmitting(true);
    try {
      await proposeBargainOffer(trip.id, {
        proposedBy: "student",
        amount: Number(proposedAmount),
        originalAmount: originalFare,
        note: note.trim() || undefined,
      });
      setIsFormOpen(false);
      if (onUpdated) onUpdated();
    } catch (err) {
      console.error("Error submitting bargain:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // DRIVER / CAPTAIN ACTIONS: Approve final amount
  const handleApproveBargain = async () => {
    if (!bargain) return;
    setIsSubmitting(true);
    try {
      await approveBargainOffer(trip.id, bargain.amount, bargain.originalAmount);
      if (onUpdated) onUpdated();
    } catch (err) {
      console.error("Error approving bargain:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRejectBargain = async () => {
    setIsSubmitting(true);
    try {
      await rejectBargainOffer(trip.id);
      if (onUpdated) onUpdated();
    } catch (err) {
      console.error("Error rejecting bargain:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendCounter = async () => {
    if (counterInput <= 0) return;
    setIsSubmitting(true);
    try {
      await counterBargainOffer(trip.id, counterInput);
      setIsCountering(false);
      if (onUpdated) onUpdated();
    } catch (err) {
      console.error("Error sending counter offer:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAcceptCounterByStudent = async () => {
    if (!bargain?.counterAmount) return;
    setIsSubmitting(true);
    try {
      await approveBargainOffer(trip.id, bargain.counterAmount, originalFare);
      if (onUpdated) onUpdated();
    } catch (err) {
      console.error("Error accepting counter offer:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- RENDER FOR CAPTAIN / DRIVER ---
  if (userRole === "driver") {
    // 1. Pending student bargain awaiting Captain approval
    if (bargain && bargain.status === "pending") {
      const savings = Math.max(0, bargain.originalAmount - bargain.amount);
      const estimatedNet = Math.round(bargain.amount * 0.9);

      return (
        <div className="p-4 rounded-[22px] bg-gradient-to-br from-amber-950/80 via-slate-900/90 to-amber-950/60 border-2 border-amber-500/50 shadow-2xl space-y-3 animate-in fade-in zoom-in-95">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-[12px] bg-amber-500/20 text-amber-300 flex items-center justify-center">
                <Handshake className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>Student Bargain Offer Received!</span>
                  <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    Awaiting Approval
                  </span>
                </h4>
                <p className="text-[10px] text-amber-200/70">
                  {trip.riderName} is offering a discounted student fare
                </p>
              </div>
            </div>

            <div className="text-right">
              <p className="text-[10px] text-white/50 line-through">₹{bargain.originalAmount}</p>
              <p className="text-lg font-black text-amber-400 font-mono">₹{bargain.amount}</p>
            </div>
          </div>

          {bargain.note && (
            <div className="p-2.5 rounded-[12px] bg-black/40 border border-white/10 text-xs text-white/90 flex items-center gap-2">
              <MessageSquare className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="italic font-medium">"{bargain.note}"</span>
            </div>
          )}

          <div className="flex items-center justify-between text-[11px] text-white/70 px-1 pt-1 border-t border-white/10">
            <span>Student Saves: <strong className="text-emerald-400">₹{savings}</strong></span>
            <span>Your Net Earnings: <strong className="text-white font-mono">₹{estimatedNet}</strong></span>
          </div>

          {/* Captain Action Controls */}
          {!isCountering ? (
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleRejectBargain}
                disabled={isSubmitting}
                className="py-2.5 px-3 rounded-[14px] bg-white/10 hover:bg-white/20 text-white/70 hover:text-white text-xs font-bold transition-all cursor-pointer"
              >
                Decline (Keep ₹{bargain.originalAmount})
              </button>
              <button
                type="button"
                onClick={() => setIsCountering(true)}
                disabled={isSubmitting}
                className="py-2.5 px-3 rounded-[14px] liquid-glass-btn text-indigo-300 hover:text-white text-xs font-bold transition-all cursor-pointer"
              >
                Counter Offer
              </button>
              <button
                type="button"
                onClick={handleApproveBargain}
                disabled={isSubmitting}
                className="flex-1 py-2.5 px-4 rounded-[14px] liquid-glass-emerald text-white text-xs font-black shadow-lg flex items-center justify-center gap-1.5 cursor-pointer hover:scale-[1.02] transition-all"
              >
                <Check className="w-4 h-4 text-emerald-300" />
                <span>Approve ₹{bargain.amount} Final Amount</span>
              </button>
            </div>
          ) : (
            <div className="p-3 rounded-[16px] bg-slate-950/80 border border-white/10 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-white/80 font-bold">Propose Counter Amount (₹)</span>
                <button
                  type="button"
                  onClick={() => setIsCountering(false)}
                  className="text-white/50 hover:text-white text-[11px]"
                >
                  Cancel
                </button>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-2 text-xs font-bold text-white/50">₹</span>
                  <input
                    type="number"
                    value={counterInput}
                    onChange={(e) => setCounterInput(Number(e.target.value))}
                    min={bargain.amount}
                    max={bargain.originalAmount}
                    className="w-full pl-7 pr-3 py-2 rounded-[10px] bg-slate-900 border border-white/20 text-xs text-white font-mono font-bold"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSendCounter}
                  disabled={isSubmitting}
                  className="py-2 px-4 rounded-[10px] liquid-glass-primary text-white text-xs font-bold cursor-pointer"
                >
                  Send Counter
                </button>
              </div>
            </div>
          )}
        </div>
      );
    }

    // 2. Bargain accepted and locked as final amount
    if (bargain && bargain.status === "accepted") {
      return (
        <div className="p-3 rounded-[18px] bg-emerald-950/40 border border-emerald-500/40 flex items-center justify-between text-xs text-emerald-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              Bargain Approved by You: <strong>₹{trip.fare} Final Amount</strong>
            </span>
          </div>
          <span className="text-[10px] font-mono text-white/50 line-through">
            Original: ₹{originalFare}
          </span>
        </div>
      );
    }

    // 3. Normal rate indicator
    return null;
  }

  // --- RENDER FOR STUDENT / PASSENGER ---

  // 1. Bargain accepted by Captain
  if (bargain && bargain.status === "accepted") {
    return (
      <div className="p-3.5 rounded-[20px] bg-gradient-to-r from-emerald-950/80 via-slate-900/90 to-emerald-950/80 border border-emerald-500/40 shadow-lg flex items-center justify-between animate-in fade-in">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-[12px] bg-emerald-500/20 text-emerald-300 flex items-center justify-center">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-extrabold text-white flex items-center gap-1.5">
              <span>Captain Approved Your Bargain!</span>
              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Final Agreed Fare
              </span>
            </p>
            <p className="text-[10px] text-emerald-300/80">
              You saved ₹{Math.max(0, originalFare - trip.fare)} on this ride
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-white/50 line-through">₹{originalFare}</p>
          <p className="text-lg font-black text-emerald-400 font-mono">₹{trip.fare}</p>
        </div>
      </div>
    );
  }

  // 2. Bargain pending Captain approval
  if (bargain && bargain.status === "pending") {
    return (
      <div className="p-3.5 rounded-[20px] bg-amber-950/50 border border-amber-500/40 space-y-2.5 animate-in fade-in">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400 animate-spin" />
            <div>
              <p className="text-xs font-bold text-white">
                Bargain Offer Sent to Captain (₹{bargain.amount})
              </p>
              <p className="text-[10px] text-amber-200/70">
                Waiting for Captain to approve this final amount...
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-white/50 line-through block">₹{bargain.originalAmount}</span>
            <span className="text-sm font-mono font-bold text-amber-400">₹{bargain.amount}</span>
          </div>
        </div>

        {bargain.note && (
          <p className="text-[10px] text-white/60 italic pl-6">
            Note to Captain: "{bargain.note}"
          </p>
        )}
      </div>
    );
  }

  // 3. Captain countered the student's bargain
  if (bargain && bargain.status === "countered") {
    return (
      <div className="p-3.5 rounded-[20px] bg-indigo-950/70 border border-indigo-500/40 space-y-2.5 animate-in fade-in">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Handshake className="w-4 h-4 text-indigo-400" />
            <div>
              <p className="text-xs font-bold text-white">
                Captain Counter-Offered ₹{bargain.counterAmount}!
              </p>
              <p className="text-[10px] text-indigo-200/70">
                Captain proposes middle ground (Original ₹{originalFare}, Your offer ₹{bargain.amount})
              </p>
            </div>
          </div>
          <span className="text-base font-mono font-black text-indigo-300">
            ₹{bargain.counterAmount}
          </span>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={() => setIsFormOpen(true)}
            className="py-2 px-3 rounded-[12px] liquid-glass-btn text-xs text-white/70 hover:text-white"
          >
            Re-Bargain
          </button>
          <button
            type="button"
            onClick={handleAcceptCounterByStudent}
            disabled={isSubmitting}
            className="flex-1 py-2 px-3 rounded-[12px] liquid-glass-primary text-xs font-bold text-white flex items-center justify-center gap-1.5"
          >
            <Check className="w-3.5 h-3.5 text-emerald-300" />
            <span>Accept ₹{bargain.counterAmount} as Final Fare</span>
          </button>
        </div>
      </div>
    );
  }

  // 4. Default: Student can open Bargain Form
  return (
    <div className="space-y-3">
      {!isFormOpen ? (
        <div className="p-3 rounded-[18px] bg-slate-950/60 border border-white/10 flex items-center justify-between hover:border-indigo-400/40 transition-all">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[12px] bg-indigo-500/20 text-indigo-300 flex items-center justify-center">
              <Handshake className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>Bargain Fare with Captain</span>
                <span className="text-[9px] font-semibold text-indigo-300 bg-indigo-500/20 px-1.5 py-0.2 rounded">
                  Student Power
                </span>
              </p>
              <p className="text-[10px] text-white/50">
                Captain set ₹{currentFare} • You can propose a budget offer
              </p>
            </div>
          </div>

          <button
            id="btn-open-student-bargain"
            type="button"
            onClick={() => setIsFormOpen(true)}
            className="px-3 py-1.5 rounded-[12px] liquid-glass-btn text-indigo-300 hover:text-white text-xs font-bold flex items-center gap-1 cursor-pointer transition-all hover:scale-[1.02]"
          >
            <span>Bargain</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        /* BARGAIN SUBMISSION FORM */
        <div className="p-4 rounded-[22px] bg-slate-950/90 border border-indigo-500/40 shadow-xl space-y-3.5 animate-in zoom-in-95">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Handshake className="w-4 h-4 text-indigo-400" />
              <h4 className="text-xs font-bold text-white">Propose Bargain Fare to Captain</h4>
            </div>
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 text-white/70 flex items-center justify-center cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Quick Discount Chips */}
          <div className="space-y-1">
            <span className="text-[10px] text-white/60 block">Quick Discount Shortcuts:</span>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_DISCOUNT_CHIPS.map((discount) => {
                const targetPrice = Math.max(15, currentFare - discount);
                return (
                  <button
                    key={discount}
                    type="button"
                    onClick={() => setProposedAmount(targetPrice)}
                    className={`px-2.5 py-1 rounded-[10px] text-xs font-mono font-bold transition-all border cursor-pointer ${
                      proposedAmount === targetPrice
                        ? "bg-indigo-600 border-indigo-400 text-white shadow"
                        : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    -₹{discount} (₹{targetPrice})
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Proposed Amount Input */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-white flex items-center justify-between">
              <span>Your Offered Price (₹)</span>
              <span className="text-[10px] text-indigo-300 font-mono">Captain's Rate: ₹{currentFare}</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-xs font-bold text-emerald-400 font-mono">₹</span>
              <input
                type="number"
                min={10}
                max={currentFare - 1}
                value={proposedAmount}
                onChange={(e) => setProposedAmount(Number(e.target.value))}
                required
                className="w-full pl-7 pr-3 py-2 rounded-[12px] bg-slate-900 border border-white/20 text-sm text-white font-mono font-bold focus:outline-none focus:border-indigo-400"
              />
            </div>
          </div>

          {/* Quick Reason Note */}
          <div className="space-y-1">
            <label className="text-[10px] text-white/60 block">Optional Message / Note to Captain:</label>
            <div className="flex flex-wrap gap-1 mb-1.5">
              {QUICK_NOTES.map((qn) => (
                <button
                  key={qn}
                  type="button"
                  onClick={() => setNote(qn)}
                  className={`px-2 py-0.5 rounded-full text-[9px] transition-all cursor-pointer ${
                    note === qn
                      ? "bg-indigo-500/40 text-white border border-indigo-400"
                      : "bg-white/5 text-white/60 hover:text-white border border-transparent"
                  }`}
                >
                  {qn}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Student budget, exact change ready"
              className="w-full px-3 py-1.5 rounded-[10px] bg-slate-900 border border-white/10 text-xs text-white placeholder-white/30 focus:outline-none focus:border-indigo-400"
            />
          </div>

          {/* Submit Button */}
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="py-2.5 px-3 rounded-[12px] liquid-glass-btn text-xs text-white/60"
            >
              Cancel
            </button>
            <button
              id="btn-send-bargain-to-captain"
              type="button"
              onClick={handleSendBargain}
              disabled={isSubmitting || proposedAmount <= 0}
              className="flex-1 py-2.5 rounded-[14px] liquid-glass-primary text-white text-xs font-bold shadow-lg flex items-center justify-center gap-1.5 cursor-pointer hover:scale-[1.01] transition-all"
            >
              <Handshake className="w-3.5 h-3.5 text-emerald-300" />
              <span>{isSubmitting ? "Sending..." : `Send Bargain Offer of ₹${proposedAmount}`}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
