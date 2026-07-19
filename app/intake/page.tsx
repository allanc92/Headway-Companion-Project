import { IntakeExperience } from "@/components/intake/IntakeExperience";
import { isVoiceEnabled } from "@/lib/realtime";
import type { IntakeContext } from "@/lib/types";
import { connection } from "next/server";

export default async function IntakePage({
  searchParams,
}: {
  searchParams: Promise<{ zip?: string; insurance?: string }>;
}) {
  await connection();
  const sp = await searchParams;
  const context: IntakeContext = {
    zip: (sp.zip ?? "").replace(/\D/g, "").slice(0, 5),
    insurance: sp.insurance ?? "",
  };
  return (
    <IntakeExperience context={context} voiceEnabled={isVoiceEnabled()} />
  );
}
