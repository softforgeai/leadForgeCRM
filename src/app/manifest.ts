import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "LeadForge CRM",
    short_name: "LeadForge",
    description: "Pipeline, follow-ups and website leads for small service businesses.",
    start_url: "/app",
    display: "standalone",
    background_color: "#f3f5f8",
    theme_color: "#111827",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
