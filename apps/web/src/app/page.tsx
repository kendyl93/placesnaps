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

export default function Home() {
  const [status, setStatus] = useState<string>("");
  const [feed, setFeed] = useState<PostItem[]>([]);

  async function loadFeed() {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/feed`, {
      cache: "no-store",
    });
    if (!res.ok) throw new Error(await res.text());
    setFeed(await res.json());
  }

  useEffect(() => {
    loadFeed().catch((e) => setStatus(`Feed error: ${e.message}`));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setStatus("Getting location...");
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
        })
      );

      setStatus("Uploading image...");
      const ext = file.name.split(".").pop() || "jpg";
      const path = `public/${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("posts")
        .upload(path, file, { contentType: file.type, upsert: false });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("posts").getPublicUrl(path);
      const mediaUrl = data.publicUrl;

      setStatus("Saving post...");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
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

      <input type="file" accept="image/*" onChange={handleFile} />
      <p>{status}</p>

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
              {new Date(p.createdAt).toLocaleString()} • {p.lat.toFixed(4)},
              {p.lng.toFixed(4)}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
