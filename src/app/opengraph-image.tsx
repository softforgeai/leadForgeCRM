import { renderShareImage } from "@/lib/brand-image";

export const alt = "LeadForge: pipeline, follow-ups and website leads for small service businesses";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Preview image when the site is shared on LinkedIn, Slack, X, etc. */
export default function OpenGraphImage() {
  return renderShareImage();
}
