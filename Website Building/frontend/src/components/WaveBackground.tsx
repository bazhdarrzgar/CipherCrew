"use client";

import React, { useEffect, useRef } from "react";
import { useTheme } from "./ThemeProvider";

interface WaveBackgroundProps {
  className?: string;
}

export function WaveBackground({ className = "" }: WaveBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { resolvedTheme } = useTheme();
  const themeRef = useRef(resolvedTheme);

  useEffect(() => {
    themeRef.current = resolvedTheme;
  }, [resolvedTheme]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Mouse tracking with inertia
    const mouse = { x: width * 0.5, y: height * 0.5, targetX: width * 0.5, targetY: height * 0.5 };

    const onMouseMove = (e: MouseEvent) => {
      mouse.targetX = e.clientX;
      mouse.targetY = e.clientY;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        mouse.targetX = e.touches[0].clientX;
        mouse.targetY = e.touches[0].clientY;
      }
    };

    window.addEventListener("mousemove", onMouseMove, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener("resize", handleResize);

    // ── Wave Grid & Particle Configuration ─────────────────────────────────────
    // Multiple undulating ribbon sheets
    const COLS = Math.min(100, Math.max(60, Math.floor(width / 18)));
    const ROWS = 48;
    const SPACING_X = 28;
    const SPACING_Y = 24;

    // Ambient floating cosmic dust particles
    const DUST_COUNT = 70;
    const dustParticles = Array.from({ length: DUST_COUNT }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      size: Math.random() * 1.8 + 0.6,
      baseAlpha: Math.random() * 0.6 + 0.2,
      pulseSpeed: Math.random() * 0.02 + 0.01,
      phase: Math.random() * Math.PI * 2,
    }));

    let time = 0;

    // ── Main Render Loop ───────────────────────────────────────────────────────
    const render = () => {
      time += 0.012;

      // Smooth mouse lerping
      mouse.x += (mouse.targetX - mouse.x) * 0.04;
      mouse.y += (mouse.targetY - mouse.y) * 0.04;

      const isDark = themeRef.current === "dark";

      // Clear with subtle backdrop color
      ctx.clearRect(0, 0, width, height);

      // Camera elevation & tilt
      const mouseTiltX = ((mouse.x / width) - 0.5) * 0.35;
      const mouseTiltY = ((mouse.y / height) - 0.5) * 0.25;

      const cameraZ = 750;
      const originX = width * 0.5;
      const originY = height * 0.62;

      // Project and draw structured wave sheets
      // We draw back-to-front for proper depth layering
      for (let r = ROWS - 1; r >= 0; r--) {
        const zPos = (r - ROWS * 0.5) * SPACING_Y;

        for (let c = 0; c < COLS; c++) {
          const xPos = (c - COLS * 0.5) * SPACING_X;

          // Normalized coordinates
          const nx = c / COLS;
          const ny = r / ROWS;

          // 3D Harmonic Wave Equations
          const wave1 = Math.sin(nx * 5.2 + time * 1.2 + ny * 2.8) * 75;
          const wave2 = Math.cos(ny * 4.6 - time * 1.5 + nx * 3.1) * 60;
          const wave3 = Math.sin(Math.sqrt((nx - 0.5) ** 2 + (ny - 0.5) ** 2) * 8.0 - time * 1.8) * 45;
          const wave4 = Math.cos((nx + ny) * 6.5 + time * 0.8) * 35;

          // Local mouse ripple influence
          const mouseDistX = (xPos + originX) - mouse.x;
          const mouseDistY = (zPos + originY) - mouse.y;
          const distToMouse = Math.sqrt(mouseDistX * mouseDistX + mouseDistY * mouseDistY);
          const mouseInfluence = Math.exp(-distToMouse / 260) * 45 * Math.sin(distToMouse * 0.04 - time * 4);

          const yElevation = wave1 + wave2 + wave3 + wave4 + mouseInfluence;

          // 3D Rotation with mouse parallax
          const cosY = Math.cos(mouseTiltX);
          const sinY = Math.sin(mouseTiltX);
          const cosX = Math.cos(mouseTiltY + 0.38); // Base pitch angle
          const sinX = Math.sin(mouseTiltY + 0.38);

          // Rotate around Y
          const xRot = xPos * cosY - zPos * sinY;
          const zRot = xPos * sinY + zPos * cosY;

          // Rotate around X
          const yRot = -yElevation * cosX - zRot * sinX;
          const zFinal = -yElevation * sinX + zRot * cosX + cameraZ;

          if (zFinal <= 40) continue; // Behind camera plane

          // Perspective projection
          const fov = 680;
          const scale = fov / zFinal;
          const projX = originX + xRot * scale;
          const projY = originY + yRot * scale;

          if (projX < -50 || projX > width + 50 || projY < -50 || projY > height + 50) {
            continue;
          }

          // Depth and height-based luminescence
          const heightFactor = Math.min(1, Math.max(0, (yElevation + 120) / 240));
          const depthFade = Math.min(1, Math.max(0.08, (1200 - zFinal) / 1000));

          // Calculate particle color and luminosity
          const radius = Math.max(0.6, (1.8 * scale) * (0.8 + heightFactor * 0.6));
          const alpha = Math.min(0.95, (0.15 + heightFactor * 0.75) * depthFade);

          if (isDark) {
            // Ethereal glowing cyan/electric-blue/teal as in reference image
            if (heightFactor > 0.65) {
              // Wave crests: vibrant luminous cyan with bloom
              ctx.fillStyle = `rgba(130, 240, 255, ${alpha})`;
              ctx.shadowColor = "rgba(56, 215, 255, 0.8)";
              ctx.shadowBlur = radius * 3;
            } else if (heightFactor > 0.35) {
              // Mid-wave: sleek deep cyan-blue
              ctx.fillStyle = `rgba(60, 170, 240, ${alpha * 0.85})`;
              ctx.shadowColor = "rgba(40, 140, 220, 0.4)";
              ctx.shadowBlur = radius * 1.5;
            } else {
              // Deep troughs: velvety indigo-sapphire
              ctx.fillStyle = `rgba(45, 100, 190, ${alpha * 0.6})`;
              ctx.shadowBlur = 0;
            }
          } else {
            // Light mode: refined azure-sapphire particles with high elegance
            if (heightFactor > 0.65) {
              ctx.fillStyle = `rgba(14, 116, 205, ${alpha * 0.85})`;
              ctx.shadowColor = "rgba(30, 144, 255, 0.4)";
              ctx.shadowBlur = radius * 2;
            } else if (heightFactor > 0.35) {
              ctx.fillStyle = `rgba(40, 95, 180, ${alpha * 0.65})`;
              ctx.shadowBlur = 0;
            } else {
              ctx.fillStyle = `rgba(80, 120, 180, ${alpha * 0.4})`;
              ctx.shadowBlur = 0;
            }
          }

          ctx.beginPath();
          ctx.arc(projX, projY, radius, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Reset shadow for dust particles
      ctx.shadowBlur = 0;

      // ── Ambient Floating Cosmic Dust ───────────────────────────────────────
      dustParticles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        const pulse = Math.sin(time * 2 + p.phase) * 0.3 + 0.7;
        const currentAlpha = p.baseAlpha * pulse * (isDark ? 0.75 : 0.4);

        ctx.fillStyle = isDark
          ? `rgba(180, 235, 255, ${currentAlpha})`
          : `rgba(40, 110, 190, ${currentAlpha})`;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("touchmove", onTouchMove);
    };
  }, []);

  return (
    <div
      className={`fixed inset-0 w-full h-full pointer-events-none z-0 overflow-hidden transition-colors duration-500 ${
        resolvedTheme === "dark" ? "bg-[#060911]" : "bg-[#f8fafc]"
      } ${className}`}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full block opacity-100 transition-opacity duration-700"
      />
      {/* Subtle Atmospheric Vignette and Depth Gradients */}
      <div
        className={`absolute inset-0 pointer-events-none transition-colors duration-500 ${
          resolvedTheme === "dark"
            ? "bg-[radial-gradient(ellipse_at_top,_transparent_30%,_rgba(6,9,17,0.7)_100%)]"
            : "bg-[radial-gradient(ellipse_at_top,_transparent_40%,_rgba(248,250,252,0.6)_100%)]"
        }`}
      />
      <div
        className={`absolute inset-0 pointer-events-none transition-colors duration-500 ${
          resolvedTheme === "dark"
            ? "bg-gradient-to-b from-[#060911]/60 via-transparent to-[#060911]/90"
            : "bg-gradient-to-b from-white/70 via-transparent to-white/85"
        }`}
      />
    </div>
  );
}
