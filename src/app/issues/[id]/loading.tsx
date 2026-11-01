import { LoadingShell, PostCardSkeleton, Skeleton } from "@/components/ui/Skeleton";
import { getT } from "@/i18n/server";

export default async function Loading() {
  const { t } = await getT();
  return (
    <LoadingShell label={t("loading")} className="mx-auto w-full max-w-[720px] space-y-3 px-3 py-4 sm:space-y-4 sm:px-4 sm:py-5">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-6 w-20" />
      </div>
      <PostCardSkeleton withImage />
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-36 w-full" />
    </LoadingShell>
  );
}
