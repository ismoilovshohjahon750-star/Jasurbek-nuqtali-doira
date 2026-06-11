import React, { useEffect, useRef } from "react";

interface VoiceOrbProps {
  state: "listening" | "speaking" | "idle";
}

export const VoiceOrb: React.FC<VoiceOrbProps> = ({ state }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    let width = canvas.width = 450;
    let height = canvas.height = 450;

    // Handle high density resize using ResizeObserver wrapped in requestAnimationFrame to avoid loop errors
    let resizeFrameId: number;
    const resizeObserver = new ResizeObserver((entries) => {
      if (resizeFrameId) {
        cancelAnimationFrame(resizeFrameId);
      }
      resizeFrameId = requestAnimationFrame(() => {
        for (const entry of entries) {
          if (canvas) {
            const dpr = window.devicePixelRatio || 1;
            const { width: contentWidth, height: contentHeight } = entry.contentRect;
            const size = Math.min(contentWidth, contentHeight) || 450;
            
            // High quality sharp resolution matching parent by only setting drawing buffer properties
            width = canvas.width = Math.floor(size * dpr);
            height = canvas.height = Math.floor(size * dpr);
            ctx.scale(dpr, dpr);
            
            // Set virtual coordinates
            width = size;
            height = size;
          }
        }
      });
    });

    if (canvas.parentElement) {
      resizeObserver.observe(canvas.parentElement);
    }

    // High Density: 3500 beautiful luminous microscopic particles
    const particleCount = 3500;
    const particles: {
      theta: number;       // Polar angle
      phi: number;         // Azimuthal angle
      baseRadius: number;  // Distance offset from center
      speedOffset: number; // Angular speed variance
      size: number;        // Shimmer diameter
      brightness: number;  // Alpha transparency base
      phaseOffset: number; // Wave alignment
    }[] = [];

    for (let i = 0; i < particleCount; i++) {
      // Golden ratio sampling for beautiful even spherical distribution
      const theta = Math.acos(1 - 2 * (i / particleCount));
      const phi = i * Math.PI * (3 - Math.sqrt(5)); // Golden angle

      particles.push({
        theta,
        phi,
        baseRadius: 0.95 + Math.random() * 0.08, // Very close to a perfect sphere shell
        speedOffset: 0.7 + Math.random() * 0.6,
        size: 0.6 + Math.random() * 2.0, // Enchanted galactic dust size range
        brightness: 0.55 + Math.random() * 0.45,
        phaseOffset: Math.random() * Math.PI * 2,
      });
    }

    let angleX = 0;
    let angleY = 0;
    let angleZ = 0;

    const render = () => {
      // Clear canvas to be fully transparent so only the sparkling points/particles are visible
      ctx.clearRect(0, 0, width, height);

      // Compositing for overlapping particle glows!
      ctx.globalCompositeOperation = "lighter";

      let speedMultiplier = 1.0;
      let primaryColor = { r: 0, g: 242, b: 255 }; // Cyan
      let secondaryColor = { r: 138, g: 43, b: 226 }; // Indigo Purple

      // Match the video's active behavior perfectly
      if (state === "speaking") {
        speedMultiplier = 3.5; // Burning high rotation fast vortex
        primaryColor = { r: 244, g: 63, b: 94 };    // Rose / Crimson Red
        secondaryColor = { r: 249, g: 115, b: 22 };   // Vibrant Orange
      } else if (state === "listening") {
        speedMultiplier = 1.9; // Fluid listening motion
        primaryColor = { r: 6, g: 182, b: 212 };     // Cyan Screen
        secondaryColor = { r: 16, g: 185, b: 129 };   // Emerald Teal
      } else {
        speedMultiplier = 0.55; // Calming steady rotational orbit
        primaryColor = { r: 29, g: 78, b: 216 };     // Royal Blue
        secondaryColor = { r: 109, g: 40, b: 217 };   // Deep Purple
      }

      const centerX = width / 2;
      const centerY = height / 2;
      const sphereRadius = width * 0.43; // Expanded radius to maximize screen width usage without clipping


      // Orbit rates
      angleX += 0.0022 * speedMultiplier;
      angleY += 0.0031 * speedMultiplier;
      angleZ += 0.0012 * speedMultiplier;

      const projected: {
        x: number;
        y: number;
        size: number;
        color: string;
        z: number;
      }[] = [];

      const time = Date.now() * 0.001 * speedMultiplier;

      // Project all 3500 particles onto 2D space
      for (let i = 0; i < particleCount; i++) {
        const p = particles[i];

        // Complex fluid turbulence based on 3-harmonic sine waves
        // Creates continuous fluid dynamic warping on the sphere's surface
        const wave1 = Math.sin(time * 2.2 + p.phi * 3.0 + p.theta * 2.0) * 0.045;
        const wave2 = Math.cos(time * 1.5 - p.phi * 2.0 + p.phaseOffset) * 0.035;
        const wave3 = Math.sin(time * 3.1 + p.theta * 5.0) * 0.02;
        
        // Dynamic radial scaling
        const turbulence = 1.0 + wave1 + wave2 + wave3;
        const currentRadius = sphereRadius * p.baseRadius * turbulence;

        // Interactive dynamic spin offset
        const dynamicPhi = p.phi + time * 0.06 * p.speedOffset;
        
        // Convert spherical coords to 3D Cartesian coordinates
        let x = currentRadius * Math.sin(p.theta) * Math.cos(dynamicPhi);
        let y = currentRadius * Math.sin(p.theta) * Math.sin(dynamicPhi);
        let z = currentRadius * Math.cos(p.theta);

        // Apply 3D matrix rotations
        // Rotation about X axis
        let y1 = y * Math.cos(angleX) - z * Math.sin(angleX);
        let z1 = y * Math.sin(angleX) + z * Math.cos(angleX);

        // Rotation about Y axis
        let x2 = x * Math.cos(angleY) + z1 * Math.sin(angleY);
        let z2 = -x * Math.sin(angleY) + z1 * Math.cos(angleY);

        // Rotation about Z axis
        let x3 = x2 * Math.cos(angleZ) - y1 * Math.sin(angleZ);
        let y3 = x2 * Math.sin(angleZ) + y1 * Math.cos(angleZ);

        // Normalized Z-depth [-sphereRadius, +sphereRadius] -> [0, 1]
        const zDepth = (z2 + sphereRadius) / (sphereRadius * 2);

        // Microscopic particle size scaling on distance
        const finalSize = p.size * (0.35 + zDepth * 1.25);
        const opacity = p.brightness * (0.2 + zDepth * 0.8) * (state === "speaking" ? 0.95 : 0.75);

        // Seamless color blending
        const gradientLerp = (Math.sin(p.theta * 2.0 + time * 1.5) + 1.0) / 2.0;
        const r = Math.round(primaryColor.r + (secondaryColor.r - primaryColor.r) * gradientLerp);
        const g = Math.round(primaryColor.g + (secondaryColor.g - primaryColor.g) * gradientLerp);
        const b = Math.round(primaryColor.b + (secondaryColor.b - primaryColor.b) * gradientLerp);

        projected.push({
          x: centerX + x3,
          y: centerY + y3,
          size: finalSize,
          color: `rgba(${r}, ${g}, ${b}, ${opacity})`,
          z: z2,
        });
      }

      // Render order via Painters Algorithm (sort depth for flawless sphere overlap)
      projected.sort((a, b) => a.z - b.z);

      // Perform extremely optimized drawing
      const len = projected.length;
      for (let i = 0; i < len; i++) {
        const p = projected[i];
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();

        // Extra hot super luminous core highlights on foreground particles
        if (p.z > sphereRadius * 0.6 && Math.random() > 0.96) {
          ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 1.4, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.globalCompositeOperation = "source-over"; // Reset compositing
      animationId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationId);
      if (resizeFrameId) {
        cancelAnimationFrame(resizeFrameId);
      }
      resizeObserver.disconnect();
    };
  }, [state]);

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden bg-transparent">
      <canvas 
        ref={canvasRef} 
        className="block w-full h-full object-contain"
      />
    </div>
  );
};
