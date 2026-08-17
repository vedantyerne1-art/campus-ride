import React, { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { DynamicBackground, BackgroundTheme } from "./components/DynamicBackground";
import { Navbar } from "./components/Navbar";
import { RiderDashboard } from "./components/RiderDashboard";
import { DriverDashboard } from "./components/DriverDashboard";
import { AdminPanel } from "./components/AdminPanel";
import { SplashScreen } from "./components/SplashScreen";
import { OnboardingCarousel } from "./components/OnboardingCarousel";
import { AuthScreen } from "./components/AuthScreen";
import { RoleTierSelectionScreen } from "./components/RoleTierSelectionScreen";
import { VerificationFlowScreen } from "./components/VerificationFlowScreen";
import { DashboardOnboardingTooltip } from "./components/DashboardOnboardingTooltip";
import { SideDrawer } from "./components/SideDrawer";
import { SafetySosModal } from "./components/SafetySosModal";
import { SharedTripView } from "./components/SharedTripView";
import { WalletModal } from "./components/DrawerViews/WalletModal";
import { CampusPickupPoint, DriverOnlineRecord, UserRole, VerificationTier } from "./types";
import {
  seedCampusPointsIfEmpty,
  subscribeCampusPoints,
} from "./services/campusService";
import { db, collection, onSnapshot, query, where } from "./lib/firebase";

function MainAppContent() {
  const { currentUser, userProfile, activeRole, loading: isAuthLoading } = useAuth();

  // App Phase Navigation State
  const [showSplash, setShowSplash] = useState(true);
  const [hasOnboarded, setHasOnboarded] = useState<boolean>(() => {
    return localStorage.getItem("campussathi_onboarded") === "true";
  });
  const [hasCompletedRoleSelection, setHasCompletedRoleSelection] = useState<boolean>(() => {
    return localStorage.getItem("campussathi_role_selected") === "true";
  });
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isRoleSelectionOpen, setIsRoleSelectionOpen] = useState(false);
  const [isVerificationFlowOpen, setIsVerificationFlowOpen] = useState(false);
  const [showDashboardGuide, setShowDashboardGuide] = useState<boolean>(() => {
    return localStorage.getItem("campussathi_dashboard_guided") !== "true";
  });

  // Background Theme
  const [bgTheme, setBgTheme] = useState<BackgroundTheme>("idle");

  // Device Live GPS coordinates
  const [currentGps, setCurrentGps] = useState<{ lat: number; lng: number } | null>(null);

  // Real-time collections
  const [campusPoints, setCampusPoints] = useState<CampusPickupPoint[]>([]);
  const [onlineDrivers, setOnlineDrivers] = useState<DriverOnlineRecord[]>([]);

  // Modals & Drawers
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSosOpen, setIsSosOpen] = useState(false);
  const [isWalletOpen, setIsWalletOpen] = useState(false);

  // Check URL query parameters for ?shareTrip=<id>
  const urlParams = new URLSearchParams(window.location.search);
  const shareTripId = urlParams.get("shareTrip");

  // Seed & subscribe to campus pickup points
  useEffect(() => {
    seedCampusPointsIfEmpty();
    const unsubPoints = subscribeCampusPoints(setCampusPoints);
    return () => unsubPoints();
  }, []);

  // Subscribe to real-time online drivers from Firestore
  useEffect(() => {
    const driversCol = collection(db, "drivers");
    const q = query(driversCol, where("isAvailable", "==", true));
    const unsubDrivers = onSnapshot(
      q,
      (snapshot) => {
        const list: DriverOnlineRecord[] = [];
        snapshot.forEach((d) => list.push(d.data() as DriverOnlineRecord));
        setOnlineDrivers(list);
      },
      (err) => {
        console.warn("Drivers snapshot listener notice:", err);
      }
    );

    return () => unsubDrivers();
  }, []);

  // Real device Geolocation stream
  useEffect(() => {
    if ("geolocation" in navigator) {
      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          setCurrentGps({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
        },
        (err) => {
          console.warn("Geolocation watch:", err.message);
          setCurrentGps({ lat: 21.1255, lng: 79.0520 });
        },
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
      );

      return () => navigator.geolocation.clearWatch(watchId);
    } else {
      setCurrentGps({ lat: 21.1255, lng: 79.0520 });
    }
  }, []);

  // Check if first-time user needs role/tier setup after auth
  useEffect(() => {
    if (
      currentUser &&
      userProfile &&
      !hasCompletedRoleSelection &&
      !userProfile.hasCompletedRoleSelection &&
      userProfile.verificationStatus === "unsubmitted" &&
      !userProfile.collegeName &&
      !userProfile.role
    ) {
      setIsRoleSelectionOpen(true);
    }
  }, [currentUser, userProfile, hasCompletedRoleSelection]);

  // If public shared trip URL (Deep Link)
  if (shareTripId) {
    return (
      <DynamicBackground theme="matched">
        <SharedTripView tripId={shareTripId} />
      </DynamicBackground>
    );
  }

  // Phase 1: Splash Screen
  if (showSplash) {
    return (
      <DynamicBackground theme="idle">
        <SplashScreen
          isLoadingBackend={isAuthLoading}
          onFinish={() => setShowSplash(false)}
        />
      </DynamicBackground>
    );
  }

  // Phase 2: Onboarding Carousel (shown once for first-time visitor)
  if (!hasOnboarded) {
    return (
      <DynamicBackground theme="idle">
        <OnboardingCarousel
          onComplete={() => {
            setHasOnboarded(true);
            if (!currentUser) {
              setIsAuthOpen(true);
            }
          }}
        />
      </DynamicBackground>
    );
  }

  // Phase 3: Require Login / Authentication (User MUST be authenticated before any dashboard, rides, or map are shown)
  if (!currentUser) {
    return (
      <DynamicBackground theme="idle">
        <AuthScreen
          onSuccess={() => {
            setIsAuthOpen(false);
          }}
        />
      </DynamicBackground>
    );
  }

  // Phase 4: Role & Tier Selection Flow (if first time logged in)
  if (isRoleSelectionOpen && currentUser) {
    return (
      <DynamicBackground theme="idle">
        <RoleTierSelectionScreen
          onComplete={(role: UserRole, tier: VerificationTier, skipVerification?: boolean) => {
            setHasCompletedRoleSelection(true);
            try {
              localStorage.setItem("campussathi_role_selected", "true");
            } catch {}
            setIsRoleSelectionOpen(false);
            if (skipVerification) {
              setIsVerificationFlowOpen(false);
            } else {
              setIsVerificationFlowOpen(true);
            }
          }}
        />
      </DynamicBackground>
    );
  }

  // Phase 5: Verification Document Upload Flow (if prompted)
  if (isVerificationFlowOpen && currentUser) {
    return (
      <DynamicBackground theme="idle">
        <VerificationFlowScreen
          initialTier={userProfile?.tier}
          onComplete={() => {
            setIsVerificationFlowOpen(false);
          }}
          onClose={() => {
            setIsVerificationFlowOpen(false);
          }}
        />
      </DynamicBackground>
    );
  }

  // Phase 6: Authenticated Role-Based Dashboard (Student Rider vs Peer Driver)
  return (
    <DynamicBackground theme={bgTheme}>
      <Navbar
        onOpenDrawer={() => setIsDrawerOpen(true)}
        onOpenSos={() => {
          setBgTheme("sos");
          setIsSosOpen(true);
        }}
        onOpenWallet={() => setIsWalletOpen(true)}
      />

      <main className="flex-1 pb-12">
        {activeRole === "rider" && (
          <RiderDashboard
            campusPoints={campusPoints}
            onlineDrivers={onlineDrivers}
            currentGps={currentGps}
            onOpenSos={() => {
              setBgTheme("sos");
              setIsSosOpen(true);
            }}
            onThemeChange={setBgTheme}
            onOpenVerification={() => setIsVerificationFlowOpen(true)}
          />
        )}

        {activeRole === "driver" && (
          <DriverDashboard
            currentGps={currentGps}
            onOpenSos={() => {
              setBgTheme("sos");
              setIsSosOpen(true);
            }}
            onThemeChange={setBgTheme}
            onOpenVerification={() => setIsVerificationFlowOpen(true)}
          />
        )}

        {activeRole === "admin" && <AdminPanel />}
      </main>

      {/* Side Drawer (Ola/Uber Profile, History, Wallet, Settings) */}
      <SideDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onOpenVerificationFlow={() => setIsVerificationFlowOpen(true)}
      />

      {/* Global Safety SOS Modal */}
      <SafetySosModal
        isOpen={isSosOpen}
        onClose={() => {
          setIsSosOpen(false);
          setBgTheme("idle");
        }}
        userProfile={userProfile}
        currentGps={currentGps}
      />

      {/* Dedicated Wallet & UPI Modal */}
      <WalletModal
        isOpen={isWalletOpen}
        onClose={() => setIsWalletOpen(false)}
      />

      {/* First-Time Dashboard Onboarding Guided Tooltip */}
      {showDashboardGuide && (
        <DashboardOnboardingTooltip
          onDismiss={() => setShowDashboardGuide(false)}
        />
      )}
    </DynamicBackground>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainAppContent />
    </AuthProvider>
  );
}
