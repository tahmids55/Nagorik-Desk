import { LoadingShell, PostCardSkeleton, Skeleton } from "@/components/ui/Skeleton";
import { getT } from "@/i18n/server";

export default async function Loading() {
  const { t } = await getT();
  return (
    <LoadingShell label={t("loading")} className="mx-auto max-w-[860px] space-y-4 px-3 py-5 sm:px-4 sm:py-6">
      <Skeleton className="h-4 w-32" />
      <div className="card space-y-4 rounded-[4px] p-4 shadow-none sm:p-5">
        <div className="flex gap-3">
          <Skeleton className="h-11 w-11" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-14" />
          ))}
        </div>
      </div>
      <PostCardSkeleton withImage />
    </LoadingShell>
  );
}
