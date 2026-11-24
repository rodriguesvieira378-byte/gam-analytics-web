"use client";

import { useEffect, useRef, useState } from "react";

interface AnimatedNumberProps {
  value: number;
  /** Duração da animação em milissegundos. */
  duration?: number;
  className?: string;
}

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

const formatter = new Intl.NumberFormat("pt-BR");

/**
 * Número que "conta" suavemente do valor anterior até o novo.
 * Respeita a preferência de movimento reduzido do sistema.
 */
export function AnimatedNumber({
  value,
  duration = 700,
  className
}: AnimatedNumberProps) {
  const [display, setDisplay] = useState(0);
  const previous = useRef(0);

  useEffect(() => {
    const from = previous.current;
    previous.current = value;

    if (from === value || prefersReducedMotion()) {
      setDisplay(value);
      return;
    }

    let frame = 0;
    const start = performance.now();

    const step = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(from + (value - from) * eased));

      if (progress < 1) {
        frame = requestAnimationFrame(step);
      }
    };

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);

  return (
    <span className={className} aria-label={formatter.format(value)}>
      {formatter.format(display)}
    </span>
  );
}

export default AnimatedNumber;
