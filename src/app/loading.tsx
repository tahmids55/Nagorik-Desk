import { LoadingShell, PostCardSkeleton, Skeleton } from "@/components/ui/Skeleton";
import { getT } from "@/i18n/server";

export default async function Loading() {
  const { t } = await getT();
  return (
    <LoadingShell label={t("loading")} className="mx-auto max-w-[680px] space-y-3 px-3 py-4 sm:space-y-4 sm:px-4">
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-24 w-full" />
      <PostCardSkeleton withImage />
      <PostCardSkeleton />
    </LoadingShell>
  );
}
