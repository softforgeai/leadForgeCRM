import { ImageResponse } from "next/og";

/** Shared drawing code for the generated PNG icons and the social share image. */

function Mark({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3b82f6" />
          <stop offset="1" stopColor="#1d4ed8" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="15" fill="url(#g)" />
      <path d="M19 15v34h27" fill="none" stroke="#fff" strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M29 36l8-8 9 9" fill="none" stroke="#fff" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function renderIconPng(size: number) {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex" }}>
        <Mark size={size} />
      </div>
    ),
    { width: size, height: size },
  );
}

const STAGES = [
  { name: "New", color: "#0ea5e9", cards: 3 },
  { name: "Contacted", color: "#8b5cf6", cards: 2 },
  { name: "Qualified", color: "#f59e0b", cards: 3 },
  { name: "Won", color: "#10b981", cards: 2 },
];

export function renderShareImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "linear-gradient(135deg, #0b1120 0%, #111827 55%, #172554 100%)",
          color: "#f3f4f6",
          fontFamily: "sans-serif",
          padding: 64,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", width: 560, justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <Mark size={56} />
            <span style={{ fontSize: 34, fontWeight: 700 }}>LeadForge</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <span style={{ fontSize: 58, fontWeight: 700, lineHeight: 1.08, letterSpacing: -1.5 }}>
              Stop losing leads in spreadsheets.
            </span>
            <span style={{ fontSize: 26, color: "#9ca3af", lineHeight: 1.4 }}>
              Pipeline, follow-ups and website leads for small service businesses.
            </span>
          </div>
          <span style={{ fontSize: 20, color: "#6b7280" }}>A showcase project by SoftForge AI</span>
        </div>

        {/* Stylised pipeline board */}
        <div style={{ display: "flex", gap: 14, marginLeft: 48, flex: 1, alignItems: "flex-start", paddingTop: 30 }}>
          {STAGES.map((stage, i) => (
            <div
              key={stage.name}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 10,
                width: 128,
                padding: 10,
                borderRadius: 14,
                background: "rgba(255,255,255,0.05)",
                borderTop: `4px solid ${stage.color}`,
                marginTop: i * 18,
              }}
            >
              <span style={{ fontSize: 15, fontWeight: 600, color: "#e5e7eb" }}>{stage.name}</span>
              {Array.from({ length: stage.cards }, (_, j) => (
                <div
                  key={j}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 7,
                    padding: 10,
                    borderRadius: 9,
                    background: "#f9fafb",
                  }}
                >
                  <div style={{ width: 70 + ((i + j) % 3) * 10, height: 8, borderRadius: 4, background: "#1f2937" }} />
                  <div style={{ width: 54, height: 6, borderRadius: 3, background: "#9ca3af" }} />
                  <div style={{ width: 40, height: 8, borderRadius: 4, background: stage.color }} />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
