import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.APP_URL ?? "http://localhost:3000";
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/office", "/authority", "/admin", "/settings", "/notifications", "/saved", "/security", "/new", "/api/", "/login", "/register", "/forgot"] }],
    sitemap: `${base}/sitemap.xml`,
  };
}
