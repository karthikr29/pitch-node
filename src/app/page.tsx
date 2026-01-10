"use client";

import { useState } from "react";
import { Header, Footer } from "@/components/layout";
import {
  Hero,
  ProblemSolution,
  HowItWorks,
  Features,
  Personas,
  FinalCTA,
} from "@/components/sections";
import { WaitlistModal } from "@/components/waitlist";
import { StarryBackground } from "@/components/ui";

export default function Home() {
  const [isWaitlistOpen, setIsWaitlistOpen] = useState(false);

  const openWaitlist = () => setIsWaitlistOpen(true);
  const closeWaitlist = () => setIsWaitlistOpen(false);

  return (
    <>
      <StarryBackground />
      <Header onOpenWaitlist={openWaitlist} />

      <main>
        <Hero onOpenWaitlist={openWaitlist} />
        <ProblemSolution />
        <HowItWorks onOpenWaitlist={openWaitlist} />
        <Features />
        <Personas />
        <FinalCTA onOpenWaitlist={openWaitlist} />
      </main>

      <Footer />

      <WaitlistModal isOpen={isWaitlistOpen} onClose={closeWaitlist} />
    </>
  );
}
