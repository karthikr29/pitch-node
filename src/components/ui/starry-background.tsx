"use client";

import { useEffect, useState } from "react";

interface Star {
    id: number;
    x: number;
    y: number;
    size: number;
    opacity: number;
    animationDelay: number;
    animationDuration: number;
    glowIntensity: number;
}

interface ShootingStar {
    id: number;
    startX: number;
    startY: number;
    angle: number;
    length: number;
    duration: number;
}

// Generate random stars with more variation
function generateStars(count: number): Star[] {
    return Array.from({ length: count }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 2.5 + 0.5, // 0.5px to 3px
        opacity: Math.random() * 0.5 + 0.2, // 0.2 to 0.7
        animationDelay: Math.random() * 8, // 0-8s delay for more variation
        animationDuration: Math.random() * 4 + 2, // 2-6s for slower twinkling
        glowIntensity: Math.random() * 0.6 + 0.2, // Subtle glow variation
    }));
}

export function StarryBackground() {
    const [shootingStars, setShootingStars] = useState<ShootingStar[]>([]);
    const [isVisible, setIsVisible] = useState(false);
    const [stars, setStars] = useState<Star[]>([]);
    const [isMounted, setIsMounted] = useState(false);

    // Generate stars only on client side to avoid hydration mismatch
    useEffect(() => {
        setStars(generateStars(120));
        setIsMounted(true);
    }, []);

    // Smooth fade-in on mount
    useEffect(() => {
        const fadeInTimeout = setTimeout(() => {
            setIsVisible(true);
        }, 100);

        return () => clearTimeout(fadeInTimeout);
    }, []);

    // Generate shooting stars periodically
    useEffect(() => {
        const createShootingStar = () => {
            const newStar: ShootingStar = {
                id: Date.now() + Math.random(),
                startX: Math.random() * 70 + 10, // 10% to 80% from left
                startY: Math.random() * 40, // Top 40% of screen
                angle: Math.random() * 25 + 20, // 20-45 degrees
                length: Math.random() * 100 + 80, // 80-180px trail
                duration: Math.random() * 1.5 + 0.8, // 0.8-2.3s duration
            };

            setShootingStars((prev) => [...prev, newStar]);

            // Remove shooting star after animation completes
            setTimeout(() => {
                setShootingStars((prev) => prev.filter((s) => s.id !== newStar.id));
            }, newStar.duration * 1000 + 500);
        };

        // Create first shooting star after initial fade-in
        const initialTimeout = setTimeout(createShootingStar, 3000);

        // Create shooting stars at random intervals (every 3-7 seconds)
        const interval = setInterval(() => {
            if (Math.random() > 0.3) { // 70% chance each interval
                createShootingStar();
            }
        }, 3500);

        return () => {
            clearTimeout(initialTimeout);
            clearInterval(interval);
        };
    }, []);

    // Don't render anything until client-side mount to avoid hydration mismatch
    if (!isMounted) {
        return null;
    }

    return (
        <div
            className="fixed inset-0 overflow-hidden pointer-events-none transition-opacity duration-[2000ms] ease-out"
            style={{
                zIndex: 1,
                opacity: isVisible ? 1 : 0,
            }}
            aria-hidden="true"
        >
            {/* Rotating star field container - slow continuous rotation */}
            <div
                className="absolute animate-rotate-stars"
                style={{
                    inset: '-50%',
                    width: '200%',
                    height: '200%',
                }}
            >
                {/* Static twinkling stars */}
                {stars.map((star) => (
                    <div
                        key={star.id}
                        className="absolute rounded-full animate-twinkle"
                        style={{
                            left: `${star.x}%`,
                            top: `${star.y}%`,
                            width: `${star.size}px`,
                            height: `${star.size}px`,
                            backgroundColor: 'rgba(255, 255, 255, 0.9)',
                            boxShadow: `0 0 ${star.size * 2}px ${star.glowIntensity}px rgba(255, 255, 255, ${star.glowIntensity})`,
                            animationDelay: `${star.animationDelay}s`,
                            animationDuration: `${star.animationDuration}s`,
                            ['--star-opacity' as string]: star.opacity,
                        }}
                    />
                ))}
            </div>

            {/* Secondary star layer with slower rotation for depth effect */}
            <div
                className="absolute animate-rotate-stars"
                style={{
                    inset: '-30%',
                    width: '160%',
                    height: '160%',
                    animationDirection: 'reverse',
                    animationDuration: '300s',
                }}
            >
                {stars.slice(0, 40).map((star) => (
                    <div
                        key={`secondary-${star.id}`}
                        className="absolute rounded-full animate-twinkle"
                        style={{
                            left: `${(star.x + 20) % 100}%`,
                            top: `${(star.y + 15) % 100}%`,
                            width: `${star.size * 0.6}px`,
                            height: `${star.size * 0.6}px`,
                            backgroundColor: 'rgba(200, 220, 255, 0.7)',
                            boxShadow: `0 0 ${star.size}px rgba(200, 220, 255, 0.3)`,
                            animationDelay: `${star.animationDelay + 2}s`,
                            animationDuration: `${star.animationDuration + 1}s`,
                            ['--star-opacity' as string]: star.opacity * 0.6,
                        }}
                    />
                ))}
            </div>

            {/* Shooting stars */}
            {shootingStars.map((star) => (
                <div
                    key={star.id}
                    className="absolute animate-shooting-star"
                    style={{
                        left: `${star.startX}%`,
                        top: `${star.startY}%`,
                        ['--shooting-duration' as string]: `${star.duration}s`,
                        ['--star-angle' as string]: `${star.angle}deg`,
                    }}
                >
                    {/* Trail that grows behind the head */}
                    <div
                        className="absolute right-0 top-1/2 -translate-y-1/2 h-[2px] origin-right animate-shooting-trail"
                        style={{
                            ['--trail-length' as string]: `${star.length}px`,
                            background: `linear-gradient(270deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.5) 30%, rgba(255, 255, 255, 0) 100%)`,
                        }}
                    />
                    {/* Bright head of the shooting star */}
                    <div
                        className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white animate-shooting-head"
                        style={{
                            boxShadow: "0 0 6px 2px rgba(255, 255, 255, 0.9), 0 0 12px 4px rgba(255, 255, 255, 0.5)",
                        }}
                    />
                </div>
            ))}
        </div>
    );
}

