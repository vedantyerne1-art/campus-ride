import React, { useState, useRef } from "react";
import {
  X,
  Car,
  Camera,
  Upload,
  Check,
  Sparkles,
  ShieldCheck,
  Image as ImageIcon,
  CheckCircle2,
  RefreshCw,
  Info,
} from "lucide-react";
import { VehicleDetails, VehicleType } from "../types";
import { useAuth } from "../context/AuthContext";
import { db, doc, updateDoc } from "../lib/firebase";

interface BikeDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentVehicle?: VehicleDetails;
  onSaved?: (updated: VehicleDetails) => void;
}

// Popular sample high-quality bike photos for quick selection
const POPULAR_BIKE_PHOTOS = [
  {
    name: "Royal Enfield Hunter 350 (Dapper Ash)",
    make: "Royal Enfield",
    model: "Hunter 350",
    color: "Matte Black & Ash",
    type: "bike" as VehicleType,
    url: "https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=800&auto=format&fit=crop&q=80",
  },
  {
    name: "Honda Activa 6G / Scooter",
    make: "Honda",
    model: "Activa 6G",
    color: "Pearl Siren Blue",
    type: "bike" as VehicleType,
    url: "https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=800&auto=format&fit=crop&q=80",
  },
  {
    name: "Ather 450X Electric Scooter",
    make: "Ather",
    model: "450X Gen 3",
    color: "Space Grey EV",
    type: "ev_scooter" as VehicleType,
    url: "https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=800&auto=format&fit=crop&q=80",
  },
  {
    name: "Hero Splendor Plus Campus Edition",
    make: "Hero",
    model: "Splendor Plus i3S",
    color: "Black with Silver",
    type: "bike" as VehicleType,
    url: "https://images.unsplash.com/photo-1558981420-87aa9dad1c89?w=800&auto=format&fit=crop&q=80",
  },
  {
    name: "Yamaha FZ-S V4 / Sports Commuter",
    make: "Yamaha",
    model: "FZ-S V4 FI",
    color: "Racing Blue Metallic",
    type: "bike" as VehicleType,
    url: "https://images.unsplash.com/photo-1558980664-769d59546b3d?w=800&auto=format&fit=crop&q=80",
  },
];

const POPULAR_BRANDS = [
  "Royal Enfield",
  "Hero",
  "Honda",
  "Yamaha",
  "Ather",
  "TVS",
  "Bajaj",
  "KTM",
  "Suzuki",
  "Ola",
];

const POPULAR_COLORS = [
  "Matte Black",
  "Racing Blue",
  "Pearl White",
  "Crimson Red",
  "Dapper Ash Grey",
  "Silver Metallic",
  "Military Green",
  "Sunset Yellow",
];

export const BikeDetailsModal: React.FC<BikeDetailsModalProps> = ({
  isOpen,
  onClose,
  currentVehicle,
  onSaved,
}) => {
  const { currentUser, userProfile, updateUserProfile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [make, setMake] = useState(currentVehicle?.make || userProfile?.vehicleDetails?.make || "Hero");
  const [model, setModel] = useState(currentVehicle?.model || userProfile?.vehicleDetails?.model || "Splendor Plus");
  const [licensePlate, setLicensePlate] = useState(
    currentVehicle?.licensePlate || userProfile?.vehicleDetails?.licensePlate || "MH 31 CP 2024"
  );
  const [color, setColor] = useState(currentVehicle?.color || userProfile?.vehicleDetails?.color || "Matte Black");
  const [type, setType] = useState<VehicleType>(currentVehicle?.type || userProfile?.vehicleDetails?.type || "bike");
  const [photoUrl, setPhotoUrl] = useState(
    currentVehicle?.photoUrl ||
      userProfile?.vehicleDetails?.photoUrl ||
      POPULAR_BIKE_PHOTOS[0].url
  );
  const [helmetProvided, setHelmetProvided] = useState(
    currentVehicle?.helmetProvided ?? userProfile?.vehicleDetails?.helmetProvided ?? true
  );
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  if (!isOpen) return null;

  // Handle local image file upload (convert to Base64 data URL)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 3 * 1024 * 1024) {
        alert("Please select a photo smaller than 3MB.");
        return;
      }
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        if (uploadEvent.target?.result) {
          setPhotoUrl(uploadEvent.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSelectPreset = (preset: typeof POPULAR_BIKE_PHOTOS[0]) => {
    setMake(preset.make);
    setModel(preset.model);
    setColor(preset.color);
    setType(preset.type);
    setPhotoUrl(preset.url);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!licensePlate.trim() || !make.trim() || !model.trim()) return;

    setIsSaving(true);
    const updatedVehicle: VehicleDetails = {
      type,
      make: make.trim(),
      model: model.trim(),
      licensePlate: licensePlate.trim().toUpperCase(),
      color: color.trim(),
      photoUrl: photoUrl.trim(),
      helmetProvided,
    };

    try {
      // 1. Update user profile in state & Firestore
      await updateUserProfile({
        vehicleDetails: updatedVehicle,
      });

      // 2. If online in drivers collection, update driver's vehicle info in real time
      if (currentUser) {
        try {
          const driverRef = doc(db, "drivers", currentUser.uid);
          await updateDoc(driverRef, {
            vehicle: updatedVehicle,
            lastUpdated: new Date().toISOString(),
          }).catch(() => {});
        } catch {}
      }

      setSuccessMsg("Bike details & photo uploaded successfully!");
      if (onSaved) onSaved(updatedVehicle);

      setTimeout(() => {
        setSuccessMsg("");
        onClose();
      }, 1200);
    } catch (err) {
      console.error("Error updating bike details:", err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-2xl max-h-[92vh] flex flex-col rounded-[32px] liquid-glass-panel shadow-2xl border border-white/20 overflow-hidden specular-shine animate-in zoom-in-95 duration-200">
        
        {/* MODAL HEADER */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-slate-950/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[14px] bg-emerald-600/30 border border-emerald-400/40 text-emerald-300 flex items-center justify-center shadow-lg">
              <Car className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Upload & Register Bike Details</span>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  Rider Visible
                </span>
              </h2>
              <p className="text-[11px] text-white/60">
                Students and passengers will see this bike name, photo, and number plate to identify your ride.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white flex items-center justify-center transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* MODAL BODY (Scrollable) */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
          {successMsg && (
            <div className="p-3.5 rounded-[16px] bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-xs font-bold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* LIVE VISUAL PREVIEW: What the student sees */}
          <div className="p-4 rounded-[22px] bg-gradient-to-br from-indigo-950/60 via-slate-900/80 to-slate-950/90 border border-indigo-500/30 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Live Student Match Card Preview
              </span>
              <span className="text-[10px] text-emerald-300 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                ✓ Publicly Visible
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-950/60 p-3.5 rounded-[18px] border border-white/10">
              {/* Bike Photo Preview */}
              <div className="relative w-full sm:w-28 h-24 rounded-[14px] overflow-hidden bg-slate-900 border border-white/20 shrink-0 shadow-inner group">
                <img
                  src={photoUrl || "https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=400&q=80"}
                  alt="Bike Preview"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[10px] font-bold transition-opacity cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5 mr-1" /> Change
                </button>
              </div>

              {/* Bike Name & HSRP Plate Display */}
              <div className="flex-1 space-y-2 w-full">
                <div>
                  <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                    <span>{make || "Bike Brand"} {model || "Model Name"}</span>
                    {color && (
                      <span className="text-[10px] font-normal text-white/60">
                        ({color})
                      </span>
                    )}
                  </h3>
                  <p className="text-[11px] text-indigo-200/80">
                    {type === "bike" && "Campus Motorcycle / Bike"}
                    {type === "ev_scooter" && "Green EV Scooter (Eco-Friendly)"}
                    {type === "auto" && "Campus E-Rickshaw / Auto"}
                    {type === "car" && "Student Carpool"}
                  </p>
                </div>

                {/* AUTHENTIC INDIAN HSRP NUMBER PLATE GRAPHIC */}
                <div className="inline-flex items-center rounded-[8px] bg-slate-100 text-slate-950 font-mono font-black text-xs sm:text-sm border-2 border-slate-400 shadow-md overflow-hidden tracking-wider">
                  <div className="bg-blue-700 text-white px-2 py-1 flex flex-col items-center justify-center text-[8px] font-extrabold leading-none border-r border-blue-900 select-none">
                    <span>🇮🇳</span>
                    <span className="text-[7px]">IND</span>
                  </div>
                  <div className="px-3 py-1 bg-white text-slate-950 font-bold uppercase tracking-widest">
                    {licensePlate || "MH 31 CP 2024"}
                  </div>
                </div>

                {helmetProvided && (
                  <div className="flex items-center gap-1.5 text-[10px] font-semibold text-emerald-300">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Clean Passenger Helmet Guaranteed</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* QUICK BIKE PRESET SELECTOR */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-white flex items-center justify-between">
              <span>⚡ Quick-Select Popular Campus Bikes</span>
              <span className="text-[10px] text-white/50">1-click auto-fill photo & specs</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {POPULAR_BIKE_PHOTOS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectPreset(preset)}
                  className={`p-2 rounded-[14px] text-left transition-all border cursor-pointer flex items-center gap-2 ${
                    make === preset.make && model === preset.model
                      ? "bg-indigo-600/30 border-indigo-400 text-white shadow-lg ring-1 ring-indigo-400"
                      : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <img
                    src={preset.url}
                    alt={preset.name}
                    className="w-8 h-8 rounded-[8px] object-cover shrink-0"
                  />
                  <div className="truncate">
                    <p className="text-[11px] font-bold truncate leading-tight">{preset.make} {preset.model}</p>
                    <p className="text-[9px] text-white/50 truncate">{preset.color}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* VEHICLE PHOTO UPLOAD SECTION */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-white flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-indigo-400" />
                Upload Real Bike / Vehicle Photo
              </span>
              <span className="text-[10px] text-indigo-300">Helps students recognize your bike at campus gates</span>
            </label>

            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Upload Box */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="p-4 rounded-[18px] bg-white/5 hover:bg-white/10 border-2 border-dashed border-white/20 hover:border-indigo-400/60 transition-all flex flex-col items-center justify-center text-center cursor-pointer group"
              >
                <div className="w-10 h-10 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Upload className="w-5 h-5" />
                </div>
                <p className="text-xs font-bold text-white mt-2">Click to Upload Bike Photo</p>
                <p className="text-[10px] text-white/50 mt-0.5">PNG, JPG or WEBP up to 3MB</p>
              </div>

              {/* Direct Photo URL Input */}
              <div className="p-3.5 rounded-[18px] bg-white/5 border border-white/10 flex flex-col justify-between space-y-2">
                <div>
                  <label className="text-[11px] font-semibold text-white/70 block mb-1">
                    Or Enter Image URL
                  </label>
                  <input
                    type="url"
                    value={photoUrl}
                    onChange={(e) => setPhotoUrl(e.target.value)}
                    placeholder="https://example.com/my-bike.jpg"
                    className="w-full px-3 py-2 rounded-[10px] bg-slate-950/80 border border-white/20 text-xs text-white placeholder-white/30 focus:outline-none focus:border-indigo-400"
                  />
                </div>
                <p className="text-[10px] text-white/40 flex items-center gap-1">
                  <Info className="w-3 h-3 text-indigo-300" />
                  Your bike image will be shown to student riders upon booking.
                </p>
              </div>
            </div>
          </div>

          {/* BIKE DETAILS INPUTS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Bike Make / Brand */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-white">
                Bike Brand / Manufacturer *
              </label>
              <input
                type="text"
                value={make}
                onChange={(e) => setMake(e.target.value)}
                placeholder="e.g. Royal Enfield, Hero, Honda, Yamaha"
                required
                className="w-full px-3.5 py-2.5 rounded-[12px] bg-slate-950/80 border border-white/20 text-xs text-white focus:outline-none focus:border-indigo-400"
              />
              <div className="flex flex-wrap gap-1 pt-1">
                {POPULAR_BRANDS.slice(0, 5).map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setMake(b)}
                    className="px-2 py-0.5 rounded-full bg-white/5 hover:bg-white/15 text-[10px] text-white/60 hover:text-white"
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>

            {/* Bike Model Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-white">
                Bike Model Name *
              </label>
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="e.g. Hunter 350, Splendor Plus, Activa 6G"
                required
                className="w-full px-3.5 py-2.5 rounded-[12px] bg-slate-950/80 border border-white/20 text-xs text-white focus:outline-none focus:border-indigo-400"
              />
            </div>

            {/* RTO License Plate */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-white flex items-center justify-between">
                <span>RTO License Plate Number *</span>
                <span className="text-[10px] text-emerald-300 font-mono">Nagpur MH-31</span>
              </label>
              <input
                type="text"
                value={licensePlate}
                onChange={(e) => setLicensePlate(e.target.value.toUpperCase())}
                placeholder="e.g. MH 31 CP 2024"
                required
                className="w-full px-3.5 py-2.5 rounded-[12px] bg-slate-950/80 border border-white/20 text-xs text-white font-mono uppercase tracking-wider focus:outline-none focus:border-indigo-400"
              />
            </div>

            {/* Bike Color */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-white">
                Vehicle Color
              </label>
              <input
                type="text"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                placeholder="e.g. Matte Black, Racing Blue, Pearl White"
                className="w-full px-3.5 py-2.5 rounded-[12px] bg-slate-950/80 border border-white/20 text-xs text-white focus:outline-none focus:border-indigo-400"
              />
              <div className="flex flex-wrap gap-1 pt-1">
                {POPULAR_COLORS.slice(0, 4).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className="px-2 py-0.5 rounded-full bg-white/5 hover:bg-white/15 text-[10px] text-white/60 hover:text-white"
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Vehicle Category */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-white">
                Vehicle Category
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as VehicleType)}
                className="w-full px-3.5 py-2.5 rounded-[12px] bg-slate-950/90 border border-white/20 text-xs text-white cursor-pointer"
              >
                <option value="bike">Campus Motorcycle / Bike</option>
                <option value="ev_scooter">Electric Scooter (EV)</option>
                <option value="auto">E-Rickshaw / Auto</option>
                <option value="car">Student Carpool</option>
              </select>
            </div>

            {/* Helmet Provided */}
            <div className="flex items-center pt-6">
              <label className="flex items-center gap-2.5 text-xs text-white cursor-pointer p-2.5 rounded-[12px] bg-emerald-950/30 border border-emerald-500/30 w-full">
                <input
                  type="checkbox"
                  checked={helmetProvided}
                  onChange={(e) => setHelmetProvided(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-400 cursor-pointer"
                />
                <span className="text-emerald-200 font-semibold">
                  I provide a clean helmet for the student rider
                </span>
              </label>
            </div>
          </div>

          {/* SUBMIT BUTTONS */}
          <div className="flex items-center gap-3 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="py-3 px-5 rounded-[16px] liquid-glass-btn text-white/70 hover:text-white text-xs font-bold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 py-3.5 rounded-[18px] liquid-glass-primary text-white text-xs font-black shadow-xl flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.01] transition-all"
            >
              <Check className="w-4 h-4 text-emerald-300" />
              <span>{isSaving ? "Uploading & Saving..." : "Save & Update Bike for All Riders"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
