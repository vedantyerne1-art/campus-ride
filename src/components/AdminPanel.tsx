import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  AlertOctagon,
  FileText,
  MapPin,
  CheckCircle2,
  XCircle,
  Eye,
  Plus,
  RefreshCw,
  Clock,
  UserCheck,
  TrendingUp,
} from "lucide-react";
import {
  db,
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
} from "../lib/firebase";
import {
  UserProfile,
  SosAlert,
  SafetyReport,
  CampusPickupPoint,
} from "../types";
import { resolveSosAlert } from "../services/safetyService";
import { addCampusPickupPoint } from "../services/campusService";

export const AdminPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"verifications" | "sos" | "reports" | "points">("verifications");

  const [pendingUsers, setPendingUsers] = useState<UserProfile[]>([]);
  const [sosAlerts, setSosAlerts] = useState<SosAlert[]>([]);
  const [reports, setReports] = useState<SafetyReport[]>([]);
  const [selectedUserDoc, setSelectedUserDoc] = useState<UserProfile | null>(null);

  // New pickup point form state
  const [newPointName, setNewPointName] = useState("");
  const [newPointArea, setNewPointArea] = useState("");
  const [newPointZone, setNewPointZone] = useState("Central Campus");
  const [newPointLat, setNewPointLat] = useState("28.5456");
  const [newPointLng, setNewPointLng] = useState("77.1926");
  const [pointSuccess, setPointSuccess] = useState(false);

  // 1. Listen to Pending Verifications from Firestore
  useEffect(() => {
    const usersCol = collection(db, "users");
    const q = query(usersCol, where("verificationStatus", "==", "pending"));
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const list: UserProfile[] = [];
        snapshot.forEach((d) => list.push(d.data() as UserProfile));
        setPendingUsers(list);
      },
      (err) => {
        console.warn("Pending users snapshot warning:", err);
      }
    );
    return () => unsub();
  }, []);

  // 2. Listen to SOS Alerts from Firestore
  useEffect(() => {
    const sosCol = collection(db, "sosAlerts");
    const unsub = onSnapshot(
      sosCol,
      (snapshot) => {
        const list: SosAlert[] = [];
        snapshot.forEach((d) => list.push(d.data() as SosAlert));
        setSosAlerts(list);
      },
      (err) => {
        console.warn("SOS alerts snapshot warning:", err);
      }
    );
    return () => unsub();
  }, []);

  // 3. Listen to Safety Reports from Firestore
  useEffect(() => {
    const reportsCol = collection(db, "reports");
    const unsub = onSnapshot(
      reportsCol,
      (snapshot) => {
        const list: SafetyReport[] = [];
        snapshot.forEach((d) => list.push(d.data() as SafetyReport));
        setReports(list);
      },
      (err) => {
        console.warn("Reports snapshot warning:", err);
      }
    );
    return () => unsub();
  }, []);

  // Approve User Verification
  const handleApprove = async (userId: string) => {
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
      verificationStatus: "approved",
      trustScore: 90,
      updatedAt: new Date().toISOString(),
    });
    setSelectedUserDoc(null);
  };

  // Reject User Verification
  const handleReject = async (userId: string, reason: string = "ID document unclear or unreadable") => {
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
      verificationStatus: "rejected",
      rejectionReason: reason,
      trustScore: 25,
      updatedAt: new Date().toISOString(),
    });
    setSelectedUserDoc(null);
  };

  // Resolve SOS Alert
  const handleResolveSos = async (alertId: string) => {
    await resolveSosAlert(alertId, "Safety squad verified and secured campus location");
  };

  // Add new Campus Pickup Spot
  const handleAddPickupPoint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPointName.trim()) return;

    await addCampusPickupPoint({
      name: newPointName.trim(),
      area: newPointArea.trim() || "Main Campus",
      campusZone: newPointZone,
      lat: Number(newPointLat),
      lng: Number(newPointLng),
      isPopular: true,
    });

    setPointSuccess(true);
    setNewPointName("");
    setNewPointArea("");
    setTimeout(() => setPointSuccess(false), 2500);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 w-full space-y-6">
      {/* Admin Header */}
      <div className="rounded-[28px] liquid-glass-panel p-6 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 specular-shine">
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-white/10 text-purple-200 border border-white/20">
            Campus Safety & Compliance Back-Office
          </span>
          <h1 className="apple-title text-white mt-2.5">Admin Command Center</h1>
          <p className="apple-caption mt-1">
            Real verification audit pipeline, emergency SOS feeds, and campus routing nodes.
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex flex-wrap gap-2 p-1.5 rounded-[20px] liquid-glass-subtle">
          <button
            onClick={() => setActiveTab("verifications")}
            className={`px-4 py-2 rounded-[14px] text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === "verifications"
                ? "bg-purple-600 text-white shadow-lg"
                : "text-white/70 hover:text-white"
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>Verifications ({pendingUsers.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("sos")}
            className={`px-4 py-2 rounded-[14px] text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === "sos"
                ? "bg-red-600 text-white shadow-lg"
                : "text-white/70 hover:text-white"
            }`}
          >
            <AlertOctagon className="w-4 h-4" />
            <span>SOS Distress ({sosAlerts.filter((s) => s.status === "active").length})</span>
          </button>

          <button
            onClick={() => setActiveTab("reports")}
            className={`px-4 py-2 rounded-[14px] text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === "reports"
                ? "bg-amber-600 text-white shadow-lg"
                : "text-white/70 hover:text-white"
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Reports ({reports.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("points")}
            className={`px-4 py-2 rounded-[14px] text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === "points"
                ? "bg-indigo-600 text-white shadow-lg"
                : "text-white/70 hover:text-white"
            }`}
          >
            <MapPin className="w-4 h-4" />
            <span>Campus Nodes</span>
          </button>
        </div>
      </div>

      {/* TAB 1: ID Verifications Review Queue */}
      {activeTab === "verifications" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white/90">
              Pending Document Verifications ({pendingUsers.length})
            </h2>
          </div>

          {pendingUsers.length === 0 ? (
            <div className="p-12 text-center rounded-[28px] liquid-glass-panel space-y-2 text-white/60">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
              <p className="font-bold text-white text-sm">All Verification Submissions Processed</p>
              <p className="apple-caption">No pending student ID or driver records awaiting review.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pendingUsers.map((user) => (
                <div
                  key={user.uid}
                  className="rounded-[24px] liquid-glass-panel p-5 shadow-xl space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={user.selfieDocUrl || user.photoURL || `https://api.dicebear.com/7.x/identicon/svg?seed=${user.uid}`}
                        alt="avatar"
                        className="w-12 h-12 rounded-[16px] object-cover border border-purple-400/40 shadow-md"
                      />
                      <div>
                        <h3 className="font-bold text-sm text-white">{user.displayName}</h3>
                        <p className="text-xs text-purple-300 font-medium">
                          {user.collegeName || "Affiliated Campus"}
                        </p>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/80">
                          {user.tier === "tier1_student_staff" ? "Tier 1: Student" : "Tier 2: Community"}
                        </span>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-[18px] liquid-glass-subtles space-y-1.5 text-xs">
                      <p className="text-white/80">
                        <span className="text-white/60">ID / Roll No:</span>{" "}
                        <span className="font-mono font-bold text-white">{user.studentStaffId || "N/A"}</span>
                      </p>
                      {user.vehicleDetails && (
                        <p className="text-white/80">
                          <span className="text-white/60">Vehicle:</span> {user.vehicleDetails.make} {user.vehicleDetails.model} ({user.vehicleDetails.licensePlate})
                        </p>
                      )}
                    </div>

                    {/* Document Thumbnails Preview */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      {user.idCardDocUrl && (
                        <div
                          onClick={() => setSelectedUserDoc(user)}
                          className="relative aspect-video rounded-[14px] overflow-hidden border border-white/20 group cursor-pointer"
                        >
                          <img
                            src={user.idCardDocUrl}
                            alt="College ID"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-white font-bold">
                            <Eye className="w-3.5 h-3.5 mr-1" /> View ID
                          </div>
                        </div>
                      )}
                      {user.selfieDocUrl && (
                        <div
                          onClick={() => setSelectedUserDoc(user)}
                          className="relative aspect-video rounded-[14px] overflow-hidden border border-white/20 group cursor-pointer"
                        >
                          <img
                            src={user.selfieDocUrl}
                            alt="Live Selfie"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-white font-bold">
                            <Eye className="w-3.5 h-3.5 mr-1" /> View Selfie
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10">
                    <button
                      id={`btn-approve-${user.uid}`}
                      onClick={() => handleApprove(user.uid)}
                      className="py-2.5 rounded-[14px] liquid-glass-emerald text-white font-bold text-xs shadow-lg flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Approve
                    </button>
                    <button
                      id={`btn-reject-${user.uid}`}
                      onClick={() => handleReject(user.uid)}
                      className="py-2.5 rounded-[14px] liquid-glass-sos text-white font-bold text-xs shadow-lg flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <XCircle className="w-4 h-4" />
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Emergency SOS Feeds */}
      {activeTab === "sos" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-red-300">Live Campus SOS Alerts</h2>
          </div>

          {sosAlerts.length === 0 ? (
            <div className="p-12 text-center rounded-[28px] liquid-glass-panel text-white/60">
              <ShieldCheck className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
              <p className="font-bold text-white text-sm">All Campus Zones Clear</p>
              <p className="apple-caption">No active distress signals received.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sosAlerts.map((alert) => {
                const isActive = alert.status === "active";
                return (
                  <div
                    key={alert.id}
                    className={`p-5 rounded-[24px] liquid-glass-panel ${
                      isActive ? "border-red-500/60 bg-red-950/40" : ""
                    } flex flex-col sm:flex-row sm:items-center justify-between gap-4`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            isActive ? "bg-red-600 text-white animate-pulse" : "bg-white/10 text-white/70"
                          }`}
                        >
                          {alert.status}
                        </span>
                        <h3 className="font-bold text-sm text-white">{alert.triggeredBy.name}</h3>
                        <span className="text-xs text-white/60 font-mono">({alert.triggeredBy.role})</span>
                      </div>
                      <p className="text-xs text-white/80 font-mono">
                        GPS: {alert.lat.toFixed(5)}, {alert.lng.toFixed(5)} • {alert.address}
                      </p>
                      <p className="text-[11px] text-white/50">
                        {new Date(alert.timestamp).toLocaleString()}
                      </p>
                    </div>

                    {isActive && (
                      <button
                        onClick={() => handleResolveSos(alert.id)}
                        className="px-4 py-2.5 rounded-[14px] liquid-glass-emerald text-white text-xs font-bold shadow-lg cursor-pointer"
                      >
                        Mark Resolved
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Incident Reports */}
      {activeTab === "reports" && (
        <div className="space-y-3">
          {reports.length === 0 ? (
            <div className="p-12 text-center rounded-[28px] liquid-glass-panel text-white/60">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
              <p className="font-bold text-white text-sm">Zero Unresolved Reports</p>
            </div>
          ) : (
            reports.map((rep) => (
              <div key={rep.id} className="p-5 rounded-[22px] liquid-glass-panel space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-300 uppercase">{rep.category}</span>
                  <span className="text-[10px] text-white/50">{new Date(rep.timestamp).toLocaleString()}</span>
                </div>
                <p className="text-xs text-white/90">{rep.description}</p>
                <p className="text-[11px] text-white/60">Filed by: {rep.reporterName}</p>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 4: Campus Pickup Points Manager */}
      {activeTab === "points" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Add Form */}
          <form onSubmit={handleAddPickupPoint} className="p-6 rounded-[28px] liquid-glass-panel space-y-4 specular-shine">
            <h3 className="apple-headline text-white">Add New Campus Pickup Spot</h3>
            <div>
              <label className="block text-xs text-white/80 mb-1">Spot Name</label>
              <input
                type="text"
                value={newPointName}
                onChange={(e) => setNewPointName(e.target.value)}
                placeholder="e.g. Bio-Tech Building Entrance"
                className="w-full px-3.5 py-2.5 rounded-[14px] liquid-glass-input text-xs text-white"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-white/80 mb-1">Area / Landmark</label>
                <input
                  type="text"
                  value={newPointArea}
                  onChange={(e) => setNewPointArea(e.target.value)}
                  placeholder="e.g. Near Fountain"
                  className="w-full px-3.5 py-2.5 rounded-[14px] liquid-glass-input text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-white/80 mb-1">Campus Zone</label>
                <select
                  value={newPointZone}
                  onChange={(e) => setNewPointZone(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-[14px] liquid-glass-input text-xs text-white bg-slate-900/90"
                >
                  <option value="North Campus">North Campus</option>
                  <option value="South Campus">South Campus</option>
                  <option value="Central Campus">Central Campus</option>
                  <option value="East Campus">East Campus</option>
                  <option value="West Campus">West Campus</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-white/80 mb-1">Latitude</label>
                <input
                  type="text"
                  value={newPointLat}
                  onChange={(e) => setNewPointLat(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-[14px] liquid-glass-input text-xs text-white font-mono"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-white/80 mb-1">Longitude</label>
                <input
                  type="text"
                  value={newPointLng}
                  onChange={(e) => setNewPointLng(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-[14px] liquid-glass-input text-xs text-white font-mono"
                  required
                />
              </div>
            </div>

            {pointSuccess && (
              <p className="text-xs text-emerald-400 font-bold">Campus point created in Firestore!</p>
            )}

            <button
              type="submit"
              className="w-full py-3.5 rounded-[16px] liquid-glass-primary text-white font-bold text-xs shadow-lg flex items-center justify-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Save to Firestore Pickup Nodes
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
