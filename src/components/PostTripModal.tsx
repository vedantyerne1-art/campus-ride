import React, { useState } from "react";
import {
  X,
  Star,
  CheckCircle2,
  MapPin,
  Clock,
  Navigation,
  IndianRupee,
  Sparkles,
  ShieldCheck,
  Send,
} from "lucide-react";
import { TripRecord } from "../types";
import { submitTripRating } from "../services/safetyService";
import { useAuth } from "../context/AuthContext";

interface PostTripModalProps {
  isOpen: boolean;
  trip: TripRecord | null;
  onClose: () => void;
}

const RATING_TAGS = [
  "Safe driving",
  "On time",
  "Clean vehicle",
  "Polite & respectful",
  "Followed campus route",
  "Great conversation",
];

export const PostTripModal: React.FC<PostTripModalProps> = ({ isOpen, trip, onClose }) => {
  const { currentUser, activeRole } = useAuth();
  const [stars, setStars] = useState<number>(5);
  const [selectedTags, setSelectedTags] = useState<string[]>(["Safe driving", "On time"]);
  const [feedback, setFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  if (!isOpen || !trip) return null;

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = async () => {
    if (!currentUser) return;
    setIsSubmitting(true);
    try {
      const targetUserId = activeRole === "rider" ? trip.driverId : trip.riderId;
      if (targetUserId) {
        await submitTripRating({
          tripId: trip.id,
          fromUserId: currentUser.uid,
          toUserId: targetUserId,
          rating: stars,
          tags: selectedTags,
          feedback: feedback.trim(),
        });
      }
      setIsSubmitted(true);
      setTimeout(() => {
        setIsSubmitted(false);
        onClose();
      }, 1200);
    } catch (err) {
      console.error("Error submitting rating:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-md" onClick={onClose} />
      <div className="w-full max-w-md rounded-[32px] liquid-glass-panel shadow-2xl p-6 sm:p-8 relative z-10 overflow-hidden specular-shine animate-in fade-in zoom-in-95 duration-300">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full liquid-glass-btn text-white/70 hover:text-white cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {isSubmitted ? (
          <div className="py-8 text-center space-y-3">
            <div className="w-16 h-16 rounded-[22px] bg-emerald-500/20 text-emerald-300 flex items-center justify-center mx-auto shadow-xl">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="apple-title text-white">Rating Submitted!</h3>
            <p className="apple-caption">Thank you for keeping CampusSathi safe and trusted.</p>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Header */}
            <div className="text-center">
              <div className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold uppercase tracking-wider mb-2">
                <CheckCircle2 className="w-3 h-3" /> Trip Completed
              </div>
              <h3 className="apple-title text-white">How was your trip?</h3>
              <p className="apple-caption mt-0.5">
                Rate your experience with {activeRole === "rider" ? trip.driverName : trip.riderName}
              </p>
            </div>

            {/* Trip Fare & Route Recap Card */}
            <div className="p-4 rounded-[22px] liquid-glass-subtle space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-white/60">Total Fare:</span>
                <span className="text-lg font-bold text-white font-mono">₹{trip.fare}</span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-white/60">
                <span>Distance & Time:</span>
                <span className="font-mono">{trip.distanceKm} km • {trip.durationMins} mins</span>
              </div>
              <div className="pt-2 border-t border-white/10 space-y-1">
                <div className="flex items-center gap-2 text-white/80 truncate">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                  <span className="truncate">{trip.pickup.name}</span>
                </div>
                <div className="flex items-center gap-2 text-white/80 truncate">
                  <div className="w-2 h-2 rounded-full bg-indigo-400 shrink-0" />
                  <span className="truncate">{trip.destination.name}</span>
                </div>
              </div>
            </div>

            {/* 5-Star Interactive Glass Rating */}
            <div className="text-center space-y-2">
              <div className="flex items-center justify-center gap-2">
                {[1, 2, 3, 4, 5].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setStars(num)}
                    className="p-1.5 transition-transform hover:scale-115 active:scale-90 cursor-pointer"
                  >
                    <Star
                      className={`w-7 h-7 sm:w-8 sm:h-8 ${
                        num <= stars
                          ? "text-amber-400 fill-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]"
                          : "text-white/25"
                      }`}
                    />
                  </button>
                ))}
              </div>
              <p className="text-xs font-semibold text-amber-300">
                {stars === 5 ? "Excellent (5/5)" : stars === 4 ? "Great (4/5)" : stars === 3 ? "Good (3/5)" : "Needs Improvement"}
              </p>
            </div>

            {/* Tag Chips */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-medium text-white/70">Compliments & Tags</label>
              <div className="flex flex-wrap gap-1.5">
                {RATING_TAGS.map((tag) => {
                  const active = selectedTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                        active
                          ? "liquid-glass-primary text-white shadow"
                          : "liquid-glass-subtle text-white/60 hover:text-white"
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Optional Comment Input */}
            <div>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Optional feedback or safety comments..."
                rows={2}
                className="w-full p-3 rounded-[16px] liquid-glass-input text-xs text-white placeholder-white/40 focus:outline-none resize-none"
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full py-4 rounded-[20px] liquid-glass-emerald text-white font-bold text-xs shadow-xl flex items-center justify-center gap-2 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>{isSubmitting ? "Submitting..." : "Submit Rating"}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
