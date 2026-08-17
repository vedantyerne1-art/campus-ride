import {
  db,
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  addDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  cleanForFirestore,
} from "../lib/firebase";
import { SosAlert, SafetyReport, RatingRecord, UserProfile } from "../types";

// Compute Real Trust Score (0 - 100)
export function computeTrustScore(profile: {
  tier?: string;
  verificationStatus?: string;
  ratingAverage?: number;
  totalTripsCompleted?: number;
  unresolvedReportsCount?: number;
}): number {
  let score = 20; // baseline

  // 1. Verification Tier
  if (profile.tier === "tier1_student_staff") {
    score += 25;
  } else if (profile.tier === "tier2_community") {
    score += 15;
  }

  // 2. ID Verification Status
  if (profile.verificationStatus === "approved") {
    score += 25;
  } else if (profile.verificationStatus === "pending") {
    score += 5;
  }

  // 3. User Ratings (max 20 pts)
  const rating = profile.ratingAverage || 5.0;
  score += Math.round((rating / 5.0) * 20);

  // 4. Completed Trip History (max 10 pts)
  const trips = profile.totalTripsCompleted || 0;
  score += Math.min(10, Math.round(trips * 1.5));

  // 5. Penalties for safety reports
  if (profile.unresolvedReportsCount && profile.unresolvedReportsCount > 0) {
    score -= profile.unresolvedReportsCount * 20;
  }

  return Math.max(10, Math.min(100, score));
}

// Trigger SOS Emergency Alert in Firestore
export async function triggerSosAlert(params: {
  tripId?: string;
  triggeredBy: {
    uid: string;
    name: string;
    role: "rider" | "driver" | "admin";
    phone?: string;
  };
  lat: number;
  lng: number;
  address?: string;
}): Promise<string> {
  const alertId = `sos_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  
  const alertData: SosAlert = {
    id: alertId,
    tripId: params.tripId,
    triggeredBy: params.triggeredBy,
    lat: params.lat,
    lng: params.lng,
    address: params.address || `Lat ${params.lat.toFixed(4)}, Lng ${params.lng.toFixed(4)}`,
    status: "active",
    timestamp: new Date().toISOString(),
  };

  await setDoc(doc(db, "sosAlerts", alertId), cleanForFirestore(alertData));

  // If inside an active trip, flag trip as SOS triggered
  if (params.tripId) {
    await updateDoc(doc(db, "trips", params.tripId), {
      sosTriggered: true,
    }).catch(console.error);
  }

  return alertId;
}

// Resolve SOS Alert
export async function resolveSosAlert(alertId: string, notes?: string): Promise<void> {
  await updateDoc(doc(db, "sosAlerts", alertId), {
    status: "resolved",
    notes: notes || "Resolved by campus safety team",
  });
}

// Submit Safety Incident Report
export async function submitSafetyReport(report: Omit<SafetyReport, "id" | "status" | "timestamp">): Promise<string> {
  const reportId = `rep_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  await setDoc(doc(db, "reports", reportId), cleanForFirestore({
    ...report,
    id: reportId,
    status: "pending",
    timestamp: new Date().toISOString(),
  }));
  return reportId;
}

// Submit Two-Way Trip Rating
export async function submitTripRating(params: {
  tripId: string;
  fromUserId: string;
  toUserId: string;
  rating: number; // 1-5
  tags?: string[];
  feedback?: string;
  isRiderRatingDriver?: boolean;
}): Promise<void> {
  const ratingId = `rate_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  
  // 1. Add rating record
  await setDoc(doc(db, "ratings", ratingId), cleanForFirestore({
    id: ratingId,
    tripId: params.tripId,
    fromUserId: params.fromUserId,
    toUserId: params.toUserId,
    rating: params.rating,
    tags: params.tags || [],
    feedback: params.feedback || "",
    createdAt: new Date().toISOString(),
  }));

  // 2. Mark trip rating completed
  if (params.isRiderRatingDriver) {
    await updateDoc(doc(db, "trips", params.tripId), { riderRated: true });
  } else {
    await updateDoc(doc(db, "trips", params.tripId), { driverRated: true });
  }

  // 3. Update target user profile ratingAverage and ratingCount
  const targetUserRef = doc(db, "users", params.toUserId);
  const snap = await getDoc(targetUserRef);
  if (snap.exists()) {
    const data = snap.data() as UserProfile;
    const currentCount = data.ratingCount || 0;
    const currentAvg = data.ratingAverage || 5.0;
    const newCount = currentCount + 1;
    const newAvg = Math.round(((currentAvg * currentCount + params.rating) / newCount) * 10) / 10;
    
    // Recompute trust score with updated rating
    const updatedTrustScore = computeTrustScore({
      tier: data.tier,
      verificationStatus: data.verificationStatus,
      ratingAverage: newAvg,
      totalTripsCompleted: data.totalTripsCompleted,
    });

    await updateDoc(targetUserRef, {
      ratingAverage: newAvg,
      ratingCount: newCount,
      trustScore: updatedTrustScore,
    });
  }
}
