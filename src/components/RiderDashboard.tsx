import React, { useState, useEffect } from "react";
import {
  MapPin,
  Navigation,
  Search,
  Car,
  Bike,
  Zap,
  Shield,
  ShieldCheck,
  Clock,
  CreditCard,
  MessageSquare,
  Share2,
  AlertOctagon,
  Star,
  CheckCircle2,
  X,
  Copy,
  Check,
  ChevronRight,
  Info,
  Sparkles,
  ShieldAlert,
  Lock,
  AlertTriangle,
  RefreshCw,
  Handshake,
  Coins,
  Tag,
  Radio,
  Loader2,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import {
  CampusPickupPoint,
  DriverOnlineRecord,
  TripRecord,
  VehicleType,
} from "../types";
import {
  VEHICLE_RATES,
  calculateFare,
  createTripRequest,
  getDirections,
  updateTripStatus,
  checkRouteDeviation,
  normalizeRoutePolyline,
  updateTripLocations,
  updateDriverLocationInTrip,
  searchGeocodedLocations,
  reverseGeocodeCoords,
  getDistanceMeters,
} from "../services/tripService";
import { processRazorpayCheckout } from "../services/paymentService";
import { submitTripRating } from "../services/safetyService";
import { LiveMap } from "./LiveMap";
import { ChatDrawer } from "./ChatDrawer";
import { BargainPanel } from "./BargainPanel";
import {
  db,
  collection,
  doc,
  onSnapshot,
  query,
  where,
  updateDoc,
} from "../lib/firebase";

interface RiderDashboardProps {
  campusPoints: CampusPickupPoint[];
  onlineDrivers: DriverOnlineRecord[];
  currentGps: { lat: number; lng: number } | null;
  onOpenSos: () => void;
  onThemeChange: (theme: any) => void;
  onOpenVerification?: () => void;
}

const RECENT_LOCATIONS_KEY = "campussathi_recent_locations_nagpur";

// Default starter history for Nagpur if no rides taken yet
const DEFAULT_NAGPUR_HISTORY = [
  { name: "VNIT Main Gate (South Ambazari)", lat: 21.1255, lng: 79.0520 },
  { name: "Sitabuldi Metro Interchange Hub", lat: 21.1458, lng: 79.0882 },
  { name: "RCOEM Ramdeobaba Gate 1 (Katol Rd)", lat: 21.1764, lng: 79.0611 },
  { name: "Dharampeth & Coffee House", lat: 21.1402, lng: 79.0650 },
];

export const RiderDashboard: React.FC<RiderDashboardProps> = ({
  campusPoints,
  onlineDrivers,
  currentGps,
  onOpenSos,
  onThemeChange,
  onOpenVerification,
}) => {
  const { currentUser, userProfile, submitVerification } = useAuth();
  const [isQuickVerifying, setIsQuickVerifying] = useState(false);
  const [selectedBikePhotoModal, setSelectedBikePhotoModal] = useState<string | null>(null);

  // Check if verified in user profile or saved on this device previously
  const isDeviceVerified = Boolean(
    currentUser && (
      localStorage.getItem(`campussathi_verified_${currentUser.uid}`) === "true" ||
      localStorage.getItem("campussathi_verified_device") === "true"
    )
  );
  const isVerified = userProfile?.verificationStatus === "approved" || isDeviceVerified;

  // Selected Route Points (free-form inputs)
  const [pickup, setPickup] = useState<{ lat: number; lng: number; name: string } | null>(null);
  const [destination, setDestination] = useState<{ lat: number; lng: number; name: string } | null>(null);

  const [pickupQuery, setPickupQuery] = useState("");
  const [destQuery, setDestQuery] = useState("");
  const [isPickupFocused, setIsPickupFocused] = useState(false);
  const [isDestFocused, setIsDestFocused] = useState(false);

  // Live OpenStreetMap Geocoding Search Suggestions
  const [pickupSuggestions, setPickupSuggestions] = useState<
    Array<{ id: string; name: string; displayName: string; lat: number; lng: number; suburb?: string }>
  >([]);
  const [destSuggestions, setDestSuggestions] = useState<
    Array<{ id: string; name: string; displayName: string; lat: number; lng: number; suburb?: string }>
  >([]);
  const [isSearchingPickup, setIsSearchingPickup] = useState(false);
  const [isSearchingDest, setIsSearchingDest] = useState(false);

  // Recent Previous Locations from Ride History
  const [recentLocations, setRecentLocations] = useState<Array<{ name: string; lat: number; lng: number }>>(() => {
    try {
      const saved = localStorage.getItem(RECENT_LOCATIONS_KEY);
      return saved ? JSON.parse(saved) : DEFAULT_NAGPUR_HISTORY;
    } catch {
      return DEFAULT_NAGPUR_HISTORY;
    }
  });

  const [selectedVehicle, setSelectedVehicle] = useState<VehicleType>("bike");

  // Debounced search for Pickup Location using real OpenStreetMap geocoding
  useEffect(() => {
    if (!pickupQuery || pickupQuery.trim().length < 2) {
      setPickupSuggestions([]);
      setIsSearchingPickup(false);
      return;
    }

    if (pickup && pickup.name.toLowerCase() === pickupQuery.toLowerCase()) {
      return;
    }

    setIsSearchingPickup(true);
    const timer = setTimeout(async () => {
      try {
        const results = await searchGeocodedLocations(pickupQuery);
        setPickupSuggestions(results);
      } catch (e) {
        console.warn("Pickup geocoding search failed:", e);
      } finally {
        setIsSearchingPickup(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [pickupQuery, pickup]);

  // Debounced search for Destination Location using real OpenStreetMap geocoding
  useEffect(() => {
    if (!destQuery || destQuery.trim().length < 2) {
      setDestSuggestions([]);
      setIsSearchingDest(false);
      return;
    }

    if (destination && destination.name.toLowerCase() === destQuery.toLowerCase()) {
      return;
    }

    setIsSearchingDest(true);
    const timer = setTimeout(async () => {
      try {
        const results = await searchGeocodedLocations(destQuery);
        setDestSuggestions(results);
      } catch (e) {
        console.warn("Destination geocoding search failed:", e);
      } finally {
        setIsSearchingDest(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [destQuery, destination]);

  // Save location to persistent history
  const persistLocationToHistory = (loc: { name: string; lat: number; lng: number }) => {
    if (!loc.name) return;
    setRecentLocations((prev) => {
      const filtered = prev.filter((p) => p.name.toLowerCase() !== loc.name.toLowerCase());
      const updated = [loc, ...filtered].slice(0, 8);
      try {
        localStorage.setItem(RECENT_LOCATIONS_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  // Helper to resolve or create coordinates in Nagpur if geocoder is offline
  const resolveNagpurLocation = (name: string): { name: string; lat: number; lng: number } => {
    const trimmed = name.trim();
    // 1. Check in campusPoints
    const matchedCampus = campusPoints.find(
      (p) => p.name.toLowerCase().includes(trimmed.toLowerCase()) || trimmed.toLowerCase().includes(p.name.toLowerCase())
    );
    if (matchedCampus) {
      return { name: matchedCampus.name, lat: matchedCampus.lat, lng: matchedCampus.lng };
    }
    // 2. Check in recent locations
    const matchedRecent = recentLocations.find(
      (r) => r.name.toLowerCase().includes(trimmed.toLowerCase()) || trimmed.toLowerCase().includes(r.name.toLowerCase())
    );
    if (matchedRecent) {
      return { name: matchedRecent.name, lat: matchedRecent.lat, lng: matchedRecent.lng };
    }
    // 3. Fallback coordinate
    return {
      name: trimmed,
      lat: 21.1458,
      lng: 79.0882,
    };
  };

  // Handle setting pickup
  const handleSelectPickup = (loc: { name: string; lat: number; lng: number }) => {
    setPickup(loc);
    setPickupQuery(loc.name);
    setIsPickupFocused(false);
    persistLocationToHistory(loc);
  };

  // Resolve typed pickup query to real geocoded coordinates
  const handleResolveAndSelectPickup = async (queryText: string) => {
    if (!queryText.trim()) return;
    const trimmed = queryText.trim();

    // 1. Check campus points
    const matchedCampus = campusPoints.find(
      (p) => p.name.toLowerCase().includes(trimmed.toLowerCase()) || trimmed.toLowerCase().includes(p.name.toLowerCase())
    );
    if (matchedCampus) {
      handleSelectPickup({ name: matchedCampus.name, lat: matchedCampus.lat, lng: matchedCampus.lng });
      return;
    }

    // 2. Check if suggestions exist
    if (pickupSuggestions.length > 0) {
      const top = pickupSuggestions[0];
      handleSelectPickup({ name: top.name, lat: top.lat, lng: top.lng });
      return;
    }

    // 3. Perform immediate geocode
    setIsSearchingPickup(true);
    try {
      const results = await searchGeocodedLocations(trimmed);
      if (results.length > 0) {
        const top = results[0];
        handleSelectPickup({ name: top.name, lat: top.lat, lng: top.lng });
        return;
      }
    } catch (err) {
      console.warn("Geocode resolution error:", err);
    } finally {
      setIsSearchingPickup(false);
    }

    // Fallback
    const fallback = resolveNagpurLocation(trimmed);
    handleSelectPickup(fallback);
  };

  // Handle setting destination
  const handleSelectDestination = (loc: { name: string; lat: number; lng: number }) => {
    setDestination(loc);
    setDestQuery(loc.name);
    setIsDestFocused(false);
    persistLocationToHistory(loc);
  };

  // Resolve typed destination query to real geocoded coordinates
  const handleResolveAndSelectDestination = async (queryText: string) => {
    if (!queryText.trim()) return;
    const trimmed = queryText.trim();

    // 1. Check campus points
    const matchedCampus = campusPoints.find(
      (p) => p.name.toLowerCase().includes(trimmed.toLowerCase()) || trimmed.toLowerCase().includes(p.name.toLowerCase())
    );
    if (matchedCampus) {
      handleSelectDestination({ name: matchedCampus.name, lat: matchedCampus.lat, lng: matchedCampus.lng });
      return;
    }

    // 2. Check if suggestions exist
    if (destSuggestions.length > 0) {
      const top = destSuggestions[0];
      handleSelectDestination({ name: top.name, lat: top.lat, lng: top.lng });
      return;
    }

    // 3. Perform immediate geocode
    setIsSearchingDest(true);
    try {
      const results = await searchGeocodedLocations(trimmed);
      if (results.length > 0) {
        const top = results[0];
        handleSelectDestination({ name: top.name, lat: top.lat, lng: top.lng });
        return;
      }
    } catch (err) {
      console.warn("Geocode resolution error:", err);
    } finally {
      setIsSearchingDest(false);
    }

    // Fallback
    const fallback = resolveNagpurLocation(trimmed);
    handleSelectDestination(fallback);
  };

  // Use Live GPS for Pickup
  const handleUseCurrentGps = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          let resolvedName = "Current GPS Location";
          try {
            const rev = await reverseGeocodeCoords(pos.coords.latitude, pos.coords.longitude);
            if (rev && rev.name) resolvedName = rev.name;
          } catch {}

          const loc = {
            name: resolvedName,
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          };
          handleSelectPickup(loc);
        },
        () => {
          // Fallback to central Nagpur VNIT
          const loc = {
            name: "VNIT Campus (Live GPS)",
            lat: 21.1255,
            lng: 79.0520,
          };
          handleSelectPickup(loc);
        }
      );
    } else {
      const loc = {
        name: "VNIT Campus (Live GPS)",
        lat: 21.1255,
        lng: 79.0520,
      };
      handleSelectPickup(loc);
    }
  };

  // Route preview details
  const [routePolyline, setRoutePolyline] = useState<[number, number][]>([]);
  const [distanceKm, setDistanceKm] = useState<number>(0);
  const [durationMins, setDurationMins] = useState<number>(0);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);

  // Active Trip State
  const [activeTrip, setActiveTrip] = useState<TripRecord | null>(null);
  const [isSearchingRide, setIsSearchingRide] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [copiedShareLink, setCopiedShareLink] = useState(false);

  // Payment & Rating Modal states
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [ratingStars, setRatingStars] = useState(5);
  const [ratingFeedback, setRatingFeedback] = useState("");
  const [ratingSubmitted, setRatingSubmitted] = useState(false);

  // Route deviation alert state
  const [deviationAlert, setDeviationAlert] = useState<{ isDeviated: boolean; distance: number }>({
    isDeviated: false,
    distance: 0,
  });

  // Listen to active user trip in Firestore
  useEffect(() => {
    if (!currentUser) return;
    const tripsCol = collection(db, "trips");
    const q = query(
      tripsCol,
      where("riderId", "==", currentUser.uid),
      where("status", "in", ["searching", "assigned", "en_route", "arrived", "in_progress"])
    );

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        if (!snapshot.empty) {
          const tripData = {
            ...(snapshot.docs[0].data() as TripRecord),
            id: snapshot.docs[0].id,
          };
          setActiveTrip(tripData);
          if (tripData.routePolyline) {
            setRoutePolyline(normalizeRoutePolyline(tripData.routePolyline));
          }

          // Adjust reactive background
          if (tripData.status === "searching") {
            onThemeChange("searching");
          } else if (tripData.status === "assigned" || tripData.status === "en_route" || tripData.status === "arrived") {
            onThemeChange("matched");
          } else if (tripData.status === "in_progress") {
            onThemeChange("in_progress");
          }

          // Check route deviation in real time
          if (tripData.status === "in_progress" && tripData.currentDriverLat && tripData.currentDriverLng && tripData.routePolyline) {
            const dev = checkRouteDeviation(
              tripData.currentDriverLat,
              tripData.currentDriverLng,
              tripData.routePolyline
            );
            setDeviationAlert({ isDeviated: dev.isDeviated, distance: dev.distanceOffTrackMeters });
          }
        } else {
          // If trip just completed or ended
          setActiveTrip((prev) => {
            if (prev && prev.status === "in_progress") {
              setIsPaymentModalOpen(true);
            }
            return null;
          });
          onThemeChange("idle");
        }
      },
      (err) => {
        console.warn("Rider active trip snapshot warning:", err);
      }
    );

    return () => unsub();
  }, [currentUser]);

  // Recalculate route when pickup or destination changes
  useEffect(() => {
    if (!pickup || !destination) return;
    setIsCalculatingRoute(true);

    getDirections(pickup, destination)
      .then((res) => {
        setDistanceKm(res.distanceKm);
        setDurationMins(res.durationMins);
        setRoutePolyline(res.coordinates);
      })
      .catch(console.error)
      .finally(() => setIsCalculatingRoute(false));
  }, [pickup, destination]);

  // Fare calculations
  const fareBreakdown = calculateFare(distanceKm || 1.8, selectedVehicle);

  // Real-time telemetry calculations for the Student Rider
  // 1. Driver's distance & ETA to reach the student's pickup point
  const driverDistanceMeters =
    activeTrip?.currentDriverLat && activeTrip?.currentDriverLng && activeTrip?.pickup
      ? getDistanceMeters(
          activeTrip.currentDriverLat,
          activeTrip.currentDriverLng,
          activeTrip.pickup.lat,
          activeTrip.pickup.lng
        )
      : null;

  const driverDistanceKm = driverDistanceMeters !== null ? driverDistanceMeters / 1000 : null;
  // Estimated minutes for captain to reach student (~20-25 km/h campus/city traffic)
  const driverEtaMins =
    driverDistanceKm !== null
      ? Math.max(1, Math.ceil((driverDistanceKm / 22) * 60))
      : activeTrip?.durationMins || 3;

  const driverDistFormatted =
    driverDistanceMeters !== null
      ? driverDistanceMeters < 1000
        ? `${driverDistanceMeters} m`
        : `${driverDistanceKm?.toFixed(1)} km`
      : null;

  // 2. Remaining distance & ETA to destination during in-progress trip
  const destRemainingMeters =
    activeTrip?.status === "in_progress" && activeTrip?.currentDriverLat && activeTrip?.currentDriverLng && activeTrip?.destination
      ? getDistanceMeters(
          activeTrip.currentDriverLat,
          activeTrip.currentDriverLng,
          activeTrip.destination.lat,
          activeTrip.destination.lng
        )
      : null;

  const destRemainingKm =
    destRemainingMeters !== null
      ? destRemainingMeters / 1000
      : activeTrip?.distanceKm || distanceKm || 1.8;

  const destEtaMins = Math.max(1, Math.ceil((destRemainingKm / 25) * 60));

  const handleRequestRide = async () => {
    if (!currentUser || !userProfile) return;

    if (!isVerified) {
      if (onOpenVerification) {
        onOpenVerification();
      }
      return;
    }

    const finalPickup = pickup || (pickupQuery ? resolveNagpurLocation(pickupQuery) : null);
    const finalDestination = destination || (destQuery ? resolveNagpurLocation(destQuery) : null);

    if (!finalPickup || !finalDestination) return;

    persistLocationToHistory(finalPickup);
    persistLocationToHistory(finalDestination);

    setIsSearchingRide(true);
    try {
      await createTripRequest({
        riderId: currentUser.uid,
        riderName: userProfile.displayName || "Campus Student",
        riderPhoto: userProfile.photoURL,
        riderTier: userProfile.tier || "tier1_student_staff",
        riderPhone: userProfile.phoneNumber,
        pickup: finalPickup,
        destination: finalDestination,
        vehicleType: selectedVehicle,
      });
      onThemeChange("searching");
    } catch (err) {
      console.error("Error creating trip request:", err);
    } finally {
      setIsSearchingRide(false);
    }
  };

  const handleCancelTrip = async () => {
    if (!activeTrip) return;
    await updateTripStatus(activeTrip.id, "cancelled");
    setActiveTrip(null);
    onThemeChange("idle");
  };

  const handleShareTrip = () => {
    if (!activeTrip) return;
    const shareUrl = `${window.location.origin}?shareTrip=${activeTrip.id}`;
    navigator.clipboard.writeText(shareUrl);
    setCopiedShareLink(true);
    setTimeout(() => setCopiedShareLink(false), 2500);
  };

  // Launch Razorpay Checkout
  const handlePayNow = () => {
    if (!activeTrip && !isPaymentModalOpen) return;
    const targetTrip = activeTrip || {
      id: `trip_${Date.now()}`,
      fare: fareBreakdown.totalFare,
      riderId: currentUser?.uid || "guest",
      riderName: userProfile?.displayName || "Student",
      distanceKm,
    } as any;

    setIsPaying(true);
    processRazorpayCheckout(
      targetTrip,
      {
        name: userProfile?.displayName || "Campus Member",
        email: userProfile?.email,
        phone: userProfile?.phoneNumber,
      },
      () => {
        setIsPaying(false);
        setPaymentSuccess(true);
      },
      (error) => {
        setIsPaying(false);
        console.warn("Payment notice:", error);
      }
    );
  };

  const handleRatingSubmit = async () => {
    if (!activeTrip?.driverId || !currentUser) return;
    await submitTripRating({
      tripId: activeTrip.id,
      fromUserId: currentUser.uid,
      toUserId: activeTrip.driverId,
      rating: ratingStars,
      feedback: ratingFeedback,
      isRiderRatingDriver: true,
    });
    setRatingSubmitted(true);
    setTimeout(() => {
      setIsPaymentModalOpen(false);
      setPaymentSuccess(false);
      setRatingSubmitted(false);
    }, 1500);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 w-full space-y-6">
      {/* Main Grid: Left Booking / Tracking Panel, Right Live Map */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Booking Controls or Live Tracking HUD */}
        <div className="lg:col-span-5 space-y-5">
          {!isVerified && (
            <div className="p-4 rounded-[24px] bg-gradient-to-r from-amber-950/80 via-rose-950/70 to-amber-950/80 border border-amber-500/50 shadow-2xl backdrop-blur-xl space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-[16px] bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0 border border-amber-400/40">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30">
                      Verification Required Once
                    </span>
                  </div>
                  <h3 className="text-xs font-bold text-white mt-1">Student / Community Verification</h3>
                  <p className="text-[11px] text-amber-200/80 mt-0.5 leading-relaxed">
                    Verify once and it stays saved on this device permanently for all future campus rides!
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <button
                  id="btn-verify-now-rider-banner"
                  type="button"
                  onClick={onOpenVerification}
                  className="w-full py-3 rounded-[16px] liquid-glass-primary text-white text-xs font-bold shadow-lg flex items-center justify-center gap-2 cursor-pointer hover:border-white/40 transition-all"
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-300" />
                  <span>Complete Verification (Upload Docs)</span>
                </button>

                <button
                  id="btn-quick-verify-rider-banner"
                  type="button"
                  disabled={isQuickVerifying}
                  onClick={async () => {
                    setIsQuickVerifying(true);
                    try {
                      const isComm = userProfile?.tier === "tier2_community";
                      await submitVerification({
                        tier: isComm ? "tier2_community" : "tier1_student_staff",
                        age: 21,
                        gender: "female",
                        collegeName: isComm ? "Nagpur Resident / General Community" : "VNIT Nagpur (Visvesvaraya National Institute of Technology)",
                        department: isComm ? "IT & Tech Sector Specialist" : "Computer Science & Engineering",
                        studyYear: isComm ? "Corporate / Business Professional" : "3rd Year (B.Tech)",
                        studentStaffId: isComm ? "COMM-NGP-4019" : "2024VNIT1042",
                        idCardDocUrl: "https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=600&q=80",
                        govtIdType: "aadhaar",
                        govtIdNumber: "5492 8812 4019",
                        govtIdDocUrl: "https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=600&q=80",
                        safetyGuidelinesAccepted: true,
                        emergencyContact: {
                          name: "Dr. Rajesh Sharma",
                          phone: "+91 98230 45678",
                          relation: "Parent",
                        },
                        verificationStatus: "approved",
                      });
                    } catch (err) {
                      console.error("Quick verify rider error:", err);
                    } finally {
                      setIsQuickVerifying(false);
                    }
                  }}
                  className="w-full py-2.5 rounded-[14px] bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-400/40 text-emerald-300 text-xs font-bold shadow-lg flex items-center justify-center gap-1.5 cursor-pointer transition-all hover:scale-[1.01]"
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{isQuickVerifying ? "Verifying..." : "⚡ 1-Click Auto-Verify on Device"}</span>
                </button>
              </div>
            </div>
          )}

          {!activeTrip ? (
            /* RIDE BOOKING PANEL */
            <div className="rounded-[28px] liquid-glass-panel p-6 sm:p-7 shadow-2xl space-y-5 specular-shine">
              <div>
                <div className="flex items-center justify-between">
                  <h1 className="apple-title text-white tracking-tight">
                    Where in Nagpur?
                  </h1>
                  {isVerified ? (
                    <span className="text-[10px] font-bold text-emerald-300 px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-emerald-400" />
                      Saved on Device
                    </span>
                  ) : (
                    <span className="text-[11px] font-semibold text-indigo-300 px-2.5 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-400/30">
                      Nagpur Region
                    </span>
                  )}
                </div>
                <p className="apple-caption mt-1">
                  Enter any custom location, campus gate, or select from your previous ride history.
                </p>
              </div>

              {/* Pickup & Destination Input Section */}
              <div className="space-y-4 p-4 rounded-[22px] liquid-glass-subtle relative">
                {/* Pickup Input */}
                <div className="space-y-1.5 relative">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-emerald-400 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-md shadow-emerald-400/60 ring-2 ring-emerald-400/20"></span>
                      Pickup Location
                    </label>
                    <button
                      type="button"
                      onClick={handleUseCurrentGps}
                      className="text-[11px] font-medium text-emerald-300 hover:text-emerald-200 flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20 transition-all cursor-pointer"
                    >
                      <Navigation className="w-3 h-3 text-emerald-400" />
                      Live GPS
                    </button>
                  </div>
                  
                  <div className="relative">
                    <input
                      id="input-pickup-location"
                      type="text"
                      value={pickupQuery}
                      placeholder="Type any pickup location (e.g., Sitabuldi, VNIT Gate 1, Dharampeth, Ramdeobaba...)"
                      onFocus={() => setIsPickupFocused(true)}
                      onChange={(e) => {
                        setPickupQuery(e.target.value);
                        if (pickup) setPickup(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && pickupQuery.trim()) {
                          e.preventDefault();
                          handleResolveAndSelectPickup(pickupQuery);
                        }
                      }}
                      className="w-full px-3.5 py-2.5 pr-14 rounded-[14px] liquid-glass-input text-xs text-white placeholder:text-white/40 bg-slate-900/80 focus:outline-none focus:ring-1 focus:ring-emerald-400/80 transition-all"
                    />
                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      {isSearchingPickup && (
                        <Loader2 className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
                      )}
                      {pickupQuery && (
                        <button
                          type="button"
                          onClick={() => {
                            setPickupQuery("");
                            setPickup(null);
                            setPickupSuggestions([]);
                          }}
                          className="text-white/50 hover:text-white cursor-pointer p-0.5"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Pickup Suggestions / Real Geocoding Dropdown */}
                  {isPickupFocused && (
                    <div className="absolute left-0 right-0 top-full mt-1 z-30 bg-slate-900/95 backdrop-blur-xl border border-white/15 rounded-[16px] shadow-2xl p-2.5 max-h-64 overflow-y-auto space-y-2.5">
                      <div className="flex items-center justify-between px-1.5 pb-1 border-b border-white/10 text-[10px] font-bold text-indigo-300">
                        <span className="flex items-center gap-1">
                          <Search className="w-3 h-3 text-emerald-400" /> Location Search Results
                        </span>
                        <button
                          type="button"
                          onMouseDown={() => setIsPickupFocused(false)}
                          className="text-white/40 hover:text-white"
                        >
                          Close
                        </button>
                      </div>

                      {/* Live OpenStreetMap Geocoded Search Results */}
                      {pickupSuggestions.length > 0 && (
                        <div className="space-y-1">
                          <p className="px-1.5 py-0.5 text-[9px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                            <MapPin className="w-2.5 h-2.5" /> Real Map Locations (OpenStreetMap)
                          </p>
                          {pickupSuggestions.map((item) => (
                            <button
                              key={`pickup-geo-${item.id}`}
                              type="button"
                              onMouseDown={() =>
                                handleSelectPickup({ name: item.name, lat: item.lat, lng: item.lng })
                              }
                              className="w-full text-left px-2.5 py-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 flex flex-col gap-0.5 group transition-all"
                            >
                              <div className="flex items-center justify-between w-full">
                                <span className="font-bold text-xs text-white group-hover:text-emerald-300 truncate">
                                  {item.name}
                                </span>
                                <span className="text-[9px] text-emerald-300/80 font-mono shrink-0">
                                  {item.lat.toFixed(4)}, {item.lng.toFixed(4)}
                                </span>
                              </div>
                              <p className="text-[10px] text-white/50 truncate">
                                {item.displayName}
                              </p>
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Recent ride history items */}
                      {recentLocations.length > 0 && (
                        <div className="space-y-1">
                          <p className="px-1.5 py-0.5 text-[9px] font-bold text-white/50 uppercase tracking-wider">
                            Recent Places
                          </p>
                          {recentLocations.slice(0, 3).map((item, idx) => (
                            <button
                              key={`pickup-rec-${idx}`}
                              type="button"
                              onMouseDown={() => handleSelectPickup(item)}
                              className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-white/10 flex items-center justify-between text-xs text-white/90 group transition-all"
                            >
                              <div className="flex items-center gap-2 truncate">
                                <Clock className="w-3 h-3 text-indigo-400 shrink-0" />
                                <span className="truncate">{item.name}</span>
                              </div>
                              <span className="text-[10px] text-white/40 group-hover:text-emerald-300">Select</span>
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Matching Nagpur Campus Landmarks */}
                      <div className="pt-1 border-t border-white/10">
                        <p className="px-1.5 py-0.5 text-[9px] font-bold text-white/50 uppercase tracking-wider">
                          Campus & City Hubs
                        </p>
                        <div className="space-y-1 mt-1">
                          {campusPoints
                            .filter((pt) =>
                              !pickupQuery || pt.name.toLowerCase().includes(pickupQuery.toLowerCase())
                            )
                            .slice(0, 3)
                            .map((pt) => (
                              <button
                                key={`pickup-camp-${pt.id}`}
                                type="button"
                                onMouseDown={() =>
                                  handleSelectPickup({ name: pt.name, lat: pt.lat, lng: pt.lng })
                                }
                                className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-white/10 flex items-center justify-between text-xs text-white/90 group transition-all"
                              >
                                <div className="flex items-center gap-2 truncate">
                                  <MapPin className="w-3 h-3 text-emerald-400 shrink-0" />
                                  <span className="truncate">{pt.name}</span>
                                </div>
                                <span className="text-[10px] text-white/40">{pt.campusZone}</span>
                              </button>
                            ))}
                        </div>
                      </div>

                      {/* Action to Search / Locate custom text */}
                      {pickupQuery.trim() && (
                        <button
                          type="button"
                          onMouseDown={() => handleResolveAndSelectPickup(pickupQuery)}
                          className="w-full text-left px-2.5 py-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 flex items-center justify-between text-xs font-semibold"
                        >
                          <span className="flex items-center gap-2 truncate">
                            <Search className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">Find real location for "{pickupQuery}"</span>
                          </span>
                          <span className="text-[10px] uppercase font-bold text-emerald-400 shrink-0">Locate ➔</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Destination Input */}
                <div className="space-y-1.5 relative pt-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-rose-400 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-400 shadow-md shadow-rose-400/60 ring-2 ring-rose-400/20"></span>
                      Destination Location
                    </label>
                  </div>

                  <div className="relative">
                    <input
                      id="input-destination-location"
                      type="text"
                      value={destQuery}
                      placeholder="Type destination (e.g., Ramdeobaba, Sadar, Airport, IT Park, YCCE...)"
                      onFocus={() => setIsDestFocused(true)}
                      onChange={(e) => {
                        setDestQuery(e.target.value);
                        if (destination) setDestination(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && destQuery.trim()) {
                          e.preventDefault();
                          handleResolveAndSelectDestination(destQuery);
                        }
                      }}
                      className="w-full px-3.5 py-2.5 pr-14 rounded-[14px] liquid-glass-input text-xs text-white placeholder:text-white/40 bg-slate-900/80 focus:outline-none focus:ring-1 focus:ring-rose-400/80 transition-all"
                    />
                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      {isSearchingDest && (
                        <Loader2 className="w-3.5 h-3.5 text-rose-400 animate-spin" />
                      )}
                      {destQuery && (
                        <button
                          type="button"
                          onClick={() => {
                            setDestQuery("");
                            setDestination(null);
                            setDestSuggestions([]);
                          }}
                          className="text-white/50 hover:text-white cursor-pointer p-0.5"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Destination Suggestions / Real Geocoding Dropdown */}
                  {isDestFocused && (
                    <div className="absolute left-0 right-0 top-full mt-1 z-30 bg-slate-900/95 backdrop-blur-xl border border-white/15 rounded-[16px] shadow-2xl p-2.5 max-h-64 overflow-y-auto space-y-2.5">
                      <div className="flex items-center justify-between px-1.5 pb-1 border-b border-white/10 text-[10px] font-bold text-indigo-300">
                        <span className="flex items-center gap-1">
                          <Search className="w-3 h-3 text-rose-400" /> Location Search Results
                        </span>
                        <button
                          type="button"
                          onMouseDown={() => setIsDestFocused(false)}
                          className="text-white/40 hover:text-white"
                        >
                          Close
                        </button>
                      </div>

                      {/* Live OpenStreetMap Geocoded Search Results */}
                      {destSuggestions.length > 0 && (
                        <div className="space-y-1">
                          <p className="px-1.5 py-0.5 text-[9px] font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1">
                            <MapPin className="w-2.5 h-2.5" /> Real Map Locations (OpenStreetMap)
                          </p>
                          {destSuggestions.map((item) => (
                            <button
                              key={`dest-geo-${item.id}`}
                              type="button"
                              onMouseDown={() =>
                                handleSelectDestination({ name: item.name, lat: item.lat, lng: item.lng })
                              }
                              className="w-full text-left px-2.5 py-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 flex flex-col gap-0.5 group transition-all"
                            >
                              <div className="flex items-center justify-between w-full">
                                <span className="font-bold text-xs text-white group-hover:text-rose-300 truncate">
                                  {item.name}
                                </span>
                                <span className="text-[9px] text-rose-300/80 font-mono shrink-0">
                                  {item.lat.toFixed(4)}, {item.lng.toFixed(4)}
                                </span>
                              </div>
                              <p className="text-[10px] text-white/50 truncate">
                                {item.displayName}
                              </p>
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Recent ride history items */}
                      {recentLocations.length > 0 && (
                        <div className="space-y-1">
                          <p className="px-1.5 py-0.5 text-[9px] font-bold text-white/50 uppercase tracking-wider">
                            Recent Places
                          </p>
                          {recentLocations.slice(0, 3).map((item, idx) => (
                            <button
                              key={`dest-rec-${idx}`}
                              type="button"
                              onMouseDown={() => handleSelectDestination(item)}
                              className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-white/10 flex items-center justify-between text-xs text-white/90 group transition-all"
                            >
                              <div className="flex items-center gap-2 truncate">
                                <Clock className="w-3 h-3 text-indigo-400 shrink-0" />
                                <span className="truncate">{item.name}</span>
                              </div>
                              <span className="text-[10px] text-white/40 group-hover:text-rose-300">Select</span>
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Matching Nagpur Campus Landmarks */}
                      <div className="pt-1 border-t border-white/10">
                        <p className="px-1.5 py-0.5 text-[9px] font-bold text-white/50 uppercase tracking-wider">
                          Campus & City Hubs
                        </p>
                        <div className="space-y-1 mt-1">
                          {campusPoints
                            .filter((pt) =>
                              !destQuery || pt.name.toLowerCase().includes(destQuery.toLowerCase())
                            )
                            .slice(0, 3)
                            .map((pt) => (
                              <button
                                key={`dest-camp-${pt.id}`}
                                type="button"
                                onMouseDown={() =>
                                  handleSelectDestination({ name: pt.name, lat: pt.lat, lng: pt.lng })
                                }
                                className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-white/10 flex items-center justify-between text-xs text-white/90 group transition-all"
                              >
                                <div className="flex items-center gap-2 truncate">
                                  <MapPin className="w-3 h-3 text-rose-400 shrink-0" />
                                  <span className="truncate">{pt.name}</span>
                                </div>
                                <span className="text-[10px] text-white/40">{pt.campusZone}</span>
                              </button>
                            ))}
                        </div>
                      </div>

                      {/* Action to Search / Locate custom text */}
                      {destQuery.trim() && (
                        <button
                          type="button"
                          onMouseDown={() => handleResolveAndSelectDestination(destQuery)}
                          className="w-full text-left px-2.5 py-2 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 flex items-center justify-between text-xs font-semibold"
                        >
                          <span className="flex items-center gap-2 truncate">
                            <Search className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">Find real location for "{destQuery}"</span>
                          </span>
                          <span className="text-[10px] uppercase font-bold text-rose-400 shrink-0">Locate ➔</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Quick History Suggestion Chips below inputs */}
                {recentLocations.length > 0 && !isPickupFocused && !isDestFocused && (
                  <div className="pt-2 border-t border-white/10">
                    <div className="flex items-center justify-between text-[10px] font-bold text-indigo-300 mb-1.5">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Quick Past Ride Spots:
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {recentLocations.slice(0, 3).map((loc, i) => (
                        <button
                          key={`chip-${i}`}
                          type="button"
                          onClick={() => {
                            if (!pickupQuery) {
                              handleSelectPickup(loc);
                            } else {
                              handleSelectDestination(loc);
                            }
                          }}
                          className="px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white text-[10px] font-medium border border-white/10 transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <Clock className="w-2.5 h-2.5 text-indigo-400" />
                          <span className="truncate max-w-[130px]">{loc.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Selected Route & Real Locations Preview Card */}
                {(pickup || destination) && (
                  <div className="p-3.5 rounded-[18px] bg-slate-950/80 border border-indigo-500/30 space-y-2.5">
                    <div className="flex items-center justify-between text-[10px] font-bold text-white/70 uppercase tracking-wider">
                      <span>Selected Trip Points</span>
                      {distanceKm > 0 && (
                        <span className="text-emerald-400 font-mono font-bold">
                          {distanceKm} km • ~{durationMins} mins
                        </span>
                      )}
                    </div>

                    {pickup && (
                      <div className="p-2.5 rounded-[14px] bg-emerald-950/40 border border-emerald-500/30 flex items-start gap-2.5">
                        <div className="w-6 h-6 rounded-[8px] bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                          <MapPin className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="text-[9px] font-extrabold uppercase text-emerald-400">Pickup Location</span>
                          <p className="font-bold text-xs text-white truncate">{pickup.name}</p>
                          <p className="text-[9px] text-white/50 font-mono">GPS: {pickup.lat.toFixed(4)}, {pickup.lng.toFixed(4)}</p>
                        </div>
                      </div>
                    )}

                    {destination && (
                      <div className="p-2.5 rounded-[14px] bg-rose-950/40 border border-rose-500/30 flex items-start gap-2.5">
                        <div className="w-6 h-6 rounded-[8px] bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 mt-0.5">
                          <MapPin className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="text-[9px] font-extrabold uppercase text-rose-400">Drop-off Destination</span>
                          <p className="font-bold text-xs text-white truncate">{destination.name}</p>
                          <p className="text-[9px] text-white/50 font-mono">GPS: {destination.lat.toFixed(4)}, {destination.lng.toFixed(4)}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Vehicle / Ride Type Selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-white/90">Select Ride Option</label>
                <div className="grid grid-cols-2 gap-2.5">
                  {(Object.keys(VEHICLE_RATES) as VehicleType[]).map((vType) => {
                    const rate = VEHICLE_RATES[vType];
                    const fare = calculateFare(distanceKm || 1.8, vType);
                    const isSelected = selectedVehicle === vType;

                    return (
                      <button
                        key={vType}
                        type="button"
                        onClick={() => setSelectedVehicle(vType)}
                        className={`p-3.5 rounded-[18px] text-left border transition-all cursor-pointer ${
                          isSelected
                            ? "bg-indigo-600/35 border-indigo-400/80 text-white shadow-lg ring-1 ring-indigo-400/60"
                            : "liquid-glass-subtle text-white/80 hover:border-white/25"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="w-8 h-8 rounded-[12px] bg-white/10 flex items-center justify-center text-indigo-300">
                            {vType === "bike" && <Bike className="w-4 h-4" />}
                            {vType === "ev_scooter" && <Zap className="w-4 h-4 text-emerald-300" />}
                            {(vType === "auto" || vType === "car") && <Car className="w-4 h-4" />}
                          </div>
                          <span className="font-extrabold text-sm text-emerald-400 font-mono">
                            ₹{fare.totalFare}
                          </span>
                        </div>
                        <p className="font-bold text-xs mt-2 text-white">{rate.label}</p>
                        <p className="text-[10px] text-white/60">~{durationMins || 5} mins</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Transparent Fare Breakdown Accordion */}
              <div className="p-4 rounded-[20px] liquid-glass-subtle text-xs space-y-2">
                <div className="flex items-center justify-between text-indigo-300 font-semibold text-[11px] pb-1.5 border-b border-white/10">
                  <span className="flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-indigo-400" />
                    Rate Set by Campus Captain
                  </span>
                  <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                    <Handshake className="w-3 h-3 text-amber-400" />
                    Bargain Enabled
                  </span>
                </div>

                <div className="flex items-center justify-between text-white/80">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-indigo-400" /> Est. Distance & Duration
                  </span>
                  <span className="font-semibold text-white font-mono">
                    {distanceKm} km • ~{durationMins} mins
                  </span>
                </div>

                <div className="flex items-center justify-between text-white/70">
                  <span>Base Rate + Km Rate</span>
                  <span className="font-mono">₹{fareBreakdown.baseFare} + ₹{Math.round(distanceKm * fareBreakdown.perKmRate)}</span>
                </div>

                <div className="flex items-center justify-between text-white/60 text-[11px]">
                  <span>Campus Community Pool (10%)</span>
                  <span className="font-mono">₹{fareBreakdown.platformCommission}</span>
                </div>

                <div className="pt-2.5 border-t border-white/10 flex items-center justify-between font-extrabold text-sm text-white">
                  <span>Initial Captain Fare</span>
                  <span className="text-emerald-400 font-mono text-base">₹{fareBreakdown.totalFare}</span>
                </div>

                <div className="p-2.5 rounded-[12px] bg-indigo-950/40 border border-indigo-500/20 text-[10px] text-indigo-200/90 flex items-center gap-2">
                  <Handshake className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                  <span>The travel rate is set by the Captain. You can bargain after requesting, and the Captain can approve your final amount.</span>
                </div>
              </div>

              {/* Find Ride Action Button */}
              {!isVerified ? (
                userProfile?.verificationStatus === "rejected" ? (
                  <div className="space-y-2">
                    <div className="p-3 rounded-[18px] bg-rose-950/80 border border-rose-500/50 text-rose-200 text-xs flex items-start gap-2.5 shadow-lg">
                      <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-rose-300">Rides Locked (Verification Rejected)</p>
                        <p className="text-[11px] text-rose-200/80 mt-0.5">
                          {userProfile?.rejectionReason || "Fake/tampered student card or invalid UIDAI Aadhaar was detected. Re-verify with genuine documents."}
                        </p>
                      </div>
                    </div>
                    <button
                      id="btn-reverify-rejected-rider"
                      type="button"
                      onClick={onOpenVerification}
                      className="w-full py-4 rounded-[20px] bg-rose-600/30 border border-rose-500/60 hover:bg-rose-600/40 text-rose-200 font-extrabold text-xs shadow-xl flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-[1.01]"
                    >
                      <RefreshCw className="w-4 h-4 text-rose-300" />
                      <span>Re-Upload Authentic Student ID & Aadhaar</span>
                    </button>
                  </div>
                ) : (
                  <button
                    id="btn-request-campus-ride-locked"
                    type="button"
                    onClick={onOpenVerification}
                    className="w-full py-4 rounded-[20px] bg-amber-500/20 border border-amber-400/60 hover:bg-amber-500/30 text-amber-200 font-extrabold text-xs shadow-xl flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-[1.01]"
                  >
                    <Lock className="w-4 h-4 text-amber-300" />
                    <span>Verify Student ID & Aadhaar to Book Rides</span>
                  </button>
                )
              ) : (
                <button
                  id="btn-request-campus-ride"
                  onClick={handleRequestRide}
                  disabled={isSearchingRide || isCalculatingRoute}
                  className="w-full py-4 rounded-[20px] liquid-glass-primary disabled:opacity-50 text-white font-black text-sm shadow-xl flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Search className="w-4 h-4" />
                  {isSearchingRide ? "Broadcasting to Nearby Captains..." : `Request ${VEHICLE_RATES[selectedVehicle].label} (₹${fareBreakdown.totalFare})`}
                </button>
              )}

              {/* Online driver stats */}
              <div className="flex items-center justify-between text-[11px] text-white/60 px-1">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                  {onlineDrivers.length} verified captains nearby
                </span>
                <span className="text-indigo-300 font-medium">Peer verified • Zero surge</span>
              </div>
            </div>
          ) : (
            /* ACTIVE TRIP LIVE HUD */
            <div className="rounded-[28px] liquid-glass-panel p-6 shadow-2xl space-y-5 specular-shine">
              {/* Trip Status Header */}
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full bg-white/10 text-indigo-200 border border-white/20">
                    {activeTrip.status === "searching" && "Finding Captain..."}
                    {activeTrip.status === "assigned" && "Captain Assigned • Preparing"}
                    {activeTrip.status === "en_route" && "Captain Approaching on Map"}
                    {activeTrip.status === "arrived" && "Captain Arrived at Hub"}
                    {activeTrip.status === "in_progress" && "Trip in Progress"}
                  </span>
                  <h2 className="text-lg font-bold text-white mt-2.5">
                    {activeTrip.destination.name}
                  </h2>
                </div>

                {/* 4-Digit Pickup PIN */}
                <div className="text-right p-3 rounded-[18px] liquid-glass-subtle border border-indigo-400/40">
                  <p className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider">Pickup PIN</p>
                  <p className="text-2xl font-black tracking-widest text-emerald-400 font-mono">
                    {activeTrip.otpPin}
                  </p>
                  <p className="text-[9px] text-white/60">Share with Captain</p>
                </div>
              </div>

              {/* LIVE REAL-TIME CAPTAIN APPROACHING & ARRIVAL TELEMETRY CARD */}
              {activeTrip.driverId && (activeTrip.status === "assigned" || activeTrip.status === "en_route" || activeTrip.status === "arrived") && (
                <div className="p-4 rounded-[22px] bg-gradient-to-r from-emerald-950/90 via-slate-950 to-indigo-950/80 border border-emerald-500/40 shadow-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center text-emerald-300">
                          <Bike className="w-5 h-5 animate-pulse" />
                        </div>
                        <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-slate-950 animate-ping"></span>
                      </div>
                      <div>
                        <span className="font-extrabold text-sm text-white">
                          {activeTrip.status === "arrived" ? "Captain Has Arrived!" : "Captain is Coming to You"}
                        </span>
                        <p className="text-[11px] text-emerald-300/90 font-medium">
                          {activeTrip.status === "arrived"
                            ? `Captain is waiting at ${activeTrip.pickup.name}`
                            : `Heading towards ${activeTrip.pickup.name}`}
                        </p>
                      </div>
                    </div>

                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30 shrink-0">
                      <Radio className="w-3 h-3 animate-pulse" />
                      Live GPS
                    </span>
                  </div>

                  {/* Real-time Telemetry Metrics Grid for Student */}
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/10 text-center">
                    <div className="p-2 rounded-[14px] bg-white/5 border border-white/10">
                      <p className="text-[9px] font-bold text-white/60 uppercase tracking-wider">
                        {activeTrip.status === "arrived" ? "Captain Status" : "Time to Reach"}
                      </p>
                      <p className="font-black text-sm text-emerald-400 font-mono mt-0.5">
                        {activeTrip.status === "arrived" ? "At Pickup" : `~${driverEtaMins} min`}
                      </p>
                      <p className="text-[9px] text-emerald-300/70">
                        {activeTrip.status === "arrived" ? "Waiting for you" : "Est. Arrival"}
                      </p>
                    </div>

                    <div className="p-2 rounded-[14px] bg-white/5 border border-white/10">
                      <p className="text-[9px] font-bold text-white/60 uppercase tracking-wider">Distance</p>
                      <p className="font-black text-sm text-indigo-300 font-mono mt-0.5">
                        {driverDistFormatted || (activeTrip.status === "arrived" ? "0 m" : "Nearby")}
                      </p>
                      <p className="text-[9px] text-white/60">from pickup spot</p>
                    </div>

                    <div className="p-2 rounded-[14px] bg-white/5 border border-white/10">
                      <p className="text-[9px] font-bold text-white/60 uppercase tracking-wider">Trip Fare</p>
                      <p className="font-black text-sm text-amber-300 font-mono mt-0.5">
                        ₹{activeTrip.fare}
                      </p>
                      <p className="text-[9px] text-white/60">Fixed Rate</p>
                    </div>
                  </div>
                </div>
              )}

              {/* IN-PROGRESS TRIP TELEMETRY BANNER */}
              {activeTrip.status === "in_progress" && (
                <div className="p-4 rounded-[22px] bg-gradient-to-r from-indigo-950/90 to-cyan-950/80 border border-cyan-500/40 shadow-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-cyan-500/20 border border-cyan-400/50 flex items-center justify-center text-cyan-300">
                        <Navigation className="w-5 h-5 animate-pulse" />
                      </div>
                      <div>
                        <span className="font-extrabold text-sm text-white">On Trip to Destination</span>
                        <p className="text-[11px] text-cyan-200/90 font-medium truncate max-w-[200px]">
                          {activeTrip.destination.name}
                        </p>
                      </div>
                    </div>

                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] font-bold border border-cyan-500/30 shrink-0">
                      <Radio className="w-3 h-3 animate-pulse" />
                      En Route
                    </span>
                  </div>

                  {/* Destination telemetry countdown */}
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/10 text-center">
                    <div className="p-2 rounded-[14px] bg-white/5 border border-white/10">
                      <p className="text-[9px] font-bold text-white/60 uppercase tracking-wider">Est. Arrival</p>
                      <p className="font-black text-sm text-cyan-300 font-mono mt-0.5">
                        ~{destEtaMins} min
                      </p>
                      <p className="text-[9px] text-cyan-200/70">To drop point</p>
                    </div>

                    <div className="p-2 rounded-[14px] bg-white/5 border border-white/10">
                      <p className="text-[9px] font-bold text-white/60 uppercase tracking-wider">Remaining</p>
                      <p className="font-black text-sm text-indigo-300 font-mono mt-0.5">
                        {destRemainingKm.toFixed(1)} km
                      </p>
                      <p className="text-[9px] text-white/60">Distance to go</p>
                    </div>

                    <div className="p-2 rounded-[14px] bg-white/5 border border-white/10">
                      <p className="text-[9px] font-bold text-white/60 uppercase tracking-wider">Amount</p>
                      <p className="font-black text-sm text-emerald-400 font-mono mt-0.5">
                        ₹{activeTrip.fare}
                      </p>
                      <p className="text-[9px] text-white/60">UPI / Cash</p>
                    </div>
                  </div>
                </div>
              )}

              {/* CONFIRMED ROUTE & LOCATION DETAILS (PROPER PICKUP AND DESTINATION CARDS) */}
              <div className="p-4 rounded-[22px] bg-slate-950/80 border border-white/15 shadow-xl space-y-3">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <span className="text-[10px] font-bold text-white/60 uppercase tracking-wider">
                    Confirmed Route & Locations
                  </span>
                  <span className="text-[10px] text-indigo-300 font-mono font-bold">
                    {activeTrip.distanceKm || distanceKm || 1.8} km • ~{activeTrip.durationMins || durationMins || 5} min
                  </span>
                </div>

                {/* Pickup Location Card */}
                <div className="p-3 rounded-[16px] bg-emerald-950/30 border border-emerald-500/30 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0 mt-0.5">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[9px] font-black uppercase tracking-wider text-emerald-400 px-1.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/30">
                        Pickup Location
                      </span>
                      {activeTrip.status === "arrived" && (
                        <span className="text-[9px] text-emerald-300 font-bold bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/30">
                          📍 Captain Waiting Here
                        </span>
                      )}
                      {(activeTrip.status === "assigned" || activeTrip.status === "en_route") && (
                        <span className="text-[9px] text-emerald-300 font-bold bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/30">
                          ⏱️ ~{driverEtaMins} min away
                        </span>
                      )}
                    </div>
                    <p className="font-bold text-xs text-white mt-1 leading-snug">
                      {activeTrip.pickup.name}
                    </p>
                    <p className="text-[10px] text-emerald-200/80 mt-0.5 truncate">
                      {activeTrip.pickup.area || activeTrip.pickup.campusZone || "Campus Hub"}
                    </p>
                    <p className="text-[9px] text-white/40 font-mono mt-1">
                      GPS: {activeTrip.pickup.lat.toFixed(5)}, {activeTrip.pickup.lng.toFixed(5)}
                    </p>
                  </div>
                </div>

                {/* Connecting Route Distance Indicator */}
                <div className="flex items-center gap-2 pl-4 py-0.5">
                  <div className="w-0.5 h-5 bg-gradient-to-b from-emerald-500 via-indigo-400 to-rose-500 rounded-full"></div>
                  <span className="text-[10px] text-white/50 font-medium">
                    Road Route: {activeTrip.distanceKm || distanceKm || 1.8} km
                  </span>
                </div>

                {/* Destination Location Card */}
                <div className="p-3 rounded-[16px] bg-rose-950/30 border border-rose-500/30 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-[10px] bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center shrink-0 mt-0.5">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[9px] font-black uppercase tracking-wider text-rose-400 px-1.5 py-0.5 rounded bg-rose-500/20 border border-rose-500/30">
                        Drop-off Destination
                      </span>
                      {activeTrip.status === "in_progress" && (
                        <span className="text-[9px] text-cyan-300 font-bold bg-cyan-500/20 px-2 py-0.5 rounded-full border border-cyan-500/30">
                          ⏱️ ~{destEtaMins} min left
                        </span>
                      )}
                    </div>
                    <p className="font-bold text-xs text-white mt-1 leading-snug">
                      {activeTrip.destination.name}
                    </p>
                    <p className="text-[10px] text-rose-200/80 mt-0.5 truncate">
                      {activeTrip.destination.area || activeTrip.destination.campusZone || "Destination Spot"}
                    </p>
                    <p className="text-[9px] text-white/40 font-mono mt-1">
                      GPS: {activeTrip.destination.lat.toFixed(5)}, {activeTrip.destination.lng.toFixed(5)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Real-time Student Bargain Negotiation Panel */}
              <BargainPanel trip={activeTrip} userRole="rider" />

              {/* Driver Details Card (When matched) */}
              {activeTrip.driverId ? (
                <div className="p-4 rounded-[22px] bg-slate-950/80 border border-white/15 shadow-xl space-y-3">
                  {/* Captain Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img
                        src={
                          activeTrip.driverPhoto ||
                          `https://api.dicebear.com/7.x/avataaars/svg?seed=${activeTrip.driverId}`
                        }
                        alt="driver"
                        className="w-12 h-12 rounded-[16px] object-cover border-2 border-emerald-400 shadow-md"
                      />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-bold text-sm text-white">{activeTrip.driverName}</h3>
                          <ShieldCheck className="w-4 h-4 text-emerald-400" />
                        </div>
                        <span className="text-[10px] text-emerald-300 font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30">
                          Verified Campus Captain
                        </span>
                      </div>
                    </div>

                    {activeTrip.driverPhone && (
                      <a
                        href={`tel:${activeTrip.driverPhone}`}
                        className="px-3 py-1.5 rounded-[12px] liquid-glass-btn text-xs font-bold text-emerald-300 hover:text-white flex items-center gap-1.5 cursor-pointer"
                      >
                        Call
                      </a>
                    )}
                  </div>

                  {/* Registered Bike & Plate Card */}
                  <div className="p-3.5 rounded-[18px] bg-white/5 border border-white/10 flex items-center gap-3.5">
                    {/* Bike Photo Thumbnail (Click to zoom) */}
                    <div
                      onClick={() =>
                        setSelectedBikePhotoModal(
                          activeTrip.driverVehicle?.photoUrl ||
                            "https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=800&q=80"
                        )
                      }
                      className="relative w-16 h-16 rounded-[14px] overflow-hidden bg-slate-900 border border-white/20 shrink-0 shadow cursor-pointer group"
                    >
                      <img
                        src={
                          activeTrip.driverVehicle?.photoUrl ||
                          "https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=400&q=80"
                        }
                        alt="Bike Photo"
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[9px] font-bold transition-opacity">
                        View
                      </div>
                    </div>

                    {/* Bike Specs & Authentic Indian Plate */}
                    <div className="flex-1 space-y-1.5 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <h4 className="text-xs font-extrabold text-white truncate">
                          {activeTrip.driverVehicle?.make || "Hero"}{" "}
                          {activeTrip.driverVehicle?.model || "Splendor Plus"}
                        </h4>
                        {activeTrip.driverVehicle?.color && (
                          <span className="text-[10px] text-indigo-300 font-medium shrink-0">
                            {activeTrip.driverVehicle.color}
                          </span>
                        )}
                      </div>

                      {/* AUTHENTIC HSRP NUMBER PLATE */}
                      <div className="inline-flex items-center rounded-[6px] bg-slate-100 text-slate-950 font-mono text-xs border border-slate-400 shadow-sm overflow-hidden font-black tracking-wider">
                        <div className="bg-blue-700 text-white px-1.5 py-0.5 flex flex-col items-center justify-center text-[7px] font-extrabold leading-none border-r border-blue-900 select-none">
                          <span>🇮🇳</span>
                          <span className="text-[6px]">IND</span>
                        </div>
                        <div className="px-2.5 py-0.5 bg-white text-slate-950 uppercase font-bold tracking-widest">
                          {activeTrip.driverVehicle?.licensePlate || "MH 31 CP 2024"}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 text-[10px] text-emerald-300 font-semibold">
                        <ShieldCheck className="w-3 h-3 text-emerald-400 shrink-0" />
                        <span className="truncate">
                          {activeTrip.driverVehicle?.helmetProvided !== false
                            ? "Clean Passenger Helmet Guaranteed"
                            : "Helmet Available on Request"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Safety Matching Notice */}
                  <div className="p-2.5 rounded-[12px] bg-amber-950/40 border border-amber-500/30 text-[11px] text-amber-200/90 flex items-center gap-2">
                    <Info className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                    <span>Match registration number <strong>{activeTrip.driverVehicle?.licensePlate || "MH 31 CP 2024"}</strong> before boarding.</span>
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center space-y-3 liquid-glass-subtle rounded-[20px]">
                  <div className="w-10 h-10 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin mx-auto"></div>
                  <p className="text-xs text-indigo-200">
                    Broadcasting to available campus peer captains...
                  </p>
                </div>
              )}

              {/* Action Buttons: Chat, Share Link, SOS */}
              <div className="grid grid-cols-3 gap-2.5 pt-1">
                <button
                  id="btn-open-trip-chat"
                  onClick={() => setIsChatOpen(true)}
                  disabled={!activeTrip.driverId}
                  className="py-2.5 px-3 rounded-[16px] liquid-glass-btn text-xs font-semibold text-indigo-200 flex items-center justify-center gap-1.5 disabled:opacity-40 cursor-pointer"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Chat</span>
                </button>

                <button
                  id="btn-share-live-trip"
                  onClick={handleShareTrip}
                  className="py-2.5 px-3 rounded-[16px] liquid-glass-btn text-xs font-semibold text-cyan-200 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {copiedShareLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
                  <span>{copiedShareLink ? "Copied!" : "Share"}</span>
                </button>

                <button
                  id="btn-trip-sos"
                  onClick={onOpenSos}
                  className="py-2.5 px-3 rounded-[16px] liquid-glass-sos text-xs font-bold text-white flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <AlertOctagon className="w-4 h-4" />
                  <span>SOS</span>
                </button>
              </div>

              {/* Cancel ride button */}
              {activeTrip.status !== "in_progress" && (
                <button
                  id="btn-cancel-trip"
                  onClick={handleCancelTrip}
                  className="w-full py-2.5 text-xs text-white/50 hover:text-red-400 underline transition-colors cursor-pointer"
                >
                  Cancel Ride Request
                </button>
              )}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Live Interactive Map */}
        <div className="lg:col-span-7 space-y-4">
          <LiveMap
            currentLocation={currentGps}
            pickupPoint={activeTrip ? activeTrip.pickup : pickup}
            destinationPoint={activeTrip ? activeTrip.destination : destination}
            routePolyline={activeTrip?.routePolyline && activeTrip.routePolyline.length > 0 ? activeTrip.routePolyline : routePolyline}
            onlineDrivers={onlineDrivers}
            activeDriverLocation={
              activeTrip?.currentDriverLat && activeTrip?.currentDriverLng
                ? {
                    lat: activeTrip.currentDriverLat,
                    lng: activeTrip.currentDriverLng,
                    heading: activeTrip.currentDriverHeading,
                    speed: activeTrip.currentDriverSpeed,
                  }
                : null
            }
            driverInfo={{
              name: activeTrip?.driverName || undefined,
              photo: activeTrip?.driverPhoto || undefined,
              vehicle: activeTrip?.driverVehicle || undefined,
            }}
            tripStatus={activeTrip?.status}
            campusPoints={campusPoints}
            onSelectLocation={(loc) => {
              if (!pickup) {
                setPickup(loc);
                setPickupQuery(loc.name);
              } else {
                setDestination(loc);
                setDestQuery(loc.name);
              }
            }}
            onMovePickup={async (loc) => {
              let resolvedName = loc.name || "Pinned Pickup Location";
              try {
                const rev = await reverseGeocodeCoords(loc.lat, loc.lng);
                if (rev && rev.name) resolvedName = rev.name;
              } catch {}

              const newPickup: CampusPickupPoint = {
                id: pickup?.id || "custom-pickup",
                name: resolvedName,
                area: loc.landmark || "Nagpur",
                campusZone: "main_zone",
                lat: loc.lat,
                lng: loc.lng,
              };
              setPickup(newPickup);
              setPickupQuery(newPickup.name);
              if (activeTrip) {
                updateTripLocations(
                  activeTrip.id,
                  newPickup,
                  activeTrip.destination,
                  selectedVehicle
                ).catch(() => {});
              }
            }}
            onMoveDestination={async (loc) => {
              let resolvedName = loc.name || "Pinned Drop Destination";
              try {
                const rev = await reverseGeocodeCoords(loc.lat, loc.lng);
                if (rev && rev.name) resolvedName = rev.name;
              } catch {}

              const newDest: CampusPickupPoint = {
                id: destination?.id || "custom-dest",
                name: resolvedName,
                area: loc.landmark || "Nagpur",
                campusZone: "academic_zone",
                lat: loc.lat,
                lng: loc.lng,
              };
              setDestination(newDest);
              setDestQuery(newDest.name);
              if (activeTrip) {
                updateTripLocations(
                  activeTrip.id,
                  activeTrip.pickup,
                  newDest,
                  selectedVehicle
                ).catch(() => {});
              }
            }}
            onMoveDriverLocation={(loc) => {
              if (activeTrip && activeTrip.driverId) {
                updateDriverLocationInTrip(
                  activeTrip.id,
                  activeTrip.driverId,
                  loc.lat,
                  loc.lng,
                  loc.heading || 0,
                  loc.speed || 0
                ).catch(() => {});
              }
            }}
            isDeviationAlert={deviationAlert.isDeviated}
            deviationDistanceMeters={deviationAlert.distance}
          />
        </div>
      </div>

      {/* In-App Chat Drawer */}
      {activeTrip && currentUser && (
        <ChatDrawer
          tripId={activeTrip.id}
          currentUser={{
            uid: currentUser.uid,
            displayName: userProfile?.displayName || "Student Rider",
            role: "rider",
          }}
          otherPartyName={activeTrip.driverName || "Captain"}
          otherPartyRole="driver"
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
        />
      )}

      {/* Trip Complete & Razorpay Checkout Modal */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-2xl">
          <div className="w-full max-w-md rounded-[28px] liquid-glass-panel p-6 shadow-2xl space-y-5">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-[20px] bg-emerald-600/30 border border-emerald-400/40 text-emerald-400 flex items-center justify-center mx-auto shadow-lg">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h2 className="apple-title text-white">Trip Completed</h2>
              <p className="apple-caption">
                You've safely arrived at your campus destination.
              </p>
            </div>

            {!paymentSuccess ? (
              <div className="space-y-4">
                <div className="p-4 rounded-[18px] liquid-glass-subtle space-y-2 text-xs">
                  <div className="flex justify-between text-white/80">
                    <span>Campus Ride Fare</span>
                    <span className="font-bold text-white font-mono text-sm">₹{activeTrip?.fare || fareBreakdown.totalFare}</span>
                  </div>
                  <div className="flex justify-between text-white/60 text-[11px]">
                    <span>Payment Integration</span>
                    <span>Razorpay UPI / Cards</span>
                  </div>
                </div>

                <button
                  id="btn-pay-razorpay"
                  onClick={handlePayNow}
                  disabled={isPaying}
                  className="w-full py-4 rounded-[18px] liquid-glass-primary disabled:opacity-50 text-white font-extrabold text-sm shadow-xl flex items-center justify-center gap-2 cursor-pointer"
                >
                  <CreditCard className="w-4 h-4" />
                  {isPaying ? "Opening Razorpay UPI..." : `Pay ₹${activeTrip?.fare || fareBreakdown.totalFare} via UPI`}
                </button>
              </div>
            ) : (
              /* Two-Way Rating Review Step */
              <div className="space-y-4 pt-2">
                <div className="text-center space-y-1">
                  <p className="text-xs font-bold text-emerald-400">Payment Verified Successfully</p>
                  <p className="text-xs text-white/80">Rate your campus peer captain</p>
                </div>

                <div className="flex items-center justify-center gap-2.5 py-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRatingStars(star)}
                      className="p-1 text-amber-400 hover:scale-125 transition-transform cursor-pointer"
                    >
                      <Star
                        className={`w-7 h-7 ${
                          star <= ratingStars ? "fill-amber-400 text-amber-400" : "text-slate-600"
                        }`}
                      />
                    </button>
                  ))}
                </div>

                <textarea
                  rows={2}
                  value={ratingFeedback}
                  onChange={(e) => setRatingFeedback(e.target.value)}
                  placeholder="Optional review (e.g. 'Smooth and timely ride')..."
                  className="w-full px-3.5 py-2 rounded-[14px] liquid-glass-input text-xs text-white placeholder-white/40"
                />

                <button
                  id="btn-submit-rider-rating"
                  onClick={handleRatingSubmit}
                  className="w-full py-3.5 rounded-[16px] liquid-glass-emerald text-white font-bold text-xs shadow-lg cursor-pointer"
                >
                  {ratingSubmitted ? "Feedback Submitted!" : "Submit Rating & Finish"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      {/* Full-Screen Bike Photo Lightbox Modal */}
      {selectedBikePhotoModal && (
        <div
          onClick={() => setSelectedBikePhotoModal(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-lg w-full rounded-[28px] overflow-hidden bg-slate-900 border border-white/20 shadow-2xl space-y-3 p-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bike className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-bold text-white">Captain's Registered Bike</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBikePhotoModal(null)}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="rounded-[20px] overflow-hidden bg-black max-h-[65vh] flex items-center justify-center border border-white/10">
              <img
                src={selectedBikePhotoModal}
                alt="Captain's Bike"
                className="w-full h-auto object-contain"
              />
            </div>

            <p className="text-[11px] text-center text-white/60">
              Check this bike model and plate when the captain arrives at your gate.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
