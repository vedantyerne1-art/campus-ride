import React, { useState } from "react";
import { AlertOctagon, Phone, ShieldAlert, CheckCircle2, X, Send } from "lucide-react";
import { triggerSosAlert, submitSafetyReport } from "../services/safetyService";
import { UserProfile } from "../types";

interface SafetySosModalProps {
  isOpen: boolean;
  onClose: () => void;
  tripId?: string;
  userProfile: UserProfile | null;
  currentGps: { lat: number; lng: number } | null;
}

export const SafetySosModal: React.FC<SafetySosModalProps> = ({
  isOpen,
  onClose,
  tripId,
  userProfile,
  currentGps,
}) => {
  const [sosTriggered, setSosTriggered] = useState(false);
  const [loading, setLoading] = useState(false);
  const [alertId, setAlertId] = useState<string | null>(null);
  
  // Incident Report form state
  const [showReportForm, setShowReportForm] = useState(false);
  const [category, setCategory] = useState<any>("reckless_driving");
  const [description, setDescription] = useState("");
  const [reportSuccess, setReportSuccess] = useState(false);

  if (!isOpen) return null;

  const handleTriggerSos = async () => {
    if (!userProfile) return;
    setLoading(true);
    try {
      const id = await triggerSosAlert({
        tripId,
        triggeredBy: {
          uid: userProfile.uid,
          name: userProfile.displayName,
          role: userProfile.role,
          phone: userProfile.phoneNumber,
        },
        lat: currentGps?.lat || 28.5456,
        lng: currentGps?.lng || 77.1926,
        address: "Campus Zone - Emergency Broadcast",
      });
      setAlertId(id);
      setSosTriggered(true);
    } catch (err) {
      console.error("SOS trigger error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile || !description.trim()) return;

    setLoading(true);
    try {
      await submitSafetyReport({
        tripId,
        reporterId: userProfile.uid,
        reporterName: userProfile.displayName,
        reportedUserId: "system_review",
        reportedUserName: "Trip Participant",
        category,
        description: description.trim(),
      });
      setReportSuccess(true);
      setTimeout(() => {
        setReportSuccess(false);
        setShowReportForm(false);
        setDescription("");
      }, 2500);
    } catch (err) {
      console.error("Report submit error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-2xl">
      <div className="w-full max-w-lg rounded-[28px] liquid-glass-panel shadow-2xl p-6 relative overflow-hidden specular-shine">
        <button
          id="btn-close-sos"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-[12px] liquid-glass-btn text-white/60 hover:text-white cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {!sosTriggered && !showReportForm && (
          <div className="text-center space-y-5">
            <div className="w-16 h-16 rounded-[20px] bg-red-600/25 border border-red-500/40 text-red-500 flex items-center justify-center mx-auto shadow-lg">
              <AlertOctagon className="w-8 h-8 animate-pulse" />
            </div>

            <div>
              <h2 className="apple-title text-white">Campus Safety & Emergency SOS</h2>
              <p className="apple-caption mt-1.5 max-w-sm mx-auto">
                Pressing Emergency SOS immediately broadcasts your live GPS location to Campus Security and triggers an urgent priority alert.
              </p>
            </div>

            <button
              id="btn-confirm-sos-trigger"
              onClick={handleTriggerSos}
              disabled={loading}
              className="w-full py-4 rounded-[20px] liquid-glass-sos text-white font-extrabold text-sm shadow-xl flex items-center justify-center gap-2 cursor-pointer"
            >
              <AlertOctagon className="w-5 h-5" />
              {loading ? "Broadcasting Emergency Alert..." : "TRIGGER IMMEDIATE SOS"}
            </button>

            {/* Quick Emergency Helplines */}
            <div className="pt-3 border-t border-white/10 space-y-2.5">
              <p className="text-[11px] font-semibold text-white/60 uppercase tracking-wider">
                Direct Emergency Contacts
              </p>
              <div className="grid grid-cols-2 gap-2.5">
                <a
                  href="tel:112"
                  className="p-3 rounded-[16px] liquid-glass-subtle flex items-center justify-center gap-2 text-xs font-semibold text-emerald-300 hover:text-emerald-200"
                >
                  <Phone className="w-3.5 h-3.5" />
                  National Help (112)
                </a>
                <a
                  href="tel:100"
                  className="p-3 rounded-[16px] liquid-glass-subtle flex items-center justify-center gap-2 text-xs font-semibold text-indigo-300 hover:text-indigo-200"
                >
                  <Phone className="w-3.5 h-3.5" />
                  Campus Control
                </a>
              </div>
            </div>

            <button
              id="btn-open-report-form"
              onClick={() => setShowReportForm(true)}
              className="text-xs text-white/60 hover:text-white underline pt-1 cursor-pointer"
            >
              Non-emergency incident? File a Safety Report
            </button>
          </div>
        )}

        {/* SOS Alert Active Confirmation */}
        {sosTriggered && (
          <div className="text-center space-y-5">
            <div className="w-16 h-16 rounded-[20px] bg-red-600/30 border-2 border-red-500 text-red-400 flex items-center justify-center mx-auto animate-bounce shadow-xl">
              <ShieldAlert className="w-8 h-8" />
            </div>

            <div>
              <span className="px-3 py-1 rounded-full bg-red-500/20 text-red-300 border border-red-500/40 text-xs font-bold uppercase tracking-wider">
                Emergency Alert Active
              </span>
              <h3 className="apple-title text-white mt-3">Live Emergency Broadcast Sent</h3>
              <p className="text-xs text-red-300 font-mono mt-1.5">
                Alert ID: {alertId}
              </p>
              <p className="apple-caption mt-2">
                Your live GPS coordinates ({currentGps?.lat.toFixed(4)}, {currentGps?.lng.toFixed(4)}) have been dispatched to campus response units.
              </p>
            </div>

            <div className="p-4 rounded-[20px] bg-red-950/60 border border-red-500/40 text-left text-xs text-red-200 space-y-1">
              <p className="font-bold">Next Steps:</p>
              <p>1. Stay in a well-lit or crowded area if possible.</p>
              <p>2. Keep your phone screen on and charged.</p>
              <p>3. Campus security officers are actively monitoring this distress feed.</p>
            </div>

            <button
              id="btn-dismiss-sos-screen"
              onClick={onClose}
              className="w-full py-3.5 rounded-[16px] liquid-glass-btn text-xs font-semibold text-white cursor-pointer"
            >
              Close & Monitor from App
            </button>
          </div>
        )}

        {/* Safety Incident Report Form */}
        {showReportForm && (
          <form onSubmit={handleReportSubmit} className="space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-bold text-sm text-white">Submit Confidential Safety Report</h3>
              <button
                type="button"
                onClick={() => setShowReportForm(false)}
                className="text-xs text-white/60 hover:text-white cursor-pointer"
              >
                Back
              </button>
            </div>

            {reportSuccess ? (
              <div className="p-6 text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                <p className="font-bold text-sm text-white">Report Submitted to Admin</p>
                <p className="apple-caption">Our safety audit panel will investigate promptly.</p>
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-xs text-white/80 mb-1.5">Incident Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-[14px] liquid-glass-input text-xs text-white bg-slate-900/90"
                  >
                    <option value="reckless_driving">Reckless / Unsafe Driving</option>
                    <option value="inappropriate_behavior">Inappropriate Conduct or Language</option>
                    <option value="wrong_route">Unauthorized Route Deviation</option>
                    <option value="overcharging">Fare or Payment Discrepancy</option>
                    <option value="other">Other Safety Concern</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-white/80 mb-1.5">Description & Details</label>
                  <textarea
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Provide specific details about what occurred..."
                    className="w-full px-3.5 py-2.5 rounded-[14px] liquid-glass-input text-xs text-white placeholder-white/40 focus:outline-none"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || !description.trim()}
                  className="w-full py-3.5 rounded-[16px] liquid-glass-sos disabled:opacity-50 text-white font-bold text-xs shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  {loading ? "Submitting Report..." : "Submit to Safety Committee"}
                </button>
              </>
            )}
          </form>
        )}
      </div>
    </div>
  );
};
