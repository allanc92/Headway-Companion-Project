import { IntakeExperience } from "@/components/intake/IntakeExperience";
import type { IntakeContext } from "@/lib/types";

export default async function IntakePage({
  searchParams,
}: {
  searchParams: Promise<{ zip?: string; insurance?: string }>;
}) {
  const sp = await searchParams;
  const context: IntakeContext = {
    zip: (sp.zip ?? "").replace(/\D/g, "").slice(0, 5),
    insurance: sp.insurance ?? "",
  };
  return <IntakeExperience context={context} />;
}
