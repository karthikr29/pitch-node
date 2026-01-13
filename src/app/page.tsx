"use client";

import { Header, Footer } from "@/components/layout";
import {
  Hero,
  ProblemSolution,
  HowItWorks,
  Features,
  Personas,
  FinalCTA,
} from "@/components/sections";
import { StarryBackground } from "@/components/ui";
import { useWaitlist } from "@/contexts/waitlist-context";

export default function Home() {
  const { openModal } = useWaitlist();

  return (
    <>
      <StarryBackground />
      <Header onOpenWaitlist={openModal} />

      <main>
        <Hero onOpenWaitlist={openModal} />
        <ProblemSolution />
        <HowItWorks onOpenWaitlist={openModal} />
        <Features />
        <Personas />
        <FinalCTA onOpenWaitlist={openModal} />
      </main>

      <Footer />
    </>
  );
}
