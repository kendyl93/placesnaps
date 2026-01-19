"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type PostItem = {
  id: string;
  mediaUrl: string | null;
  lat: number;
  lng: number;
  createdAt: string;
  expiresAt: string;
};

/**
 * Geolocation helper:
 * - never hangs
 * - timeout
 * - cache allowed
 * - no high accuracy (mobile-safe)
 */
function getLocation(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new Error("Geolocation not supported"));
      return;
    }

    const timeoutId = setTimeout(() => {
      reject(new Error("Location timeout"));
    }, 8000);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearTimeout(timeoutId);
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      },
      (err) => {
        clearTimeout(timeoutId);
        if (err.code === err.PERMISSION_DENIED)
          reject(new Error("Location permission denied"));
        else if (err.code === err.POSITION_UNAVAILABLE)
          reject(new Error("Location unavailable"));
        else reject(new Error("Location error"));
      },
      {
        enableHighAccuracy: false,
        maximumAge: 60_000,
      },
    );
  });
}

export default function Home() {
  const [status, setStatus] = useState<string>("");
  const [feed, setFeed] = useState<PostItem[]>([]);
  const [uploading, setUploading] = useState(false);

  async function loadFeed(coords?: { lat: number; lng: number } | null) {
    const url = new URL(`${process.env.NEXT_PUBLIC_API_URL}/feed`);
    if (coords) {
      url.searchParams.set("lat", String(coords.lat));
      url.searchParams.set("lng", String(coords.lng));
    }

    const res = await fetch(url.toString(), { cache: "no-store" });
    if (!res.ok) throw new Error(await res.text());
    setFeed(await res.json());
  }

  useEffect(() => {
    (async () => {
      try {
        // best-effort: jak nie działa, po prostu pokaż createdAt desc
        const coords = await getLocation();
        await loadFeed(coords);
      } catch {
        await loadFeed(null);
      }
    })().catch((e) => setStatus(`Feed error: ${e.message}`));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || uploading) return;

    setUploading(true);

    try {
      setStatus("Getting location...");
      let coords: { lat: number; lng: number } | null = null;

      try {
        coords = await getLocation();
      } catch (locErr: any) {
        setStatus(`Location issue: ${locErr.message}. Posting anyway…`);
      }

      setStatus("Uploading image...");
      const ext = file.name.split(".").pop() || "jpg";
      const path = `public/${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("posts")
        .upload(path, file, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("posts").getPublicUrl(path);
      const mediaUrl = data.publicUrl;

      setStatus("Saving post...");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lat: coords?.lat ?? 0,
          lng: coords?.lng ?? 0,
          mediaUrl,
        }),
      });

      if (!res.ok) throw new Error(await res.text());

      setStatus("Posted ✅");
      await loadFeed();
    } catch (err: any) {
      setStatus(`Error: ${err?.message ?? String(err)}`);
    } finally {
      e.target.value = "";
      setUploading(false);
    }
  }

  return (
    <main
      style={{
        padding: 24,
        fontFamily: "system-ui",
        maxWidth: 520,
        margin: "0 auto",
      }}
    >
      <h1>PlaceSnaps</h1>

      <input
        type="file"
        accept="image/*"
        onChange={handleFile}
        disabled={uploading}
      />

      <p style={{ minHeight: 24 }}>{status}</p>

      <div style={{ display: "grid", gap: 16, marginTop: 16 }}>
        {feed.map((p) => (
          <div
            key={p.id}
            style={{
              border: "1px solid #ddd",
              borderRadius: 16,
              overflow: "hidden",
            }}
          >
            {p.mediaUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={p.mediaUrl}
                alt=""
                style={{ width: "100%", display: "block" }}
              />
            ) : (
              <div style={{ padding: 24, color: "#666" }}>No media</div>
            )}

            <div style={{ padding: 12, fontSize: 12, color: "#666" }}>
              {new Date(p.createdAt).toLocaleString()} •{" "}
              {p.lat !== 0 || p.lng !== 0
                ? `${p.lat.toFixed(4)}, ${p.lng.toFixed(4)}`
                : "no location"}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
