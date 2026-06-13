import type { Metadata } from "next";
import LandingScreen from "./LandingScreen";

export const metadata: Metadata = {
  title: "Localy - Discover local. Support local.",
  description:
    "Discover your community's largest collection of local businesses: popular spots, hidden gems, family-owned shops, exclusive deals, and services you won't find on major platforms.",
  openGraph: {
    title: "Localy",
    description: "Discover local. Support local.",
    type: "website",
  },
};

export default function Page() {
  return <LandingScreen />;
}
