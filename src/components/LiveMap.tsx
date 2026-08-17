import React, { useEffect, useRef, useState, useMemo } from "react";
import L from "leaflet";
import {
  Compass,
  Navigation,
  MapPin,
  Car,
  Bike,
  Zap,
  AlertTriangle,
  Layers,
  ZoomIn,
  ZoomOut,
  Clock,
  Radio,
  LocateFixed,
  Focus,
  Eye,
  Move,
  Check,
  Crosshair,
} from "lucide-react";
import { CampusPickupPoint, DriverOnlineRecord, RoutePoint } from "../types";
import {
  normalizeRoutePolyline,
  calculateBearing,
  getDistanceMeters,
  reverseGeocodeCoords,
} from "../services/tripService";

export type MapInteractionMode = "auto" | "pickup" | "destination" | "driver";

interface LiveMapProps {
  currentLocation: { lat: number; lng: number } | null;
  pickupPoint: { lat: number; lng: number; name?: string } | null;
  destinationPoint: { lat: number; lng: number; name?: string } | null;
  routePolyline?: RoutePoint[] | [number, number][] | any[];
  onlineDrivers?: DriverOnlineRecord[];
  activeDriverLocation?: {
    lat: number;
    lng: number;
    heading?: number;
    speed?: number;
  } | null;
  driverInfo?: {
    name?: string;
    photo?: string;
    vehicle?: {
      make?: string;
      model?: string;
      licensePlate?: string;
      color?: string;
    };
  };
  tripStatus?: string;
  campusPoints?: CampusPickupPoint[];
  onSelectLocation?: (location: { lat: number; lng: number; name: string }) => void;
  onMovePickup?: (location: { lat: number; lng: number; name?: string }) => void;
  onMoveDestination?: (location: { lat: number; lng: number; name?: string }) => void;
  onMoveDriverLocation?: (location: { lat: number; lng: number; heading?: number; speed?: number }) => void;
  onMoveCurrentGps?: (location: { lat: number; lng: number }) => void;
  allowDraggingPoints?: boolean;
  isDeviationAlert?: boolean;
  deviationDistanceMeters?: number;
  heightClass?: string;
}

const TILE_PROVIDERS: Record<
  string,
  { name: string; url: string; attribution: string; maxZoom: number; subdomains?: string }
> = {
  osm: {
    name: "OpenStreetMap",
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
    maxZoom: 19,
  },
  voyager: {
    name: "Carto Voyager",
    url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: "abcd",
    maxZoom: 19,
  },
  dark: {
    name: "Carto Dark",
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: "abcd",
    maxZoom: 19,
  },
};

export const LiveMap: React.FC<LiveMapProps> = ({
  currentLocation,
  pickupPoint,
  destinationPoint,
  routePolyline,
  onlineDrivers = [],
  activeDriverLocation,
  driverInfo,
  tripStatus,
  campusPoints = [],
  onSelectLocation,
  onMovePickup,
  onMoveDestination,
  onMoveDriverLocation,
  onMoveCurrentGps,
  allowDraggingPoints = true,
  isDeviationAlert = false,
  deviationDistanceMeters = 0,
  heightClass = "h-[380px] sm:h-[460px] lg:h-[540px]",
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersGroupRef = useRef<L.LayerGroup | null>(null);
  const routeLayerRef = useRef<L.Polyline | null>(null);
  const approachLayerRef = useRef<L.Polyline | null>(null);
  const [activeTileKey, setActiveTileKey] = useState<string>("osm");
  const [isLayerMenuOpen, setIsLayerMenuOpen] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [interactionMode, setInteractionMode] = useState<MapInteractionMode>("auto");
  const [lastActionHint, setLastActionHint] = useState<string>("");

  // Determine current navigation target for Captain (Pickup hub during approach, Destination during ride)
  const targetPoint = useMemo(() => {
    if (tripStatus === "in_progress") {
      return destinationPoint;
    }
    return pickupPoint;
  }, [tripStatus, pickupPoint, destinationPoint]);

  // Real-time live telemetry metrics from Driver to Target
  const liveMetrics = useMemo(() => {
    if (!activeDriverLocation || !targetPoint) return null;
    const distanceMeters = getDistanceMeters(
      activeDriverLocation.lat,
      activeDriverLocation.lng,
      targetPoint.lat,
      targetPoint.lng
    );
    const etaMins = Math.max(1, Math.round((distanceMeters / 1000) * 3.2));
    const calculatedBearing =
      activeDriverLocation.heading ??
      calculateBearing(
        activeDriverLocation.lat,
        activeDriverLocation.lng,
        targetPoint.lat,
        targetPoint.lng
      );
    return {
      distanceMeters,
      distanceFormatted:
        distanceMeters >= 1000
          ? `${(distanceMeters / 1000).toFixed(1)} km`
          : `${distanceMeters} m`,
      etaMins,
      bearing: calculatedBearing,
    };
  }, [activeDriverLocation, targetPoint]);

  // Initialize map once with OpenStreetMap
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const initialLat = currentLocation?.lat || 21.1255;
    const initialLng = currentLocation?.lng || 79.0520;

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: 15,
      zoomControl: false,
      attributionControl: false,
    });

    // Default: OpenStreetMap standard tile layer
    const osmConfig = TILE_PROVIDERS.osm;
    const tileLayer = L.tileLayer(osmConfig.url, {
      maxZoom: osmConfig.maxZoom,
      attribution: osmConfig.attribution,
    }).addTo(map);

    tileLayerRef.current = tileLayer;

    const markersGroup = L.layerGroup().addTo(map);
    markersGroupRef.current = markersGroup;
    mapInstanceRef.current = map;
    setMapReady(true);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      tileLayerRef.current = null;
    };
  }, []);

  // Map Click Listener to interactively place or move selected point
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const handleMapClick = async (e: L.LeafletMouseEvent) => {
      const lat = Number(e.latlng.lat.toFixed(6));
      const lng = Number(e.latlng.lng.toFixed(6));

      if (interactionMode === "pickup" || (!pickupPoint && interactionMode === "auto")) {
        try {
          const geo = await reverseGeocodeCoords(lat, lng);
          if (onMovePickup) {
            onMovePickup({ lat, lng, name: geo.name || "Pickup Spot" });
            setLastActionHint(`Pickup: ${geo.name}`);
          } else if (onSelectLocation) {
            onSelectLocation({ lat, lng, name: geo.name || "Pickup Spot" });
          }
        } catch {
          if (onMovePickup) {
            onMovePickup({ lat, lng, name: "Moved Pickup Spot" });
            setLastActionHint("Pickup Spot Moved");
          } else if (onSelectLocation) {
            onSelectLocation({ lat, lng, name: "Pickup Spot" });
          }
        }
      } else if (interactionMode === "destination" || (!destinationPoint && interactionMode === "auto")) {
        try {
          const geo = await reverseGeocodeCoords(lat, lng);
          if (onMoveDestination) {
            onMoveDestination({ lat, lng, name: geo.name || "Drop Spot" });
            setLastActionHint(`Drop: ${geo.name}`);
          } else if (onSelectLocation) {
            onSelectLocation({ lat, lng, name: geo.name || "Drop Spot" });
          }
        } catch {
          if (onMoveDestination) {
            onMoveDestination({ lat, lng, name: "Moved Destination Spot" });
            setLastActionHint("Drop Spot Moved");
          } else if (onSelectLocation) {
            onSelectLocation({ lat, lng, name: "Drop Spot" });
          }
        }
      } else if (interactionMode === "driver") {
        if (onMoveDriverLocation) {
          const prevLat = activeDriverLocation?.lat || lat;
          const prevLng = activeDriverLocation?.lng || lng;
          const heading = calculateBearing(prevLat, prevLng, lat, lng);
          onMoveDriverLocation({ lat, lng, heading, speed: 24 });
          setLastActionHint("Captain Position Moved");
        }
      } else {
        // Auto mode fallback: if onSelectLocation provided
        if (onSelectLocation) {
          try {
            const geo = await reverseGeocodeCoords(lat, lng);
            onSelectLocation({ lat, lng, name: geo.name || "Custom Campus Point" });
          } catch {
            onSelectLocation({ lat, lng, name: "Custom Campus Point" });
          }
        }
      }
    };

    map.on("click", handleMapClick);
    return () => {
      map.off("click", handleMapClick);
    };
  }, [
    interactionMode,
    pickupPoint,
    destinationPoint,
    activeDriverLocation,
    onMovePickup,
    onMoveDestination,
    onMoveDriverLocation,
    onSelectLocation,
  ]);

  // Clear action hint after 3s
  useEffect(() => {
    if (!lastActionHint) return;
    const t = setTimeout(() => setLastActionHint(""), 3000);
    return () => clearTimeout(t);
  }, [lastActionHint]);

  // Change tile layer on selection
  const handleSelectTileLayer = (key: string) => {
    setActiveTileKey(key);
    setIsLayerMenuOpen(false);
    const map = mapInstanceRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    const config = TILE_PROVIDERS[key] || TILE_PROVIDERS.osm;
    const newLayer = L.tileLayer(config.url, {
      maxZoom: config.maxZoom,
      subdomains: config.subdomains || "abc",
      attribution: config.attribution,
    }).addTo(map);

    tileLayerRef.current = newLayer;
  };

  // Update markers, live driver tracking, route polyline, and campus points
  useEffect(() => {
    const map = mapInstanceRef.current;
    const group = markersGroupRef.current;
    if (!map || !group) return;

    group.clearLayers();

    // 1. Render Campus Pickup Points
    campusPoints.forEach((point) => {
      const isSelected =
        (pickupPoint && Math.abs(pickupPoint.lat - point.lat) < 0.0001) ||
        (destinationPoint && Math.abs(destinationPoint.lat - point.lat) < 0.0001);

      const campusHtml = `
        <div class="relative cursor-pointer transition-transform hover:scale-110">
          <div class="w-8 h-8 rounded-full ${
            isSelected ? "bg-indigo-500 ring-4 ring-indigo-400/50" : "bg-slate-900/90 border border-indigo-400/70"
          } flex items-center justify-center shadow-lg text-white">
            <svg class="w-4 h-4 text-indigo-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
          </div>
          <div class="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap bg-slate-950/90 text-indigo-200 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-indigo-500/40 shadow">
            ${point.name.split(" ")[0]}
          </div>
        </div>
      `;

      const icon = L.divIcon({
        className: "custom-campus-marker",
        html: campusHtml,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const marker = L.marker([point.lat, point.lng], { icon }).addTo(group);
      marker.bindPopup(`
        <div class="p-1 text-slate-100 font-sans">
          <p class="font-bold text-sm text-indigo-300">${point.name}</p>
          <p class="text-xs text-slate-300">${point.area} • ${point.campusZone}</p>
          <div class="flex gap-1.5 mt-2">
            <button id="select-pickup-${point.id}" class="flex-1 px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold cursor-pointer shadow">
              Set Pickup
            </button>
            <button id="select-drop-${point.id}" class="flex-1 px-2 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold cursor-pointer shadow">
              Set Drop
            </button>
          </div>
        </div>
      `);

      marker.on("popupopen", () => {
        const pickupBtn = document.getElementById(`select-pickup-${point.id}`);
        const dropBtn = document.getElementById(`select-drop-${point.id}`);
        if (pickupBtn) {
          pickupBtn.onclick = () => {
            if (onMovePickup) onMovePickup({ lat: point.lat, lng: point.lng, name: point.name });
            else if (onSelectLocation) onSelectLocation({ lat: point.lat, lng: point.lng, name: point.name });
            map.closePopup();
          };
        }
        if (dropBtn) {
          dropBtn.onclick = () => {
            if (onMoveDestination) onMoveDestination({ lat: point.lat, lng: point.lng, name: point.name });
            else if (onSelectLocation) onSelectLocation({ lat: point.lat, lng: point.lng, name: point.name });
            map.closePopup();
          };
        }
      });
    });

    // 2. Render Nearby Online Drivers (when not on an active trip)
    if (!activeDriverLocation) {
      onlineDrivers.forEach((driver) => {
        const isTier1 = driver.tier === "tier1_student_staff";
        const driverHtml = `
          <div class="relative cursor-pointer transition-all duration-300 hover:scale-125" style="transform: rotate(${driver.heading || 0}deg);">
            <div class="w-9 h-9 rounded-full ${
              isTier1 ? "bg-emerald-600 ring-2 ring-emerald-300" : "bg-cyan-600 ring-2 ring-cyan-300"
            } flex items-center justify-center shadow-xl text-white">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span class="absolute -top-1 -right-1 w-3 h-3 rounded-full ${isTier1 ? "bg-emerald-300" : "bg-cyan-300"} border-2 border-slate-900 animate-ping"></span>
          </div>
        `;

        const driverIcon = L.divIcon({
          className: "custom-driver-marker",
          html: driverHtml,
          iconSize: [36, 36],
          iconAnchor: [18, 18],
        });

        const dMarker = L.marker([driver.lat, driver.lng], { icon: driverIcon }).addTo(group);
        const bikePhoto = driver.vehicle?.photoUrl || "https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=300&q=80";
        dMarker.bindPopup(`
          <div class="p-1.5 text-slate-100 font-sans min-w-[200px]">
            <div class="flex items-center gap-2 mb-2">
              <span class="font-bold text-sm text-emerald-400">${driver.driverName}</span>
              <span class="text-[10px] px-1.5 py-0.5 rounded ${isTier1 ? "bg-emerald-500/20 text-emerald-300" : "bg-cyan-500/20 text-cyan-300"} font-semibold">
                ${isTier1 ? "Campus Peer" : "Verified"}
              </span>
            </div>
            
            <div class="flex items-center gap-2 bg-slate-900/80 p-2 rounded-lg border border-slate-700/60 mb-2">
              <img src="${bikePhoto}" alt="Bike" class="w-10 h-10 rounded object-cover border border-slate-600 shrink-0" />
              <div class="truncate">
                <p class="text-xs font-bold text-white truncate">${driver.vehicle?.make || "Hero"} ${driver.vehicle?.model || "Splendor"}</p>
                ${driver.vehicle?.color ? `<p class="text-[10px] text-slate-400 truncate">${driver.vehicle.color}</p>` : ""}
              </div>
            </div>

            <div class="inline-flex items-center rounded bg-slate-100 text-slate-950 font-mono text-[10px] font-black border border-slate-400 px-1.5 py-0.5 tracking-wider mb-1.5">
              <span class="bg-blue-700 text-white px-1 py-0.2 text-[7px] mr-1 rounded-sm">IND</span>
              <span>${driver.vehicle?.licensePlate || "MH 31 CP 2024"}</span>
            </div>

            <div class="flex items-center justify-between text-[10px] text-amber-300 pt-1 border-t border-slate-700/60">
              <span>★ ${driver.ratingAverage?.toFixed(1) || "5.0"} Rating</span>
              <span class="text-emerald-300 font-semibold">${driver.trustScore || 80}% Trust</span>
            </div>
          </div>
        `);
      });
    }

    // 3. Render ACTIVE CAPTAIN LOCATION WITH REAL-TIME DRAGGABLE MARKER & LIVE ROTATION
    if (activeDriverLocation) {
      const headingDeg = liveMetrics?.bearing || activeDriverLocation.heading || 0;
      const isApproaching = tripStatus === "assigned" || tripStatus === "en_route";
      const isArrived = tripStatus === "arrived";

      const activeDriverHtml = `
        <div class="relative flex items-center justify-center cursor-grab active:cursor-grabbing group">
          <!-- Multi-ring Radar Pulse -->
          <div class="absolute -inset-4 rounded-full bg-emerald-500/25 animate-ping"></div>
          <div class="absolute -inset-2 rounded-full bg-emerald-400/40 animate-pulse"></div>

          <!-- Directional Orientation Pointer Indicator -->
          <div class="absolute -top-3 w-0 h-0 border-x-4 border-x-transparent border-b-6 border-b-emerald-400" style="transform-origin: center bottom; transform: rotate(${headingDeg}deg);"></div>

          <!-- Main 3D Bike Container -->
          <div class="relative w-12 h-12 rounded-full bg-gradient-to-tr from-emerald-700 to-emerald-400 ring-3 ring-white shadow-2xl flex items-center justify-center text-white transform group-hover:scale-110 transition-transform">
            <svg class="w-7 h-7 text-white drop-shadow" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24">
              <circle cx="5.5" cy="17.5" r="3.5" />
              <circle cx="18.5" cy="17.5" r="3.5" />
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 6h-3.5l-3 6.5h7.5l2-4.5h2.5" />
              <path stroke-linecap="round" stroke-linejoin="round" d="M5.5 17.5L8.5 11l3.5 2.5 3-5.5" />
              <circle cx="15" cy="5" r="1" fill="currentColor" />
            </svg>
          </div>

          <!-- Live Floating Captain Pill -->
          <div class="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap bg-slate-950/95 text-emerald-300 text-[10px] font-black px-2.5 py-0.5 rounded-full border border-emerald-500/50 shadow-xl flex items-center gap-1">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>${driverInfo?.name ? driverInfo.name.split(" ")[0] : "Captain"}</span>
            ${liveMetrics ? `<span class="font-mono text-white text-[9px]">(${liveMetrics.distanceFormatted})</span>` : ""}
          </div>
        </div>
      `;

      const activeDriverIcon = L.divIcon({
        className: "custom-active-driver",
        html: activeDriverHtml,
        iconSize: [48, 48],
        iconAnchor: [24, 24],
      });

      const dMarker = L.marker([activeDriverLocation.lat, activeDriverLocation.lng], {
        icon: activeDriverIcon,
        zIndexOffset: 2000,
        draggable: allowDraggingPoints,
      }).addTo(group);

      if (allowDraggingPoints) {
        dMarker.on("dragend", (e: any) => {
          const latlng = e.target.getLatLng();
          const newLat = Number(latlng.lat.toFixed(6));
          const newLng = Number(latlng.lng.toFixed(6));
          const heading = calculateBearing(activeDriverLocation.lat, activeDriverLocation.lng, newLat, newLng);
          if (onMoveDriverLocation) {
            onMoveDriverLocation({ lat: newLat, lng: newLng, heading, speed: 25 });
            setLastActionHint("Captain Moved to New Position");
          }
        });
      }

      dMarker.bindPopup(`
        <div class="p-2 text-slate-100 font-sans min-w-[210px]">
          <div class="flex items-center gap-2 mb-2 pb-1.5 border-b border-slate-700/60">
            <span class="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            <span class="font-bold text-xs text-emerald-400">
              ${isApproaching ? "Captain Approaching" : isArrived ? "Captain Arrived at Hub" : "Trip In Progress"}
            </span>
          </div>

          <p class="font-bold text-sm text-white">${driverInfo?.name || "Campus Captain"}</p>
          <p class="text-xs text-indigo-200">
            ${driverInfo?.vehicle?.make || "Hero"} ${driverInfo?.vehicle?.model || "Splendor"}
          </p>

          ${
            driverInfo?.vehicle?.licensePlate
              ? `
            <div class="inline-flex items-center rounded bg-slate-100 text-slate-950 font-mono text-[10px] font-black border border-slate-400 px-1.5 py-0.5 tracking-wider my-1.5">
              <span class="bg-blue-700 text-white px-1 py-0.2 text-[7px] mr-1 rounded-sm">IND</span>
              <span>${driverInfo.vehicle.licensePlate}</span>
            </div>
          `
              : ""
          }

          ${
            liveMetrics
              ? `
            <div class="mt-2 p-2 rounded-lg bg-emerald-950/70 border border-emerald-500/40 flex items-center justify-between text-xs">
              <span class="text-emerald-300 font-bold">ETA: ~${liveMetrics.etaMins} mins</span>
              <span class="font-mono text-white">${liveMetrics.distanceFormatted}</span>
            </div>
          `
              : ""
          }
          
          <p class="text-[10px] text-emerald-300/80 mt-2 font-medium flex items-center gap-1">
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"/></svg>
            Drag marker on map to move captain in real time
          </p>
        </div>
      `);

      // 3b. Draw Glowing Approach Trajectory Line from Driver to Target
      if (targetPoint) {
        if (approachLayerRef.current) {
          map.removeLayer(approachLayerRef.current);
        }

        const approachCoords: [number, number][] = [
          [activeDriverLocation.lat, activeDriverLocation.lng],
          [targetPoint.lat, targetPoint.lng],
        ];

        const approachPolyline = L.polyline(approachCoords, {
          color: "#10b981",
          weight: 4,
          opacity: 0.9,
          dashArray: "6, 10",
          lineCap: "round",
        }).addTo(map);

        approachLayerRef.current = approachPolyline;
      }
    } else if (approachLayerRef.current) {
      map.removeLayer(approachLayerRef.current);
      approachLayerRef.current = null;
    }

    // 4. Render User's Real Device GPS Location (Draggable to simulate rider repositioning)
    if (currentLocation) {
      const userGpsHtml = `
        <div class="relative cursor-grab active:cursor-grabbing group">
          <div class="absolute -inset-3 rounded-full bg-indigo-500/40 pulse-ring-element"></div>
          <div class="w-7 h-7 rounded-full bg-indigo-500 ring-2 ring-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
            <div class="w-2.5 h-2.5 rounded-full bg-white"></div>
          </div>
          <div class="absolute -bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap bg-slate-950/90 text-indigo-200 text-[8px] font-bold px-1.5 py-0.2 rounded-full border border-indigo-500/40 shadow">
            You
          </div>
        </div>
      `;

      const userGpsIcon = L.divIcon({
        className: "custom-user-gps",
        html: userGpsHtml,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const userMarker = L.marker([currentLocation.lat, currentLocation.lng], {
        icon: userGpsIcon,
        zIndexOffset: 500,
        draggable: allowDraggingPoints,
      }).addTo(group);

      if (allowDraggingPoints) {
        userMarker.on("dragend", (e: any) => {
          const latlng = e.target.getLatLng();
          const newLat = Number(latlng.lat.toFixed(6));
          const newLng = Number(latlng.lng.toFixed(6));
          if (onMoveCurrentGps) {
            onMoveCurrentGps({ lat: newLat, lng: newLng });
          }
          if (onMovePickup && !pickupPoint) {
            onMovePickup({ lat: newLat, lng: newLng, name: "My New Location" });
          }
          setLastActionHint("Your Position Updated");
        });
      }
    }

    // 5. Render Pickup Marker (Student Location Hub - Draggable & Movable)
    if (pickupPoint) {
      const isMatched = !!activeDriverLocation;
      const pickupHtml = `
        <div class="relative cursor-grab active:cursor-grabbing group">
          <div class="absolute -inset-2 rounded-full ${isMatched ? "bg-emerald-400/30 animate-pulse" : "bg-emerald-400/20"}"></div>
          <div class="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-700 to-emerald-500 ring-2 ring-white flex items-center justify-center shadow-xl text-white font-black text-xs group-hover:scale-110 transition-transform">
            <svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
            </svg>
          </div>
          <div class="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap bg-slate-950/90 text-emerald-300 text-[9px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/40 shadow flex items-center gap-1">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span>Pickup Spot</span>
          </div>
        </div>
      `;
      const pickupIcon = L.divIcon({
        className: "custom-pickup-marker",
        html: pickupHtml,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      });

      const pMarker = L.marker([pickupPoint.lat, pickupPoint.lng], {
        icon: pickupIcon,
        zIndexOffset: 1200,
        draggable: allowDraggingPoints,
      }).addTo(group);

      if (allowDraggingPoints) {
        pMarker.on("dragend", async (e: any) => {
          const latlng = e.target.getLatLng();
          const newLat = Number(latlng.lat.toFixed(6));
          const newLng = Number(latlng.lng.toFixed(6));
          try {
            const geo = await reverseGeocodeCoords(newLat, newLng);
            if (onMovePickup) {
              onMovePickup({ lat: newLat, lng: newLng, name: geo.name || "Pickup Spot" });
              setLastActionHint(`Pickup: ${geo.name}`);
            }
          } catch {
            if (onMovePickup) {
              onMovePickup({ lat: newLat, lng: newLng, name: pickupPoint.name || "Custom Pickup" });
              setLastActionHint("Pickup Spot Moved");
            }
          }
        });
      }

      pMarker.bindPopup(`
        <div class="p-1.5 text-slate-100 font-sans text-xs">
          <p class="font-bold text-emerald-400">Pickup Spot</p>
          <p class="text-slate-300">${pickupPoint.name || "Campus Pickup Hub"}</p>
          <p class="text-[10px] text-emerald-300/80 mt-1 font-medium">💡 Drag pin to move pickup spot</p>
        </div>
      `);
    }

    // 6. Render Destination Marker (Draggable & Movable)
    if (destinationPoint) {
      const destHtml = `
        <div class="relative cursor-grab active:cursor-grabbing group">
          <div class="w-10 h-10 rounded-full bg-gradient-to-tr from-rose-700 to-rose-500 ring-2 ring-white flex items-center justify-center shadow-xl text-white font-black text-xs group-hover:scale-110 transition-transform">
            <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
            </svg>
          </div>
          <div class="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap bg-slate-950/90 text-rose-300 text-[9px] font-bold px-2 py-0.5 rounded-full border border-rose-500/40 shadow flex items-center gap-1">
            <span class="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
            <span>Drop Destination</span>
          </div>
        </div>
      `;
      const destIcon = L.divIcon({
        className: "custom-dest-marker",
        html: destHtml,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      });

      const dMarker = L.marker([destinationPoint.lat, destinationPoint.lng], {
        icon: destIcon,
        zIndexOffset: 1200,
        draggable: allowDraggingPoints,
      }).addTo(group);

      if (allowDraggingPoints) {
        dMarker.on("dragend", async (e: any) => {
          const latlng = e.target.getLatLng();
          const newLat = Number(latlng.lat.toFixed(6));
          const newLng = Number(latlng.lng.toFixed(6));
          try {
            const geo = await reverseGeocodeCoords(newLat, newLng);
            if (onMoveDestination) {
              onMoveDestination({ lat: newLat, lng: newLng, name: geo.name || "Drop Destination" });
              setLastActionHint(`Drop: ${geo.name}`);
            }
          } catch {
            if (onMoveDestination) {
              onMoveDestination({ lat: newLat, lng: newLng, name: destinationPoint.name || "Custom Destination" });
              setLastActionHint("Destination Spot Moved");
            }
          }
        });
      }

      dMarker.bindPopup(`
        <div class="p-1.5 text-slate-100 font-sans text-xs">
          <p class="font-bold text-rose-400">Drop Destination</p>
          <p class="text-slate-300">${destinationPoint.name || "Campus Drop Location"}</p>
          <p class="text-[10px] text-rose-300/80 mt-1 font-medium">💡 Drag pin to move destination</p>
        </div>
      `);
    }

    // 7. Render Route Polyline
    const normalizedRoute = normalizeRoutePolyline(routePolyline);
    if (normalizedRoute && normalizedRoute.length > 1) {
      if (routeLayerRef.current) {
        map.removeLayer(routeLayerRef.current);
      }

      const polyline = L.polyline(normalizedRoute, {
        color: isDeviationAlert ? "#ef4444" : "#6366f1",
        weight: 6,
        opacity: 0.85,
        lineCap: "round",
        lineJoin: "round",
        dashArray: isDeviationAlert ? "10, 10" : undefined,
      }).addTo(map);

      routeLayerRef.current = polyline;

      // Fit map bounds to encompass the entire route or approaching driver
      if (activeDriverLocation && targetPoint) {
        const bounds = L.latLngBounds(
          [activeDriverLocation.lat, activeDriverLocation.lng],
          [targetPoint.lat, targetPoint.lng]
        );
        map.fitBounds(bounds, { padding: [70, 70], maxZoom: 17 });
      } else {
        map.fitBounds(polyline.getBounds(), { padding: [40, 40] });
      }
    } else if (routeLayerRef.current) {
      map.removeLayer(routeLayerRef.current);
      routeLayerRef.current = null;

      // If no route polyline yet, center directly on entered real locations
      if (pickupPoint && destinationPoint) {
        const bounds = L.latLngBounds(
          [pickupPoint.lat, pickupPoint.lng],
          [destinationPoint.lat, destinationPoint.lng]
        );
        map.fitBounds(bounds, { padding: [60, 60], maxZoom: 16 });
      } else if (pickupPoint) {
        map.flyTo([pickupPoint.lat, pickupPoint.lng], 16, { duration: 0.8 });
      } else if (destinationPoint) {
        map.flyTo([destinationPoint.lat, destinationPoint.lng], 16, { duration: 0.8 });
      }
    } else {
      // If no polyline existed initially and points changed
      if (pickupPoint && destinationPoint) {
        const bounds = L.latLngBounds(
          [pickupPoint.lat, pickupPoint.lng],
          [destinationPoint.lat, destinationPoint.lng]
        );
        map.fitBounds(bounds, { padding: [60, 60], maxZoom: 16 });
      } else if (pickupPoint) {
        map.flyTo([pickupPoint.lat, pickupPoint.lng], 16, { duration: 0.8 });
      } else if (destinationPoint) {
        map.flyTo([destinationPoint.lat, destinationPoint.lng], 16, { duration: 0.8 });
      }
    }
  }, [
    campusPoints,
    onlineDrivers,
    activeDriverLocation,
    currentLocation,
    pickupPoint,
    destinationPoint,
    routePolyline,
    isDeviationAlert,
    driverInfo,
    tripStatus,
    targetPoint,
    liveMetrics,
    allowDraggingPoints,
    onMovePickup,
    onMoveDestination,
    onMoveDriverLocation,
    onMoveCurrentGps,
    onSelectLocation,
  ]);

  const handleRecenter = () => {
    if (!mapInstanceRef.current || !currentLocation) return;
    mapInstanceRef.current.flyTo([currentLocation.lat, currentLocation.lng], 16, {
      duration: 1.2,
    });
  };

  const handleFocusCaptain = () => {
    if (!mapInstanceRef.current || !activeDriverLocation) return;
    mapInstanceRef.current.flyTo([activeDriverLocation.lat, activeDriverLocation.lng], 17, {
      duration: 1.2,
    });
  };

  const handleZoomIn = () => mapInstanceRef.current?.zoomIn();
  const handleZoomOut = () => mapInstanceRef.current?.zoomOut();

  return (
    <div className={`relative w-full ${heightClass} rounded-[28px] overflow-hidden shadow-2xl border border-white/20 z-0`}>
      <div ref={mapContainerRef} className="w-full h-full" id="campus-live-map" />

      {/* FLOATING LIVE CAPTAIN RADAR & APPROACH TELEMETRY HUD (When matched) */}
      {activeDriverLocation && liveMetrics && (
        <div className="absolute top-4 left-4 right-16 z-[400] p-3.5 rounded-[22px] bg-slate-950/90 backdrop-blur-xl border border-emerald-500/50 shadow-2xl flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative shrink-0">
              <img
                src={
                  driverInfo?.photo ||
                  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&q=80"
                }
                alt="Captain"
                className="w-10 h-10 rounded-[14px] object-cover border-2 border-emerald-400 shadow-md"
              />
              <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-400 border-2 border-slate-950 animate-ping"></span>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="font-extrabold text-xs text-white truncate">
                  {driverInfo?.name || "Campus Captain"}
                </p>
                <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {tripStatus === "in_progress" ? "Trip Active" : "Approaching"}
                </span>
              </div>
              <p className="text-[10px] text-indigo-200 truncate">
                {driverInfo?.vehicle?.make || "Hero"} {driverInfo?.vehicle?.model || "Bike"} •{" "}
                <span className="font-mono text-white font-bold">{driverInfo?.vehicle?.licensePlate || "MH 31 CP 2024"}</span>
              </p>
            </div>
          </div>

          <div className="text-right shrink-0 flex flex-col items-end">
            <div className="flex items-center gap-1 text-emerald-400 font-mono font-black text-sm">
              <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span>~{liveMetrics.etaMins} min ETA</span>
            </div>
            <p className="text-[10px] text-white/70 font-mono">
              {liveMetrics.distanceFormatted} away
            </p>
          </div>
        </div>
      )}

      {/* REAL-TIME POINT MOVEMENT & INTERACTION TOOLBAR */}
      <div className="absolute top-4 left-4 z-[390] flex items-center gap-1.5 bg-slate-950/85 backdrop-blur-xl p-1.5 rounded-[18px] border border-white/20 shadow-xl max-w-[calc(100%-80px)] overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-1 text-white/70 px-2 text-[10px] font-bold shrink-0">
          <Move className="w-3.5 h-3.5 text-indigo-300" />
          <span className="hidden sm:inline">Move Points:</span>
        </div>

        <button
          type="button"
          onClick={() => setInteractionMode("auto")}
          className={`px-2.5 py-1 rounded-[10px] text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer ${
            interactionMode === "auto"
              ? "bg-indigo-600 text-white shadow-md"
              : "text-white/70 hover:bg-white/10 hover:text-white"
          }`}
          title="Drag any pin directly on map"
        >
          Drag Any Pin
        </button>

        <button
          type="button"
          onClick={() => setInteractionMode("pickup")}
          className={`px-2.5 py-1 rounded-[10px] text-[11px] font-bold whitespace-nowrap transition-all flex items-center gap-1 cursor-pointer ${
            interactionMode === "pickup"
              ? "bg-emerald-600 text-white shadow-md"
              : "text-emerald-300 hover:bg-emerald-500/20"
          }`}
          title="Click map to move Pickup point"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          <span>Move Pickup</span>
        </button>

        <button
          type="button"
          onClick={() => setInteractionMode("destination")}
          className={`px-2.5 py-1 rounded-[10px] text-[11px] font-bold whitespace-nowrap transition-all flex items-center gap-1 cursor-pointer ${
            interactionMode === "destination"
              ? "bg-rose-600 text-white shadow-md"
              : "text-rose-300 hover:bg-rose-500/20"
          }`}
          title="Click map to move Destination point"
        >
          <span className="w-2 h-2 rounded-full bg-rose-400"></span>
          <span>Move Drop</span>
        </button>

        {activeDriverLocation && (
          <button
            type="button"
            onClick={() => setInteractionMode("driver")}
            className={`px-2.5 py-1 rounded-[10px] text-[11px] font-bold whitespace-nowrap transition-all flex items-center gap-1 cursor-pointer ${
              interactionMode === "driver"
                ? "bg-cyan-600 text-white shadow-md"
                : "text-cyan-300 hover:bg-cyan-500/20"
            }`}
            title="Click map to move Captain / Rider location"
          >
            <Bike className="w-3 h-3" />
            <span>Move Captain</span>
          </button>
        )}
      </div>

      {/* Floating Action Feedback Notification */}
      {lastActionHint && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-[450] px-3 py-1.5 rounded-full bg-emerald-500 text-slate-950 text-xs font-black shadow-2xl border border-white/40 flex items-center gap-1.5 animate-in fade-in zoom-in-90">
          <Check className="w-3.5 h-3.5 stroke-[3]" />
          <span>{lastActionHint}</span>
        </div>
      )}

      {/* Floating Interactive Map Controls */}
      <div className="absolute right-4 top-4 z-[400] flex flex-col gap-2">
        {activeDriverLocation && (
          <button
            id="btn-focus-captain"
            type="button"
            onClick={handleFocusCaptain}
            title="Focus on Captain"
            className="p-3 rounded-[14px] bg-emerald-600/90 hover:bg-emerald-500 text-white shadow-xl flex items-center justify-center cursor-pointer border border-emerald-400/60 transition-all hover:scale-105"
          >
            <Bike className="w-4 h-4 text-white" />
          </button>
        )}

        <button
          id="btn-recenter-gps"
          type="button"
          onClick={handleRecenter}
          title="Recenter on My Location"
          className="p-3 rounded-[14px] liquid-glass-btn text-white shadow-lg flex items-center justify-center cursor-pointer"
        >
          <Navigation className="w-4 h-4 text-indigo-300" />
        </button>

        {/* Map Tile Layer Switcher */}
        <div className="relative">
          <button
            id="btn-toggle-layers"
            type="button"
            onClick={() => setIsLayerMenuOpen(!isLayerMenuOpen)}
            title="Switch Map Tiles (OpenStreetMap / Carto)"
            className="p-3 rounded-[14px] liquid-glass-btn text-white shadow-lg flex items-center justify-center cursor-pointer"
          >
            <Layers className="w-4 h-4 text-indigo-300" />
          </button>

          {isLayerMenuOpen && (
            <div className="absolute right-0 top-12 w-48 rounded-[16px] liquid-glass-panel p-2 shadow-2xl space-y-1 z-[500] border border-white/20">
              <p className="text-[10px] uppercase tracking-wider font-extrabold text-white/60 px-2 py-1">
                Map Tiles Layer
              </p>
              {Object.entries(TILE_PROVIDERS).map(([key, provider]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleSelectTileLayer(key)}
                  className={`w-full text-left px-2.5 py-1.5 rounded-[10px] text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                    activeTileKey === key
                      ? "bg-indigo-600 text-white font-bold"
                      : "text-white/80 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <span>{provider.name}</span>
                  {activeTileKey === key && <span className="text-[10px]">✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          id="btn-zoom-in"
          onClick={handleZoomIn}
          title="Zoom In"
          className="p-3 rounded-[14px] liquid-glass-btn text-white shadow-lg flex items-center justify-center cursor-pointer"
        >
          <ZoomIn className="w-4 h-4 text-indigo-300" />
        </button>
        <button
          id="btn-zoom-out"
          onClick={handleZoomOut}
          title="Zoom Out"
          className="p-3 rounded-[14px] liquid-glass-btn text-white shadow-lg flex items-center justify-center cursor-pointer"
        >
          <ZoomOut className="w-4 h-4 text-indigo-300" />
        </button>
      </div>

      {/* Floating GPS Status Pill */}
      <div className="absolute bottom-3 left-4 z-[400] px-3 py-1.5 rounded-full liquid-glass-panel text-xs text-white/90 flex items-center gap-2 shadow-lg">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
        <span className="text-[11px] font-mono font-medium">
          {activeDriverLocation ? "Live Captain GPS Active" : "Interactive Campus Map"}
        </span>
      </div>

      {/* OpenStreetMap Attribution Pill */}
      <div className="absolute bottom-3 right-4 z-[400] px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-[10px] text-white/70 border border-white/10 flex items-center gap-1 shadow-sm select-none">
        <span>©</span>
        <a
          href="https://www.openstreetmap.org/copyright"
          target="_blank"
          rel="noreferrer"
          className="underline hover:text-white transition-colors"
        >
          OpenStreetMap contributors
        </a>
      </div>

      {/* Route Deviation Safety Alert HUD */}
      {isDeviationAlert && (
        <div className="absolute top-4 left-4 right-16 z-[400] p-3.5 rounded-[18px] bg-red-950/80 border border-red-500/60 backdrop-blur-xl shadow-xl flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 animate-bounce" />
          <div className="text-xs">
            <p className="font-bold text-red-200">Safety Alert: Route Deviation Detected</p>
            <p className="text-red-300/90">
              Vehicle is {deviationDistanceMeters}m off the designated route corridor.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
