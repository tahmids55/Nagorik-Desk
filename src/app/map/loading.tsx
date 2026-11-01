import { LoadingShell, Skeleton } from "@/components/ui/Skeleton";
import { getT } from "@/i18n/server";

export default async function Loading() {
  const { t } = await getT();
  return (
    <LoadingShell label={t("map_loading")} className="flex h-[calc(100dvh-7.5rem-env(safe-area-inset-top)-env(safe-area-inset-bottom))] min-h-[420px] flex-col md:h-[calc(100dvh-3.5rem)]">
      <div className="flex gap-2 border-b border-line bg-surface px-3 py-2.5 sm:px-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-9 w-20" />
        ))}
      </div>
      <div className="flex min-h-0 flex-1">
        <Skeleton className="h-full flex-1 !rounded-none" />
        <div className="hidden w-[340px] space-y-3 border-l border-line bg-surface p-4 md:block">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      </div>
    </LoadingShell>
  );
}
