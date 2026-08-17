import {
  db,
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  addDoc,
  serverTimestamp,
  cleanForFirestore,
} from "../lib/firebase";
import {
  TripRecord,
  TripStatus,
  TripLocation,
  FareBreakdown,
  ChatMessage,
  VehicleType,
  BargainOffer,
  CustomPricing,
} from "../types";

// Fare rates for college campus economics (Captain defaults)
export const VEHICLE_RATES: Record<
  VehicleType,
  { baseFare: number; perKm: number; minFare: number; label: string; icon: string }
> = {
  bike: { baseFare: 15, perKm: 7, minFare: 20, label: "Campus Bike", icon: "Bike" },
  ev_scooter: { baseFare: 12, perKm: 6, minFare: 18, label: "Campus EV", icon: "Zap" },
  auto: { baseFare: 25, perKm: 11, minFare: 30, label: "Campus Auto", icon: "Car" },
  car: { baseFare: 40, perKm: 16, minFare: 50, label: "Carpool Cab", icon: "Car" },
};

// Calculate Fare Breakdown with 10% platform commission & 5% GST
// Rate is set by rider/captain with optional custom pricing
export function calculateFare(
  distanceKm: number,
  vehicleType: VehicleType = "bike",
  customPricing?: CustomPricing
): FareBreakdown {
  const rate = customPricing
    ? {
        baseFare: customPricing.baseFare,
        perKm: customPricing.perKm,
        minFare: customPricing.minFare || customPricing.baseFare,
      }
    : VEHICLE_RATES[vehicleType] || VEHICLE_RATES.bike;

  const rawDistanceFare = distanceKm * rate.perKm;
  const subtotal = Math.max(rate.minFare, Math.round((rate.baseFare + rawDistanceFare) * 10) / 10);
  
  const platformCommission = Math.round(subtotal * 0.10 * 10) / 10;
  const gst = Math.round(platformCommission * 0.05 * 10) / 10;
  const totalFare = Math.round(subtotal + gst);
  const driverNet = Math.round((totalFare - platformCommission - gst) * 10) / 10;

  return {
    baseFare: rate.baseFare,
    distanceKm,
    perKmRate: rate.perKm,
    subtotal,
    platformCommission,
    gst,
    totalFare,
    driverNet,
  };
}

// Search and Geocode real world locations via server proxy or Nominatim
export async function searchGeocodedLocations(
  queryText: string
): Promise<Array<{ id: string; name: string; displayName: string; lat: number; lng: number; suburb?: string }>> {
  if (!queryText || !queryText.trim()) return [];
  const q = queryText.trim();

  // 1. Try server proxy endpoint
  try {
    const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`);
    if (res.ok) {
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        return data.results.map((r: any) => ({
          id: r.id,
          name: r.name,
          displayName: r.displayName,
          lat: r.lat,
          lng: r.lng,
          suburb: r.address?.suburb || r.address?.road || r.address?.city,
        }));
      }
    }
  } catch (e) {
    // Proceed to direct Nominatim fallback
  }

  // 2. Direct Nominatim fallback
  try {
    const directRes = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&addressdetails=1&limit=6`,
      {
        headers: {
          "Accept-Language": "en-IN,en;q=0.9",
        },
      }
    );
    if (directRes.ok) {
      const directData = await directRes.json();
      if (Array.isArray(directData) && directData.length > 0) {
        return directData.map((item: any) => {
          const addr = item.address || {};
          const shortName =
            addr.amenity ||
            addr.building ||
            addr.college ||
            addr.university ||
            addr.hospital ||
            addr.shop ||
            addr.road ||
            item.display_name.split(",")[0];
          return {
            id: String(item.place_id || `${item.lat}_${item.lon}`),
            name: shortName,
            displayName: item.display_name,
            lat: parseFloat(item.lat),
            lng: parseFloat(item.lon),
            suburb: addr.suburb || addr.road || addr.city,
          };
        });
      }
    }
  } catch (err) {
    console.warn("Direct geocode fallback failed:", err);
  }

  return [];
}

// Reverse Geocode latitude & longitude to human-readable address
export async function reverseGeocodeCoords(
  lat: number,
  lng: number
): Promise<{ name: string; displayName: string }> {
  // 1. Try server proxy endpoint
  try {
    const res = await fetch(`/api/reverse-geocode?lat=${lat}&lng=${lng}`);
    if (res.ok) {
      const data = await res.json();
      if (data.name) {
        return {
          name: data.name,
          displayName: data.displayName || data.name,
        };
      }
    }
  } catch (e) {
    // Fallback below
  }

  // 2. Direct Nominatim reverse geocode fallback
  try {
    const directRes = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`,
      {
        headers: { "Accept-Language": "en-IN,en;q=0.9" },
      }
    );
    if (directRes.ok) {
      const data = await directRes.json();
      const addr = data.address || {};
      const shortName =
        addr.amenity ||
        addr.building ||
        addr.college ||
        addr.university ||
        addr.road ||
        addr.suburb ||
        data.display_name?.split(",")[0] ||
        "Pinned Location";
      return {
        name: shortName,
        displayName: data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
      };
    }
  } catch (err) {
    console.warn("Direct reverse geocode fallback failed:", err);
  }

  return {
    name: "Pinned Location",
    displayName: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
  };
}

// Fetch real turn-by-turn road route from server API
export async function getDirections(
  start: { lat: number; lng: number },
  end: { lat: number; lng: number }
): Promise<{
  distanceKm: number;
  durationMins: number;
  coordinates: [number, number][];
  steps: { instruction: string; distance: number; duration: number }[];
}> {
  try {
    const res = await fetch(
      `/api/directions?startLat=${start.lat}&startLng=${start.lng}&endLat=${end.lat}&endLng=${end.lng}`
    );
    if (!res.ok) throw new Error("Directions request failed");
    const data = await res.json();
    return {
      distanceKm: data.distanceKm || 1.8,
      durationMins: data.durationMins || 5,
      coordinates: data.coordinates || [[start.lat, start.lng], [end.lat, end.lng]],
      steps: data.steps || [],
    };
  } catch (err) {
    console.warn("Failed fetching directions via proxy, computing straight line:", err);
    // Haversine fallback
    const dist = calculateHaversineDistance(start.lat, start.lng, end.lat, end.lng);
    return {
      distanceKm: Math.round(dist * 1.2 * 10) / 10,
      durationMins: Math.max(3, Math.round(dist * 3.5)),
      coordinates: [
        [start.lat, start.lng],
        [end.lat, end.lng],
      ],
      steps: [{ instruction: "Proceed towards destination", distance: Math.round(dist * 1000), duration: 180 }],
    };
  }
}

// Generate random 4-digit PIN for ride pickup verification
export function generateOtpPin(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

// Normalizer helper: Convert any format of polyline (array of [lat, lng] or array of {lat, lng}) to [number, number][]
export function normalizeRoutePolyline(polyline?: any): [number, number][] {
  if (!polyline || !Array.isArray(polyline)) return [];
  return polyline
    .map((pt) => {
      if (Array.isArray(pt)) {
        return [Number(pt[0]), Number(pt[1])] as [number, number];
      }
      if (pt && typeof pt === "object") {
        const lat = Number(pt.lat ?? pt.latitude ?? 0);
        const lng = Number(pt.lng ?? pt.longitude ?? 0);
        return [lat, lng] as [number, number];
      }
      return null;
    })
    .filter((pt): pt is [number, number] => pt !== null && !isNaN(pt[0]) && !isNaN(pt[1]) && (pt[0] !== 0 || pt[1] !== 0));
}

// Request a new ride in Firestore
export async function createTripRequest(params: {
  riderId: string;
  riderName: string;
  riderPhoto?: string;
  riderTier: "tier1_student_staff" | "tier2_community";
  riderPhone?: string;
  pickup: TripLocation;
  destination: TripLocation;
  vehicleType: VehicleType;
}): Promise<string> {
  const directions = await getDirections(params.pickup, params.destination);
  const fareBreakdown = calculateFare(directions.distanceKm, params.vehicleType);
  const otpPin = generateOtpPin();
  const tripId = `trip_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  // Convert coordinate array of arrays [[lat, lng], ...] into array of objects [{ lat, lng }, ...]
  // to guarantee 100% compliance with Firestore nested array restrictions
  const polylinePoints = (directions.coordinates || []).map((coord) => ({
    lat: coord[0],
    lng: coord[1],
  }));

  const tripData: TripRecord = {
    id: tripId,
    riderId: params.riderId,
    riderName: params.riderName,
    riderPhoto: params.riderPhoto,
    riderTier: params.riderTier,
    riderPhone: params.riderPhone,
    pickup: params.pickup,
    destination: params.destination,
    status: "searching",
    otpPin,
    fare: fareBreakdown.totalFare,
    originalFare: fareBreakdown.totalFare,
    fareBreakdown,
    distanceKm: directions.distanceKm,
    durationMins: directions.durationMins,
    routePolyline: polylinePoints,
    paymentStatus: "pending",
    timestamps: {
      requestedAt: new Date().toISOString(),
    },
  };

  await setDoc(doc(db, "trips", tripId), cleanForFirestore(tripData));
  return tripId;
}

// Driver accepts ride
export async function acceptTrip(
  tripId: string,
  driver: {
    driverId: string;
    driverName: string;
    driverPhoto?: string;
    driverPhone?: string;
    driverVehicle: any;
    currentLat: number;
    currentLng: number;
  }
): Promise<void> {
  const tripRef = doc(db, "trips", tripId);
  await updateDoc(tripRef, {
    driverId: driver.driverId,
    driverName: driver.driverName,
    driverPhoto: driver.driverPhoto || null,
    driverPhone: driver.driverPhone || null,
    driverVehicle: driver.driverVehicle || null,
    currentDriverLat: driver.currentLat,
    currentDriverLng: driver.currentLng,
    status: "assigned",
    "timestamps.assignedAt": new Date().toISOString(),
  });

  // Mark driver active trip
  await updateDoc(doc(db, "drivers", driver.driverId), {
    activeTripId: tripId,
    isAvailable: false,
    lastUpdated: new Date().toISOString(),
  });
}

// Update trip state (en_route, arrived, etc.)
export async function updateTripStatus(tripId: string, status: TripStatus): Promise<void> {
  const tripRef = doc(db, "trips", tripId);
  const updatePayload: any = { status };
  
  if (status === "arrived") updatePayload["timestamps.arrivedAt"] = new Date().toISOString();
  if (status === "in_progress") updatePayload["timestamps.startedAt"] = new Date().toISOString();
  if (status === "completed") updatePayload["timestamps.completedAt"] = new Date().toISOString();
  if (status === "cancelled") updatePayload["timestamps.cancelledAt"] = new Date().toISOString();

  await updateDoc(tripRef, updatePayload);
}

// Driver enters OTP PIN to start the ride
export async function verifyOtpAndStartRide(tripId: string, inputPin: string): Promise<{ success: boolean; message: string }> {
  const tripRef = doc(db, "trips", tripId);
  const snap = await getDoc(tripRef);
  if (!snap.exists()) {
    return { success: false, message: "Trip not found" };
  }

  const trip = snap.data() as TripRecord;
  if (trip.otpPin !== inputPin.trim()) {
    return { success: false, message: "Incorrect OTP PIN. Please ask the rider for the 4-digit code." };
  }

  await updateDoc(tripRef, {
    status: "in_progress",
    "timestamps.startedAt": new Date().toISOString(),
  });

  return { success: true, message: "OTP Verified! Trip started successfully." };
}

// Calculate Bearing (in degrees 0-360) from point A to point B
export function calculateBearing(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const lat1Rad = (lat1 * Math.PI) / 180;
  const lat2Rad = (lat2 * Math.PI) / 180;
  const y = Math.sin(dLon) * Math.cos(lat2Rad);
  const x =
    Math.cos(lat1Rad) * Math.sin(lat2Rad) -
    Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);
  let brng = (Math.atan2(y, x) * 180) / Math.PI;
  return (brng + 360) % 360;
}

// Calculate distance in meters using Haversine formula
export function getDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

// Driver updates live position
export async function updateDriverLocationInTrip(
  tripId: string,
  driverId: string,
  lat: number,
  lng: number,
  heading: number = 0,
  speed: number = 0
): Promise<void> {
  // Update in driver registry
  await updateDoc(doc(db, "drivers", driverId), {
    lat,
    lng,
    heading,
    speed,
    lastUpdated: new Date().toISOString(),
  }).catch(() => {});

  // Update in active trip document
  if (tripId) {
    await updateDoc(doc(db, "trips", tripId), {
      currentDriverLat: lat,
      currentDriverLng: lng,
      currentDriverHeading: heading,
      currentDriverSpeed: speed,
    }).catch(() => {});
  }
}

// Update trip pickup and/or destination in real time and recalculate route
export async function updateTripLocations(
  tripId: string,
  pickup: TripLocation,
  destination: TripLocation,
  vehicleType: VehicleType = "bike"
): Promise<{ distanceKm: number; durationMins: number; fareBreakdown: FareBreakdown }> {
  const directions = await getDirections(pickup, destination);
  const fareBreakdown = calculateFare(directions.distanceKm, vehicleType);

  const polylinePoints = (directions.coordinates || []).map((coord) => ({
    lat: coord[0],
    lng: coord[1],
  }));

  if (tripId) {
    await updateDoc(doc(db, "trips", tripId), {
      pickup,
      destination,
      distanceKm: directions.distanceKm,
      durationMins: directions.durationMins,
      routePolyline: polylinePoints,
      fareBreakdown,
      baseFare: fareBreakdown.baseFare,
      fare: fareBreakdown.totalFare,
    }).catch(() => {});
  }

  return {
    distanceKm: directions.distanceKm,
    durationMins: directions.durationMins,
    fareBreakdown,
  };
}

// Send chat message
export async function sendChatMessage(
  tripId: string,
  sender: { id: string; name: string; role: "rider" | "driver" },
  text: string
): Promise<void> {
  if (!text.trim()) return;
  const messagesCol = collection(db, "trips", tripId, "messages");
  await addDoc(messagesCol, {
    tripId,
    senderId: sender.id,
    senderName: sender.name,
    senderRole: sender.role,
    text: text.trim(),
    timestamp: new Date().toISOString(),
  });
}

// Listen to chat messages in real time
export function subscribeTripMessages(
  tripId: string,
  callback: (messages: ChatMessage[]) => void
): () => void {
  const messagesCol = collection(db, "trips", tripId, "messages");
  const q = query(messagesCol, orderBy("timestamp", "asc"));
  return onSnapshot(
    q,
    (snap) => {
      const msgs: ChatMessage[] = [];
      snap.forEach((d) => msgs.push({ ...(d.data() as ChatMessage), id: d.id }));
      callback(msgs);
    },
    (err) => {
      console.warn("Trip messages snapshot warning:", err);
    }
  );
}

// Haversine Distance helper (km)
export function calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100;
}

// Real-time Route Deviation Checker:
// Check minimum distance from driver position to any point in the planned polyline
export function checkRouteDeviation(
  driverLat: number,
  driverLng: number,
  polyline?: any,
  thresholdMeters: number = 250
): { isDeviated: boolean; distanceOffTrackMeters: number } {
  const normalized = normalizeRoutePolyline(polyline);
  if (!normalized || normalized.length === 0) return { isDeviated: false, distanceOffTrackMeters: 0 };

  let minDistanceMeters = Infinity;
  for (const point of normalized) {
    const distKm = calculateHaversineDistance(driverLat, driverLng, point[0], point[1]);
    const distMeters = distKm * 1000;
    if (distMeters < minDistanceMeters) {
      minDistanceMeters = distMeters;
    }
  }

  return {
    isDeviated: minDistanceMeters > thresholdMeters,
    distanceOffTrackMeters: Math.round(minDistanceMeters),
  };
}

// Student proposes a bargain/counter price to the Captain
export async function proposeBargainOffer(
  tripId: string,
  offer: {
    proposedBy: "student" | "driver";
    amount: number;
    originalAmount: number;
    note?: string;
  }
): Promise<void> {
  const tripRef = doc(db, "trips", tripId);
  const bargainData: BargainOffer = {
    proposedBy: offer.proposedBy,
    amount: Math.round(offer.amount),
    originalAmount: Math.round(offer.originalAmount),
    status: "pending",
    note: offer.note || undefined,
    timestamp: new Date().toISOString(),
  };

  await updateDoc(tripRef, {
    bargainOffer: cleanForFirestore(bargainData),
  });
}

// Captain approves the student's bargain offer as the final trip fare
export async function approveBargainOffer(
  tripId: string,
  finalAmount: number,
  originalFare?: number
): Promise<void> {
  const tripRef = doc(db, "trips", tripId);
  const amount = Math.round(finalAmount);

  // Recalculate platform commission & net driver earnings for the final approved amount
  const platformCommission = Math.round(amount * 0.10 * 10) / 10;
  const gst = Math.round(platformCommission * 0.05 * 10) / 10;
  const driverNet = Math.round((amount - platformCommission - gst) * 10) / 10;

  await updateDoc(tripRef, {
    fare: amount,
    isBargainApproved: true,
    "bargainOffer.status": "accepted",
    "bargainOffer.approvedAt": new Date().toISOString(),
    "fareBreakdown.totalFare": amount,
    "fareBreakdown.subtotal": amount - gst,
    "fareBreakdown.platformCommission": platformCommission,
    "fareBreakdown.gst": gst,
    "fareBreakdown.driverNet": driverNet,
  });
}

// Captain rejects the bargain offer and keeps the original fare
export async function rejectBargainOffer(tripId: string): Promise<void> {
  const tripRef = doc(db, "trips", tripId);
  await updateDoc(tripRef, {
    "bargainOffer.status": "rejected",
  });
}

// Captain counters the student's bargain with a middle amount
export async function counterBargainOffer(
  tripId: string,
  counterAmount: number
): Promise<void> {
  const tripRef = doc(db, "trips", tripId);
  await updateDoc(tripRef, {
    "bargainOffer.status": "countered",
    "bargainOffer.counterAmount": Math.round(counterAmount),
    "bargainOffer.timestamp": new Date().toISOString(),
  });
}

// Update Captain's custom pricing card in their profile & active online state
export async function updateCaptainPricing(
  driverId: string,
  pricing: CustomPricing
): Promise<void> {
  // Update in user profile
  await updateDoc(doc(db, "users", driverId), {
    customPricing: cleanForFirestore(pricing),
    updatedAt: new Date().toISOString(),
  }).catch(() => {});

  // Update in online drivers collection
  await updateDoc(doc(db, "drivers", driverId), {
    customPricing: cleanForFirestore(pricing),
    lastUpdated: new Date().toISOString(),
  }).catch(() => {});
}

