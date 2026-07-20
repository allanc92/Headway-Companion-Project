import type { Metadata } from "next";
import { PortalExperience } from "@/components/portal/PortalExperience";

export const metadata: Metadata = {
  title: "Your care home — The Intention Engine",
  description:
    "A browser-local prototype care home for your Intention, fictional provider choice, and simulated session.",
};

export default function PortalPage() {
  return <PortalExperience />;
}
