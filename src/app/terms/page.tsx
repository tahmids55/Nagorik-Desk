import type { Metadata } from "next";
import { StaticPage } from "@/components/layout/StaticPage";

export const metadata: Metadata = { title: "Terms of use" };

export default function TermsPage() {
  return <StaticPage page="terms" />;
}
