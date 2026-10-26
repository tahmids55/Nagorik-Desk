import type { Metadata } from "next";
import { StaticPage } from "@/components/layout/StaticPage";

export const metadata: Metadata = { title: "Privacy" };

export default function PrivacyPage() {
  return <StaticPage page="privacy" />;
}
