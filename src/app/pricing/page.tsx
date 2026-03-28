import type { Metadata } from "next";
import PricingClient from "./pricing-client";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "ConvoSparr launch pricing — $79/mo for AI-powered sales roleplay training. Limited time offer.",
};

export default function PricingPage() {
  return <PricingClient />;
}
