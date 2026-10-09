import type { Metadata } from "next";
import { DirectionsLab } from "@/components/directions-lab";
import { directionById } from "@/lib/design-directions";
import "@fontsource/cormorant-garamond/400.css";
import "@fontsource/cormorant-garamond/500.css";
import "@fontsource/cormorant-garamond/400-italic.css";
import "@fontsource/dm-sans/400.css";
import "@fontsource/dm-sans/500.css";
import "@fontsource/dm-sans/600.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "@fontsource/bebas-neue/400.css";
import "./directions.css";
import "./lab.css";
import "./royale.css";
import "../refinements.css";

export const metadata: Metadata = {
  title: "River — Six directions",
  description:
    "Six complete interface directions for the same private poker platform. Explore, play and compare before choosing.",
};
export default async function DirectionsPage({
  searchParams,
}: {
  searchParams: Promise<{ direction?: string }>;
}) {
  const { direction } = await searchParams;
  return (
    <DirectionsLab initialDirection={directionById(direction)?.id || null} />
  );
}
