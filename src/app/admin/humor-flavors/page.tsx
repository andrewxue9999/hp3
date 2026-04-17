import HumorFlavorStudio from "@/components/humor-flavor-studio";
import { getStepsForFlavor, loadHumorFlavorManagerData } from "@/lib/humor-flavors";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminHumorFlavorsPage({ searchParams }: PageProps) {
  const resolvedParams = searchParams ? await searchParams : {};
  const selectedFlavorId = typeof resolvedParams.flavor === "string" ? resolvedParams.flavor : null;
  const duplicateFrom = typeof resolvedParams.duplicateFrom === "string" ? resolvedParams.duplicateFrom : null;
  const notice = typeof resolvedParams.message === "string" ? resolvedParams.message : null;
  const status =
    resolvedParams.status === "success" || resolvedParams.status === "error" ? resolvedParams.status : null;

  const data = await loadHumorFlavorManagerData();
  const duplicateFlavor = duplicateFrom ? data.flavors.find((flavor) => flavor.id === duplicateFrom) ?? null : null;
  const duplicateSteps = duplicateFlavor ? getStepsForFlavor(data.steps, duplicateFlavor.id) : [];

  return (
    <HumorFlavorStudio
      apiBaseUrl={process.env.NEXT_PUBLIC_ALMOSTCRACKD_API_URL ?? "https://api.almostcrackd.ai"}
      duplicateFlavor={duplicateFlavor}
      duplicateSteps={duplicateSteps}
      flavorParamKey={process.env.NEXT_PUBLIC_HUMOR_FLAVOR_PARAM_KEY ?? "humorFlavorId"}
      images={data.images}
      flavors={data.flavors}
      notice={notice}
      recentCaptions={data.recentCaptions}
      selectedFlavorId={selectedFlavorId}
      status={status}
      steps={data.steps}
    />
  );
}
