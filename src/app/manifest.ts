import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Nagorik Desk",
    short_name: "Nagorik Desk",
    description: "Report local problems in Panchagarh-1 and follow the fix.",
    start_url: "/",
    display: "standalone",
    background_color: "#F3F3F1",
    theme_color: "#F3F3F1",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
