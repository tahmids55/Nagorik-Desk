import type { Metadata } from "next";
import { StaticPage } from "@/components/layout/StaticPage";

export const metadata: Metadata = { title: "About" };

export default function AboutPage() {
  return <StaticPage page="about" />;
}
