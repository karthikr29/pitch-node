"use client";

import { useState, useCallback } from "react";

export type FormStep = "name" | "email" | "experience" | "submitting" | "success";

export interface FormData {
  name: string;
  email: string;
  experienceRating: number;
}

export interface UseWaitlistFormReturn {
  step: FormStep;
  formData: FormData;
  error: string | null;
  setStep: (step: FormStep) => void;
  updateField: <K extends keyof FormData>(field: K, value: FormData[K]) => void;
  nextStep: () => void;
  prevStep: () => void;
  reset: () => void;
  setError: (error: string | null) => void;
}

const initialFormData: FormData = {
  name: "",
  email: "",
  experienceRating: 5,
};

const stepOrder: FormStep[] = ["name", "email", "experience"];

export function useWaitlistForm(): UseWaitlistFormReturn {
  const [step, setStep] = useState<FormStep>("name");
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [error, setError] = useState<string | null>(null);

  const updateField = useCallback(
    <K extends keyof FormData>(field: K, value: FormData[K]) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
      setError(null);
    },
    []
  );

  const nextStep = useCallback(() => {
    const currentIndex = stepOrder.indexOf(step as (typeof stepOrder)[number]);
    if (currentIndex < stepOrder.length - 1) {
      setStep(stepOrder[currentIndex + 1]);
      setError(null);
    }
  }, [step]);

  const prevStep = useCallback(() => {
    const currentIndex = stepOrder.indexOf(step as (typeof stepOrder)[number]);
    if (currentIndex > 0) {
      setStep(stepOrder[currentIndex - 1]);
      setError(null);
    }
  }, [step]);

  const reset = useCallback(() => {
    setStep("name");
    setFormData(initialFormData);
    setError(null);
  }, []);

  return {
    step,
    formData,
    error,
    setStep,
    updateField,
    nextStep,
    prevStep,
    reset,
    setError,
  };
}

export function getStepNumber(step: FormStep): number {
  const stepMap: Record<FormStep, number> = {
    name: 1,
    email: 2,
    experience: 3,
    submitting: 3,
    success: 3,
  };
  return stepMap[step];
}

export function getStepProgress(step: FormStep): number {
  const progressMap: Record<FormStep, number> = {
    name: 33,
    email: 66,
    experience: 100,
    submitting: 100,
    success: 100,
  };
  return progressMap[step];
}
