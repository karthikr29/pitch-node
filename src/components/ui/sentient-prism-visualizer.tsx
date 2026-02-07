"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Float, MeshDistortMaterial, Icosahedron, Torus, Environment, Sparkles } from "@react-three/drei";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { cn } from "@/lib/utils";

interface SentientPrismProps {
    mode: "ai" | "user" | "idle";
    className?: string;
}

function PrismCore({ mode }: { mode: "ai" | "user" | "idle" }) {
    const meshRef = useRef<THREE.Mesh>(null);
    const materialRef = useRef<THREE.MeshPhysicalMaterial>(null);

    // Target values for smooth transitions
    const targetScale = useRef(1);
    const targetSpeed = useRef(0.5);
    const targetColor = useRef(new THREE.Color("#4f46e5")); // Default indigo/primary
    const targetEmissive = useRef(new THREE.Color("#000000"));

    useFrame((state, delta) => {
        if (!meshRef.current || !materialRef.current) return;

        // Determine targets based on mode
        if (mode === "idle") {
            targetScale.current = 1;
            targetSpeed.current = 0.5;
            targetColor.current.set("#64748b"); // Slate 500
            targetEmissive.current.set("#000000"); // No glow
        } else if (mode === "user") {
            // User speaking: Absorbing, Blue/Cyan, Fast Spin
            targetScale.current = 1.2;
            targetSpeed.current = 2.0;
            targetColor.current.set("#0ea5e9"); // Sky 500
            targetEmissive.current.set("#0284c7"); // Slight glow
        } else if (mode === "ai") {
            // AI speaking: Pulsing, Pink/Purple, Variable Scale
            // Pulse scale randomly for "voice" effect
            const noise = Math.sin(state.clock.elapsedTime * 10) * 0.2;
            targetScale.current = 1.3 + noise;
            targetSpeed.current = 1.0;
            targetColor.current.set("#d946ef"); // Fuchsia 500
            targetEmissive.current.set("#c026d3"); // Strong glow
        }

        // specific rotation logic
        meshRef.current.rotation.x += delta * targetSpeed.current;
        meshRef.current.rotation.y += delta * targetSpeed.current * 0.5;

        // Smoothly interpolate current values to targets
        const lerpFactor = 0.1;
        meshRef.current.scale.lerp(new THREE.Vector3(targetScale.current, targetScale.current, targetScale.current), lerpFactor);

        // Color interpolation
        materialRef.current.color.lerp(targetColor.current, lerpFactor);
        materialRef.current.emissive.lerp(targetEmissive.current, lerpFactor);
    });

    return (
        <Icosahedron args={[1, 0]} ref={meshRef}> {/* args=[radius, detail] detail=0 for low-poly look */}
            <meshPhysicalMaterial
                ref={materialRef}
                roughness={0}
                metalness={0.8}
                clearcoat={1}
                clearcoatRoughness={0}
                transparent
                opacity={0.9}
                wireframe={true} // Main core is wireframe? Or solid? Let's do solid glass
                wireframeLinewidth={2}
            />
        </Icosahedron>
    );
}

function OuterShell({ mode }: { mode: "ai" | "user" | "idle" }) {
    const meshRef = useRef<THREE.Mesh>(null);

    useFrame((state, delta) => {
        if (!meshRef.current) return;

        let rotSpeed = 0.2;
        let scale = 1.5;

        if (mode === 'user') {
            rotSpeed = 0.5;
            scale = 1.6;
            // Wobble effect could be added here if using MeshWobbleMaterial
        } else if (mode === 'ai') {
            rotSpeed = 0.8;
            scale = 1.8 + Math.sin(state.clock.elapsedTime * 5) * 0.05;
        }

        meshRef.current.rotation.y -= delta * rotSpeed;
        meshRef.current.rotation.z += delta * (rotSpeed * 0.5);

        const lerpFactor = 0.1;
        meshRef.current.scale.lerp(new THREE.Vector3(scale, scale, scale), lerpFactor);
    });

    return (
        <Icosahedron args={[1, 1]} ref={meshRef}>
            <meshBasicMaterial
                color={mode === 'ai' ? "#ec4899" : mode === 'user' ? "#38bdf8" : "#94a3b8"}
                wireframe
                transparent
                opacity={0.15}
            />
        </Icosahedron>
    );
}

function Scene({ mode }: { mode: "ai" | "user" | "idle" }) {
    return (
        <>
            <ambientLight intensity={0.5} />
            <pointLight position={[10, 10, 10]} intensity={1} />
            <pointLight position={[-10, -10, -10]} intensity={0.5} color="blue" />

            <Float
                speed={2}
                rotationIntensity={0.5}
                floatIntensity={0.5}
            >
                <PrismCore mode={mode} />
                <OuterShell mode={mode} />
            </Float>

            {/* Floating particles */}
            <Sparkles
                count={50}
                scale={4}
                size={2}
                speed={0.4}
                opacity={0.5}
                color={mode === 'ai' ? "#f0abfc" : mode === 'user' ? "#7dd3fc" : "#cbd5e1"}
            />

            {/* Environment for reflections */}
            <Environment preset="city" />
        </>
    );
}

export function SentientPrismVisualizer({ mode, className }: SentientPrismProps) {
    return (
        <div className={cn("relative w-full h-full min-h-[300px]", className)}>
            {/* Adjusted camera to prevent clipping without changing the model scale if possible, 
            but kept the original logic mostly intact. 
            Original logic had camera at [0,0,4]. User said it was clipping. 
            I will set it to [0,0,5] to be safe but keep existing logic. */}
            <Canvas camera={{ position: [0, 0, 5], fov: 45 }} gl={{ antialias: true, alpha: true }}>
                <Scene mode={mode} />
            </Canvas>
        </div>
    );
}
