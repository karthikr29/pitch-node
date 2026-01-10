"use client";

import { useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Modal } from "@/components/ui";
import { NameStep } from "./name-step";
import { EmailStep } from "./email-step";
import { ExperienceStep } from "./experience-step";
import { ThankYou } from "./thank-you";
import {
  useWaitlistForm,
  getStepProgress,
} from "@/hooks/use-waitlist-form";
import { submitWaitlist } from "@/app/actions";

interface WaitlistModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WaitlistModal({ isOpen, onClose }: WaitlistModalProps) {
  const {
    step,
    formData,
    error,
    setStep,
    updateField,
    nextStep,
    prevStep,
    reset,
    setError,
  } = useWaitlistForm();

  const handleClose = useCallback(() => {
    onClose();
    // Reset form after modal close animation
    setTimeout(reset, 300);
  }, [onClose, reset]);

  const handleSubmit = useCallback(async () => {
    setStep("submitting");
    setError(null);

    try {
      const result = await submitWaitlist(formData);

      if (result.success) {
        setStep("success");
      } else {
        setStep("experience");
        setError(result.error || "Something went wrong. Please try again.");
      }
    } catch {
      setStep("experience");
      setError("Something went wrong. Please try again.");
    }
  }, [formData, setStep, setError]);

  const renderStep = () => {
    switch (step) {
      case "name":
        return (
          <NameStep
            key="name"
            value={formData.name}
            onChange={(value) => updateField("name", value)}
            onNext={nextStep}
            error={error}
            setError={setError}
            stepNumber={1}
            totalSteps={3}
          />
        );
      case "email":
        return (
          <EmailStep
            key="email"
            value={formData.email}
            onChange={(value) => updateField("email", value)}
            onSubmit={nextStep}
            onPrev={prevStep}
            isSubmitting={false}
            error={error}
            setError={setError}
            stepNumber={2}
            totalSteps={3}
          />
        );
      case "experience":
      case "submitting":
        return (
          <ExperienceStep
            key="experience"
            value={formData.experienceRating}
            onChange={(value) => updateField("experienceRating", value)}
            onSubmit={handleSubmit}
            onPrev={prevStep}
            isSubmitting={step === "submitting"}
            error={error}
            setError={setError}
            stepNumber={3}
            totalSteps={3}
          />
        );
      case "success":
        return (
          <ThankYou
            key="success"
            name={formData.name.split(" ")[0]}
            email={formData.email}
            onClose={handleClose}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} variant="fullscreen">
      <div className="h-full flex flex-col">
        {/* Progress bar - only show when not on success */}
        {step !== "success" && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute top-0 left-0 right-0 h-1 bg-border/30"
          >
            <motion.div
              className="h-full bg-primary"
              initial={{ width: 0 }}
              animate={{ width: `${getStepProgress(step)}%` }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            />
          </motion.div>
        )}

        {/* Main content area */}
        <div className="flex-1 flex items-center justify-center px-6 py-20">
          <div className="w-full max-w-xl">
            <AnimatePresence mode="wait">{renderStep()}</AnimatePresence>
          </div>
        </div>
      </div>
    </Modal>
  );
}
