import React, { useEffect, useState } from "react";
import { X, Clock, MapPin, CheckCircle2, IndianRupee, ShieldCheck, ChevronRight, Navigation } from "lucide-react";
import { TripRecord } from "../../types";
import { useAuth } from "../../context/AuthContext";
import { db, collection, query, where, getDocs } from "../../lib/firebase";

interface RideHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RideHistoryModal: React.FC<RideHistoryModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, activeRole } = useAuth();
  const [trips, setTrips] = useState<TripRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen || !currentUser) return;
    const fetchHistory = async () => {
      setLoading(true);
      try {
        const tripsCol = collection(db, "trips");
        const filterField = activeRole === "driver" ? "driverId" : "riderId";
        const q = query(tripsCol, where(filterField, "==", currentUser.uid));
        const snap = await getDocs(q);
        const list: TripRecord[] = [];
        snap.forEach((d) => list.push({ ...d.data(), id: d.id } as TripRecord));
        // Sort newest first
        list.sort((a, b) => new Date(b.timestamps.requestedAt).getTime() - new Date(a.timestamps.requestedAt).getTime());
        setTrips(list);
      } catch (err) {
        console.error("Error fetching history:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [isOpen, currentUser, activeRole]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md" onClick={onClose} />
      <div className="w-full max-w-lg rounded-[32px] liquid-glass-panel shadow-2xl p-6 relative z-10 overflow-hidden specular-shine animate-in fade-in zoom-in-95 duration-300 max-h-[88vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-[14px] bg-indigo-600/30 text-indigo-300 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="apple-headline text-white">Ride History</h3>
              <p className="apple-caption">Your past campus trips and receipts</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full liquid-glass-btn text-white/70 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Trips List */}
        <div className="flex-1 overflow-y-auto py-4 space-y-3">
          {loading ? (
            <div className="py-12 text-center text-xs text-white/50 space-y-2">
              <div className="w-5 h-5 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin mx-auto" />
              <p>Loading ride records...</p>
            </div>
          ) : trips.length === 0 ? (
            <div className="py-12 text-center text-xs text-white/50 space-y-2">
              <Navigation className="w-10 h-10 text-white/20 mx-auto" />
              <p className="font-semibold text-white/80">No ride history yet</p>
              <p>Your completed campus trips will appear here with fare receipts.</p>
            </div>
          ) : (
            trips.map((trip) => (
              <div
                key={trip.id}
                className="p-4 rounded-[20px] liquid-glass-subtle space-y-3 hover:border-indigo-400/40 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono text-white/60">
                    {new Date(trip.timestamps.requestedAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        trip.status === "completed"
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/30"
                          : trip.status === "cancelled"
                          ? "bg-rose-500/20 text-rose-300 border border-rose-400/30"
                          : "bg-indigo-500/20 text-indigo-300"
                      }`}
                    >
                      {trip.status}
                    </span>
                    <span className="text-sm font-bold text-white font-mono flex items-center">
                      ₹{trip.fare}
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center gap-2 text-white/90">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                    <span className="truncate">{trip.pickup.name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-white/90">
                    <div className="w-2 h-2 rounded-full bg-indigo-400 shrink-0" />
                    <span className="truncate">{trip.destination.name}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-white/50">
                  <span>
                    {activeRole === "driver" ? `Rider: ${trip.riderName}` : `Driver: ${trip.driverName || "Matched Driver"}`}
                  </span>
                  <span>{trip.distanceKm} km • {trip.durationMins} mins</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
