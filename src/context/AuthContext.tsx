import React, { createContext, useContext, useEffect, useState } from "react";
import {
  auth,
  db,
  googleProvider,
  signInWithPopup,
  signInAnonymously,
  firebaseSignOut,
  onAuthStateChanged,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  FirebaseUser,
  cleanForFirestore,
} from "../lib/firebase";
import { UserProfile, UserRole, VerificationTier, VerificationStatus } from "../types";
import { computeTrustScore } from "../services/safetyService";

export interface AuthUser {
  uid: string;
  email?: string | null;
  displayName?: string | null;
  photoURL?: string | null;
  phoneNumber?: string | null;
}

interface AuthContextType {
  currentUser: AuthUser | null;
  userProfile: UserProfile | null;
  loading: boolean;
  activeRole: UserRole;
  setActiveRole: (role: UserRole) => void;
  signInWithGoogle: () => Promise<void>;
  signInWithDemo: (role?: UserRole, name?: string, email?: string) => Promise<void>;
  signInWithPhoneOtpSession: (phone: string) => Promise<void>;
  signInWithRealEmailSession: (email: string, role?: UserRole, name?: string, photoURL?: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateUserProfile: (data: Partial<UserProfile>) => Promise<void>;
  submitVerification: (data: {
    tier: VerificationTier;
    age?: number;
    dateOfBirth?: string;
    gender?: 'female' | 'male' | 'other' | 'prefer_not_to_say';
    collegeName?: string;
    department?: string;
    studyYear?: string;
    studentStaffId?: string;
    idCardDocUrl?: string;
    selfieDocUrl?: string;
    govtIdType?: 'aadhaar' | 'driving_license' | 'voter_id' | 'passport';
    govtIdNumber?: string;
    govtIdDocUrl?: string;
    drivingLicenseNumber?: string;
    drivingLicenseDocUrl?: string;
    vehicleDetails?: any;
    safetyGuidelinesAccepted?: boolean;
    emergencyContact?: { name: string; phone: string; relation: string };
  }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const DEMO_USER_KEY = "campussathi_demo_user";
const DEMO_PROFILE_KEY = "campussathi_demo_profile";

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => {
    try {
      const saved = localStorage.getItem(DEMO_USER_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [userProfile, setUserProfile] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem(DEMO_PROFILE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(true);
  const [activeRole, setActiveRoleState] = useState<UserRole>(() => {
    try {
      const saved = localStorage.getItem(DEMO_PROFILE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.role) return parsed.role;
      }
    } catch {}
    return "rider";
  });

  const setActiveRole = (role: UserRole) => {
    setActiveRoleState(role);
    if (userProfile) {
      const updated = { ...userProfile, role };
      setUserProfile(updated);
      try {
        localStorage.setItem(DEMO_PROFILE_KEY, JSON.stringify(updated));
      } catch {}
      if (currentUser) {
        updateDoc(doc(db, "users", currentUser.uid), cleanForFirestore({ role })).catch(console.warn);
      }
    }
  };

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const authUser: AuthUser = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          phoneNumber: user.phoneNumber,
        };
        setCurrentUser(authUser);
        try {
          localStorage.setItem(DEMO_USER_KEY, JSON.stringify(authUser));
        } catch {}

        // Listen to User Profile in Firestore
        const userDocRef = doc(db, "users", user.uid);
        const unsubProfile = onSnapshot(
          userDocRef,
          async (docSnap) => {
            if (docSnap.exists()) {
              let data = docSnap.data() as UserProfile;
              
              // Check if previously verified on this device
              const isLocallyVerified = localStorage.getItem(`campussathi_verified_${user.uid}`) === "true" ||
                                        localStorage.getItem("campussathi_verified_device") === "true";
              
              if (isLocallyVerified && data.verificationStatus !== "rejected") {
                data = {
                  ...data,
                  verificationStatus: "approved",
                  trustScore: Math.max(data.trustScore || 0, 95),
                };
              }

              setUserProfile(data);
              try {
                localStorage.setItem(DEMO_PROFILE_KEY, JSON.stringify(data));
              } catch {}
              if (data.role) {
                setActiveRoleState(data.role);
              }
            } else {
              // Check device cache for previous verification
              const isLocallyVerified = localStorage.getItem(`campussathi_verified_${user.uid}`) === "true" ||
                                        localStorage.getItem("campussathi_verified_device") === "true";

              // First-time user profile creation
              const initialProfile: UserProfile = {
                uid: user.uid,
                email: user.email || "",
                displayName: user.displayName || "Campus Member",
                photoURL: user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`,
                phoneNumber: user.phoneNumber || "",
                role: "rider",
                tier: "tier1_student_staff",
                verificationStatus: isLocallyVerified ? "approved" : "unsubmitted",
                trustScore: isLocallyVerified ? 96 : 40,
                ratingAverage: 5.0,
                ratingCount: 0,
                totalTripsCompleted: 0,
                walletBalance: 0,
                createdAt: new Date().toISOString(),
              };
              await setDoc(userDocRef, cleanForFirestore(initialProfile)).catch(console.warn);
              setUserProfile(initialProfile);
              try {
                localStorage.setItem(DEMO_PROFILE_KEY, JSON.stringify(initialProfile));
              } catch {}
            }
            setLoading(false);
          },
          (err) => {
            console.warn("User profile snapshot warning:", err);
            setLoading(false);
          }
        );

        return () => unsubProfile();
      } else {
        // If not authenticated in Firebase, check if demo session exists
        const savedUser = localStorage.getItem(DEMO_USER_KEY);
        const savedProf = localStorage.getItem(DEMO_PROFILE_KEY);
        if (!savedUser || !savedProf) {
          setCurrentUser(null);
          setUserProfile(null);
        }
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const signInWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      console.error("Google sign in error:", error);
      throw error;
    }
  };

  const signInWithPhoneOtpSession = async (phone: string) => {
    let uid = `phone_user_${Date.now()}`;
    try {
      const userCred = await signInAnonymously(auth);
      if (userCred.user) {
        uid = userCred.user.uid;
      }
    } catch (err) {
      console.info("Anonymous auth fallback to instant session:", err);
    }

    const authUser: AuthUser = {
      uid,
      email: `student_${phone.slice(-4)}@campus.edu`,
      displayName: `Campus Student (${phone.slice(-4)})`,
      phoneNumber: `+91 ${phone}`,
      photoURL: `https://api.dicebear.com/7.x/avataaars/svg?seed=${uid}`,
    };

    const newProf: UserProfile = {
      uid,
      email: authUser.email || "",
      displayName: authUser.displayName || "Campus Student",
      phoneNumber: `+91 ${phone}`,
      photoURL: authUser.photoURL,
      role: "rider",
      tier: "tier1_student_staff",
      collegeName: "VNIT Nagpur (South Ambazari)",
      studentStaffId: `2024VNIT${phone.slice(-4)}`,
      verificationStatus: "unsubmitted",
      trustScore: 50,
      ratingAverage: 5.0,
      ratingCount: 0,
      totalTripsCompleted: 0,
      walletBalance: 0,
      createdAt: new Date().toISOString(),
    };

    setCurrentUser(authUser);
    setUserProfile(newProf);
    setActiveRoleState("rider");

    try {
      localStorage.setItem(DEMO_USER_KEY, JSON.stringify(authUser));
      localStorage.setItem(DEMO_PROFILE_KEY, JSON.stringify(newProf));
    } catch {}

    // Background sync to Firestore
    setDoc(doc(db, "users", uid), cleanForFirestore(newProf)).catch(console.warn);
  };

  const signInWithDemo = async (
    role: UserRole = "rider",
    name = role === "driver" ? "Pooja Sharma" : "Rohan Verma",
    email = role === "driver" ? "pooja.sharma@campus.iitd.ac.in" : "rohan.v@campus.iitd.ac.in"
  ) => {
    let uid = role === "driver" ? "driver_pooja_vnit_982" : "rider_rohan_vnit_104";
    try {
      const userCred = await signInAnonymously(auth);
      if (userCred.user) {
        uid = userCred.user.uid;
      }
    } catch (err) {
      console.info("Anonymous auth fallback to instant demo account:", err);
    }

    const authUser: AuthUser = {
      uid,
      email,
      displayName: name,
      phoneNumber: "+91 98765 43210",
      photoURL:
        role === "driver"
          ? "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"
          : "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80",
    };

    const demoProfile: UserProfile = {
      uid,
      email,
      displayName: name,
      phoneNumber: "+91 98765 43210",
      photoURL: authUser.photoURL,
      role,
      tier: "tier1_student_staff",
      collegeName: "VNIT Nagpur (South Ambazari)",
      studentStaffId: role === "driver" ? "2023VNIT1089" : "2024VNIT1045",
      verificationStatus: "approved",
      trustScore: role === "driver" ? 95 : 90,
      ratingAverage: 5.0,
      ratingCount: 0,
      totalTripsCompleted: 0,
      walletBalance: 0,
      ...(role === "driver"
        ? {
            vehicleDetails: {
              make: "Ather",
              model: "450X Gen 3",
              licensePlate: "MH-31-EV-4421",
              type: "ev_scooter",
              helmetProvided: true,
            },
          }
        : {}),
      createdAt: new Date().toISOString(),
    };

    setCurrentUser(authUser);
    setUserProfile(demoProfile);
    setActiveRoleState(role);

    try {
      localStorage.setItem(DEMO_USER_KEY, JSON.stringify(authUser));
      localStorage.setItem(DEMO_PROFILE_KEY, JSON.stringify(demoProfile));
    } catch {}

    // Background sync to Firestore
    setDoc(doc(db, "users", uid), cleanForFirestore(demoProfile)).catch(console.warn);
  };

  const signInWithRealEmailSession = async (
    email: string,
    role: UserRole = "rider",
    name?: string,
    photoURL?: string
  ) => {
    let uid = `email_user_${email.replace(/[^a-zA-Z0-9]/g, "_")}`;
    try {
      const userCred = await signInAnonymously(auth);
      if (userCred.user) {
        uid = userCred.user.uid;
      }
    } catch (err) {
      console.info("Anonymous fallback:", err);
    }

    const computedName =
      name ||
      email
        .split("@")[0]
        .replace(/[._]/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());

    const authUser: AuthUser = {
      uid,
      email,
      displayName: computedName,
      photoURL:
        photoURL ||
        (role === "driver"
          ? "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"
          : `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`),
      phoneNumber: "+91 98765 43210",
    };

    const isCampusEmail = email.endsWith(".ac.in") || email.endsWith(".edu") || email.includes("campus") || email.includes("vnit") || email.includes("rcoem") || email.includes("iiitn");

    const newProf: UserProfile = {
      uid,
      email,
      displayName: computedName,
      phoneNumber: "+91 98765 43210",
      photoURL: authUser.photoURL,
      role,
      tier: isCampusEmail ? "tier1_student_staff" : "tier2_community",
      collegeName: isCampusEmail ? "VNIT Nagpur / RCOEM Network" : "Nagpur Campus Community",
      studentStaffId: role === "driver" ? `CAPTAIN_${Math.floor(1000 + Math.random() * 9000)}` : `STU_${Math.floor(10000 + Math.random() * 90000)}`,
      verificationStatus: "unsubmitted",
      trustScore: 45,
      ratingAverage: 5.0,
      ratingCount: 0,
      totalTripsCompleted: 0,
      walletBalance: 0,
      ...(role === "driver"
        ? {
            vehicleDetails: {
              make: "Ather",
              model: "450X Gen 3",
              licensePlate: "MH-31-EV-4421",
              type: "ev_scooter",
              helmetProvided: true,
            },
          }
        : {}),
      createdAt: new Date().toISOString(),
    };

    setCurrentUser(authUser);
    setUserProfile(newProf);
    setActiveRoleState(role);

    try {
      localStorage.setItem(DEMO_USER_KEY, JSON.stringify(authUser));
      localStorage.setItem(DEMO_PROFILE_KEY, JSON.stringify(newProf));
    } catch {}

    setDoc(doc(db, "users", uid), cleanForFirestore(newProf)).catch(console.warn);
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth).catch(() => {});
    } catch {}
    try {
      localStorage.removeItem(DEMO_USER_KEY);
      localStorage.removeItem(DEMO_PROFILE_KEY);
    } catch {}
    setCurrentUser(null);
    setUserProfile(null);
  };

  const updateUserProfile = async (data: Partial<UserProfile>) => {
    if (!currentUser) return;
    const updated = {
      ...(userProfile || ({} as UserProfile)),
      ...data,
      updatedAt: new Date().toISOString(),
    };
    setUserProfile(updated as UserProfile);
    try {
      localStorage.setItem(DEMO_PROFILE_KEY, JSON.stringify(updated));
    } catch {}

    const userDocRef = doc(db, "users", currentUser.uid);
    updateDoc(userDocRef, cleanForFirestore({
      ...data,
      updatedAt: new Date().toISOString(),
    })).catch(console.warn);
  };

  const submitVerification = async (data: {
    tier: VerificationTier;
    age?: number;
    dateOfBirth?: string;
    gender?: 'female' | 'male' | 'other' | 'prefer_not_to_say';
    collegeName?: string;
    department?: string;
    studyYear?: string;
    studentStaffId?: string;
    idCardDocUrl?: string;
    selfieDocUrl?: string;
    govtIdType?: 'aadhaar' | 'driving_license' | 'voter_id' | 'passport';
    govtIdNumber?: string;
    govtIdDocUrl?: string;
    drivingLicenseNumber?: string;
    drivingLicenseDocUrl?: string;
    vehicleDetails?: any;
    safetyGuidelinesAccepted?: boolean;
    emergencyContact?: { name: string; phone: string; relation: string };
    verificationStatus?: VerificationStatus;
    rejectionReason?: string;
  }) => {
    if (!currentUser) return;
    const finalStatus: VerificationStatus = data.verificationStatus || "approved";
    const computedScore = finalStatus === "approved" 
      ? computeTrustScore({
          tier: data.tier,
          verificationStatus: "approved",
          ratingAverage: userProfile?.ratingAverage || 5.0,
          totalTripsCompleted: userProfile?.totalTripsCompleted || 0,
        })
      : 20;

    const updated: Partial<UserProfile> = {
      tier: data.tier,
      age: data.age || userProfile?.age,
      dateOfBirth: data.dateOfBirth || userProfile?.dateOfBirth,
      gender: data.gender || userProfile?.gender,
      collegeName: data.collegeName || userProfile?.collegeName,
      department: data.department || userProfile?.department,
      studyYear: data.studyYear || userProfile?.studyYear,
      studentStaffId: data.studentStaffId || userProfile?.studentStaffId,
      idCardDocUrl: data.idCardDocUrl || userProfile?.idCardDocUrl,
      selfieDocUrl: data.selfieDocUrl || userProfile?.selfieDocUrl,
      govtIdType: data.govtIdType || userProfile?.govtIdType,
      govtIdNumber: data.govtIdNumber || userProfile?.govtIdNumber,
      govtIdDocUrl: data.govtIdDocUrl || userProfile?.govtIdDocUrl,
      drivingLicenseNumber: data.drivingLicenseNumber || userProfile?.drivingLicenseNumber,
      drivingLicenseDocUrl: data.drivingLicenseDocUrl || userProfile?.drivingLicenseDocUrl,
      vehicleDetails: data.vehicleDetails || userProfile?.vehicleDetails,
      safetyGuidelinesAccepted: data.safetyGuidelinesAccepted ?? true,
      emergencyContact: data.emergencyContact || userProfile?.emergencyContact,
      verificationStatus: finalStatus,
      rejectionReason: data.rejectionReason || (finalStatus === "rejected" ? "Fake / Invalid Document Detected" : undefined),
      trustScore: computedScore,
      updatedAt: new Date().toISOString(),
    };

    if (finalStatus === "approved") {
      try {
        localStorage.setItem(`campussathi_verified_${currentUser.uid}`, "true");
        localStorage.setItem("campussathi_verified_device", "true");
        localStorage.setItem(`campussathi_verified_profile_${currentUser.uid}`, JSON.stringify(updated));
      } catch {}
    }

    await updateUserProfile(updated);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        loading,
        activeRole,
        setActiveRole,
        signInWithGoogle,
        signInWithDemo,
        signInWithPhoneOtpSession,
        signInWithRealEmailSession,
        signOut,
        updateUserProfile,
        submitVerification,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
