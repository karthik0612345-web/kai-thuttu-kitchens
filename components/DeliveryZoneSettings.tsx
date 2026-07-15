"use client";

import { doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { useEffect, useRef, useState } from "react";
import { db } from "@/lib/firebase";
import {
  checkDeliveryZone,
  defaultDeliveryZone,
  parseCoordinatesFromMapsLink,
  type DeliveryZone,
} from "@/lib/deliveryZone";

type LeafletMap = {
  remove: () => void;
  setView: (latLng: [number, number], zoom: number) => void;
  removeLayer: (layer: unknown) => void;
};

type LeafletMarker = {
  addTo: (map: LeafletMap) => LeafletMarker;
  on: (event: string, callback: () => void) => void;
  getLatLng: () => { lat: number; lng: number };
};

type LeafletCircle = {
  addTo: (map: LeafletMap) => LeafletCircle;
};

type LeafletGlobal = {
  map: (element: HTMLElement) => LeafletMap;
  tileLayer: (
    url: string,
    options: Record<string, string | number>,
  ) => { addTo: (map: LeafletMap) => unknown };
  marker: (
    latLng: [number, number],
    options: { draggable: boolean },
  ) => LeafletMarker;
  circle: (
    latLng: [number, number],
    options: Record<string, string | number | boolean>,
  ) => LeafletCircle;
};

declare global {
  interface Window {
    L?: LeafletGlobal;
  }
}

const leafletScriptUrl = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
const leafletStyleUrl = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";

function loadLeaflet() {
  return new Promise<LeafletGlobal>((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("Map can only load in the browser."));
      return;
    }

    if (window.L) {
      resolve(window.L);
      return;
    }

    if (!document.querySelector(`link[href="${leafletStyleUrl}"]`)) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = leafletStyleUrl;
      document.head.appendChild(link);
    }

    const existingScript = document.querySelector<HTMLScriptElement>(
      `script[src="${leafletScriptUrl}"]`,
    );

    if (existingScript) {
      existingScript.addEventListener(
        "load",
        () => (window.L ? resolve(window.L) : reject(new Error("Map library failed to load."))),
        { once: true },
      );
      existingScript.addEventListener(
        "error",
        () => reject(new Error("Map library failed to load.")),
        { once: true },
      );
      return;
    }

    const script = document.createElement("script");
    script.src = leafletScriptUrl;
    script.async = true;
    script.onload = () => {
      if (window.L) {
        resolve(window.L);
      } else {
        reject(new Error("Map library failed to load."));
      }
    };
    script.onerror = () => reject(new Error("Map library failed to load."));
    document.body.appendChild(script);
  });
}

function normalizeDeliveryZone(data: Partial<DeliveryZone> | undefined): DeliveryZone {
  return {
    isEnabled: data?.isEnabled === true,
    centerLatitude: Number.isFinite(Number(data?.centerLatitude))
      ? Number(data?.centerLatitude)
      : defaultDeliveryZone.centerLatitude,
    centerLongitude: Number.isFinite(Number(data?.centerLongitude))
      ? Number(data?.centerLongitude)
      : defaultDeliveryZone.centerLongitude,
    radiusKm:
      Number.isFinite(Number(data?.radiusKm)) && Number(data?.radiusKm) > 0
        ? Number(data?.radiusKm)
        : defaultDeliveryZone.radiusKm,
  };
}

export function useDeliveryZone() {
  const [zone, setZone] = useState<DeliveryZone>(defaultDeliveryZone);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!db) {
      setIsLoading(false);
      return;
    }

    return onSnapshot(
      doc(db, "settings", "deliveryZone"),
      (snapshot) => {
        setZone(normalizeDeliveryZone(snapshot.data() as Partial<DeliveryZone> | undefined));
        setIsLoading(false);
      },
      () => {
        setIsLoading(false);
      },
    );
  }, []);

  return { zone, isLoading };
}

export async function saveDeliveryZone(zone: DeliveryZone) {
  if (!db) {
    throw new Error("Firebase is not configured.");
  }

  await setDoc(
    doc(db, "settings", "deliveryZone"),
    {
      ...zone,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export default function DeliveryZoneAdmin() {
  const { zone, isLoading } = useDeliveryZone();
  const [form, setForm] = useState<DeliveryZone>(defaultDeliveryZone);
  const [mapsLink, setMapsLink] = useState("");
  const [message, setMessage] = useState("");
  const mapElementRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<LeafletMarker | null>(null);
  const circleRef = useRef<LeafletCircle | null>(null);

  useEffect(() => {
    setForm(zone);
  }, [zone]);

  useEffect(() => {
    let isCancelled = false;

    async function setupMap() {
      if (!mapElementRef.current) {
        return;
      }

      try {
        const leaflet = await loadLeaflet();

        if (isCancelled || !mapElementRef.current) {
          return;
        }

        if (!mapRef.current) {
          const map = leaflet.map(mapElementRef.current);
          map.setView([form.centerLatitude, form.centerLongitude], 13);
          leaflet
            .tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
              maxZoom: 19,
              attribution: "OpenStreetMap",
            })
            .addTo(map);
          mapRef.current = map;
        }

        const map = mapRef.current;
        map.setView([form.centerLatitude, form.centerLongitude], 13);

        if (markerRef.current) {
          map.removeLayer(markerRef.current);
        }

        if (circleRef.current) {
          map.removeLayer(circleRef.current);
        }

        const marker = leaflet
          .marker([form.centerLatitude, form.centerLongitude], { draggable: true })
          .addTo(map);
        const circle = leaflet
          .circle([form.centerLatitude, form.centerLongitude], {
            radius: form.radiusKm * 1000,
            color: "#F97316",
            fillColor: "#E9B44C",
            fillOpacity: 0.16,
            weight: 2,
          })
          .addTo(map);

        marker.on("dragend", () => {
          const position = marker.getLatLng();
          setForm((current) => ({
            ...current,
            centerLatitude: Number(position.lat.toFixed(6)),
            centerLongitude: Number(position.lng.toFixed(6)),
          }));
        });

        markerRef.current = marker;
        circleRef.current = circle;
      } catch {
        setMessage("Map could not load. You can still save latitude, longitude, and radius manually.");
      }
    }

    setupMap();

    return () => {
      isCancelled = true;
    };
  }, [form.centerLatitude, form.centerLongitude, form.radiusKm]);

  useEffect(() => {
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  const updateNumber = (
    field: "centerLatitude" | "centerLongitude" | "radiusKm",
    value: string,
  ) => {
    const parsedValue = Number(value);

    setForm((current) => ({
      ...current,
      [field]: Number.isFinite(parsedValue) ? parsedValue : current[field],
    }));
  };

  const applyMapsLink = () => {
    const coordinates = parseCoordinatesFromMapsLink(mapsLink);

    if (!coordinates) {
      setMessage("Paste a valid Google Maps link containing latitude and longitude.");
      return;
    }

    setForm((current) => ({
      ...current,
      centerLatitude: Number(coordinates.latitude.toFixed(6)),
      centerLongitude: Number(coordinates.longitude.toFixed(6)),
    }));
    setMessage("Map center updated from Google Maps link.");
  };

  const saveZone = async () => {
    setMessage("");

    if (form.radiusKm <= 0) {
      setMessage("Delivery radius must be greater than 0 km.");
      return;
    }

    try {
      await saveDeliveryZone(form);
      setMessage("Delivery range saved. Customers outside this range will be blocked at checkout.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save delivery range.");
    }
  };

  const preview = checkDeliveryZone(form, {
    latitude: form.centerLatitude,
    longitude: form.centerLongitude,
  });

  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
      <div className="rounded-lg border border-white/10 bg-white/[0.06] p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.2em] text-[#F97316]">
              Delivery range
            </p>
            <h2 className="mt-2 text-3xl font-black text-white">
              Drag the kitchen center
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-300">
              Drag the marker to your kitchen/service center and set the delivery radius. Customers outside this circle cannot place an order.
            </p>
          </div>
          <span className={`rounded-full px-4 py-2 text-xs font-black ${form.isEnabled ? "bg-emerald-500 text-black" : "bg-zinc-700 text-zinc-200"}`}>
            {form.isEnabled ? "Enabled" : "Disabled"}
          </span>
        </div>

        <div
          ref={mapElementRef}
          className="mt-5 h-[420px] overflow-hidden rounded-lg border border-[#E9B44C]/25 bg-[#111111]"
        />

        <p className="mt-4 text-sm font-semibold text-zinc-300">
          Current center: {form.centerLatitude.toFixed(6)}, {form.centerLongitude.toFixed(6)} | Radius: {form.radiusKm} km
        </p>
        <p className="mt-2 text-sm font-semibold text-emerald-200">
          {preview.message}
        </p>
      </div>

      <div className="rounded-lg border border-white/10 bg-white/[0.06] p-5">
        <h3 className="text-2xl font-black text-white">Delivery controls</h3>
        <div className="mt-5 grid gap-4">
          <label className="flex items-center gap-3 text-sm font-bold text-zinc-200">
            <input
              type="checkbox"
              checked={form.isEnabled}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  isEnabled: event.target.checked,
                }))
              }
            />
            Enable delivery range checking
          </label>

          <label className="grid gap-2 text-sm font-bold text-amber-100">
            Paste kitchen Google Maps link
            <div className="grid gap-3">
              <input
                value={mapsLink}
                onChange={(event) => setMapsLink(event.target.value)}
                placeholder="https://www.google.com/maps?q=12.9786,77.364"
                className="h-12 rounded-lg border border-white/10 bg-black/35 px-4 text-white outline-none"
              />
              <button
                type="button"
                onClick={applyMapsLink}
                className="h-11 rounded-full border border-[#E9B44C]/40 px-5 text-sm font-black text-[#E9B44C] transition hover:bg-[#E9B44C] hover:text-black"
              >
                Use this location
              </button>
            </div>
          </label>

          <label className="grid gap-2 text-sm font-bold text-amber-100">
            Latitude
            <input
              type="number"
              step="0.000001"
              value={form.centerLatitude}
              onChange={(event) => updateNumber("centerLatitude", event.target.value)}
              className="h-12 rounded-lg border border-white/10 bg-black/35 px-4 text-white outline-none"
            />
          </label>

          <label className="grid gap-2 text-sm font-bold text-amber-100">
            Longitude
            <input
              type="number"
              step="0.000001"
              value={form.centerLongitude}
              onChange={(event) => updateNumber("centerLongitude", event.target.value)}
              className="h-12 rounded-lg border border-white/10 bg-black/35 px-4 text-white outline-none"
            />
          </label>

          <label className="grid gap-2 text-sm font-bold text-amber-100">
            Delivery radius in km
            <input
              type="number"
              min="0.5"
              step="0.5"
              value={form.radiusKm}
              onChange={(event) => updateNumber("radiusKm", event.target.value)}
              className="h-12 rounded-lg border border-white/10 bg-black/35 px-4 text-white outline-none"
            />
          </label>

          <button
            type="button"
            onClick={saveZone}
            disabled={isLoading}
            className="h-12 rounded-full bg-[#F97316] px-6 text-sm font-black text-white transition hover:bg-[#E9B44C] hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
          >
            Save delivery range
          </button>

          {message && (
            <p className="rounded-lg border border-[#E9B44C]/25 bg-[#2D1B14] p-4 text-sm font-bold leading-6 text-[#E9B44C]">
              {message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
