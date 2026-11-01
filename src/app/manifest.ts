import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Nagorik Desk",
    short_name: "Nagorik Desk",
    description: "Report local problems in Panchagarh-1 and follow the fix.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#F3F3F1",
    theme_color: "#F3F3F1",
    lang: "bn",
    dir: "ltr",
    categories: ["government", "news", "social"],
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    // Long-press the home-screen icon on Android to jump straight to these.
    shortcuts: [
      { name: "Report an issue · সমস্যা জানান", short_name: "Report", url: "/new", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Map · মানচিত্র", short_name: "Map", url: "/map", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Scorecard · স্কোরকার্ড", short_name: "Scorecard", url: "/accountability", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
