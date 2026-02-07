"use client";

import { Header, Footer } from "@/components/layout";
import {
  Hero,
  ProblemSolution,
  HowItWorks,
  Features,
  Personas,
  Pricing,
  FinalCTA,
} from "@/components/sections";
import { StarryBackground } from "@/components/ui";

export default function Home() {
  return (
    <>
      <StarryBackground />
      <Header />

      <main>
        <Hero />
        <ProblemSolution />
        <HowItWorks />
        <Features />
        <Personas />
        <Pricing />
        <FinalCTA />
      </main>

      <Footer />
    </>
  );
}
