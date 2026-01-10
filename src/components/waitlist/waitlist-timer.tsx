"use client";

import { useEffect, useState } from "react";
import { WaitlistModal } from "./waitlist-modal";
import { WaitlistNudge } from "./waitlist-nudge";

const WAITLIST_POPUP_DELAY = 6000; // 6 seconds
const SESSION_STORAGE_KEY = "pitch_node_waitlist_shown";

export function WaitlistTimer() {
    const [isNudgeOpen, setIsNudgeOpen] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
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
        setIsModalOpen(true);
    };

    const handleNudgeClose = () => {
        setIsNudgeOpen(false);
    };

    if (hasShown && !isNudgeOpen && !isModalOpen) return null;

    return (
        <>
            <WaitlistNudge
                isOpen={isNudgeOpen}
                onClose={handleNudgeClose}
                onJoin={handleJoinClick}
            />
            <WaitlistModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
            />
        </>
    );
}
