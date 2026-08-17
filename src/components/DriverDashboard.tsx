import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Power,
  Navigation,
  CheckCircle2,
  MapPin,
  Clock,
  Car,
  Bike,
  Zap,
  Wallet,
  ArrowUpRight,
  ShieldCheck,
  ShieldAlert,
  Lock,
  AlertTriangle,
  RefreshCw,
  Phone,
  MessageSquare,
  AlertCircle,
  KeyRound,
  X,
  CreditCard,
  Edit3,
  Camera,
  Sparkles,
  Tag,
  Handshake,
  Coins,
  Play,
  Pause,
  FastForward,
  Radio,
  Eye,
  RotateCcw,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import {
  TripRecord,
  DriverOnlineRecord,
  PayoutRequest,
  VehicleDetails,
} from "../types";
import {
  acceptTrip,
  updateTripStatus,
  verifyOtpAndStartRide,
  updateDriverLocationInTrip,
  updateTripLocations,
  calculateBearing,
  getDistanceMeters,
  normalizeRoutePolyline,
} from "../services/tripService";
import { requestDriverPayout } from "../services/paymentService";
import { LiveMap } from "./LiveMap";
import { ChatDrawer } from "./ChatDrawer";
import { PostTripModal } from "./PostTripModal";
import { BikeDetailsModal } from "./BikeDetailsModal";
import { CaptainPricingModal } from "./CaptainPricingModal";
import { BargainPanel } from "./BargainPanel";
import {
  db,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  onSnapshot,
  getDocs,
} from "../lib/firebase";

interface DriverDashboardProps {
  currentGps: { lat: number; lng: number } | null;
  onOpenSos: () => void;
  onThemeChange: (theme: any) => void;
  onOpenVerification?: () => void;
}

export const DriverDashboard: React.FC<DriverDashboardProps> = ({
  currentGps,
  onOpenSos,
  onThemeChange,
  onOpenVerification,
}) => {
  const { currentUser, userProfile, submitVerification } = useAuth();
  const isVerified = userProfile?.verificationStatus === "approved";
  const [isQuickVerifying, setIsQuickVerifying] = useState(false);

  const [isOnline, setIsOnline] = useState(false);
  const [activeTrip, setActiveTrip] = useState<TripRecord | null>(null);
  const [incomingRequests, setIncomingRequests] = useState<TripRecord[]>([]);
  const [otpInput, setOtpInput] = useState("");
  const [otpError, setOtpError] = useState("");
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [completedTripForRating, setCompletedTripForRating] = useState<TripRecord | null>(null);

  // Earnings & Payout states
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState(userProfile?.walletBalance || 0);
  const [payoutUpiId, setPayoutUpiId] = useState("");
  const [isProcessingPayout, setIsProcessingPayout] = useState(false);
  const [payoutSuccessMsg, setPayoutSuccessMsg] = useState("");
  const [isBikeModalOpen, setIsBikeModalOpen] = useState(false);
  const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);

  const [driverGps, setDriverGps] = useState<{
    lat: number;
    lng: number;
    heading: number;
    speed: number;
  } | null>(null);

  const locationIntervalRef = useRef<any>(null);

  // Sync initial GPS when currentGps becomes available
  useEffect(() => {
    if (currentGps && !driverGps) {
      setDriverGps({
        lat: currentGps.lat,
        lng: currentGps.lng,
        heading: 0,
        speed: 0,
      });
    }
  }, [currentGps, driverGps]);

  // Toggle Driver Online status in Firestore `drivers/{driverId}`
  const toggleOnlineStatus = async () => {
    if (!currentUser || !userProfile) return;
    if (!isVerified) {
      if (onOpenVerification) onOpenVerification();
      return;
    }
    const newStatus = !isOnline;
    setIsOnline(newStatus);

    const driverRef = doc(db, "drivers", currentUser.uid);
    if (newStatus) {
      const activeLat = driverGps?.lat || currentGps?.lat || 21.1255;
      const activeLng = driverGps?.lng || currentGps?.lng || 79.0520;
      const record: DriverOnlineRecord = {
        driverId: currentUser.uid,
        driverName: userProfile.displayName || "Captain",
        driverPhoto: userProfile.photoURL,
        phoneNumber: userProfile.phoneNumber,
        tier: userProfile.tier || "tier1_student_staff",
        trustScore: userProfile.trustScore || 80,
        ratingAverage: userProfile.ratingAverage || 5.0,
        vehicle: userProfile.vehicleDetails || {
          type: "bike",
          make: "Hero",
          model: "Splendor",
          licensePlate: "MH 31 CP 2024",
        },
        customPricing: userProfile.customPricing,
        lat: activeLat,
        lng: activeLng,
        heading: driverGps?.heading || 0,
        isAvailable: true,
        lastUpdated: new Date().toISOString(),
      };
      await setDoc(driverRef, record);
    } else {
      await deleteDoc(driverRef).catch(() => {});
    }
  };

  // Live GPS writing to Firestore every 3 seconds while online
  useEffect(() => {
    if (isOnline && currentUser) {
      const latToSend = driverGps?.lat || currentGps?.lat || 21.1255;
      const lngToSend = driverGps?.lng || currentGps?.lng || 79.0520;
      locationIntervalRef.current = setInterval(() => {
        updateDriverLocationInTrip(
          activeTrip?.id || "",
          currentUser.uid,
          latToSend,
          lngToSend,
          driverGps?.heading || 0,
          driverGps?.speed || 0
        );
      }, 3000);
    } else {
      if (locationIntervalRef.current) clearInterval(locationIntervalRef.current);
    }

    return () => {
      if (locationIntervalRef.current) clearInterval(locationIntervalRef.current);
    };
  }, [isOnline, currentUser, currentGps, driverGps, activeTrip]);

  // Listen to incoming ride requests (`status == 'searching'`) in real-time
  useEffect(() => {
    if (!isOnline) {
      setIncomingRequests([]);
      return;
    }

    const tripsCol = collection(db, "trips");
    const q = query(tripsCol, where("status", "==", "searching"));

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const list: TripRecord[] = [];
        snapshot.forEach((d) => {
          list.push({ ...(d.data() as TripRecord), id: d.id });
        });
        setIncomingRequests(list);
      },
      (err) => {
        console.warn("Incoming requests snapshot warning:", err);
      }
    );

    return () => unsub();
  }, [isOnline]);

  // Listen to Driver's active trip in real-time
  useEffect(() => {
    if (!currentUser) return;
    const tripsCol = collection(db, "trips");
    const q = query(
      tripsCol,
      where("driverId", "==", currentUser.uid),
      where("status", "in", ["assigned", "en_route", "arrived", "in_progress"])
    );

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        if (!snapshot.empty) {
          const trip = {
            ...(snapshot.docs[0].data() as TripRecord),
            id: snapshot.docs[0].id,
          };
          setActiveTrip(trip);
          if (trip.status === "in_progress") {
            onThemeChange("in_progress");
          } else {
            onThemeChange("matched");
          }
        } else {
          setActiveTrip(null);
          if (isOnline) onThemeChange("idle");
        }
      },
      (err) => {
        console.warn("Driver active trip snapshot warning:", err);
      }
    );

    return () => unsub();
  }, [currentUser, isOnline]);

  // Accept Ride
  const handleAcceptRide = async (tripId: string) => {
    if (!currentUser || !userProfile) return;
    if (!isVerified) {
      if (onOpenVerification) onOpenVerification();
      return;
    }
    try {
      await acceptTrip(tripId, {
        driverId: currentUser.uid,
        driverName: userProfile.displayName || "Captain",
        driverPhoto: userProfile.photoURL,
        driverPhone: userProfile.phoneNumber,
        driverVehicle: userProfile.vehicleDetails || {
          type: "bike",
          make: "Honda",
          model: "Activa",
          licensePlate: "DL 01 CAMPUS",
        },
        currentLat: currentGps?.lat || 28.5456,
        currentLng: currentGps?.lng || 77.1926,
      });
      onThemeChange("matched");
    } catch (err) {
      console.error("Accept trip error:", err);
    }
  };

  // Transition: Arrived at Pickup
  const handleArrived = async () => {
    if (!activeTrip) return;
    await updateTripStatus(activeTrip.id, "arrived");
  };

  // Verify Rider 4-digit PIN and start trip
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTrip || !otpInput.trim()) return;

    setIsVerifyingOtp(true);
    setOtpError("");
    try {
      const result = await verifyOtpAndStartRide(activeTrip.id, otpInput);
      if (!result.success) {
        setOtpError(result.message);
      } else {
        setOtpInput("");
        onThemeChange("in_progress");
      }
    } catch (err: any) {
      setOtpError(err.message || "Failed verifying OTP");
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  // Complete Trip
  const handleCompleteTrip = async () => {
    if (!activeTrip) return;
    const tripToRate = { ...activeTrip };
    await updateTripStatus(activeTrip.id, "completed");
    setCompletedTripForRating(tripToRate);
    setActiveTrip(null);
    onThemeChange("wallet");
  };

  // Submit Driver Payout
  const handlePayoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !userProfile || payoutAmount <= 0) return;

    setIsProcessingPayout(true);
    try {
      const result = await requestDriverPayout({
        driverId: currentUser.uid,
        driverName: userProfile.displayName,
        amount: payoutAmount,
        upiId: payoutUpiId,
      });
      setPayoutSuccessMsg(result.message);
      setTimeout(() => {
        setPayoutSuccessMsg("");
        setIsPayoutModalOpen(false);
      }, 2000);
    } catch (err: any) {
      console.error("Payout error:", err);
    } finally {
      setIsProcessingPayout(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 w-full space-y-6">
      {/* Driver Controls Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Online Toggle, Active Trip or Requests */}
        <div className="lg:col-span-5 space-y-5">
          {!isVerified && (
            userProfile?.verificationStatus === "rejected" ? (
              <div className="p-4 rounded-[24px] bg-gradient-to-r from-rose-950/90 via-red-950/80 to-rose-950/90 border border-rose-500/60 shadow-2xl backdrop-blur-xl space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-[16px] bg-rose-500/20 text-rose-300 flex items-center justify-center shrink-0 border border-rose-400/40">
                    <AlertTriangle className="w-5 h-5 text-rose-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-400/30">
                        Verification Rejected
                      </span>
                    </div>
                    <h3 className="text-xs font-bold text-white mt-1">Captain Account Locked (Fake / Invalid Document)</h3>
                    <p className="text-[11px] text-rose-200/80 mt-0.5 leading-relaxed">
                      {userProfile?.rejectionReason || "Fake/tampered student card or invalid UIDAI Aadhaar was detected. Re-verify with genuine documents to unlock."}
                    </p>
                  </div>
                </div>

                <button
                  id="btn-reverify-rejected-driver-banner"
                  type="button"
                  onClick={onOpenVerification}
                  className="w-full py-3 rounded-[16px] bg-rose-600/30 hover:bg-rose-600/40 border border-rose-500/50 text-rose-200 text-xs font-bold shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-[1.01]"
                >
                  <RefreshCw className="w-4 h-4 text-rose-300" />
                  <span>Re-Upload Authentic Documents</span>
                </button>
              </div>
            ) : (
              <div className="p-4 rounded-[24px] bg-gradient-to-r from-amber-950/80 via-rose-950/70 to-amber-950/80 border border-amber-500/50 shadow-2xl backdrop-blur-xl space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-[16px] bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0 border border-amber-400/40">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30">
                        Captain Verification Required
                      </span>
                    </div>
                    <h3 className="text-xs font-bold text-white mt-1">Driving License & Vehicle Verification Required</h3>
                    <p className="text-[11px] text-amber-200/80 mt-0.5 leading-relaxed">
                      Peer captains must submit a valid Driving License, Nagpur (MH-31) vehicle registration, 12-digit UIDAI Aadhaar, and student ID before going online or picking up riders.
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <button
                    id="btn-verify-now-driver-banner"
                    type="button"
                    onClick={onOpenVerification}
                    className="w-full py-3 rounded-[16px] liquid-glass-primary text-white text-xs font-bold shadow-lg flex items-center justify-center gap-2 cursor-pointer hover:border-white/40 transition-all"
                  >
                    <ShieldCheck className="w-4 h-4 text-emerald-300" />
                    <span>Complete Captain Verification</span>
                  </button>

                  <button
                    id="btn-quick-verify-driver-banner"
                    type="button"
                    disabled={isQuickVerifying}
                    onClick={async () => {
                      setIsQuickVerifying(true);
                      try {
                        const isComm = userProfile?.tier === "tier2_community";
                        await submitVerification({
                          tier: isComm ? "tier2_community" : "tier1_student_staff",
                          age: 23,
                          gender: "female",
                          collegeName: isComm ? "Nagpur Resident / General Community" : "VNIT Nagpur (Visvesvaraya National Institute of Technology)",
                          department: isComm ? "Corporate / Business" : "Computer Science & Engineering",
                          studyYear: isComm ? "Corporate / Business Professional" : "3rd Year (B.Tech)",
                          studentStaffId: isComm ? "COMM-NGP-4019" : "2024VNIT1042",
                          idCardDocUrl: "https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=600&q=80",
                          govtIdType: "aadhaar",
                          govtIdNumber: "5492 8812 4019",
                          govtIdDocUrl: "https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=600&q=80",
                          drivingLicenseNumber: "MH31 20210049281",
                          drivingLicenseDocUrl: "https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=600&q=80",
                          vehicleDetails: {
                            make: "Hero",
                            model: "Splendor Plus",
                            licensePlate: "MH 31 CP 2024",
                            type: "bike",
                            helmetProvided: true,
                          },
                          safetyGuidelinesAccepted: true,
                          emergencyContact: {
                            name: "Suresh Deshmukh",
                            phone: "+91 98223 99881",
                            relation: "Family",
                          },
                          verificationStatus: "approved",
                        });
                      } catch (err) {
                        console.error("Quick verify error:", err);
                      } finally {
                        setIsQuickVerifying(false);
                      }
                    }}
                    className="w-full py-2.5 rounded-[14px] bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-400/40 text-emerald-300 text-xs font-bold shadow-lg flex items-center justify-center gap-1.5 cursor-pointer transition-all hover:scale-[1.01]"
                  >
                    <Zap className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{isQuickVerifying ? "Verifying..." : "⚡ Quick 1-Click Auto-Verify for Testing"}</span>
                  </button>
                </div>
              </div>
            )
          )}

          {/* Online Toggle & Earnings Card */}
          <div className="rounded-[28px] liquid-glass-panel p-6 shadow-2xl space-y-5 specular-shine">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">
                  Campus Captain Hub
                </span>
                <h1 className="apple-title text-white mt-0.5">
                  {userProfile?.displayName || "Captain Dashboard"}
                </h1>
              </div>

              {/* Online / Offline Apple Switch */}
              {!isVerified ? (
                <button
                  id="btn-driver-online-toggle-locked"
                  type="button"
                  onClick={onOpenVerification}
                  className={`px-3.5 py-2 rounded-[16px] border text-xs font-bold flex items-center gap-1.5 shadow-lg cursor-pointer transition-all hover:scale-[1.02] ${
                    userProfile?.verificationStatus === "rejected"
                      ? "bg-rose-500/20 border-rose-400/50 hover:bg-rose-500/30 text-rose-200"
                      : "bg-amber-500/20 border-amber-400/50 hover:bg-amber-500/30 text-amber-200"
                  }`}
                >
                  {userProfile?.verificationStatus === "rejected" ? (
                    <>
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-300" />
                      <span>Locked (Rejected)</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-3.5 h-3.5 text-amber-300" />
                      <span>Verify to Go Online</span>
                    </>
                  )}
                </button>
              ) : (
                <button
                  id="btn-driver-online-toggle"
                  onClick={toggleOnlineStatus}
                  className={`px-4 py-2.5 rounded-[16px] font-bold text-xs flex items-center gap-2 shadow-xl transition-all cursor-pointer ${
                    isOnline
                      ? "liquid-glass-emerald text-white"
                      : "liquid-glass-btn text-white/60 hover:text-white"
                  }`}
                >
                  <Power className="w-4 h-4" />
                  <span>{isOnline ? "ONLINE" : "GO ONLINE"}</span>
                </button>
              )}
            </div>

            {/* Wallet & Stats Overview */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="p-4 rounded-[20px] liquid-glass-subtle space-y-1">
                <p className="apple-caption font-medium">Wallet Balance</p>
                <div className="flex items-baseline justify-between">
                  <span className="text-xl font-extrabold text-emerald-400 font-mono">
                    ₹{userProfile?.walletBalance || 0}
                  </span>
                  <button
                    onClick={() => {
                      setPayoutAmount(userProfile?.walletBalance || 0);
                      setIsPayoutModalOpen(true);
                    }}
                    className="px-2 py-1 rounded-[10px] liquid-glass-btn text-indigo-300 hover:text-white text-[10px] flex items-center gap-0.5 cursor-pointer"
                  >
                    <span>Withdraw</span>
                    <ArrowUpRight className="w-3 h-3" />
                  </button>
                </div>
              </div>

              <div className="p-4 rounded-[20px] liquid-glass-subtle space-y-1">
                <p className="apple-caption font-medium">Completed Trips</p>
                <div className="flex items-baseline justify-between">
                  <span className="text-xl font-extrabold text-white font-mono">
                    {userProfile?.totalTripsCompleted || 0}
                  </span>
                  <span className="text-[10px] text-amber-300 font-bold">
                    ★ {userProfile?.ratingAverage?.toFixed(1) || "5.0"}
                  </span>
                </div>
              </div>
            </div>

            {/* REGISTERED BIKE / VEHICLE DETAILS CARD */}
            <div className="p-4 rounded-[22px] bg-slate-950/70 border border-white/15 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-[12px] bg-emerald-500/20 text-emerald-300 flex items-center justify-center">
                    <Bike className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span>My Registered Bike</span>
                      <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        Live
                      </span>
                    </h3>
                    <p className="text-[10px] text-white/50">Students verify this bike & number plate before boarding</p>
                  </div>
                </div>
                <button
                  id="btn-edit-bike-details"
                  type="button"
                  onClick={() => setIsBikeModalOpen(true)}
                  className="px-3 py-1.5 rounded-[12px] liquid-glass-btn hover:border-emerald-400 text-emerald-300 hover:text-white text-xs font-bold flex items-center gap-1 cursor-pointer transition-all hover:scale-[1.02]"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit & Upload</span>
                </button>
              </div>

              <div className="p-3 rounded-[18px] bg-white/5 flex items-center gap-3 border border-white/10">
                {/* Bike Photo Thumbnail */}
                <div
                  onClick={() => setIsBikeModalOpen(true)}
                  className="relative w-16 h-16 rounded-[14px] overflow-hidden bg-slate-900 border border-white/20 shrink-0 shadow cursor-pointer group"
                >
                  <img
                    src={
                      userProfile?.vehicleDetails?.photoUrl ||
                      "https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=400&q=80"
                    }
                    alt="Registered Bike"
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[9px] font-bold transition-opacity">
                    <Camera className="w-3.5 h-3.5" />
                  </div>
                </div>

                {/* Bike Specs & HSRP License Plate */}
                <div className="flex-1 space-y-1.5 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <h4 className="text-xs font-extrabold text-white truncate">
                      {userProfile?.vehicleDetails?.make || "Hero"}{" "}
                      {userProfile?.vehicleDetails?.model || "Splendor Plus"}
                    </h4>
                    {userProfile?.vehicleDetails?.color && (
                      <span className="text-[10px] text-indigo-300 shrink-0 font-medium">
                        {userProfile.vehicleDetails.color}
                      </span>
                    )}
                  </div>

                  {/* Authentic Indian Number Plate (HSRP) */}
                  <div className="inline-flex items-center rounded-[6px] bg-slate-100 text-slate-950 font-mono text-[11px] border border-slate-400 shadow-sm overflow-hidden font-black tracking-wider">
                    <div className="bg-blue-700 text-white px-1.5 py-0.5 flex flex-col items-center justify-center text-[7px] font-extrabold leading-none border-r border-blue-900 select-none">
                      <span>🇮🇳</span>
                      <span className="text-[6px]">IND</span>
                    </div>
                    <div className="px-2 py-0.5 bg-white text-slate-950 uppercase font-bold">
                      {userProfile?.vehicleDetails?.licensePlate || "MH 31 CP 2024"}
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/10">
                    <div className="flex items-center gap-1.5 text-[10px] text-emerald-300 font-semibold">
                      <ShieldCheck className="w-3 h-3 text-emerald-400 shrink-0" />
                      <span className="truncate">
                        {userProfile?.vehicleDetails?.helmetProvided !== false
                          ? "Clean Passenger Helmet Provided"
                          : "Helmet Available upon request"}
                      </span>
                    </div>

                    {/* Quick rate info & edit trigger */}
                    <button
                      type="button"
                      onClick={() => setIsPricingModalOpen(true)}
                      className="text-[10px] font-mono font-bold text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-400/30 px-2 py-0.5 rounded-[8px] flex items-center gap-1 shrink-0 cursor-pointer transition-all"
                    >
                      <Tag className="w-2.5 h-2.5" />
                      <span>₹{userProfile?.customPricing?.baseFare || 15}+₹{userProfile?.customPricing?.perKm || 7}/km</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Captain Rate Card Box */}
              <div className="p-3 rounded-[18px] bg-indigo-950/40 border border-indigo-400/20 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-[10px] bg-indigo-500/20 text-indigo-300 flex items-center justify-center">
                    <Coins className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-white flex items-center gap-1.5">
                      <span>Captain Travel Rate Card</span>
                      <span className="text-[8px] uppercase tracking-wider px-1.5 py-0.2 rounded bg-indigo-500/30 text-indigo-200 border border-indigo-400/40 font-extrabold">
                        Rider-Controlled
                      </span>
                    </p>
                    <p className="text-[10px] text-indigo-200/70 font-mono">
                      Base: ₹{userProfile?.customPricing?.baseFare || 15} • Rate: ₹{userProfile?.customPricing?.perKm || 7}/km • Min: ₹{userProfile?.customPricing?.minFare || 20}
                    </p>
                  </div>
                </div>

                <button
                  id="btn-open-captain-rates"
                  type="button"
                  onClick={() => setIsPricingModalOpen(true)}
                  className="px-2.5 py-1 rounded-[10px] liquid-glass-btn text-[11px] font-bold text-indigo-300 hover:text-white flex items-center gap-1 cursor-pointer transition-all"
                >
                  <Edit3 className="w-3 h-3" />
                  <span>Set Rates</span>
                </button>
              </div>
            </div>
          </div>

          {/* ACTIVE TRIP IN CAPTAIN MODE */}
          {activeTrip ? (
            <div className="rounded-[28px] liquid-glass-panel p-6 shadow-2xl space-y-5 border-emerald-500/40 specular-shine">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full bg-white/10 text-emerald-300 border border-white/20">
                    {activeTrip.status === "assigned" && "Heading to Pickup"}
                    {activeTrip.status === "arrived" && "Arrived at Pickup Spot"}
                    {activeTrip.status === "in_progress" && "Trip in Progress"}
                  </span>
                  <h2 className="text-base font-bold text-white mt-2.5">
                    {activeTrip.riderName}
                  </h2>
                </div>

                <div className="text-right">
                  <p className="text-[10px] text-white/60">Net Earnings</p>
                  <p className="text-xl font-black text-emerald-400 font-mono">
                    ₹{activeTrip.fareBreakdown?.driverNet || Math.round(activeTrip.fare * 0.9)}
                  </p>
                </div>
              </div>

              {/* Real-time Bargain Negotiation Card for Captain */}
              <BargainPanel trip={activeTrip} userRole="driver" />

              {/* Route checkpoints */}
              <div className="space-y-2.5 text-xs p-3.5 rounded-[18px] liquid-glass-subtle">
                <div className="flex items-start gap-2.5 text-white/90">
                  <MapPin className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] text-white/60">Pickup Point</p>
                    <p className="font-semibold text-white">{activeTrip.pickup.name}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5 text-white/90 pt-1 border-t border-white/10">
                  <MapPin className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] text-white/60">Drop Destination</p>
                    <p className="font-semibold text-white">{activeTrip.destination.name}</p>
                  </div>
                </div>
              </div>

              {/* OTP PIN Verification Box (Before starting ride) */}
              {activeTrip.status !== "in_progress" && (
                <form onSubmit={handleVerifyOtp} className="p-4 rounded-[20px] liquid-glass-subtle space-y-3">
                  <div className="flex items-center gap-2 text-indigo-300 font-bold text-xs">
                    <KeyRound className="w-4 h-4 text-indigo-400" />
                    <span>Enter Rider 4-Digit Pickup PIN</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      id="input-driver-otp"
                      type="text"
                      maxLength={4}
                      value={otpInput}
                      onChange={(e) => setOtpInput(e.target.value.replace(/[^0-9]/g, ""))}
                      placeholder="e.g. 4821"
                      className="flex-1 px-4 py-2.5 rounded-[14px] liquid-glass-input text-center font-mono font-bold text-lg text-emerald-400 tracking-widest"
                      required
                    />
                    <button
                      id="btn-verify-otp-start"
                      type="submit"
                      disabled={otpInput.length < 4 || isVerifyingOtp}
                      className="px-4 py-2.5 rounded-[14px] liquid-glass-emerald disabled:opacity-40 text-white font-bold text-xs shadow-lg cursor-pointer"
                    >
                      {isVerifyingOtp ? "Verifying..." : "Verify & Start"}
                    </button>
                  </div>
                  {otpError && (
                    <p className="text-[11px] text-red-300 font-medium">{otpError}</p>
                  )}
                </form>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-2.5">
                <button
                  id="btn-driver-chat-rider"
                  onClick={() => setIsChatOpen(true)}
                  className="flex-1 py-3 rounded-[16px] liquid-glass-btn text-xs font-bold text-indigo-200 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Chat Rider</span>
                </button>

                {activeTrip.status === "assigned" && (
                  <button
                    id="btn-driver-mark-arrived"
                    onClick={handleArrived}
                    className="flex-1 py-3 rounded-[16px] liquid-glass-primary text-xs font-bold text-white cursor-pointer"
                  >
                    I Have Arrived
                  </button>
                )}

                {activeTrip.status === "in_progress" && (
                  <button
                    id="btn-driver-complete-trip"
                    onClick={handleCompleteTrip}
                    className="flex-1 py-3 rounded-[16px] liquid-glass-emerald text-xs font-extrabold text-white shadow-xl cursor-pointer"
                  >
                    Complete Trip
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* INCOMING REQUESTS FEED */
            <div className="rounded-[28px] liquid-glass-panel p-6 shadow-2xl space-y-4 specular-shine">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>Available Campus Ride Requests</span>
                  <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/30 text-indigo-300 text-xs font-mono font-bold">
                    {incomingRequests.length}
                  </span>
                </h2>
              </div>

              {!isOnline ? (
                <div className="p-8 text-center space-y-2 text-white/50">
                  <Power className="w-8 h-8 mx-auto text-white/30" />
                  <p className="text-xs">You are currently offline. Tap "Go Online" above to start receiving campus ride requests.</p>
                </div>
              ) : incomingRequests.length === 0 ? (
                <div className="p-8 text-center space-y-2 text-white/50">
                  <Clock className="w-8 h-8 mx-auto text-indigo-400/70 animate-spin" />
                  <p className="text-xs">Listening for nearby student ride requests...</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {incomingRequests.map((req) => (
                    <div
                      key={req.id}
                      className="p-4 rounded-[20px] liquid-glass-subtle space-y-3 hover:border-indigo-400/40 transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={req.riderPhoto || `https://api.dicebear.com/7.x/identicon/svg?seed=${req.riderId}`}
                            alt="rider"
                            className="w-9 h-9 rounded-[12px] border border-white/20 object-cover"
                          />
                          <div>
                            <p className="font-bold text-xs text-white">{req.riderName}</p>
                            <p className="text-[10px] text-indigo-300">
                              {req.riderTier === "tier1_student_staff" ? "Student Peer" : "Community Member"}
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          {req.bargainOffer && req.bargainOffer.status === "pending" ? (
                            <div>
                              <span className="text-[9px] font-bold uppercase px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 block mb-0.5">
                                Bargain: ₹{req.bargainOffer.amount}
                              </span>
                              <p className="font-black text-sm text-amber-400 font-mono">
                                ₹{Math.round(req.bargainOffer.amount * 0.9)} Net
                              </p>
                            </div>
                          ) : (
                            <div>
                              <p className="font-black text-sm text-emerald-400 font-mono">
                                ₹{req.fareBreakdown?.driverNet || Math.round(req.fare * 0.9)}
                              </p>
                              <p className="text-[10px] text-white/60 font-mono">{req.distanceKm} km</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {req.bargainOffer && req.bargainOffer.status === "pending" && (
                        <div className="p-2 rounded-[10px] bg-amber-950/40 border border-amber-500/30 text-[10px] text-amber-200 flex items-center justify-between">
                          <span className="flex items-center gap-1 font-bold">
                            <Handshake className="w-3 h-3 text-amber-400" />
                            Student offered ₹{req.bargainOffer.amount} (Original ₹{req.fare})
                          </span>
                          {req.bargainOffer.note && (
                            <span className="italic truncate max-w-[120px]">"{req.bargainOffer.note}"</span>
                          )}
                        </div>
                      )}

                      <div className="text-xs space-y-1 text-white/80">
                        <p className="truncate">
                          <span className="text-emerald-400 font-bold">From:</span> {req.pickup.name}
                        </p>
                        <p className="truncate">
                          <span className="text-rose-400 font-bold">To:</span> {req.destination.name}
                        </p>
                      </div>

                      {!isVerified ? (
                        <button
                          id={`btn-accept-ride-locked-${req.id}`}
                          type="button"
                          onClick={onOpenVerification}
                          className="w-full py-2.5 rounded-[14px] bg-amber-500/20 border border-amber-400/50 hover:bg-amber-500/30 text-amber-200 text-xs font-bold shadow-lg cursor-pointer flex items-center justify-center gap-1.5 transition-all"
                        >
                          <Lock className="w-3.5 h-3.5" />
                          <span>Verify Captain Credentials to Accept</span>
                        </button>
                      ) : (
                        <button
                          id={`btn-accept-ride-${req.id}`}
                          onClick={() => handleAcceptRide(req.id)}
                          className="w-full py-2.5 rounded-[14px] liquid-glass-emerald text-white text-xs font-bold shadow-lg cursor-pointer"
                        >
                          Accept Ride (₹{req.fareBreakdown?.driverNet || Math.round(req.fare * 0.9)})
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Live Map Navigation */}
        <div className="lg:col-span-7 space-y-4">
          <LiveMap
            currentLocation={currentGps}
            pickupPoint={activeTrip?.pickup || null}
            destinationPoint={activeTrip?.destination || null}
            routePolyline={activeTrip?.routePolyline || []}
            activeDriverLocation={driverGps || currentGps}
            driverInfo={{
              name: userProfile?.displayName || "Captain",
              photo: userProfile?.photoURL,
              vehicle: userProfile?.vehicleDetails || undefined,
            }}
            tripStatus={activeTrip?.status}
            onMoveDriverLocation={(loc) => {
              setDriverGps((prev) => ({
                lat: loc.lat,
                lng: loc.lng,
                heading: loc.heading ?? prev?.heading ?? 0,
                speed: loc.speed ?? prev?.speed ?? 0,
              }));
              if (currentUser && activeTrip) {
                updateDriverLocationInTrip(
                  activeTrip.id,
                  currentUser.uid,
                  loc.lat,
                  loc.lng,
                  loc.heading || 0,
                  loc.speed || 0
                ).catch(() => {});
              }
            }}
            onMovePickup={(loc) => {
              if (activeTrip) {
                updateTripLocations(
                  activeTrip.id,
                  {
                    name: loc.name || "Custom Pickup Point",
                    lat: loc.lat,
                    lng: loc.lng,
                    address: loc.landmark,
                  },
                  activeTrip.destination,
                  activeTrip.vehicleType || "bike"
                ).catch(() => {});
              }
            }}
            onMoveDestination={(loc) => {
              if (activeTrip) {
                updateTripLocations(
                  activeTrip.id,
                  activeTrip.pickup,
                  {
                    name: loc.name || "Custom Drop Destination",
                    lat: loc.lat,
                    lng: loc.lng,
                    address: loc.landmark,
                  },
                  activeTrip.vehicleType || "bike"
                ).catch(() => {});
              }
            }}
          />
        </div>
      </div>

      {/* Driver In-App Chat Drawer */}
      {activeTrip && currentUser && (
        <ChatDrawer
          tripId={activeTrip.id}
          currentUser={{
            uid: currentUser.uid,
            displayName: userProfile?.displayName || "Captain",
            role: "driver",
          }}
          otherPartyName={activeTrip.riderName}
          otherPartyRole="rider"
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
        />
      )}

      {/* Driver Instant Payout Modal */}
      {isPayoutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-2xl">
          <div className="w-full max-w-md rounded-[28px] liquid-glass-panel p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-sm text-white">Instant UPI Payout Transfer</h3>
              </div>
              <button
                id="btn-close-payout"
                onClick={() => setIsPayoutModalOpen(false)}
                className="p-1.5 rounded-[12px] liquid-glass-btn text-white/60 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {payoutSuccessMsg ? (
              <div className="p-6 text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                <p className="font-bold text-sm text-white">Payout Dispatched</p>
                <p className="text-xs text-white/80">{payoutSuccessMsg}</p>
              </div>
            ) : (
              <form onSubmit={handlePayoutSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs text-white/80 mb-1">Payout Amount (₹)</label>
                  <input
                    type="number"
                    min={10}
                    max={userProfile?.walletBalance || 10000}
                    value={payoutAmount}
                    onChange={(e) => setPayoutAmount(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-[14px] liquid-glass-input text-sm font-bold text-white font-mono"
                    required
                  />
                  <p className="text-[10px] text-white/60 mt-1">
                    Available balance: ₹{userProfile?.walletBalance || 0}
                  </p>
                </div>

                <div>
                  <label className="block text-xs text-white/80 mb-1">Your UPI ID (VPA)</label>
                  <input
                    type="text"
                    value={payoutUpiId}
                    onChange={(e) => setPayoutUpiId(e.target.value)}
                    placeholder="e.g. yourname@oksbi or 9876543210@paytm"
                    className="w-full px-3.5 py-2.5 rounded-[14px] liquid-glass-input text-xs text-white placeholder-white/40"
                    required
                  />
                </div>

                <button
                  id="btn-confirm-payout"
                  type="submit"
                  disabled={isProcessingPayout || payoutAmount <= 0}
                  className="w-full py-3.5 rounded-[16px] liquid-glass-emerald disabled:opacity-50 text-white font-extrabold text-xs shadow-xl cursor-pointer"
                >
                  {isProcessingPayout ? "Transferring Funds via RazorpayX..." : `Withdraw ₹${payoutAmount} to UPI`}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Post-Trip Rating Modal */}
      <PostTripModal
        isOpen={!!completedTripForRating}
        trip={completedTripForRating}
        onClose={() => setCompletedTripForRating(null)}
      />

      {/* Bike / Vehicle Upload & Details Modal */}
      <BikeDetailsModal
        isOpen={isBikeModalOpen}
        onClose={() => setIsBikeModalOpen(false)}
        currentVehicle={userProfile?.vehicleDetails}
      />

      {/* Captain Pricing & Rates Modal */}
      <CaptainPricingModal
        isOpen={isPricingModalOpen}
        onClose={() => setIsPricingModalOpen(false)}
        currentPricing={userProfile?.customPricing}
      />
    </div>
  );
};
