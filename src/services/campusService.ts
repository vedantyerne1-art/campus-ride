import {
  db,
  collection,
  doc,
  setDoc,
  getDocs,
  onSnapshot,
} from "../lib/firebase";
import { CampusPickupPoint } from "../types";

// Default campus pickup points centered specifically on Nagpur, Maharashtra
export const INITIAL_CAMPUS_POINTS: Omit<CampusPickupPoint, "id">[] = [
  {
    name: "VNIT Nagpur (Main Gate / South Ambazari)",
    area: "South Ambazari Road",
    campusZone: "VNIT Campus",
    lat: 21.1255,
    lng: 79.0520,
    isPopular: true,
  },
  {
    name: "RCOEM / Ramdeobaba University Gate 1",
    area: "Katol Road, Gittikhadan",
    campusZone: "Ramdeobaba Campus",
    lat: 21.1764,
    lng: 79.0611,
    isPopular: true,
  },
  {
    name: "IIIT Nagpur Campus",
    area: "Waranga / MIHAN",
    campusZone: "IIIT Nagpur",
    lat: 20.9520,
    lng: 79.0320,
    isPopular: true,
  },
  {
    name: "YCCE Campus (Wanadongri)",
    area: "Hingna Road",
    campusZone: "YCCE Campus",
    lat: 21.0965,
    lng: 78.9790,
    isPopular: true,
  },
  {
    name: "G.H. Raisoni College of Engineering (GHRCE)",
    area: "CRPF Digdoh Hills, Hingna",
    campusZone: "Raisoni Campus",
    lat: 21.1018,
    lng: 78.9950,
    isPopular: true,
  },
  {
    name: "LIT University (Amravati Road)",
    area: "Bharat Nagar / Amravati Rd",
    campusZone: "LIT Campus",
    lat: 21.1448,
    lng: 79.0494,
    isPopular: true,
  },
  {
    name: "Sitabuldi Metro Interchange Station",
    area: "Munje Square, Sitabuldi",
    campusZone: "Central Transit Hub",
    lat: 21.1458,
    lng: 79.0882,
    isPopular: true,
  },
  {
    name: "IT Park & Gayatri Nagar Square",
    area: "Pratap Nagar / IT Park",
    campusZone: "Tech & Student Hub",
    lat: 21.1195,
    lng: 79.0558,
    isPopular: true,
  },
  {
    name: "Dharampeth & Coffee House Junction",
    area: "West High Court Road",
    campusZone: "Dharampeth",
    lat: 21.1402,
    lng: 79.0650,
    isPopular: true,
  },
  {
    name: "GMC Medical Square (Super Speciality)",
    area: "Ajni Road, Medical Square",
    campusZone: "GMC Campus",
    lat: 21.1350,
    lng: 79.0970,
    isPopular: true,
  },
  {
    name: "Shankar Nagar Square (LAD College)",
    area: "Shankar Nagar",
    campusZone: "West Nagpur",
    lat: 21.1325,
    lng: 79.0588,
    isPopular: false,
  },
  {
    name: "Nagpur Railway Station (West Gate)",
    area: "Railway Station Complex",
    campusZone: "Transit Zone",
    lat: 21.1528,
    lng: 79.0886,
    isPopular: true,
  },
];

export async function seedCampusPointsIfEmpty(): Promise<void> {
  try {
    const colRef = collection(db, "pickupPoints");
    const snapshot = await getDocs(colRef);
    if (snapshot.empty) {
      for (const pt of INITIAL_CAMPUS_POINTS) {
        const pointId = `point_${pt.name.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;
        await setDoc(doc(db, "pickupPoints", pointId), {
          ...pt,
          id: pointId,
        });
      }
    }
  } catch (error) {
    console.error("Error checking or seeding campus points:", error);
  }
}

export function subscribeCampusPoints(
  callback: (points: CampusPickupPoint[]) => void
): () => void {
  const colRef = collection(db, "pickupPoints");
  return onSnapshot(
    colRef,
    (snapshot) => {
      const points: CampusPickupPoint[] = [];
      snapshot.forEach((d) => {
        points.push({ ...(d.data() as CampusPickupPoint), id: d.id });
      });
      callback(points.length > 0 ? points : INITIAL_CAMPUS_POINTS.map((p, idx) => ({ ...p, id: `seed_${idx}` })));
    },
    (err) => {
      console.warn("Using fallback campus points due to snapshot error:", err);
      callback(INITIAL_CAMPUS_POINTS.map((p, idx) => ({ ...p, id: `seed_${idx}` })));
    }
  );
}

export async function addCampusPickupPoint(point: Omit<CampusPickupPoint, "id">): Promise<string> {
  const pointId = `point_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  await setDoc(doc(db, "pickupPoints", pointId), {
    ...point,
    id: pointId,
  });
  return pointId;
}
