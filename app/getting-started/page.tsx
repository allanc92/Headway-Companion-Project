import { GettingStarted } from "@/components/interstitial/GettingStarted";
import { getDeterministicProviderCount, getStateName } from "@/lib/getting-started";
import { zipToState } from "@/lib/providers";

export default async function GettingStartedPage({
  searchParams,
}: {
  searchParams: Promise<{ zip?: string; insurance?: string }>;
}) {
  const sp = await searchParams;
  const zip = (sp.zip ?? "").replace(/\D/g, "").slice(0, 5);
  const insurance = sp.insurance ?? "";
  const stateAbbreviation = zipToState(zip);
  const stateName = getStateName(stateAbbreviation);
  const providerCount =
    stateName !== null
      ? getDeterministicProviderCount(stateName).toLocaleString("en-US")
      : undefined;

  return (
    <GettingStarted
      zip={zip}
      insurance={insurance}
      providerCount={providerCount}
      stateName={stateName}
    />
  );
}
