import { SearchX } from "lucide-react";
import Link from "next/link";
import { getT } from "@/i18n/server";

export default async function NotFound() {
  const { t } = await getT();
  return (
    <div className="mx-auto flex max-w-md flex-col items-start px-4 py-24 text-left">
      <SearchX className="mb-4 h-8 w-8 text-muted" strokeWidth={1.5} aria-hidden="true" />
      <h1 className="text-xl font-semibold">{t("not_found_title")}</h1>
      <p className="mt-2 text-sm text-muted">{t("not_found_body")}</p>
      <Link href="/" className="btn-primary mt-6 rounded-[3px] font-medium">
        {t("back_to_feed")}
      </Link>
    </div>
  );
}
