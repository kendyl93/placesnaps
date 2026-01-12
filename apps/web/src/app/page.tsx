"use client";

import { useEffect, useState } from "react";

export default function Home() {
  const [health, setHealth] = useState<string | null>(null);

  useEffect(() => {
    fetch(process.env.NEXT_PUBLIC_API_URL + "/health")
      .then((r) => r.json())
      .then((data) => {
        setHealth(data.ok ? "ok" : "not ok");
      })
      .catch(() => setHealth("error"));
  }, []);

  return (
    <main style={{ padding: 24, fontFamily: "system-ui" }}>
      <h1>PlaceSnaps</h1>
      <p>API health: {health ? "ok" : "nope"}</p>

      <button style={{ padding: "10px 14px", borderRadius: 10 }}>
        Leave one
      </button>

      <div style={{ marginTop: 24, display: "grid", gap: 16 }}>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              height: 420,
              borderRadius: 16,
              border: "1px solid #ddd",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#666",
            }}
          >
            Post #{i} (image placeholder)
          </div>
        ))}
      </div>
    </main>
  );
}
