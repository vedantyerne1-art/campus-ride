import React, { useEffect, useState } from "react";
import {
  Car,
  ShieldCheck,
  MapPin,
  Clock,
  Phone,
  AlertOctagon,
  CheckCircle2,
} from "lucide-react";
import { db, doc, onSnapshot } from "../lib/firebase";
import { TripRecord } from "../types";
import { LiveMap } from "./LiveMap";

interface SharedTripViewProps {
  tripId: string;
}

export const SharedTripView: React.FC<SharedTripViewProps> = ({ tripId }) => {
  const [trip, setTrip] = useState<TripRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tripId) return;
    const unsub = onSnapshot(doc(db, "trips", tripId), (docSnap) => {
      if (docSnap.exists()) {
        setTrip({ ...(docSnap.data() as TripRecord), id: docSnap.id });
      }
      setLoading(false);
    });

    return () => unsub();
  }, [tripId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 text-center">
        <div className="w-10 h-10 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin mx-auto mb-3"></div>
        <p className="text-xs text-white/70">Connecting to live campus GPS telemetry...</p>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md p-6 rounded-[28px] liquid-glass-panel text-center space-y-3 specular-shine">
          <p className="font-bold text-white text-base">Trip Not Found or Link Expired</p>
          <p className="apple-caption">This live tracking link is either concluded or inactive.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Live Header */}
      <div className="p-6 rounded-[28px] liquid-glass-panel shadow-2xl flex items-center justify-between specular-shine">
        <div>
          <span className="px-3 py-1 rounded-full bg-white/10 text-emerald-300 border border-white/20 text-[10px] font-extrabold uppercase tracking-wider">
            Live Tracking Feed
          </span>
          <h1 className="apple-title text-white mt-2.5">
            {trip.riderName}'s Campus Ride
          </h1>
          <p className="apple-caption mt-1">
            Status: <span className="font-semibold text-emerald-400 capitalize">{trip.status.replace("_", " ")}</span>
          </p>
        </div>

        <div className="text-right">
          <a
            href="tel:112"
            className="px-4 py-2.5 rounded-[16px] liquid-glass-sos text-white text-xs font-bold shadow flex items-center gap-1.5 cursor-pointer"
          >
            <AlertOctagon className="w-4 h-4" />
            <span>Emergency (112)</span>
          </a>
        </div>
      </div>

      {/* Live Map */}
      <LiveMap
        currentLocation={
          trip.currentDriverLat && trip.currentDriverLng
            ? { lat: trip.currentDriverLat, lng: trip.currentDriverLng }
            : { lat: trip.pickup.lat, lng: trip.pickup.lng }
        }
        pickupPoint={trip.pickup}
        destinationPoint={trip.destination}
        routePolyline={trip.routePolyline || []}
        activeDriverLocation={
          trip.currentDriverLat && trip.currentDriverLng
            ? {
                lat: trip.currentDriverLat,
                lng: trip.currentDriverLng,
                heading: trip.currentDriverHeading,
                speed: trip.currentDriverSpeed,
              }
            : null
        }
        driverInfo={{
          name: trip.driverName || undefined,
          photo: trip.driverPhoto || undefined,
          vehicle: trip.driverVehicle || undefined,
        }}
        tripStatus={trip.status}
      />

      {/* Driver & Trip Details */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-6 rounded-[24px] liquid-glass-panel space-y-3.5">
          <p className="text-xs font-bold text-white/60 uppercase tracking-wider">Assigned Campus Captain & Vehicle</p>
          <div className="flex items-center gap-3.5">
            <img
              src={trip.driverPhoto || `https://api.dicebear.com/7.x/identicon/svg?seed=${trip.driverId || "driver"}`}
              alt="captain"
              className="w-12 h-12 rounded-[16px] object-cover border-2 border-emerald-400 shadow-md"
            />
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm text-white">{trip.driverName || "Assigned Driver"}</p>
              <p className="text-xs text-indigo-200">
                {trip.driverVehicle?.make} {trip.driverVehicle?.model}
                {trip.driverVehicle?.color ? ` (${trip.driverVehicle.color})` : ""}
              </p>
              
              <div className="inline-flex items-center rounded-[6px] bg-slate-100 text-slate-950 font-mono text-[10px] border border-slate-400 shadow-sm overflow-hidden font-black tracking-wider mt-1">
                <div className="bg-blue-700 text-white px-1.5 py-0.5 text-[6px] font-extrabold border-r border-blue-900 select-none">
                  IND
                </div>
                <div className="px-2 py-0.5 bg-white text-slate-950 uppercase font-bold">
                  {trip.driverVehicle?.licensePlate || "MH 31 CP 2024"}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 rounded-[24px] liquid-glass-panel space-y-2 text-xs">
          <p className="font-bold text-white/60 uppercase tracking-wider">Route Destination</p>
          <p className="text-white/90">
            <span className="text-emerald-400 font-bold">Pickup:</span> {trip.pickup.name}
          </p>
          <p className="text-white/90">
            <span className="text-rose-400 font-bold">Destination:</span> {trip.destination.name}
          </p>
          <p className="text-indigo-300 font-semibold pt-1 font-mono">
            Distance: {trip.distanceKm} km • ~{trip.durationMins} mins
          </p>
        </div>
      </div>
    </div>
  );
};
