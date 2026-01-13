"use client";

import { useEffect, useState } from "react";
import { WaitlistModal } from "./waitlist-modal";
import { WaitlistNudge } from "./waitlist-nudge";
import { useWaitlist } from "@/contexts/waitlist-context";

const WAITLIST_POPUP_DELAY = 10000; // 10 seconds
const SESSION_STORAGE_KEY = "pitch_node_waitlist_shown";

export function WaitlistTimer() {
    const { isModalOpen, openModal, closeModal } = useWaitlist();
    const [isNudgeOpen, setIsNudgeOpen] = useState(false);
    const [hasShown, setHasShown] = useState(true);

    useEffect(() => {
        const shownSession = sessionStorage.getItem(SESSION_STORAGE_KEY);

        if (!shownSession) {
            setHasShown(false);

            const timer = setTimeout(() => {
                setIsNudgeOpen(true);
                // We set session storage here so it counts as "shown" even if they don't interact
                sessionStorage.setItem(SESSION_STORAGE_KEY, "true");
                setHasShown(true);
            }, WAITLIST_POPUP_DELAY);

            return () => clearTimeout(timer);
        }
    }, []);

    const handleJoinClick = () => {
        setIsNudgeOpen(false);
        openModal();
    };

    const handleNudgeClose = () => {
        setIsNudgeOpen(false);
    };

    if (hasShown && !isNudgeOpen && !isModalOpen) return null;

    return (
        <>
            {/* Only show nudge when modal is NOT open */}
            <WaitlistNudge
                isOpen={isNudgeOpen && !isModalOpen}
                onClose={handleNudgeClose}
                onJoin={handleJoinClick}
            />
            <WaitlistModal
                isOpen={isModalOpen}
                onClose={closeModal}
            />
        </>
    );
}
