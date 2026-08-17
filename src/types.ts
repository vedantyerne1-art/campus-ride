export type UserRole = 'rider' | 'driver' | 'admin';
export type VerificationTier = 'tier1_student_staff' | 'tier2_community';
export type VerificationStatus = 'unsubmitted' | 'pending' | 'approved' | 'rejected';
export type VehicleType = 'bike' | 'auto' | 'car' | 'ev_scooter';

export interface BargainOffer {
  proposedBy: 'student' | 'driver';
  amount: number;
  originalAmount: number;
  status: 'pending' | 'accepted' | 'rejected' | 'countered';
  counterAmount?: number;
  note?: string;
  timestamp: string;
  approvedAt?: string;
}

export interface CustomPricing {
  baseFare: number;
  perKm: number;
  minFare: number;
}

export interface VehicleDetails {
  type: VehicleType;
  make: string;
  model: string;
  licensePlate: string;
  color?: string;
  photoUrl?: string;
  rcDocUrl?: string;
  helmetProvided?: boolean;
}

export interface EmergencyContact {
  name: string;
  phone: string;
  relation: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  phoneNumber?: string;
  role: UserRole;
  tier: VerificationTier;
  verificationStatus: VerificationStatus;
  rejectionReason?: string;
  
  // Safety & Identity Demographics
  age?: number;
  dateOfBirth?: string;
  gender?: 'female' | 'male' | 'other' | 'prefer_not_to_say';
  collegeName?: string;
  department?: string;
  studyYear?: string;
  studentStaffId?: string;
  
  // Verification Documents
  idCardDocUrl?: string;
  selfieDocUrl?: string;
  govtIdType?: 'aadhaar' | 'driving_license' | 'voter_id' | 'passport';
  govtIdNumber?: string;
  govtIdDocUrl?: string;
  
  // Driver specific verification
  drivingLicenseNumber?: string;
  drivingLicenseDocUrl?: string;
  vehicleDetails?: VehicleDetails;
  customPricing?: CustomPricing;
  
  // Safety & Compliance
  safetyGuidelinesAccepted?: boolean;
  hasCompletedRoleSelection?: boolean;
  emergencyContact?: EmergencyContact;
  
  // Reputation & Ledger
  trustScore: number;
  ratingAverage: number;
  ratingCount: number;
  totalTripsCompleted: number;
  walletBalance: number;
  createdAt: string;
  updatedAt?: string;
}

export interface CampusPickupPoint {
  id: string;
  name: string;
  area: string;
  campusZone: string;
  lat: number;
  lng: number;
  isPopular?: boolean;
}

export interface DriverOnlineRecord {
  driverId: string;
  driverName: string;
  driverPhoto?: string;
  phoneNumber?: string;
  tier: VerificationTier;
  trustScore: number;
  ratingAverage: number;
  vehicle: VehicleDetails;
  customPricing?: CustomPricing;
  lat: number;
  lng: number;
  heading: number;
  speed?: number;
  isAvailable: boolean;
  activeTripId?: string | null;
  lastUpdated: string;
}

export type TripStatus =
  | 'searching'
  | 'assigned'
  | 'en_route'
  | 'arrived'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export interface TripLocation {
  name: string;
  lat: number;
  lng: number;
  address?: string;
}

export interface FareBreakdown {
  baseFare: number;
  distanceKm: number;
  perKmRate: number;
  subtotal: number;
  platformCommission: number;
  gst: number;
  totalFare: number;
  driverNet: number;
}

export interface RoutePoint {
  lat: number;
  lng: number;
}

export interface TripRecord {
  id: string;
  riderId: string;
  riderName: string;
  riderPhoto?: string;
  riderTier: VerificationTier;
  riderPhone?: string;
  driverId?: string | null;
  driverName?: string | null;
  driverPhoto?: string | null;
  driverPhone?: string | null;
  driverVehicle?: VehicleDetails | null;
  pickup: TripLocation;
  destination: TripLocation;
  status: TripStatus;
  otpPin: string; // 4-digit PIN for pickup verification
  fare: number;
  originalFare?: number;
  bargainOffer?: BargainOffer | null;
  isBargainApproved?: boolean;
  fareBreakdown?: FareBreakdown;
  distanceKm: number;
  durationMins: number;
  routePolyline?: RoutePoint[] | [number, number][];
  currentDriverLat?: number;
  currentDriverLng?: number;
  currentDriverHeading?: number;
  currentDriverSpeed?: number;
  paymentStatus: 'pending' | 'paid' | 'failed';
  paymentDetails?: {
    orderId: string;
    paymentId: string;
    method: 'upi' | 'card' | 'wallet';
    paidAt: string;
  };
  timestamps: {
    requestedAt: string;
    assignedAt?: string;
    arrivedAt?: string;
    startedAt?: string;
    completedAt?: string;
    cancelledAt?: string;
  };
  riderRated?: boolean;
  driverRated?: boolean;
  routeDeviations?: {
    detectedAt: string;
    distanceOffTrackMeters: number;
  }[];
  sosTriggered?: boolean;
}

export interface ChatMessage {
  id: string;
  tripId: string;
  senderId: string;
  senderName: string;
  senderRole: 'rider' | 'driver';
  text: string;
  timestamp: string;
}

export interface SosAlert {
  id: string;
  tripId?: string;
  triggeredBy: {
    uid: string;
    name: string;
    role: UserRole;
    phone?: string;
  };
  lat: number;
  lng: number;
  address?: string;
  status: 'active' | 'investigating' | 'resolved';
  notes?: string;
  timestamp: string;
}

export interface SafetyReport {
  id: string;
  tripId?: string;
  reporterId: string;
  reporterName: string;
  reportedUserId: string;
  reportedUserName: string;
  category: 'reckless_driving' | 'inappropriate_behavior' | 'wrong_route' | 'overcharging' | 'other';
  description: string;
  status: 'pending' | 'reviewed' | 'action_taken';
  adminNotes?: string;
  timestamp: string;
}

export interface RatingRecord {
  id: string;
  tripId: string;
  fromUserId: string;
  toUserId: string;
  rating: number; // 1-5
  tags?: string[];
  feedback?: string;
  createdAt: string;
}

export interface PayoutRequest {
  id: string;
  driverId: string;
  driverName: string;
  amount: number;
  method: 'UPI' | 'IMPS_BANK';
  upiId?: string;
  bankDetails?: {
    accountHolder: string;
    accountNumber: string;
    ifsc: string;
  };
  status: 'pending' | 'processed' | 'rejected';
  payoutReference?: string;
  requestedAt: string;
  processedAt?: string;
}
