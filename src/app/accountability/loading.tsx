import { LoadingShell, Skeleton } from "@/components/ui/Skeleton";
import { getT } from "@/i18n/server";

export default async function Loading() {
  const { t } = await getT();
  return (
    <LoadingShell label={t("loading")} className="mx-auto max-w-[1100px] space-y-4 px-3 py-5 sm:space-y-5 sm:px-4 sm:py-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-3 w-80 max-w-full" />
      </div>
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 md:grid-cols-5">
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className={i === 4 ? "col-span-2 h-[88px] md:col-span-1" : "h-[88px]"} />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-2">
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
      <Skeleton className="h-72" />
    </LoadingShell>
  );
}
